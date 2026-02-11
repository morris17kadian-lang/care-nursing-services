const INVALID_STRINGS = new Set(['n/a', 'na', 'not provided', 'undefined', 'null', 'none', 'n/a.', 'not available']);

const normalizeToken = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.toUpperCase();
};

const isMeaningful = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text) return false;
  return !INVALID_STRINGS.has(text.toLowerCase());
};

const pickFirstMeaningful = (...values) => {
  for (const value of values) {
    if (isMeaningful(value)) return value;
  }
  return null;
};

const nurseTokensFromCandidate = (candidate) => {
  if (!candidate) return [];

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    const token = normalizeToken(candidate);
    return token ? [token] : [];
  }

  const fields = [
    candidate.id,
    candidate._id,
    candidate.uid,
    candidate.nurseId,
    candidate.primaryNurseId,
    candidate.nurseCode,
    candidate.staffCode,
    candidate.code,
    candidate.username,
    candidate.licenseNumber,
  ];

  const tokens = fields
    .map(normalizeToken)
    .filter(Boolean);

  return [...new Set(tokens)];
};

export const findNurseInRoster = (nursesRoster, candidate) => {
  if (!Array.isArray(nursesRoster) || nursesRoster.length === 0) return null;

  const wanted = new Set(nurseTokensFromCandidate(candidate));
  if (wanted.size === 0) return null;

  for (const nurse of nursesRoster) {
    if (!nurse) continue;
    const tokens = nurseTokensFromCandidate(nurse);
    if (tokens.some((t) => wanted.has(t))) {
      return nurse;
    }
  }

  return null;
};

export const resolveNurseDetails = (candidate, nursesRoster) => {
  const candidateObj = candidate && typeof candidate === 'object' ? candidate : { id: candidate };
  const rosterMatch = findNurseInRoster(nursesRoster, candidateObj);

  const merged = {
    ...(rosterMatch || {}),
    ...(candidateObj || {}),
  };

  const resolvedEmail = pickFirstMeaningful(
    candidateObj?.email,
    candidateObj?.emailAddress,
    candidateObj?.mail,
    candidateObj?.contactEmail,
    candidateObj?.workEmail,
    candidateObj?.personalEmail,
    rosterMatch?.email,
    rosterMatch?.emailAddress,
    rosterMatch?.mail,
    rosterMatch?.contactEmail,
    rosterMatch?.workEmail,
    rosterMatch?.personalEmail
  );

  const resolvedPhone = pickFirstMeaningful(
    candidateObj?.phone,
    candidateObj?.phoneNumber,
    candidateObj?.mobile,
    candidateObj?.mobileNumber,
    candidateObj?.cell,
    candidateObj?.cellNumber,
    candidateObj?.contactNumber,
    candidateObj?.contactPhone,
    candidateObj?.workPhone,
    rosterMatch?.phone,
    rosterMatch?.phoneNumber,
    rosterMatch?.mobile,
    rosterMatch?.mobileNumber,
    rosterMatch?.cell,
    rosterMatch?.cellNumber,
    rosterMatch?.contactNumber,
    rosterMatch?.contactPhone,
    rosterMatch?.workPhone
  );

  const resolvedName = pickFirstMeaningful(
    candidateObj?.fullName,
    candidateObj?.name,
    candidateObj?.nurseName,
    rosterMatch?.fullName,
    rosterMatch?.name,
    rosterMatch?.nurseName
  );

  const resolvedCode = pickFirstMeaningful(
    candidateObj?.nurseCode,
    candidateObj?.code,
    candidateObj?.username,
    candidateObj?.staffCode,
    rosterMatch?.nurseCode,
    rosterMatch?.code,
    rosterMatch?.username,
    rosterMatch?.staffCode
  );

  const resolvedSpecialty = pickFirstMeaningful(
    candidateObj?.specialization,
    candidateObj?.specialty,
    candidateObj?.nurseSpecialty,
    rosterMatch?.specialization,
    rosterMatch?.specialty,
    rosterMatch?.nurseSpecialty
  );

  return {
    ...merged,
    fullName: resolvedName || merged.fullName || merged.name || 'Unknown Nurse',
    name: resolvedName || merged.name || merged.fullName || 'Unknown Nurse',
    nurseCode: resolvedCode || merged.nurseCode || merged.code || merged.username,
    specialization: resolvedSpecialty || merged.specialization || merged.specialty,
    specialty: resolvedSpecialty || merged.specialty || merged.specialization,
    email: resolvedEmail || null,
    phone: resolvedPhone || null,
  };
};
