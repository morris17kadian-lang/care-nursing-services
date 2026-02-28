/*
	Purge patients except a keep-list.

	- Deletes patient/user/client profiles from Firestore `users` (and optionally `patients`).
	- Deletes related documents from `appointments` and `invoices`.
	- Optionally prunes the local JSON seed file `876Nursesdatabase/care_database.users.json`.

	SAFETY:
	- Requires Firebase Admin credentials (service account JSON).
	- This script is DESTRUCTIVE.

	Credentials resolution (first found wins):
	- GOOGLE_APPLICATION_CREDENTIALS
	- FIREBASE_SERVICE_ACCOUNT_PATH
	- ./firebase-service-key.json (repo root)

	Usage examples:
		node scripts/purgePatientsExcept.js \
			--keep ref@care.com,morris17kadian@gmail.com

		node scripts/purgePatientsExcept.js --local-only \
			--keep ref@care.com,morris17kadian@gmail.com
*/

const fs = require('fs');
const path = require('path');

const { admin, getFirestore } = require('../backend/services/firebaseAdmin');

function parseArgs(argv) {
	const args = {
		keep: [],
		localOnly: false,
		skipLocal: false,
		includePatientsCollection: true,
	};

	for (let i = 2; i < argv.length; i++) {
		const token = argv[i];
		if (token === '--keep') {
			const raw = argv[i + 1] || '';
			i++;
			args.keep = raw
				.split(',')
				.map((s) => String(s).trim().toLowerCase())
				.filter(Boolean);
			continue;
		}
		if (token === '--local-only') {
			args.localOnly = true;
			continue;
		}
		if (token === '--skip-local') {
			args.skipLocal = true;
			continue;
		}
		if (token === '--skip-patients-collection') {
			args.includePatientsCollection = false;
			continue;
		}
	}

	return args;
}

function resolveServiceAccountPath() {
	const candidates = [
		process.env.GOOGLE_APPLICATION_CREDENTIALS,
		process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
		path.resolve(process.cwd(), 'firebase-service-key.json'),
	].filter(Boolean);

	for (const candidate of candidates) {
		const abs = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
		if (fs.existsSync(abs)) return abs;
	}

	return null;
}

function isPatientLikeUser(userData) {
	const role = String(userData?.role || userData?.type || userData?.userType || '').toLowerCase();
	return role === 'patient' || role === 'user' || role === 'client';
}

function toLowerEmail(value) {
	if (!value) return '';
	return String(value).trim().toLowerCase();
}

async function deleteDocsInBatches(db, docRefs, label) {
	const refs = Array.isArray(docRefs) ? docRefs : [];
	const batchSize = 450;
	let deleted = 0;

	for (let i = 0; i < refs.length; i += batchSize) {
		const slice = refs.slice(i, i + batchSize);
		const batch = db.batch();
		slice.forEach((ref) => batch.delete(ref));
		await batch.commit();
		deleted += slice.length;
		console.log(`   ✓ Deleted ${deleted}/${refs.length} ${label}`);
	}

	return deleted;
}

async function collectMatches(db, collectionName, field, value) {
	if (value === undefined || value === null || String(value).trim() === '') return [];
	try {
		const snap = await db.collection(collectionName).where(field, '==', value).get();
		return snap.docs.map((d) => d.ref);
	} catch (e) {
		// Query may fail due to missing index; fallback to full scan (best effort).
		console.warn(
			`   ⚠️  Query failed for ${collectionName}.${field} == ${value} (${e?.message || e}). Falling back to scan.`
		);
		try {
			const snap = await db.collection(collectionName).get();
			return snap.docs
				.filter((d) => {
					const data = d.data();
					return String(data?.[field] ?? '') === String(value);
				})
				.map((d) => d.ref);
		} catch (scanErr) {
			console.warn(`   ⚠️  Scan failed for ${collectionName}: ${scanErr?.message || scanErr}`);
			return [];
		}
	}
}

