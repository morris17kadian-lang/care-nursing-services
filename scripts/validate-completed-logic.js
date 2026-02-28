// Quick validation of completed vs booked logic for shift requests
// Mirrors the logic in AdminDashboardScreen completedShifts useMemo

function hasClockedOut(shift) {
  if (!shift.clockByNurse || typeof shift.clockByNurse !== 'object') return false;
  const entries = Object.values(shift.clockByNurse);
  if (entries.length === 0) return false;
  return entries.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const inTime = entry.lastClockInTime || entry.clockInTime || entry.startedAt;
    const outTime = entry.lastClockOutTime || entry.clockOutTime || entry.completedAt;
    if (!inTime || !outTime) return false;
    const inMs = Date.parse(inTime);
    const outMs = Date.parse(outTime);
    return outMs > inMs;
  });
}

function computeCompletedShifts(shiftRequests) {
  return (shiftRequests || []).filter((request) => {
    if (request?.status === 'completed') return true;
    const isRecurring = Boolean(request?.isRecurring);
    return !isRecurring && hasClockedOut(request);
  });
}

function isoNowOffset(hours) {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  return d.toISOString();
}

// Sample data
const samples = [
  {
    id: 'nonrec-1',
    status: 'approved',
    isRecurring: false,
    clockByNurse: {
      A123: { clockInTime: isoNowOffset(-2), clockOutTime: isoNowOffset(-1) },
    },
  },
  {
    id: 'nonrec-2',
    status: 'approved',
    isRecurring: false,
    clockByNurse: {
      B456: { clockInTime: isoNowOffset(-2) }, // No clock out
    },
  },
  {
    id: 'rec-1',
    status: 'approved',
    isRecurring: true,
    clockByNurse: {
      C789: { clockInTime: isoNowOffset(-5), clockOutTime: isoNowOffset(-4) },
    },
  },
  {
    id: 'rec-2',
    status: 'completed',
    isRecurring: true,
    clockByNurse: {
      D012: { clockInTime: isoNowOffset(-3), clockOutTime: isoNowOffset(-2) },
    },
  },
];

const completed = computeCompletedShifts(samples);

console.log('Total samples:', samples.length);
console.log('Completed computed:', completed.map((s) => s.id));

// Expectations:
// - 'nonrec-1' should be included (has clock-out, non-recurring)
// - 'nonrec-2' should NOT be included (no clock-out)
// - 'rec-1' should NOT be included (recurring, per-day clock-out stays booked)
// - 'rec-2' should be included (explicit status completed)

const expected = ['nonrec-1', 'rec-2'];
const ok =
  expected.length === completed.length &&
  expected.every((id) => completed.some((s) => s.id === id));

console.log('Matches expectation:', ok ? 'YES' : 'NO');

if (!ok) {
  console.error('Mismatch detected. Expected:', expected, 'Got:', completed.map((s) => s.id));
  process.exitCode = 1;
} else {
  console.log('Validation passed.');
}
