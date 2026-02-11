const express = require('express');
const { randomUUID } = require('crypto');
const { getFirestore, admin } = require('../services/firebaseAdmin');

const router = express.Router();
const SHIFTS_COLLECTION = process.env.SHIFT_REQUESTS_COLLECTION || 'shiftRequests';
const FieldValue = admin?.firestore?.FieldValue;

const getServerTimestamp = () => (FieldValue ? FieldValue.serverTimestamp() : new Date());

const buildError = (res, status, message) => res.status(status).json({ success: false, error: message });

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split('T')[0];
};

async function getShiftRecord(id) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firebase Admin is not configured');
  }

  const ref = db.collection(SHIFTS_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    const error = new Error('Recurring shift not found');
    error.status = 404;
    throw error;
  }

  return { ref, data: snapshot.data() };
}

function cloneCoverageRequests(list = []) {
  return Array.isArray(list) ? list.map((item) => ({ ...item })) : [];
}

router.post('/recurring/:id/request-coverage', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, requestingNurseId, requestingNurseName, reason, notes } = req.body || {};

    if (!requestingNurseId) {
      return buildError(res, 400, 'requestingNurseId is required');
    }

    const normalizedDate = normalizeDate(date || new Date().toISOString());
    if (!normalizedDate) {
      return buildError(res, 400, 'A valid date is required');
    }

    const { ref, data } = await getShiftRecord(id);
    const coverageRequests = cloneCoverageRequests(data.coverageRequests);
    const backupNurses = Array.isArray(data.backupNurses) ? data.backupNurses : [];

    const nowIso = new Date().toISOString();
    const coverageRequest = {
      id: randomUUID(),
      date: normalizedDate,
      status: 'pending',
      requestedAt: nowIso,
      requestingNurseId,
      requestingNurseName: requestingNurseName || null,
      reason: reason || null,
      notes: notes || null,
      backupNursesNotified: backupNurses.map((nurse) => nurse.nurseId),
      responses: [],
    };

    coverageRequests.push(coverageRequest);

    await ref.update({
      coverageRequests,
      updatedAt: getServerTimestamp(),
    });

    return res.json({
      success: true,
      coverageRequest,
      backupNurses,
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('[RecurringShiftRoutes] request-coverage error:', error.message);
    return buildError(res, status, error.message || 'Failed to request coverage');
  }
});