async function pruneLocalUsersJson(keepEmailsLower) {
	const jsonPath = path.resolve(process.cwd(), '876Nursesdatabase', 'care_database.users.json');
	if (!fs.existsSync(jsonPath)) {
		console.log('ℹ️  Local users JSON not found, skipping:', jsonPath);
		return;
	}

	const raw = fs.readFileSync(jsonPath, 'utf8');
	let data;
	try {
		data = JSON.parse(raw);
	} catch (e) {
		throw new Error(`Failed to parse ${jsonPath}: ${e.message}`);
	}

	const list = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : null;
	if (!list) {
		throw new Error(`Unexpected shape in ${jsonPath} (expected array or {users: []}).`);
	}

	const before = list.length;
	const kept = [];

	for (const u of list) {
		const role = String(u?.role || u?.type || u?.userType || '').toLowerCase();
		const email = toLowerEmail(u?.email || u?.contactEmail);

		const isPatient = role === 'patient' || role === 'user' || role === 'client';

		if (!isPatient) {
			kept.push(u);
			continue;
		}

		if (email && keepEmailsLower.has(email)) {
			kept.push(u);
		}
	}

	const after = kept.length;
	const output = Array.isArray(data) ? kept : { ...data, users: kept };

	fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
	console.log(`✅ Pruned local JSON patients: ${before} -> ${after} records (${jsonPath})`);
}

async function main() {
	const args = parseArgs(process.argv);

	if (!args.keep.length) {
		console.error('❌ Missing --keep. Example: --keep ref@care.com,morris17kadian@gmail.com');
		process.exit(1);
	}

	const keepEmailsLower = new Set(args.keep.map((e) => String(e).trim().toLowerCase()).filter(Boolean));

	if (!args.skipLocal) {
		await pruneLocalUsersJson(keepEmailsLower);
	}

	if (args.localOnly) {
		console.log('✅ Local-only mode complete. No Firestore changes made.');
		return;
	}

	const serviceAccountPath = resolveServiceAccountPath();
	if (!serviceAccountPath) {
		console.error('❌ No Firebase Admin service account key found.');
		console.error('   Provide one of:');
		console.error('   - export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/key.json');
		console.error('   - export FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/key.json');
		console.error('   - place firebase-service-key.json in repo root (ignored by git)');
		process.exit(1);
	}

	// Ensure backend helper sees the path as FIREBASE_SERVICE_ACCOUNT_PATH.
	if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
		process.env.FIREBASE_SERVICE_ACCOUNT_PATH = serviceAccountPath;
	}

	const db = getFirestore();
	if (!db) {
		console.error('❌ Firebase Admin could not initialize (check credentials/env).');
		process.exit(1);
	}

	const auth = admin.auth();

	console.log('🧨 Purging patient users (Firestore)...');
	console.log('   Keeping emails:', Array.from(keepEmailsLower.values()).join(', '));

	const usersSnap = await db.collection('users').get();
	const allUserDocs = usersSnap.docs;

	const toDelete = [];
	const toKeep = [];

	for (const doc of allUserDocs) {
		const data = doc.data() || {};
		if (!isPatientLikeUser(data)) continue;

		const email = toLowerEmail(data.email || data.contactEmail);
		if (email && keepEmailsLower.has(email)) {
			toKeep.push({ doc, data, email });
		} else {
			toDelete.push({ doc, data, email });
		}
	}

	console.log(`📌 Found ${toKeep.length} patient users to KEEP, ${toDelete.length} to DELETE (from users collection).`);

	const appointmentRefsToDelete = [];
	const invoiceRefsToDelete = [];
	const userRefsToDelete = [];

	for (const u of toDelete) {
		const uidCandidates = [u.data.uid, u.data.userId, u.doc.id]
			.filter(Boolean)
			.map((v) => String(v));
		const email = u.email;

		// Collect related appointments + invoices
		for (const uid of uidCandidates) {
			appointmentRefsToDelete.push(
				...(await collectMatches(db, 'appointments', 'patientId', uid)),
				...(await collectMatches(db, 'appointments', 'clientId', uid)),
				...(await collectMatches(db, 'appointments', 'userId', uid))
			);
			invoiceRefsToDelete.push(
				...(await collectMatches(db, 'invoices', 'userId', uid)),
				...(await collectMatches(db, 'invoices', 'patientId', uid)),
				...(await collectMatches(db, 'invoices', 'clientId', uid))
			);
		}

		if (email) {
			appointmentRefsToDelete.push(
				...(await collectMatches(db, 'appointments', 'patientEmail', email)),
				...(await collectMatches(db, 'appointments', 'clientEmail', email)),
				...(await collectMatches(db, 'appointments', 'email', email))
			);
			invoiceRefsToDelete.push(
				...(await collectMatches(db, 'invoices', 'patientEmail', email)),
				...(await collectMatches(db, 'invoices', 'clientEmail', email)),
				...(await collectMatches(db, 'invoices', 'email', email))
			);
		}

		userRefsToDelete.push(u.doc.ref);
	}

	// Deduplicate refs
	const uniqRefs = (refs) => {
		const seen = new Set();
		const out = [];
		refs.forEach((r) => {
			const key = r.path;
			if (seen.has(key)) return;
			seen.add(key);
			out.push(r);
		});
		return out;
	};

	const uniqueAppointments = uniqRefs(appointmentRefsToDelete);
	const uniqueInvoices = uniqRefs(invoiceRefsToDelete);
	const uniqueUsers = uniqRefs(userRefsToDelete);

	console.log(`🧾 Deleting related docs: ${uniqueAppointments.length} appointments, ${uniqueInvoices.length} invoices.`);
	await deleteDocsInBatches(db, uniqueAppointments, 'appointments');
	await deleteDocsInBatches(db, uniqueInvoices, 'invoices');
	await deleteDocsInBatches(db, uniqueUsers, 'user profiles');

	// Optionally also delete from "patients" collection
	if (args.includePatientsCollection) {
		try {
			const patientsSnap = await db.collection('patients').get();
			const patientRefs = [];

			patientsSnap.docs.forEach((doc) => {
				const d = doc.data() || {};
				const email = toLowerEmail(d.email || d.contactEmail);
				const role = String(d.role || d.type || '').toLowerCase();
				const isPatient = role === 'patient' || role === 'user' || role === 'client' || !role;

				if (!isPatient) return;
				if (email && keepEmailsLower.has(email)) return;
				patientRefs.push(doc.ref);
			});

			const uniquePatients = uniqRefs(patientRefs);
			if (uniquePatients.length) {
				console.log(`🧾 Deleting ${uniquePatients.length} docs from patients collection...`);
				await deleteDocsInBatches(db, uniquePatients, 'patients');
			}
		} catch (e) {
			console.log('ℹ️  No patients collection found (or access denied). Skipping.');
		}
	}

	// Delete Auth users best-effort
	console.log('🔐 Deleting Firebase Auth users (best-effort)...');
	let authDeleted = 0;
	for (const u of toDelete) {
		const possibleUids = [u.data.uid, u.doc.id].filter(Boolean).map(String);

		let deleted = false;
		for (const uid of possibleUids) {
			try {
				await auth.deleteUser(uid);
				authDeleted++;
				deleted = true;
				break;
			} catch (e) {
				// ignore; try next
			}
		}

		if (!deleted && u.email) {
			try {
				const userRecord = await auth.getUserByEmail(u.email);
				if (userRecord?.uid) {
					await auth.deleteUser(userRecord.uid);
					authDeleted++;
				}
			} catch (e) {
				// ignore
			}
		}
	}

	console.log('✅ Purge complete.');
	console.log(`   Kept patient users: ${toKeep.length}`);
	console.log(`   Deleted patient users: ${toDelete.length}`);
	console.log(`   Deleted Auth users (best-effort): ${authDeleted}`);
	console.log('⚠️  Note: shiftRequests/messages/etc were NOT deleted by this script.');
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('❌ Purge failed:', err?.message || err);
		process.exit(1);
	});