router.put('/recurring/:id/coverage/:coverageRequestId/accept', async (req, res) => {
  try {
    const { id, coverageRequestId } = req.params;
    const { backupNurseId, backupNurseName, note } = req.body || {};

    if (!backupNurseId) {
      return buildError(res, 400, 'backupNurseId is required to accept coverage');
    }

    const { ref, data } = await getShiftRecord(id);
    const coverageRequests = cloneCoverageRequests(data.coverageRequests);
    const targetIndex = coverageRequests.findIndex((entry) => entry.id === coverageRequestId);

    if (targetIndex === -1) {
      return buildError(res, 404, 'Coverage request not found');
    }

    const requestEntry = coverageRequests[targetIndex];
    if (requestEntry.status === 'accepted') {
      return buildError(res, 400, 'Coverage request already accepted');
    }

    const nowIso = new Date().toISOString();
    requestEntry.status = 'accepted';
    requestEntry.acceptedAt = nowIso;
    requestEntry.acceptedBy = backupNurseId;
    requestEntry.acceptedByName = backupNurseName || null;
    requestEntry.acceptNote = note || null;

    const dateKey = requestEntry.date || normalizeDate(nowIso);
    const occurrenceOverrides = { ...(data.occurrenceOverrides || {}) };
    occurrenceOverrides[dateKey] = {
      ...(occurrenceOverrides[dateKey] || {}),
      assignedNurseId: backupNurseId,
      assignedNurseName: backupNurseName || null,
      coverageRequestId,
      coverageStatus: 'accepted',
      coverageAssignedAt: nowIso,
      requestReason: requestEntry.reason || null,
    };

    const assignedNursesSet = new Set(
      Array.isArray(data.assignedNurses) ? data.assignedNurses.filter(Boolean) : []
    );
    if (data.nurseId) {
      assignedNursesSet.add(data.nurseId);
    }
    assignedNursesSet.add(backupNurseId);

    coverageRequests[targetIndex] = requestEntry;
    await ref.update({
      coverageRequests,
      occurrenceOverrides,
      assignedNurses: Array.from(assignedNursesSet),
      updatedAt: getServerTimestamp(),
    });

    return res.json({
      success: true,
      coverageRequest: requestEntry,
      occurrenceOverride: occurrenceOverrides[dateKey],
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('[RecurringShiftRoutes] accept coverage error:', error.message);
    return buildError(res, status, error.message || 'Failed to accept coverage request');
  }
});

router.put('/recurring/:id/coverage/:coverageRequestId/decline', async (req, res) => {
  try {
    const { id, coverageRequestId } = req.params;
    const { backupNurseId, reason, closeRequest } = req.body || {};

    const { ref, data } = await getShiftRecord(id);
    const coverageRequests = cloneCoverageRequests(data.coverageRequests);
    const targetIndex = coverageRequests.findIndex((entry) => entry.id === coverageRequestId);

    if (targetIndex === -1) {
      return buildError(res, 404, 'Coverage request not found');
    }

    const requestEntry = coverageRequests[targetIndex];
    if (requestEntry.status === 'accepted') {
      return buildError(res, 400, 'Cannot decline an already accepted request');
    }

    const nowIso = new Date().toISOString();
    const responses = Array.isArray(requestEntry.responses) ? [...requestEntry.responses] : [];
    responses.push({
      id: randomUUID(),
      userId: backupNurseId || 'admin',
      status: 'declined',
      reason: reason || 'Declined',
      respondedAt: nowIso,
    });
    requestEntry.responses = responses;

    if (closeRequest || !backupNurseId) {
      requestEntry.status = 'declined';
      requestEntry.declinedAt = nowIso;
      requestEntry.declineReason = reason || 'Declined';
    } else {
      const backupNurses = Array.isArray(data.backupNurses) ? data.backupNurses : [];
      const respondedIds = new Set(
        responses.filter((resp) => resp.status === 'declined').map((resp) => resp.userId)
      );
      const remaining = backupNurses.filter((nurse) => !respondedIds.has(nurse.nurseId));
      if (remaining.length === 0) {
        requestEntry.status = 'escalated';
        requestEntry.escalatedAt = nowIso;
      }
    }

    coverageRequests[targetIndex] = requestEntry;
    await ref.update({
      coverageRequests,
      updatedAt: getServerTimestamp(),
    });

    return res.json({
      success: true,
      coverageRequest: requestEntry,
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('[RecurringShiftRoutes] decline coverage error:', error.message);
    return buildError(res, status, error.message || 'Failed to decline coverage request');
  }
});

router.put('/recurring/:id/clock-out', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clockOutLocation,
      clockOutTime,
      clockInTime,
      notes,
      addToVisitHistory,
    } = req.body || {};

    if (!clockOutLocation || typeof clockOutLocation !== 'object') {
      return buildError(res, 400, 'clockOutLocation is required');
    }

    const { ref, data } = await getShiftRecord(id);
    const nowIso = new Date().toISOString();
    const effectiveClockOutTime = clockOutTime || nowIso;

    const updatePayload = {
      clockOutLocation,
      latestClockOutLocation: clockOutLocation,
      lastClockOutTime: effectiveClockOutTime,
      updatedAt: getServerTimestamp(),
    };

    if (addToVisitHistory) {
      const visitHistory = Array.isArray(data.visitHistory) ? [...data.visitHistory] : [];
      const visitEntry = {
        id: randomUUID(),
        date: normalizeDate(effectiveClockOutTime),
        startTime: clockInTime || data.actualStartTime || data.recurringStartTime || null,
        endTime: effectiveClockOutTime,
        status: 'completed',
        notes: notes || null,
        nurseId: data.nurseId || data.primaryNurseId || null,
        recordedAt: nowIso,
        clockInTime: clockInTime || data.actualStartTime || null,
        clockOutTime: effectiveClockOutTime,
        clockInLocation: data.clockInLocation || null,
        clockOutLocation,
      };
      visitHistory.push(visitEntry);
      updatePayload.visitHistory = visitHistory;
      updatePayload.latestVisit = visitEntry;
    }

    await ref.update(updatePayload);

    return res.json({
      success: true,
      clockOutLocation,
      visitHistoryEntry: updatePayload.latestVisit || null,
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('[RecurringShiftRoutes] clock-out error:', error.message);
    return buildError(res, status, error.message || 'Failed to record clock-out');
  }
});

module.exports = router;
