import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, GRADIENTS } from '../constants';
import TouchableWeb from './TouchableWeb';
import { buttonStyles } from '../styles/ButtonStyles';
import { formatTimeTo12Hour } from '../utils/formatters';
import NurseInfoCard from './NurseInfoCard';
import NurseDetailsModal from './NurseDetailsModal';
import NotesAccordionList from './NotesAccordionList';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAME_TO_INDEX = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const mapDayValueToIndex = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 0 && value <= 6 ? value : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = value.getDay();
    return day >= 0 && day <= 6 ? day : null;
  }

  const str = String(value).trim();
  if (!str) return null;

  const numeric = Number(str);
  if (Number.isInteger(numeric)) {
    return numeric >= 0 && numeric <= 6 ? numeric : null;
  }

  const mapped = DAY_NAME_TO_INDEX[str.toLowerCase()];
  return typeof mapped === 'number' ? mapped : null;
};

const toDateObject = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const localDateOnly = new Date(`${value.trim()}T00:00:00`);
    return Number.isNaN(localDateOnly.getTime()) ? null : localDateOnly;
  }
  if (typeof value?.toDate === 'function') {
    try {
      const asDate = value.toDate();
      if (asDate instanceof Date && !Number.isNaN(asDate.getTime())) {
        return asDate;
      }
    } catch (error) {
      // Swallow and fall through to other parsing strategies.
    }
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const fromSeconds = new Date(value.seconds * 1000);
    return Number.isNaN(fromSeconds.getTime()) ? null : fromSeconds;
  }
  if (typeof value === 'object' && typeof value._seconds === 'number') {
    const fromUnderscoreSeconds = new Date(value._seconds * 1000);
    return Number.isNaN(fromUnderscoreSeconds.getTime()) ? null : fromUnderscoreSeconds;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pickFirstDateValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (Array.isArray(candidate)) {
      const nested = pickFirstDateValue(...candidate);
      if (nested) return nested;
      continue;
    }

    const asDate = toDateObject(candidate);
    if (asDate) return asDate;
  }
  return null;
};

const containsOngoingIndicator = (candidates) => {
  if (!Array.isArray(candidates)) return false;
  const keywords = ['ongoing', 'no end', 'no-end', 'continuous', 'indefinite'];
  return candidates.some((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return false;
      return keywords.some((keyword) => normalized.includes(keyword));
    }
    if (typeof value === 'boolean') {
      return value === true;
    }
    return false;
  });
};

const SAFE_GRADIENTS = {
  header: Array.isArray(GRADIENTS?.header) ? GRADIENTS.header : [COLORS.primary, COLORS.primary],
  primary: Array.isArray(GRADIENTS?.primary) ? GRADIENTS.primary : [COLORS.primary, COLORS.primary],
  success: Array.isArray(GRADIENTS?.success) ? GRADIENTS.success : ['#10b981', '#059669'],
  error: Array.isArray(GRADIENTS?.error) ? GRADIENTS.error : [COLORS.error, COLORS.error],
  warning: Array.isArray(GRADIENTS?.warning) ? GRADIENTS.warning : [COLORS.warning, COLORS.warning],
};

const normalizeId = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  return s.length ? s : null;
};

const normalizeCode = (value) => {
  if (!value) return null;
  const s = String(value).trim().toUpperCase();
  return s.length ? s : null;
};

const normalizeStatus = (value) => {
  if (!value) return 'pending';
  const s = String(value).trim().toLowerCase();
  if (s.includes('accept')) return 'accepted';
  if (s.includes('declin') || s.includes('reject')) return 'declined';
  return 'pending';
};

const looksLikeFirebaseUid = (value) => {
  const s = normalizeId(value);
  if (s.toUpperCase().includes('NURSE')) return false;
  return s.length >= 20;
};

const formatDate = (value) => {
  if (!value) return 'N/A';

  // Handle Firestore Timestamp objects (with toDate(), ._seconds, or .seconds)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if (typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        if (!Number.isNaN(d.getTime()))
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) { /* ignore */ }
    }
    const secs = value._seconds ?? value.seconds;
    if (typeof secs === 'number') {
      const d = new Date(secs * 1000);
      if (!Number.isNaN(d.getTime()))
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // Handle ISO date-only strings like "2026-03-07" as LOCAL dates to avoid UTC off-by-one
  if (typeof value === 'string') {
    const iso = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const local = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
      if (!Number.isNaN(local.getTime()))
        return local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const calculateDuration = (startTime, endTime) => {
  const parse = (t) => {
    if (!t) return null;
    const raw = String(t).trim();
    const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2] || '0', 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (ampm) {
      if (hours === 12) hours = 0;
      if (ampm === 'PM') hours += 12;
    }
    return hours * 60 + minutes;
  };

  const start = parse(startTime);
  const end = parse(endTime);
  if (start == null || end == null) return 'N/A';
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
};

export default function RecurringShiftDetailsModal({
  visible,
  shift,
  clients = [],
  nurses = [],
  contextType,
  hideFooter = false,
  currentNurseId = null,
  currentNurseCode = null,
  showPatientPostVisitSections = false,
  patientInvoices = [],
  patientIsLoadingInvoices = false,
  onOpenPatientInvoice,
  onGeneratePatientInvoice,
  medicalNotesUnlocked = false,
  onUnlockMedicalNotes,
  onLockMedicalNotes,
  onClose,
  onAccept,
  onDecline,
  onCoverageAccept,
  onCoverageDecline,
  onOpenAssignNurseModal,
  onManageBackupNurses,
  onOpenClockDetails,
  onAddNote,
  onRequestBackup,
  onClockIn,
  onClockOut,
}) {
  const [selectedNurseForDetails, setSelectedNurseForDetails] = useState(null);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState('');
  const activeShift = shift || {};

  const openPhotoPreview = (uri) => {
    const target = typeof uri === 'string' ? uri.trim() : '';
    if (!target) return;
    setPhotoPreviewUri(target);
    setPhotoPreviewVisible(true);
  };

  const closePhotoPreview = () => {
    setPhotoPreviewVisible(false);
    setPhotoPreviewUri('');
  };

  const debugBackupClock = useMemo(() => {
    try {
      return Boolean(__DEV__ && globalThis && globalThis.__DEBUG_BACKUP_CLOCK__ === true);
    } catch (error) {
      return false;
    }
  }, []);

  const lastSplitNotesDebugSigRef = useRef(null);

  const clockRoot = useMemo(() => {
    const candidates = [
      activeShift?.clockDetails,
      activeShift?.activeShift,
      activeShift?.shiftDetails,
      activeShift?.shift,
      activeShift,
    ].filter((c) => c && typeof c === 'object');

    const withClockByNurse = candidates.find((c) => {
      const map = c?.clockByNurse;
      return map && typeof map === 'object' && Object.keys(map).length > 0;
    });

    return withClockByNurse || candidates[0] || activeShift;
  }, [activeShift]);

  const mergedClockByNurse = useMemo(() => {
    const buckets = [
      activeShift?.clockDetails,
      activeShift?.activeShift,
      activeShift?.shiftDetails,
      activeShift?.shift,
      activeShift,
    ].filter((c) => c && typeof c === 'object');

    const merged = {};
    buckets.forEach((bucket) => {
      const map = bucket?.clockByNurse;
      if (!map || typeof map !== 'object') return;
      Object.assign(merged, map);
    });

    return Object.keys(merged).length > 0 ? merged : null;
  }, [activeShift]);

  const isSplitScheduleShift = useMemo(() => {
    if (String(activeShift?.assignmentType || '').toLowerCase() === 'split-schedule') return true;
    const serviceText = String(activeShift?.service || '').toLowerCase();
    if (serviceText.includes('split schedule')) return true;
    const schedule = activeShift?.nurseSchedule;
    if (schedule && typeof schedule === 'object') {
      const rawValues = Object.values(schedule);
      const normalizedValues = rawValues
        .map((value) => normalizeId(value) || normalizeCode(value) || null)
        .filter(Boolean);
      const uniqueNurses = new Set(normalizedValues);
      if (uniqueNurses.size > 1) return true;
    }
    const assigned = Array.isArray(activeShift?.assignedNurses) ? activeShift.assignedNurses : [];
    if (assigned.length > 1) return true;
    const responses = activeShift?.nurseResponses;
    if (responses && typeof responses === 'object') {
      const nurseIdentifiers = [];
      Object.entries(responses).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          // Exclude declined responses - they shouldn't count toward split schedule detection
          const status = normalizeStatus(v.status);
          if (status === 'declined') return;
          
          const id = normalizeId(v.nurseId || v.uid);
          const code = normalizeCode(v.nurseCode || v.staffCode || v.code);
          if (id || code) {
            nurseIdentifiers.push({ id, code });
          }
        }
      });
      
      console.log('[RecurringShiftDetailsModal] isSplitScheduleShift check - nurseIdentifiers:', nurseIdentifiers);
      
      if (nurseIdentifiers.length > 1) {
        const firstNurse = nurseIdentifiers[0];
        const allSameNurse = nurseIdentifiers.every(nurse => {
          const idMatch = firstNurse.id && nurse.id && firstNurse.id === nurse.id;
          const codeMatch = firstNurse.code && nurse.code && firstNurse.code === nurse.code;
          return idMatch || codeMatch;
        });
        
        if (!allSameNurse) return true;
      }
    }
    return false;
  }, [activeShift]);

  const modalTitle = 'Recurring Shift Details';

  const shiftClientName =
    activeShift?.clientName ||
    activeShift?.patientName ||
    activeShift?.name ||
    activeShift?.clientSnapshot?.name ||
    activeShift?.patientSnapshot?.name ||
    activeShift?.clientData?.name ||
    activeShift?.contactData?.name ||
    'Client';

  const shiftAddress = (() => {
    const addr =
      activeShift?.address ||
      activeShift?.location ||
      activeShift?.patientAddress ||
      activeShift?.clientAddress ||
      null;

    if (addr && typeof addr === 'object') {
      return addr.address || addr.location || addr.street || addr.formattedAddress || null;
    }

    return typeof addr === 'string' ? addr : null;
  })();

  const resolveString = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const s = value.trim();
      return s.length ? s : null;
    }
    return null;
  };

  const resolveAddressDisplay = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    if (typeof value === 'object') {
      const candidates = [value.address, value.location, value.street, value.formattedAddress];
      for (const c of candidates) {
        const s = resolveString(c);
        if (s) return s;
      }
      if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
        return `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`;
      }
    }
    return null;
  };

  const matchedClient = (() => {
    const idCandidates = [activeShift?.clientId, activeShift?.patientId, activeShift?.contactId];
    const nameCand = resolveString(shiftClientName);
    if (Array.isArray(clients) && clients.length) {
      for (const id of idCandidates) {
        const sid = resolveString(id);
        if (!sid) continue;
        const found = clients.find((c) => resolveString(c?.id) === sid || resolveString(c?._id) === sid);
        if (found) return found;
      }
      if (nameCand) {
        const foundByName = clients.find(
          (c) => resolveString(c?.fullName) === nameCand || resolveString(c?.name) === nameCand
        );
        if (foundByName) return foundByName;
      }
    }
    return null;
  })();

  const clientEmail =
    resolveString(matchedClient?.email) ||
    resolveString(activeShift?.clientEmail) ||
    resolveString(activeShift?.patientEmail) ||
    resolveString(activeShift?.email) ||
    resolveString(activeShift?.clientSnapshot?.email) ||
    resolveString(activeShift?.patientSnapshot?.email) ||
    resolveString(activeShift?.clientSnapshot?.contactEmail) ||
    resolveString(activeShift?.patientSnapshot?.contactEmail) ||
    resolveString(activeShift?.clientData?.email) ||
    resolveString(activeShift?.clientData?.contactEmail) ||
    resolveString(activeShift?.contactData?.email) ||
    resolveString(activeShift?.contactData?.contactEmail) ||
    null;

  const clientPhone =
    resolveString(matchedClient?.phone) ||
    resolveString(activeShift?.patientPhone) ||
    resolveString(activeShift?.clientPhone) ||
    resolveString(activeShift?.phone) ||
    resolveString(activeShift?.clientSnapshot?.phone) ||
    resolveString(activeShift?.patientSnapshot?.phone) ||
    resolveString(activeShift?.clientSnapshot?.phoneNumber) ||
    resolveString(activeShift?.patientSnapshot?.phoneNumber) ||
    resolveString(activeShift?.patientSnapshot?.contactNumber) ||
    resolveString(activeShift?.clientSnapshot?.contactNumber) ||
    resolveString(activeShift?.clientData?.phone) ||
    resolveString(activeShift?.clientData?.contactNumber) ||
    resolveString(activeShift?.clientData?.phoneNumber) ||
    resolveString(activeShift?.contactData?.phone) ||
    resolveString(activeShift?.contactData?.contactNumber) ||
    resolveString(activeShift?.contactData?.phoneNumber) ||
    null;

  const clientAddress =
    resolveAddressDisplay(matchedClient?.address) ||
    resolveAddressDisplay(activeShift?.clientSnapshot?.address) ||
    resolveAddressDisplay(activeShift?.patientSnapshot?.address) ||
    resolveAddressDisplay(activeShift?.clientSnapshot?.location) ||
    resolveAddressDisplay(activeShift?.patientSnapshot?.location) ||
    resolveAddressDisplay(activeShift?.clientData?.address) ||
    resolveAddressDisplay(activeShift?.clientData?.location) ||
    resolveAddressDisplay(activeShift?.contactData?.address) ||
    resolveAddressDisplay(activeShift?.contactData?.location) ||
    resolveAddressDisplay(activeShift?.clientAddress) ||
    resolveAddressDisplay(activeShift?.patientAddress) ||
    resolveAddressDisplay(activeShift?.address) ||
    resolveAddressDisplay(activeShift?.location?.address) ||
    resolveAddressDisplay(activeShift?.location) ||
    resolveString(shiftAddress) ||
    null;

  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [visible]);

  const parseTimeToDateOnDay = (timeValue, baseDate = new Date()) => {
    if (!timeValue) return null;
    let raw = String(timeValue).trim();
    if (!raw) return null;

    if (raw.includes('T') || /\d{4}-\d{2}-\d{2}/.test(raw)) {
      const dt = new Date(raw);
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    // If a time range or extra text is provided, extract the first time segment.
    if (!/(\d{1,2})(?::\d{2})?\s*(AM|PM)?/i.test(raw)) {
      return null;
    }

    const timeMatch = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (timeMatch && timeMatch[0]) {
      raw = timeMatch[0].trim();
    }

    const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return null;

    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2] || '0', 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (ampm) {
      if (hours === 12) hours = 0;
      if (ampm === 'PM') hours += 12;
    }

    const dt = new Date(baseDate);
    dt.setHours(hours, minutes, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const getShiftScheduledStartDateTime = useMemo(() => {
    const isAdminRecurring = activeShift?.adminRecurring === true || 
      String(activeShift?.adminRecurring || '').trim().toLowerCase() === 'true';
    const isPatientRecurring = activeShift?.isRecurring === true || 
      String(activeShift?.isRecurring || '').trim().toLowerCase() === 'true' || 
      (activeShift?.recurringSchedule && typeof activeShift?.recurringSchedule === 'object');
    const isRecurring = isAdminRecurring || isPatientRecurring;

    const timeCandidate =
      activeShift?.startTime ||
      activeShift?.time ||
      activeShift?.preferredTime ||
      activeShift?.scheduledTime ||
      activeShift?.scheduledStartTime ||
      activeShift?.recurringStartTime ||
      null;

    const dateCandidate =
      activeShift?.scheduledDate ||
      activeShift?.date ||
      activeShift?.shiftDate ||
      activeShift?.startDate ||
      activeShift?.serviceDate ||
      activeShift?.requestedDate ||
      null;

    // For recurring shifts, check if today (or upcoming days) matches scheduled days
    if (isRecurring && timeCandidate) {
      const normalizeDayKey = (value) => {
        if (value == null) return null;
        if (typeof value === 'string') {
          const raw = value.trim();
          if (!raw) return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
          if (/^\d{8}$/.test(raw)) {
            const yyyy = raw.slice(0, 4);
            const mm = raw.slice(4, 6);
            const dd = raw.slice(6, 8);
            return `${yyyy}-${mm}-${dd}`;
          }
          const d = new Date(raw);
          if (!Number.isFinite(d.getTime())) return null;
          const yyyy = String(d.getFullYear());
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
          const raw = String(Math.trunc(value));
          if (/^\d{8}$/.test(raw)) {
            const yyyy = raw.slice(0, 4);
            const mm = raw.slice(4, 6);
            const dd = raw.slice(6, 8);
            return `${yyyy}-${mm}-${dd}`;
          }
        }
        if (value instanceof Date && Number.isFinite(value.getTime())) {
          const yyyy = String(value.getFullYear());
          const mm = String(value.getMonth() + 1).padStart(2, '0');
          const dd = String(value.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
        try {
          const d = new Date(value);
          if (!Number.isFinite(d.getTime())) return null;
          const yyyy = String(d.getFullYear());
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
          return null;
        }
      };

      const getCompletedDayKeysForCurrentNurse = () => {
        const completed = new Set();

        const clockByNurse = activeShift?.clockByNurse;
        const keysToTry = [currentNurseId, currentNurseCode]
          .filter(Boolean)
          .map((v) => String(v).trim())
          .filter(Boolean);

        const isKeyMatch = (rawKey) => {
          if (!rawKey) return false;
          const k = String(rawKey).trim();
          if (!k) return false;
          return keysToTry.some((t) => t === k || t.toUpperCase() === k.toUpperCase() || t.toLowerCase() === k.toLowerCase());
        };

        if (clockByNurse && typeof clockByNurse === 'object') {
          for (const [key, entry] of Object.entries(clockByNurse)) {
            if (!entry || typeof entry !== 'object') continue;
            const entryId = entry.nurseId || entry.id || entry._id || entry.uid || entry.nurseCode || entry.staffCode || entry.code;
            if (!isKeyMatch(key) && !isKeyMatch(entryId)) continue;

            const sessions = Array.isArray(entry.clockEntries) ? entry.clockEntries : [];
            sessions.forEach((s) => {
              if (!s || typeof s !== 'object') return;
              const hasOut = Boolean(s.clockOutTime || s.actualEndTime || s.completedAt);
              if (!hasOut) return;
              const outKey = normalizeDayKey(s.dayKey || s.clockOutTime || s.actualEndTime || s.completedAt);
              if (outKey) completed.add(outKey);
            });

            const lastOutKey = normalizeDayKey(entry.lastClockOutTime || entry.clockOutTime || entry.actualEndTime || entry.completedAt);
            if (lastOutKey) completed.add(lastOutKey);
          }
        }

        const globalSessions = Array.isArray(activeShift?.clockEntries) ? activeShift.clockEntries : [];
        globalSessions.forEach((s) => {
          if (!s || typeof s !== 'object') return;
          const sid = s.nurseId || s.id || s._id;
          if (sid && !isKeyMatch(sid)) return;
          const hasOut = Boolean(s.clockOutTime || s.actualEndTime || s.completedAt);
          if (!hasOut) return;
          const outKey = normalizeDayKey(s.dayKey || s.clockOutTime || s.actualEndTime || s.completedAt);
          if (outKey) completed.add(outKey);
        });

        return completed;
      };

      const completedDayKeys = getCompletedDayKeysForCurrentNurse();

      const isSplitSchedule = (() => {
        if (String(activeShift?.assignmentType || '').trim().toLowerCase() === 'split-schedule') return true;
        const schedule = activeShift?.nurseSchedule;
        return Boolean(schedule && typeof schedule === 'object' && Object.keys(schedule).length > 0);
      })();

      const daysRaw = [
        activeShift?.daysOfWeek,
        activeShift?.recurringDaysOfWeek,
        activeShift?.recurringDaysOfWeekList,
        activeShift?.selectedDays,
        activeShift?.recurringDays,
        activeShift?.recurringPattern?.daysOfWeek,
        activeShift?.recurringPattern?.selectedDays,
        activeShift?.schedule?.daysOfWeek,
        activeShift?.schedule?.selectedDays,
        activeShift?.recurringSchedule?.daysOfWeek,
        activeShift?.recurringSchedule?.selectedDays,
      ]
        .filter(Boolean)
        .flatMap((value) => (Array.isArray(value) ? value : [value]));

      const days = [];
      daysRaw.forEach((d) => {
        const mapped = mapDayValueToIndex(d);
        if (mapped !== null) days.push(mapped);
      });

      // Split-schedule: only allow clock-in on the weekdays assigned to *this* nurse.
      if (isSplitSchedule) {
        const schedule = activeShift?.nurseSchedule;

        const normalizeKey = (v) => {
          if (v === null || v === undefined) return null;
          const s = String(v).trim();
          if (!s) return null;
          return s.toLowerCase();
        };

        const nurseMatchesCurrent = (raw) => {
          if (!raw) return false;
          const currentKeys = [
            normalizeKey(currentNurseId),
            normalizeKey(currentNurseCode),
          ].filter(Boolean);
          if (currentKeys.length === 0) return false;

          const candidates = [];
          if (typeof raw === 'object') {
            const obj = raw;
            candidates.push(
              obj.nurseId,
              obj.id,
              obj._id,
              obj.uid,
              obj.nurseCode,
              obj.staffCode,
              obj.code
            );
          } else {
            candidates.push(raw);
          }

          return candidates
            .map(normalizeKey)
            .filter(Boolean)
            .some((k) => currentKeys.includes(k));
        };

        if (schedule && typeof schedule === 'object') {
          const assigned = [];
          for (const [dayKey, nurseVal] of Object.entries(schedule)) {
            if (!nurseVal) continue;
            if (!nurseMatchesCurrent(nurseVal)) continue;
            const mapped = mapDayValueToIndex(dayKey);
            if (mapped !== null) assigned.push(mapped);
          }

          const uniqueAssigned = Array.from(new Set(assigned)).sort((a, b) => a - b);
          if (uniqueAssigned.length === 0) return null;

          days.splice(0, days.length, ...uniqueAssigned);
        } else {
          return null;
        }
      }
      
      if (days.length === 0) return null;

      const periodStart = toDateObject(
        activeShift?.recurringPeriodStart ||
        activeShift?.recurringStartDate ||
        activeShift?.startDate ||
        null
      );
      const periodEnd = toDateObject(
        activeShift?.recurringPeriodEnd ||
        activeShift?.recurringEndDate ||
        activeShift?.endDate ||
        null
      );

      const timeParsed = parseTimeToDateOnDay(timeCandidate, new Date());
      if (!timeParsed) return null;
      
      const hours = timeParsed.getHours();
      const minutes = timeParsed.getMinutes();
      const now = new Date();

      // Search up to 14 days to find the next occurrence
      for (let offset = 0; offset <= 14; offset++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + offset);
        candidate.setHours(hours, minutes, 0, 0);

        const candidateKey = normalizeDayKey(candidate);
        if (candidateKey && completedDayKeys.has(candidateKey)) continue;

        if (!days.includes(candidate.getDay())) continue;
        
        if (periodStart) {
          const periodStartDate = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0, 0);
          if (candidate < periodStartDate) continue;
        }
        
        if (periodEnd) {
          const periodEndDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999);
          if (candidate > periodEndDate) continue;
        }

        return candidate;
      }

      return null;
    }

    // Non-recurring shift logic
    if (timeCandidate) {
      const asDate = parseTimeToDateOnDay(timeCandidate, new Date());
      if (asDate && String(timeCandidate).includes('T')) return asDate;

      const base = dateCandidate ? new Date(dateCandidate) : null;
      if (asDate && base && !Number.isNaN(base.getTime())) {
        const combined = new Date(base);
        combined.setHours(asDate.getHours(), asDate.getMinutes(), 0, 0);
        return Number.isNaN(combined.getTime()) ? null : combined;
      }

      return asDate;
    }

    if (dateCandidate) {
      const dt = new Date(dateCandidate);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    return null;
  }, [activeShift, currentNurseId, currentNurseCode]);

  const canClockInNow = useMemo(() => {
    if (!getShiftScheduledStartDateTime) return false;
    
    const now = new Date(nowTs);
    
    // Check if current time is at or after shift start time
    if (now < getShiftScheduledStartDateTime) return false;
    
    // For recurring shifts, allow clock-in for the scheduled day plus 24 hours
    // This allows nurses to complete shifts they forgot to clock into,
    // especially important for the last day of a recurring period
    const endTimeCandidate =
      activeShift?.recurringEndTime ||
      activeShift?.endTime ||
      activeShift?.scheduledEndTime ||
      null;
    
    if (endTimeCandidate) {
      const endTimeParsed = parseTimeToDateOnDay(endTimeCandidate, getShiftScheduledStartDateTime);
      if (endTimeParsed) {
        // Allow clock-in until 24 hours after the scheduled end time
        // This gives nurses reasonable time to complete shifts, especially on the last day of the period
        const graceHours = 24;
        const endWithGrace = new Date(endTimeParsed.getTime() + graceHours * 60 * 60 * 1000);
        
        // If current time is past the end time + grace period, don't allow clock-in
        if (now > endWithGrace) return false;
      }
    }
    
    return true;
  }, [getShiftScheduledStartDateTime, nowTs, activeShift]);

  const currentNurseClockEntry = useMemo(() => {
    const clockByNurse = mergedClockByNurse;
    if (!clockByNurse) return null;

    const idKey = normalizeId(currentNurseId);
    const codeKey = normalizeCode(currentNurseCode);
    const candidates = [idKey, codeKey].filter(Boolean).map((v) => String(v));

    for (const rawKey of candidates) {
      const key = rawKey.trim();
      if (!key) continue;
      if (clockByNurse[key]) return clockByNurse[key];
      const upper = key.toUpperCase();
      if (clockByNurse[upper]) return clockByNurse[upper];
      const lower = key.toLowerCase();
      if (clockByNurse[lower]) return clockByNurse[lower];
    }

    for (const entry of Object.values(clockByNurse)) {
      if (!entry || typeof entry !== 'object') continue;
      const entryId = normalizeId(entry?.nurseId || entry?.id || entry?._id || entry?.uid);
      const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);
      if (idKey && entryId && entryId === idKey) return entry;
      if (codeKey && entryCode && entryCode === codeKey) return entry;
    }

    return null;
  }, [mergedClockByNurse, currentNurseCode, currentNurseId]);

  const currentNurseHasClockIn = useMemo(() => {
    const entry = currentNurseClockEntry;
    if (!entry || typeof entry !== 'object') return false;
    return Boolean(entry.lastClockInTime || entry.actualStartTime || entry.clockInTime || entry.startedAt);
  }, [currentNurseClockEntry]);

  const currentNurseHasClockOut = useMemo(() => {
    const entry = currentNurseClockEntry;
    if (!entry || typeof entry !== 'object') return false;
    return Boolean(entry.lastClockOutTime || entry.actualEndTime || entry.clockOutTime || entry.completedAt);
  }, [currentNurseClockEntry]);

  const currentNurseHasActiveClockIn = useMemo(() => {
    const entry = currentNurseClockEntry;
    if (!entry || typeof entry !== 'object') return false;

    const sessions = Array.isArray(entry.clockEntries) ? entry.clockEntries : [];

    const getSessionIn = (s) => s?.clockInTime || s?.actualStartTime || s?.startedAt || null;
    const getSessionOut = (s) => s?.clockOutTime || s?.actualEndTime || s?.completedAt || null;

    let latestInMs = -Infinity;
    let latestSession = null;
    for (const s of sessions) {
      if (!s || typeof s !== 'object') continue;
      const inTime = getSessionIn(s);
      if (!inTime) continue;
      const inMs = Date.parse(inTime);
      if (!Number.isFinite(inMs)) continue;
      if (inMs > latestInMs) {
        latestInMs = inMs;
        latestSession = s;
      }
    }

    if (latestSession) {
      const outTime = getSessionOut(latestSession);
      if (!outTime) return true;
      const outMs = Date.parse(outTime);
      if (!Number.isFinite(outMs)) return true;
      return outMs < latestInMs;
    }

    // Fallback to non-historical fields only.
    const inTime = entry.actualStartTime || entry.clockInTime || entry.startedAt;
    if (!inTime) return false;
    const inMs = Date.parse(inTime);
    if (!Number.isFinite(inMs)) return false;

    const outTime = entry.actualEndTime || entry.clockOutTime || entry.completedAt;
    if (!outTime) return true;
    const outMs = Date.parse(outTime);
    if (!Number.isFinite(outMs)) return true;
    return outMs < inMs;
  }, [currentNurseClockEntry]);

  const nurseNotesText = (() => {
    const fromCurrentClock =
      (currentNurseClockEntry &&
        (resolveString(currentNurseClockEntry?.nurseNotes) ||
          resolveString(currentNurseClockEntry?.lastCompletionNotes))) ||
      null;

    if (fromCurrentClock) return fromCurrentClock;

    const clockByNurse = mergedClockByNurse;
    if (clockByNurse && typeof clockByNurse === 'object') {
      for (const entry of Object.values(clockByNurse)) {
        if (!entry || typeof entry !== 'object') continue;
        const note = resolveString(entry?.nurseNotes) || resolveString(entry?.lastCompletionNotes);
        if (note) return note;
      }
    }

    return (
      resolveString(activeShift?.nurseNotes) ||
      resolveString(activeShift?.completionNotes) ||
      resolveString(activeShift?.lastCompletionNotes) ||
      null
    );
  })();

  const shiftNurseNotePhotos = useMemo(() => {
    const list = Array.isArray(activeShift?.nurseNotePhotos) ? activeShift.nurseNotePhotos : [];
    return list.filter((u) => typeof u === 'string' && u.trim().length > 0);
  }, [activeShift]);

  const startTime =
    activeShift?.recurringStartTime ||
    activeShift?.startTime ||
    activeShift?.scheduledStartTime ||
    null;
  const endTime =
    activeShift?.recurringEndTime ||
    activeShift?.endTime ||
    activeShift?.scheduledEndTime ||
    null;

  const startDateCandidates = [
    activeShift?.scheduledDate,
    activeShift?.date,
    activeShift?.shiftDate,
    activeShift?.startDate,
    activeShift?.start_date,
    activeShift?.start,
    activeShift?.serviceDate,
    activeShift?.appointmentDate,
    activeShift?.requestedDate,
    activeShift?.requested_date,
    activeShift?.preferredDate,
    activeShift?.recurringPeriodStart,
    activeShift?.recurring_period_start,
    activeShift?.recurringStartDate,
    activeShift?.recurring_start_date,
    activeShift?.recurringPattern?.startDate,
    activeShift?.recurringPattern?.start_date,
    activeShift?.recurringPattern?.periodStart,
    activeShift?.recurringPattern?.start,
    activeShift?.recurringSchedule?.startDate,
    activeShift?.recurringSchedule?.start_date,
    activeShift?.recurringSchedule?.date,
    activeShift?.schedule?.startDate,
    activeShift?.schedule?.start_date,
    activeShift?.schedule?.date,
    activeShift?.requestedAt,
    activeShift?.createdAt,
  ];

  const startDate = pickFirstDateValue(...startDateCandidates) || null;

  const endDateCandidates = [
    activeShift?.endDate,
    activeShift?.end_date,
    activeShift?.end,
    activeShift?.appointmentEndDate,
    activeShift?.serviceEndDate,
    activeShift?.requestedEndDate,
    activeShift?.requested_end_date,
    activeShift?.completionDate,
    activeShift?.completedDate,
    activeShift?.completed_at,
    activeShift?.recurringPeriodEnd,
    activeShift?.recurring_period_end,
    activeShift?.recurringEndDate,
    activeShift?.recurring_end_date,
    activeShift?.recurringPattern?.endDate,
    activeShift?.recurringPattern?.end_date,
    activeShift?.recurringPattern?.periodEnd,
    activeShift?.recurringPattern?.end,
    activeShift?.recurringSchedule?.endDate,
    activeShift?.recurringSchedule?.end_date,
    activeShift?.recurringSchedule?.end,
    activeShift?.schedule?.endDate,
    activeShift?.schedule?.end_date,
    activeShift?.schedule?.end,
    activeShift?.requestedAt,
    activeShift?.createdAt,
  ];

  const hasExplicitOngoingIndicator =
    containsOngoingIndicator(endDateCandidates) ||
    Boolean(activeShift?.recurringPattern?.isOngoing) ||
    Boolean(activeShift?.recurringPattern?.ongoing) ||
    Boolean(activeShift?.recurringSchedule?.isOngoing) ||
    Boolean(activeShift?.recurringSchedule?.ongoing) ||
    Boolean(activeShift?.isOngoing);

  const endDate =
    pickFirstDateValue(...endDateCandidates) ||
    (!hasExplicitOngoingIndicator && startDate ? startDate : null);

  const recurringDaysForDisplay = useMemo(() => {
    const combined = [];

    const addDayCandidates = (candidate) => {
      if (!candidate) return;
      if (Array.isArray(candidate)) {
        candidate.forEach((value) => combined.push(value));
        return;
      }
      if (typeof candidate === 'object') {
        Object.entries(candidate).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            if (value) combined.push(key);
            return;
          }
          combined.push(value);
        });
        return;
      }
      combined.push(candidate);
    };

    addDayCandidates(activeShift?.daysOfWeek);
    addDayCandidates(activeShift?.selectedDays);
    addDayCandidates(activeShift?.requestedDays);
    addDayCandidates(activeShift?.preferredDays);
    addDayCandidates(activeShift?.recurringDaysOfWeek);
    addDayCandidates(activeShift?.recurringDaysOfWeekList);
    addDayCandidates(activeShift?.recurringPattern?.daysOfWeek);
    addDayCandidates(activeShift?.recurringPattern?.selectedDays);
    addDayCandidates(activeShift?.schedule?.daysOfWeek);
    addDayCandidates(activeShift?.schedule?.selectedDays);
    addDayCandidates(activeShift?.schedule?.requestedDays);
    addDayCandidates(activeShift?.recurringSchedule?.daysOfWeek);
    addDayCandidates(activeShift?.recurringSchedule?.selectedDays);
    addDayCandidates(activeShift?.recurringSchedule?.requestedDays);

    // Don't extract days from dates - only use explicit day assignments
    // Extracting days from startDate/endDate incorrectly adds those days to the schedule

    const days = Array.from(
      new Set(
        combined
          .map(mapDayValueToIndex)
          .filter((day) => day !== null),
      ),
    );
    const baseDay = startDate instanceof Date && !Number.isNaN(startDate.getTime())
      ? startDate.getDay()
      : new Date(nowTs).getDay();

    return days
      .sort((a, b) => {
        const aOffset = (a - baseDay + 7) % 7;
        const bOffset = (b - baseDay + 7) % 7;
        return aOffset - bOffset;
      });
  }, [activeShift, nowTs, startDate]);

  const nurseCards = useMemo(() => {
    const byId = new Map();
    const roster = Array.isArray(nurses) ? nurses : [];
    const assigned = Array.isArray(activeShift?.assignedNurses) ? activeShift.assignedNurses : [];
    const responses = activeShift?.nurseResponses;

    const resolveCanonicalId = (value, hintObj) => {
      const raw = normalizeId(value);
      if (!raw) return null;

      const code = normalizeCode(value);
      const hintCode = normalizeCode(hintObj?.nurseCode || hintObj?.staffCode || hintObj?.code);
      const hintId = normalizeId(hintObj?.nurseId || hintObj?.uid || hintObj?.id || hintObj?._id);

      const match = roster.find((n) => {
        const rosterId = normalizeId(n?.id || n?._id || n?.uid || n?.nurseId);
        const rosterCode = normalizeCode(n?.code || n?.nurseCode || n?.staffCode || n?.username);
        if (raw && rosterId && rosterId === raw) return true;
        if (hintId && rosterId && rosterId === hintId) return true;
        if (code && rosterCode && rosterCode === code) return true;
        if (hintCode && rosterCode && rosterCode === hintCode) return true;
        return false;
      });

      const rosterId = normalizeId(match?.id || match?._id || match?.uid || match?.nurseId);
      if (rosterId) return rosterId;

      if (responses && typeof responses === 'object') {
        const direct = responses[raw];
        const directId = normalizeId(direct?.nurseId || direct?.uid);
        if (directId) return directId;
      }

      const codeToResolve = code || hintCode;
      if (codeToResolve) {
        if (responses && typeof responses === 'object') {
          const foundResponse = Object.values(responses).find((entry) => {
            if (!entry || typeof entry !== 'object') return false;
            const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);
            return entryCode && entryCode === codeToResolve;
          });
          const foundResponseId = normalizeId(foundResponse?.nurseId || foundResponse?.uid);
          if (foundResponseId) return foundResponseId;
        }

        const foundAssigned = assigned.find((entry) => {
          if (!entry || typeof entry !== 'object') return false;
          const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);
          return entryCode && entryCode === codeToResolve;
        });
        const foundAssignedId = normalizeId(
          foundAssigned?.nurseId || foundAssigned?.uid || foundAssigned?.id || foundAssigned?._id
        );
        if (foundAssignedId) return foundAssignedId;
      }

      return raw;
    };

    const schedule = activeShift?.nurseSchedule;
    if (schedule && typeof schedule === 'object') {
      Object.entries(schedule).forEach(([dayKey, nurseId]) => {
        const id = resolveCanonicalId(nurseId);
        const day = mapDayValueToIndex(dayKey);
        if (!id || day === null) return;
        const existing = byId.get(id) || { nurseId: id, days: new Set() };
        existing.days.add(day);
        byId.set(id, existing);
      });
    }
    assigned.forEach((entry) => {
      const id = resolveCanonicalId(entry?.nurseId || entry?.id || entry?._id || entry, entry);
      if (!id) return;
      let alreadyExists = byId.has(id);
      const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);

      if (!alreadyExists && entryCode) {
        for (const existing of byId.values()) {
          if (existing.code && existing.code === entryCode) {
            alreadyExists = true;
            break;
          }
          const existingNurse = roster.find(
            (n) => normalizeId(n?.id || n?._id || n?.uid) === existing.nurseId
          );
          const existingCode = normalizeCode(existingNurse?.code || existingNurse?.nurseCode || existingNurse?.staffCode);
          if (existingCode === entryCode) {
            alreadyExists = true;
            existing.code = existingCode;
            break;
          }
        }
      }
      if (!alreadyExists) byId.set(id, { nurseId: id, days: new Set(), code: entryCode });
    });

    if (responses && typeof responses === 'object') {
      Object.entries(responses).forEach(([k, v]) => {
        // Skip declined responses - they shouldn't appear in nurse cards
        if (v && typeof v === 'object') {
          const status = normalizeStatus(v.status);
          if (status === 'declined') {
            console.log('[RecurringShiftDetailsModal] Skipping declined nurse in nurseCards:', {
              key: k,
              nurseId: v.nurseId,
              nurseName: v.nurseName,
              status: v.status,
            });
            return;
          }
        }
        
        const fromValue = v && typeof v === 'object' ? (v.nurseId || v.uid) : null;
        const fromKey = looksLikeFirebaseUid(k) ? k : null;
        const id = resolveCanonicalId(fromValue || fromKey || k, v);
        if (!id) return;
        let alreadyExists = byId.has(id);
        const responseCode = normalizeCode(v?.nurseCode || v?.staffCode);

        if (!alreadyExists && responseCode) {
          for (const existing of byId.values()) {
            if (existing.code && existing.code === responseCode) {
              alreadyExists = true;
              break;
            }
            const existingNurse = roster.find(
              (n) => normalizeId(n?.id || n?._id || n?.uid) === existing.nurseId
            );
            const existingCode = normalizeCode(existingNurse?.code || existingNurse?.nurseCode || existingNurse?.staffCode);
            if (existingCode === responseCode) {
              alreadyExists = true;
              existing.code = existingCode;
              break;
            }
          }
        }
        if (!alreadyExists) byId.set(id, { nurseId: id, days: new Set(), code: responseCode });
      });
    }

    // Detect accepted backup coverage and prefer the requesting/original nurse for display
    const coverageBuckets = [
      activeShift?.coverageRequests,
      activeShift?.schedule?.coverageRequests,
      activeShift?.recurringSchedule?.coverageRequests,
      activeShift?.recurrence?.coverageRequests,
      activeShift?.shift?.coverageRequests,
      activeShift?.shiftDetails?.coverageRequests,
    ].filter((b) => Array.isArray(b));

    const coverageList = coverageBuckets.flat();
    const acceptedCoverage =
      (Array.isArray(coverageList)
        ? coverageList.find((cr) => {
            if (!cr) return false;
            const s = String(cr.status || '').toLowerCase();
            return s.includes('accept');
          })
        : null) || null;

    const requestingPrimaryRaw =
      acceptedCoverage?.requestingNurseId ||
      acceptedCoverage?.requestedByNurseId ||
      acceptedCoverage?.requestingNurseCode ||
      acceptedCoverage?.requestedByNurseCode ||
      null;
    const requestingPrimary = requestingPrimaryRaw ? resolveCanonicalId(requestingPrimaryRaw, acceptedCoverage) : null;
    const requestingCode = normalizeCode(
      acceptedCoverage?.requestingNurseCode || acceptedCoverage?.requestedByNurseCode || null
    );

    if (requestingPrimary && !byId.has(requestingPrimary)) {
      byId.set(requestingPrimary, { nurseId: requestingPrimary, days: new Set(), code: requestingCode || undefined });
    }

    const fallbackPrimary = resolveCanonicalId(activeShift?.primaryNurseId || activeShift?.nurseId);
    const primary = requestingPrimary || fallbackPrimary;
    if (primary && !byId.has(primary)) byId.set(primary, { nurseId: primary, days: new Set() });

    const resolveNurse = (id) => {
      const fromNurses =
        roster.find((n) => {
          const rosterId = normalizeId(n?.id || n?._id || n?.uid || n?.nurseId);
          return rosterId === id;
        }) || null;

      const rosterCode = normalizeCode(fromNurses?.code || fromNurses?.nurseCode || fromNurses?.staffCode || fromNurses?.username);
      const responseObj =
        responses && typeof responses === 'object'
          ? (responses[id] && typeof responses[id] === 'object'
            ? responses[id]
            : Object.values(responses).find((entry) => {
                if (!entry || typeof entry !== 'object') return false;
                const entryId = normalizeId(entry?.nurseId || entry?.uid);
                if (entryId && entryId === id) return true;
                const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode);
                if (entryCode && rosterCode && entryCode === rosterCode) return true;
                return false;
              }) || null)
          : null;

      const assignedObj =
        assigned.find((a) => {
          const cand = normalizeId(a?.nurseId || a?.id || a?._id || a);
          return cand === id;
        }) ||
        assigned.find((a) => {
          if (!a || typeof a !== 'object') return false;
          const aCode = normalizeCode(a?.nurseCode || a?.staffCode || a?.code);
          const idCode = normalizeCode(id);
          return aCode && idCode && aCode === idCode;
        }) ||
        null;

      const name =
        responseObj?.nurseName ||
        assignedObj?.nurseName ||
        assignedObj?.name ||
        fromNurses?.fullName ||
        fromNurses?.name ||
        'Assigned Nurse';

      const code =
        responseObj?.nurseCode ||
        assignedObj?.nurseCode ||
        assignedObj?.staffCode ||
        fromNurses?.staffCode ||
        fromNurses?.nurseCode ||
        fromNurses?.code ||
        null;

      const photo =
        responseObj?.profilePhoto ||
        responseObj?.profileImage ||
        responseObj?.photo ||
        responseObj?.photoUrl ||
        responseObj?.photoURL ||
        responseObj?.avatar ||
        assignedObj?.profilePhoto ||
        assignedObj?.profileImage ||
        assignedObj?.photo ||
        assignedObj?.photoUrl ||
        assignedObj?.photoURL ||
        assignedObj?.avatar ||
        fromNurses?.profilePhoto ||
        fromNurses?.profileImage ||
        fromNurses?.photo ||
        fromNurses?.photoUrl ||
        fromNurses?.photoURL ||
        fromNurses?.avatar ||
        null;

      const specialty =
        fromNurses?.specialization ||
        fromNurses?.specialty ||
        assignedObj?.specialization ||
        assignedObj?.specialty ||
        'General Nursing';

      return { id, name, code, photo, specialty };
    };

    const initialCards = [...byId.values()].map((entry) => {
      const nurse = resolveNurse(entry.nurseId);
      const days = [...entry.days].sort((a, b) => a - b);
      return { nurseId: entry.nurseId, nurse, days };
    });

    const merged = new Map();
    const scoreNurse = (n) => {
      if (!n) return 0;
      let score = 0;
      if (normalizeId(n?.id)) score += 2;
      if (normalizeCode(n?.code)) score += 3;
      if (normalizeId(n?.photo)) score += 4;
      if (normalizeId(n?.name) && n.name !== 'Assigned Nurse') score += 2;
      return score;
    };

    initialCards.forEach((card) => {
      const cardCode = normalizeCode(card?.nurse?.code);
      const key = cardCode ? `code:${cardCode}` : `id:${normalizeId(card?.nurseId)}`;
      if (!key) return;

      if (!merged.has(key)) {
        merged.set(key, card);
        return;
      }

      const existing = merged.get(key);
      const mergedDays = Array.from(new Set([...(existing.days || []), ...(card.days || [])])).sort((a, b) => a - b);
      const keepExisting = scoreNurse(existing?.nurse) >= scoreNurse(card?.nurse);
      merged.set(key, {
        nurseId: keepExisting ? existing.nurseId : card.nurseId,
        nurse: keepExisting ? existing.nurse : card.nurse,
        days: mergedDays,
      });
    });

    return [...merged.values()];
  }, [activeShift, nurses]);

  // Select the primary nurse card for Service Information display
  const primaryServiceNurseCard = useMemo(() => {
    const cards = Array.isArray(nurseCards) ? nurseCards : [];
    if (cards.length === 0) return null;

    // First priority: requesting nurse from accepted coverage
    const coverageBuckets = [
      activeShift?.coverageRequests,
      activeShift?.schedule?.coverageRequests,
      activeShift?.recurringSchedule?.coverageRequests,
      activeShift?.recurrence?.coverageRequests,
      activeShift?.shift?.coverageRequests,
      activeShift?.shiftDetails?.coverageRequests,
    ].filter((b) => Array.isArray(b));

    const coverageList = coverageBuckets.flat();
    const acceptedCoverage =
      (Array.isArray(coverageList)
        ? coverageList.find((cr) => {
            if (!cr) return false;
            const s = String(cr.status || '').toLowerCase();
            return s.includes('accept');
          })
        : null) || null;

    const requestingId = normalizeId(
      acceptedCoverage?.requestingNurseId || acceptedCoverage?.requestedByNurseId || null
    );
    const requestingCode = normalizeCode(
      acceptedCoverage?.requestingNurseCode || acceptedCoverage?.requestedByNurseCode || null
    );

    if (requestingId || requestingCode) {
      const matched =
        cards.find((card) => {
          const cardId = normalizeId(card?.nurseId);
          const cardCode = normalizeCode(card?.nurse?.code || card?.code);
          if (requestingId && cardId && cardId === requestingId) return true;
          if (requestingCode && cardCode && cardCode === requestingCode) return true;
          return false;
        }) || null;

      if (matched) return matched;
    }

    // Second priority: assigned nurse hints
    const assignedIdCandidates = [
      activeShift?.assignedNurseId,
      activeShift?.primaryNurseId,
      activeShift?.assignedNurse?.id,
      activeShift?.assignedNurse?._id,
      activeShift?.nurse?.id,
      activeShift?.nurse?._id,
      activeShift?.primaryNurse?.id,
      activeShift?.primaryNurse?._id,
    ]
      .map(normalizeId)
      .filter(Boolean);

    const assignedCodeCandidates = [
      activeShift?.assignedNurseCode,
      activeShift?.primaryNurseCode,
      activeShift?.assignedNurse?.code,
      activeShift?.assignedNurse?.staffCode,
      activeShift?.nurse?.code,
      activeShift?.nurse?.staffCode,
      activeShift?.primaryNurse?.code,
      activeShift?.primaryNurse?.staffCode,
    ]
      .map(normalizeCode)
      .filter(Boolean);

    const matched =
      cards.find((card) => {
        const cardId = normalizeId(card?.nurseId);
        const cardCode = normalizeCode(card?.nurse?.code || card?.code);
        if (cardId && assignedIdCandidates.includes(cardId)) return true;
        if (cardCode && assignedCodeCandidates.includes(cardCode)) return true;
        return false;
      }) || null;

    return matched || cards[0];
  }, [activeShift, nurseCards]);

  const splitScheduleNurseNotes = useMemo(() => {
    if (!isSplitScheduleShift) return [];
    const clockByNurse = mergedClockByNurse;

    const shiftDateFallback =
      activeShift?.scheduledDate ||
      activeShift?.date ||
      activeShift?.shiftDate ||
      activeShift?.startDate ||
      activeShift?.serviceDate ||
      activeShift?.requestedDate ||
      activeShift?.recurringStartDate ||
      activeShift?.recurringPeriodStart ||
      null;

    const getClockEntryForNurseCard = (card) => {
      if (!clockByNurse) return null;

      const idKey = normalizeId(card?.nurseId);
      const codeKey = normalizeCode(card?.nurse?.code || card?.code);
      const candidates = [idKey, codeKey]
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean);

      for (const rawKey of candidates) {
        const key = rawKey;
        if (clockByNurse[key]) return clockByNurse[key];
        const upper = key.toUpperCase();
        if (clockByNurse[upper]) return clockByNurse[upper];
        const lower = key.toLowerCase();
        if (clockByNurse[lower]) return clockByNurse[lower];
      }

      for (const entry of Object.values(clockByNurse)) {
        if (!entry || typeof entry !== 'object') continue;
        const entryId = normalizeId(entry?.nurseId || entry?.id || entry?._id || entry?.uid);
        const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);
        if (idKey && entryId && entryId === idKey) return entry;
        if (codeKey && entryCode && entryCode === codeKey) return entry;
      }

      return null;
    };

    const cards = Array.isArray(nurseCards) ? nurseCards : [];
    return cards
      .map((card) => {
        const entry = getClockEntryForNurseCard(card);
        const note = resolveString(entry?.nurseNotes) || resolveString(entry?.lastCompletionNotes) || null;

        const noteDateRaw =
          entry?.nurseNotesUpdatedAt ||
          entry?.nurseNotesDate ||
          entry?.notesUpdatedAt ||
          entry?.updatedAt ||
          entry?.lastClockOutTime ||
          entry?.actualEndTime ||
          null;

        const nurseName = resolveString(card?.nurse?.name) || resolveString(card?.nurseName) || 'Assigned Nurse';

        const nurseCode = resolveString(card?.nurse?.code) || resolveString(card?.code) || null;

        const key = normalizeId(card?.nurseId) || normalizeCode(nurseCode) || null;

        return {
          key,
          nurseId: normalizeId(card?.nurseId) || null,
          nurseCode,
          nurseName,
          note,
          noteDate: noteDateRaw || shiftDateFallback || null,
        };
      })
      .filter((item) => Boolean(item?.key));
  }, [activeShift, isSplitScheduleShift, mergedClockByNurse, nurseCards]);

  useEffect(() => {
    if (!__DEV__) return;
    if (!visible) return;
    if (!isSplitScheduleShift) return;

    const shiftId = activeShift?.id || activeShift?._id || activeShift?.requestId || null;
    const mergedCount = mergedClockByNurse ? Object.keys(mergedClockByNurse).length : 0;
    const notesCount = Array.isArray(splitScheduleNurseNotes) ? splitScheduleNurseNotes.length : 0;
    const cardsCount = Array.isArray(nurseCards) ? nurseCards.length : 0;
    const signature = `${String(shiftId)}|${mergedCount}|${notesCount}|${cardsCount}`;
    if (lastSplitNotesDebugSigRef.current === signature) return;
    lastSplitNotesDebugSigRef.current = signature;

    const bucketKeys = (map) => {
      if (!map || typeof map !== 'object') return [];
      return Object.keys(map);
    };

    const rootMap = activeShift?.clockByNurse;
    const clockDetailsMap = activeShift?.clockDetails?.clockByNurse;
    const activeShiftMap = activeShift?.activeShift?.clockByNurse;
    const shiftDetailsMap = activeShift?.shiftDetails?.clockByNurse;
    const shiftMap = activeShift?.shift?.clockByNurse;

    const safeNurseCards = (Array.isArray(nurseCards) ? nurseCards : []).map((c) => ({
      nurseId: normalizeId(c?.nurseId) || null,
      nurseCode: normalizeCode(c?.nurse?.code || c?.code) || null,
      nurseName: c?.nurse?.name || c?.nurseName || 'Assigned Nurse',
    }));

    const safeResolvedNotes = (Array.isArray(splitScheduleNurseNotes) ? splitScheduleNurseNotes : []).map((n) => ({
      key: n?.key || null,
      nurseId: n?.nurseId || null,
      nurseCode: n?.nurseCode || null,
      nurseName: n?.nurseName || null,
      hasNote: Boolean(n?.note),
      noteLength: typeof n?.note === 'string' ? n.note.length : 0,
    }));

    // Debug logging for split-notes removed per request; keeping computation in case it's reused later
  }, [
    activeShift,
    currentNurseCode,
    currentNurseId,
    isSplitScheduleShift,
    mergedClockByNurse,
    nurseCards,
    nurseNotesText,
    splitScheduleNurseNotes,
    visible,
  ]);

  const splitScheduleClockOutState = useMemo(() => {
    if (!isSplitScheduleShift) return { allClockedOut: false, byNurseId: {} };

    const clockMap = clockRoot?.clockByNurse && typeof clockRoot.clockByNurse === 'object' ? clockRoot.clockByNurse : null;
    if (!clockMap) return { allClockedOut: false, byNurseId: {} };

    const responses = activeShift?.nurseResponses && typeof activeShift.nurseResponses === 'object' ? activeShift.nurseResponses : null;

    const isClockedOutEntry = (entry) => {
      if (!entry || typeof entry !== 'object') return false;

      const inTime = entry.lastClockInTime || entry.actualStartTime || entry.clockInTime || entry.startedAt;
      const outTime = entry.lastClockOutTime || entry.actualEndTime || entry.clockOutTime || entry.completedAt;
      if (!outTime) return false;
      if (!inTime) return true;

      const inMs = Date.parse(inTime);
      const outMs = Date.parse(outTime);
      if (!Number.isFinite(inMs) || !Number.isFinite(outMs)) return true;
      return outMs > inMs;
    };

    const findResponseEntry = (nurseId, nurseCode) => {
      if (!responses) return null;

      if (nurseId && responses[nurseId] && typeof responses[nurseId] === 'object') return responses[nurseId];
      if (nurseCode && responses[nurseCode] && typeof responses[nurseCode] === 'object') return responses[nurseCode];

      const upperCode = nurseCode ? String(nurseCode).toUpperCase() : null;
      const upperId = nurseId ? String(nurseId).toUpperCase() : null;
      return (
        Object.values(responses).find((entry) => {
          if (!entry || typeof entry !== 'object') return false;
          const entryId = normalizeId(entry?.nurseId || entry?.uid);
          if (entryId && upperId && String(entryId).toUpperCase() === upperId) return true;
          const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode);
          if (entryCode && upperCode && String(entryCode).toUpperCase() === upperCode) return true;
          return false;
        }) || null
      );
    };

    const findClockEntry = (candidateKeys) => {
      if (!Array.isArray(candidateKeys) || candidateKeys.length === 0) return null;

      for (const rawKey of candidateKeys) {
        if (!rawKey) continue;
        const key = String(rawKey).trim();
        if (!key) continue;
        if (clockMap[key]) return clockMap[key];
        const upper = key.toUpperCase();
        if (clockMap[upper]) return clockMap[upper];
        const lower = key.toLowerCase();
        if (clockMap[lower]) return clockMap[lower];
      }
      return null;
    };

    const byNurseId = {};

    (Array.isArray(nurseCards) ? nurseCards : []).forEach((card) => {
      const nurseId = normalizeId(card?.nurseId);
      if (!nurseId) return;
      const nurseCode = normalizeCode(card?.nurse?.code);

      const responseEntry = findResponseEntry(nurseId, nurseCode);
      const responseNurseId = normalizeId(responseEntry?.nurseId || responseEntry?.uid);

      const candidates = [
        responseNurseId,
        nurseId,
        nurseCode,
        normalizeId(card?.nurse?.id),
        normalizeId(card?.nurse?._id),
        normalizeCode(card?.nurse?.code),
      ].filter(Boolean);

      const entry = findClockEntry(candidates);
      byNurseId[nurseId] = {
        clockedOut: isClockedOutEntry(entry),
      };
    });

    const allClockedOut = Object.keys(byNurseId).length > 0 && Object.values(byNurseId).every((v) => v?.clockedOut);
    return { allClockedOut, byNurseId };
  }, [activeShift?.nurseResponses, clockRoot?.clockByNurse, clockRoot, isSplitScheduleShift, nurseCards]);

  const backupNurses = useMemo(() => {
    const list = Array.isArray(activeShift?.backupNurses) ? activeShift.backupNurses : [];
    const seen = new Set();
    const result = [];
    list.forEach((entry) => {
      const id = normalizeId(entry?.nurseId || entry?.uid || entry?.id || entry?._id || entry);
      const code = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);
      const key = id ? `id:${id}` : code ? `code:${code}` : null;
      if (!key) {
        result.push(entry);
        return;
      }
      if (seen.has(key)) return;
      seen.add(key);
      result.push(entry);
    });
    return result;
  }, [activeShift?.backupNurses]);

  const coverageRequests = useMemo(() => {
    const coverageBuckets = [
      activeShift?.coverageRequests,
      activeShift?.schedule?.coverageRequests,
      activeShift?.recurringSchedule?.coverageRequests,
      activeShift?.recurrence?.coverageRequests,
    ].filter(Boolean);

    return coverageBuckets.flatMap((bucket) => (Array.isArray(bucket) ? bucket : []));
  }, [activeShift]);

  const pendingCoverageForCurrentNurse = useMemo(() => {
    const currentId = normalizeId(currentNurseId);
    const currentCode = normalizeCode(currentNurseCode);

    const matchesCurrent = (value) => {
      if (!value) return false;
      if (Array.isArray(value)) return value.some(matchesCurrent);
      if (typeof value === 'object') {
        const id = normalizeId(value.id || value._id || value.uid || value.nurseId);
        const code = normalizeCode(value.staffCode || value.nurseCode || value.code || value.username);
        if (currentId && id && id === currentId) return true;
        if (currentCode && code && code === currentCode) return true;
        return false;
      }
      const id = normalizeId(value);
      const code = normalizeCode(value);
      if (currentId && id && id === currentId) return true;
      if (currentCode && code && code === currentCode) return true;
      return false;
    };

    if (!coverageRequests || coverageRequests.length === 0) return null;

    return (
      coverageRequests.find((entry) => {
        const status = normalizeStatus(entry?.status);
        if (status !== 'pending') return false;
        const targets = [
          entry?.targetBackupNurseId,
          entry?.targetBackupNurseStaffCode,
          entry?.targetBackupNurse,
          ...(Array.isArray(entry?.backupNursesNotified) ? entry.backupNursesNotified : []),
        ].filter(Boolean);
        return targets.some((t) => matchesCurrent(t));
      }) || null
    );
  }, [coverageRequests, currentNurseCode, currentNurseId]);

  const isAssignedToCurrentNurse = useMemo(() => {
    const currentId = normalizeId(currentNurseId);
    const currentCode = normalizeCode(currentNurseCode);
    if (!currentId && !currentCode) return true;

    const matchesCurrent = (value) => {
      if (!value) return false;
      if (Array.isArray(value)) return value.some(matchesCurrent);
      if (typeof value === 'object') {
        const id = normalizeId(value.id || value._id || value.uid || value.nurseId);
        const code = normalizeCode(value.staffCode || value.nurseCode || value.code || value.username);
        if (currentId && id && id === currentId) return true;
        if (currentCode && code && code === currentCode) return true;
        return false;
      }
      const id = normalizeId(value);
      const code = normalizeCode(value);
      if (currentId && id && id === currentId) return true;
      if (currentCode && code && code === currentCode) return true;
      return false;
    };

    const assignedCandidates = [
      activeShift?.assignedNurseId,
      activeShift?.nurseId,
      activeShift?.nurseCode,
      activeShift?.assignedNurse,
      activeShift?.nurse,
      activeShift?.primaryNurseId,
      activeShift?.primaryNurse,
      activeShift?.assignedNurseCode,
      activeShift?.primaryNurseCode,
    ].filter(Boolean);

    if (assignedCandidates.some((c) => matchesCurrent(c))) return true;

    const assignedList = Array.isArray(activeShift?.assignedNurses) ? activeShift.assignedNurses : [];
    if (assignedList.length > 0) {
      return assignedList.some((entry) => matchesCurrent(entry));
    }

    return assignedCandidates.length === 0;
  }, [activeShift, currentNurseCode, currentNurseId]);

  const acceptedCoverageForOtherNurse = useMemo(() => {
    if (!coverageRequests || coverageRequests.length === 0) return false;
    const currentId = normalizeId(currentNurseId);
    const currentCode = normalizeCode(currentNurseCode);

    const matchesCurrent = (value) => {
      if (!value) return false;
      if (Array.isArray(value)) return value.some(matchesCurrent);
      if (typeof value === 'object') {
        const id = normalizeId(value.id || value._id || value.uid || value.nurseId);
        const code = normalizeCode(value.staffCode || value.nurseCode || value.code || value.username);
        if (currentId && id && id === currentId) return true;
        if (currentCode && code && code === currentCode) return true;
        return false;
      }
      const id = normalizeId(value);
      const code = normalizeCode(value);
      if (currentId && id && id === currentId) return true;
      if (currentCode && code && code === currentCode) return true;
      return false;
    };

    return coverageRequests.some((entry) => {
      const status = normalizeStatus(entry?.status);
      if (status !== 'accepted') return false;
      const acceptedTargets = [
        entry?.acceptedBy,
        entry?.acceptedById,
        entry?.acceptedByStaffCode,
        entry?.acceptedByCode,
        entry?.backupNurseId,
        entry?.backupNurseCode,
        entry?.targetBackupNurseId,
        entry?.targetBackupNurseStaffCode,
      ].filter(Boolean);

      if (acceptedTargets.length === 0) return false;
      return !acceptedTargets.some((t) => matchesCurrent(t));
    });
  }, [coverageRequests, currentNurseCode, currentNurseId]);

  const hasActiveBackupCoverageForOtherNurse = useMemo(() => {
    if (!coverageRequests || coverageRequests.length === 0) return false;
    if (!mergedClockByNurse || typeof mergedClockByNurse !== 'object') return false;

    const currentId = normalizeId(currentNurseId);
    const currentCode = normalizeCode(currentNurseCode);

    const findClockEntryFor = (idValue, codeValue) => {
      const candidates = [normalizeId(idValue), normalizeCode(codeValue)]
        .filter(Boolean)
        .map((v) => String(v));

      for (const rawKey of candidates) {
        const key = rawKey.trim();
        if (!key) continue;
        if (mergedClockByNurse[key]) return mergedClockByNurse[key];
        const upper = key.toUpperCase();
        if (mergedClockByNurse[upper]) return mergedClockByNurse[upper];
        const lower = key.toLowerCase();
        if (mergedClockByNurse[lower]) return mergedClockByNurse[lower];
      }

      for (const entry of Object.values(mergedClockByNurse)) {
        if (!entry || typeof entry !== 'object') continue;
        const entryId = normalizeId(entry?.nurseId || entry?.id || entry?._id || entry?.uid);
        const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);
        if (currentId && entryId && entryId === currentId) continue;
        if (currentCode && entryCode && entryCode === currentCode) continue;
        if (idValue && entryId && normalizeId(idValue) === entryId) return entry;
        if (codeValue && entryCode && normalizeCode(codeValue) === entryCode) return entry;
      }

      return null;
    };

    const isClockedOut = (entry) => {
      if (!entry || typeof entry !== 'object') return false;
      return Boolean(entry.lastClockOutTime || entry.actualEndTime || entry.clockOutTime || entry.completedAt);
    };

    return coverageRequests.some((entry) => {
      const status = normalizeStatus(entry?.status);
      if (status !== 'accepted') return false;

      const backupId = normalizeId(
        entry?.acceptedBy || entry?.acceptedById || entry?.backupNurseId || entry?.targetBackupNurseId || entry?.responseById
      );
      const backupCode = normalizeCode(
        entry?.acceptedByStaffCode || entry?.acceptedByCode || entry?.backupNurseCode || entry?.targetBackupNurseStaffCode
      );

      if (currentId && backupId && backupId === currentId) return false;
      if (currentCode && backupCode && backupCode === currentCode) return false;

      const backupClockEntry = findClockEntryFor(backupId, backupCode);
      if (!backupClockEntry) return true;
      return !isClockedOut(backupClockEntry);
    });
  }, [coverageRequests, mergedClockByNurse, currentNurseCode, currentNurseId]);

  const isAcceptedCoverageForNurse = (nurseId, nurseCode) => {
    if (!coverageRequests || coverageRequests.length === 0) return false;
    
    const checkNurseId = normalizeId(nurseId);
    const checkNurseCode = normalizeCode(nurseCode);
    
    if (!checkNurseId && !checkNurseCode) return false;
    
    return coverageRequests.some((entry) => {
      const status = normalizeStatus(entry?.status);
      if (status !== 'accepted') return false;
      
      const acceptedId = normalizeId(entry?.acceptedBy || entry?.acceptedById || entry?.targetBackupNurseId || entry?.backupNurseId || entry?.responseById);
      const acceptedCode = normalizeCode(entry?.acceptedByStaffCode || entry?.acceptedByCode || entry?.targetBackupNurseStaffCode || entry?.backupNurseCode);
      
      if (checkNurseId && acceptedId && checkNurseId === acceptedId) return true;
      if (checkNurseCode && acceptedCode && checkNurseCode === acceptedCode) return true;
      
      return false;
    });
  };

  const hasNurseDecisionActions = contextType === 'nurse' && (typeof onAccept === 'function' || typeof onDecline === 'function');
  const hasCoverageDecisionActions =
    contextType === 'nurse' && (typeof onCoverageAccept === 'function' || typeof onCoverageDecline === 'function');

  const shouldShowNurseDecisionButtons = useMemo(() => {
    if (contextType !== 'nurse') return false;
    if (!hasNurseDecisionActions) return false;
    const raw = String(activeShift?.status || '').toLowerCase();
    if (raw.includes('book') || raw.includes('accept') || raw.includes('approved') || raw.includes('completed')) return false;
    if (raw.includes('pending') || raw.includes('assign') || raw.includes('request')) return true;
    return false;
  }, [activeShift?.status, contextType, hasNurseDecisionActions]);

  const shouldShowNurseClockOutButtons = useMemo(() => {
    if (contextType !== 'nurse') return false;

    const statusRaw = String(activeShift?.status || '').toLowerCase();
    const statusSuggestsActive = statusRaw.includes('active') || statusRaw.includes('clock');

    if (isSplitScheduleShift) {
      return currentNurseHasActiveClockIn;
    }

    const startedByRaw = clockRoot?.startedBy;
    const startedById = normalizeId(
      typeof startedByRaw === 'object' && startedByRaw !== null
        ? startedByRaw.id || startedByRaw._id || startedByRaw.uid || startedByRaw.nurseId
        : startedByRaw
    );
    const startedByCode = normalizeCode(
      typeof startedByRaw === 'object' && startedByRaw !== null
        ? startedByRaw.nurseCode || startedByRaw.staffCode || startedByRaw.code
        : startedByRaw
    );
    const currentId = normalizeId(currentNurseId);
    const currentCode = normalizeCode(currentNurseCode);
    const startedByMe =
      Boolean(currentId && startedById && startedById === currentId) ||
      Boolean(currentCode && startedByCode && startedByCode === currentCode);

    const rootHasClockIn = Boolean(
      clockRoot?.actualStartTime ||
        clockRoot?.startedAt ||
        clockRoot?.clockInTime ||
        clockRoot?.clockInLocation
    );
    const rootHasClockOut = Boolean(
      clockRoot?.actualEndTime ||
        clockRoot?.completedAt ||
        clockRoot?.clockOutTime ||
        clockRoot?.clockOutLocation
    );

    // Only show Clock Out when there's an ACTIVE clock-in session.
    // NOTE: lastClockInTime/lastClockOutTime represent history for prior occurrences.
    if (currentNurseHasActiveClockIn) return true;
    if (startedByMe && rootHasClockIn && !rootHasClockOut) return true;
    return false;
  }, [clockRoot, contextType, currentNurseCode, currentNurseHasActiveClockIn, currentNurseId, isSplitScheduleShift]);

  const getNurseClockStatus = (nurseId, nurseCode) => {
    const nId = normalizeId(nurseId);
    const nCode = normalizeCode(nurseCode);

    const hasAnyClockActivity = (entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const hasIn = entry.lastClockInTime || entry.actualStartTime || entry.clockInTime || entry.startedAt;
      return Boolean(hasIn);
    };

    // 1. Check strictly mergedClockByNurse entries
    if (mergedClockByNurse) {
      const candidates = [nId, nCode].filter(Boolean).map((v) => String(v).trim());
      for (const key of candidates) {
        if (mergedClockByNurse[key]) return hasAnyClockActivity(mergedClockByNurse[key]);
        if (mergedClockByNurse[key.toUpperCase()]) return hasAnyClockActivity(mergedClockByNurse[key.toUpperCase()]);
        if (mergedClockByNurse[key.toLowerCase()]) return hasAnyClockActivity(mergedClockByNurse[key.toLowerCase()]);
      }
      const values = Object.values(mergedClockByNurse);
      const found = values.find((v) => {
        if (!v || typeof v !== 'object') return false;
        const vId = normalizeId(v.nurseId || v.id || v._id || v.uid);
        const vCode = normalizeCode(v.nurseCode || v.staffCode || v.code);
        return (nId && vId && nId === vId) || (nCode && vCode && nCode === vCode);
      });
      if (found) return hasAnyClockActivity(found);
    }

    // 2. Check root shift properties + startedBy
    const startedByRaw = clockRoot?.startedBy;
    const startedById = normalizeId(
      typeof startedByRaw === 'object' && startedByRaw !== null
        ? startedByRaw.id || startedByRaw._id || startedByRaw.uid || startedByRaw.nurseId
        : startedByRaw
    );
    const startedByCode = normalizeCode(
      typeof startedByRaw === 'object' && startedByRaw !== null
        ? startedByRaw.nurseCode || startedByRaw.staffCode || startedByRaw.code
        : startedByRaw
    );

    const matchesStartedBy =
      (nId && startedById && nId === startedById) || (nCode && startedByCode && nCode === startedByCode);

    if (matchesStartedBy) {
      const hasIn = clockRoot?.actualStartTime || clockRoot?.startedAt || clockRoot?.clockInTime;
      // We return true if there's any start time, regardless of whether they have clocked out
      if (hasIn) return true;
    }

    return false;
  };

  const shouldHideNonNurseFooter = useMemo(() => {
    if (contextType === 'nurse') return false;
    const statusRaw = String(activeShift?.status || '').toLowerCase();
    const hasClockInData = Boolean(
      activeShift?.actualStartTime ||
        activeShift?.startedAt ||
        activeShift?.clockInLocation ||
        (activeShift?.clockByNurse && typeof activeShift.clockByNurse === 'object' && Object.keys(activeShift.clockByNurse).length > 0)
    );
    const statusSuggestsActive = statusRaw.includes('active') || statusRaw.includes('clock');
    return hasClockInData || statusSuggestsActive;
  }, [activeShift, contextType]);

  const shouldHideFooter =
    contextType === 'patient' || shouldHideNonNurseFooter || (contextType === 'nurse' && hideFooter);

  const isPatientContext =
    String(contextType || '').trim().toLowerCase() === 'patient' ||
    (contextType == null && typeof onOpenPatientInvoice === 'function');

  const isPatientPending =
    isPatientContext && String(activeShift?.status || '').toLowerCase() === 'pending';

  const patientAlertsBanner = useMemo(() => {
    const status = String(activeShift?.status || '').toLowerCase();
    
    // For patients: show only for pending appointments
    // For nurses/admins: show for all active appointments (not completed/cancelled)
    const shouldShow = isPatientContext 
      ? status === 'pending'
      : !['completed', 'cancelled', 'canceled', 'declined', 'rejected'].includes(status);
    
    if (!shouldShow) return null;

    const patientAlerts =
      activeShift?.patientAlerts ||
      activeShift?.shiftDetails?.patientAlerts ||
      activeShift?.clockDetails?.patientAlerts ||
      activeShift?.clinicalInfo ||
      null;

    const allergiesRaw = patientAlerts?.allergies || activeShift?.allergies || null;
    const allergies = Array.isArray(allergiesRaw)
      ? allergiesRaw.map((a) => String(a).trim()).filter(Boolean)
      : [];
    const allergyOther = String(patientAlerts?.allergyOther || '').trim();

    const vitals = patientAlerts?.vitals || activeShift?.vitals || null;
    const bpSys = String(vitals?.bpSystolic || '').trim();
    const bpDia = String(vitals?.bpDiastolic || '').trim();
    const hr = String(vitals?.heartRate || '').trim();
    const temp = String(vitals?.temperature || '').trim();
    const spo2 = String(vitals?.oxygenSaturation || '').trim();

    const allergiesFiltered = allergies
      .map((a) => String(a).trim())
      .filter((a) => a && a.toLowerCase() !== 'none')
      .filter((a) => !(a === 'Other' && allergyOther));

    const hasAllergies = allergiesFiltered.length > 0 || Boolean(allergyOther);
    const hasVitals = Boolean(bpSys || bpDia || hr || temp || spo2);
    if (!hasAllergies && !hasVitals) return null;

    const allergyParts = [...allergiesFiltered];
    if (allergyOther && !allergyParts.includes(allergyOther)) allergyParts.push(allergyOther);
    const allergyText = allergyParts.join(', ');

    const vitalsParts = [];
    if (bpSys || bpDia) vitalsParts.push(`BP ${bpSys || '?'} / ${bpDia || '?'}`);
    if (hr) vitalsParts.push(`HR ${hr}`);
    if (temp) vitalsParts.push(`Temp ${temp}`);
    if (spo2) vitalsParts.push(`SpO₂ ${spo2}%`);
    const vitalsText = vitalsParts.join(' • ');

    return (
      <View style={styles.patientAlertsBanner}>
        <MaterialCommunityIcons name="alert-circle" size={18} color={COLORS.error} />
        <View style={{ flex: 1 }}>
          <Text style={styles.patientAlertsTitle}>Patient Alerts</Text>
          {hasAllergies ? (
            <Text style={styles.patientAlertsText} numberOfLines={3}>
              Patient is allergic to: {allergyText || '—'}
            </Text>
          ) : null}
          {hasVitals ? (
            <Text style={styles.patientAlertsText} numberOfLines={3}>
              Vitals are: {vitalsText}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }, [activeShift, isPatientContext]);

  return (
    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{modalTitle}</Text>
            <TouchableWeb onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
            </TouchableWeb>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 80 }}>
            {pendingCoverageForCurrentNurse ? (
              <Text style={styles.emergencyTextOnly}>Emergency backup request for this shift</Text>
            ) : null}

            {patientAlertsBanner}

            {!isPatientContext && !isPatientPending ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account" size={16} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{shiftClientName}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="email" size={16} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{clientEmail || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="phone" size={16} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{clientPhone || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{clientAddress || 'N/A'}</Text>
                </View>
              </View>
            </View>
            ) : null}

            {isSplitScheduleShift ? (
              nurseCards.map((card) => {
                const responses = activeShift?.nurseResponses;
                const nurseId = normalizeId(card?.nurseId);
                const nurseCode = normalizeCode(card?.nurse?.code);

                let responseEntry = null;
                if (responses && typeof responses === 'object') {
                  if (responses[nurseId] && typeof responses[nurseId] === 'object') {
                    responseEntry = responses[nurseId];
                  } else if (responses[nurseCode] && typeof responses[nurseCode] === 'object') {
                    responseEntry = responses[nurseCode];
                  } else {
                    responseEntry =
                      Object.values(responses).find((entry) => {
                        if (!entry || typeof entry !== 'object') return false;
                        const entryId = normalizeId(entry?.nurseId || entry?.uid);
                        if (entryId && nurseId && entryId === nurseId) return true;
                        const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode);
                        if (entryCode && nurseCode && entryCode === nurseCode) return true;
                        return false;
                      }) || null;
                  }
                }

                const responseNurseId = normalizeId(responseEntry?.nurseId || responseEntry?.uid);

                const useClockDetailsView = contextType !== 'nurse' && typeof onOpenClockDetails === 'function';

                const clockMap = clockRoot?.clockByNurse && typeof clockRoot.clockByNurse === 'object' ? clockRoot.clockByNurse : null;

                const getClockEntryForNurse = () => {
                  if (!clockMap) return null;
                  const candidates = [
                    responseNurseId,
                    nurseId,
                    nurseCode,
                    normalizeId(card?.nurse?.id),
                    normalizeId(card?.nurse?._id),
                    normalizeCode(card?.nurse?.code),
                  ]
                    .filter((v) => typeof v === 'string' || typeof v === 'number')
                    .map((v) => String(v).trim())
                    .filter(Boolean);

                  for (const key of candidates) {
                    if (clockMap[key]) return clockMap[key];
                    const upper = key.toUpperCase();
                    if (clockMap[upper]) return clockMap[upper];
                    const lower = key.toLowerCase();
                    if (clockMap[lower]) return clockMap[lower];
                  }
                  return null;
                };

                const clockEntry = getClockEntryForNurse();

                const clockInTime = clockEntry?.lastClockInTime || clockEntry?.actualStartTime || clockEntry?.clockInTime || clockEntry?.startedAt || null;
                const clockOutTime = clockEntry?.lastClockOutTime || clockEntry?.actualEndTime || clockEntry?.clockOutTime || clockEntry?.completedAt || null;

                const startedByRaw = clockRoot?.startedBy;
                const startedById = normalizeId(
                  typeof startedByRaw === 'object' && startedByRaw !== null
                    ? startedByRaw.id || startedByRaw._id || startedByRaw.uid || startedByRaw.nurseId
                    : startedByRaw
                );
                const startedByCode = normalizeCode(
                  typeof startedByRaw === 'object' && startedByRaw !== null
                    ? startedByRaw.nurseCode || startedByRaw.staffCode || startedByRaw.code
                    : startedByRaw
                );
                const startedByMatchesThisNurse =
                  Boolean(startedById && (startedById === nurseId || startedById === responseNurseId)) ||
                  Boolean(startedByCode && startedByCode === nurseCode);

                const shiftHasClockIn = Boolean(clockRoot?.actualStartTime || clockRoot?.startedAt || clockRoot?.clockInTime || clockRoot?.clockInLocation);
                const shiftHasClockOut = Boolean(clockRoot?.actualEndTime || clockRoot?.completedAt || clockRoot?.clockOutTime || clockRoot?.clockOutLocation);

                // Modified logic: Show clock details if they have EVER clocked in (even if they clocked out)
                const isClockedInForThisNurse = clockEntry ? Boolean(clockInTime) : startedByMatchesThisNurse && shiftHasClockIn;
                
                // New logic: Only show GREEN card if they are CURRENTLY clocked in (Active)
                const isCurrentlyClockedIn = clockEntry 
                  ? Boolean(clockInTime) && !Boolean(clockOutTime) 
                  : startedByMatchesThisNurse && shiftHasClockIn && !shiftHasClockOut;

                const isClockedOutForThisNurse = Boolean(clockOutTime);
                const shouldFadeServiceCard =
                  isClockedOutForThisNurse &&
                  !splitScheduleClockOutState?.allClockedOut &&
                  Boolean(splitScheduleClockOutState?.byNurseId?.[nurseId]?.clockedOut);

                const nurseServicesMap =
                  activeShift?.nurseServices && typeof activeShift.nurseServices === 'object'
                    ? activeShift.nurseServices
                    : activeShift?.splitNurseServices && typeof activeShift.splitNurseServices === 'object'
                      ? activeShift.splitNurseServices
                      : null;

                const resolveService = (key) => {
                  if (!nurseServicesMap || !key) return null;
                  const raw = nurseServicesMap[String(key)];
                  return typeof raw === 'string' && raw.trim().length ? raw.trim() : null;
                };

                const perNurseService =
                  resolveService(nurseId) ||
                  resolveService(nurseCode) ||
                  resolveService(card?.nurseId) ||
                  resolveService(card?.nurse?.code) ||
                  null;

                const shiftService = typeof activeShift?.service === 'string' && activeShift.service.trim().length ? activeShift.service.trim() : null;

                const displayService =
                  perNurseService ||
                  (shiftService && shiftService !== 'Split Schedule Services' ? shiftService : null) ||
                  'N/A';

                const status = normalizeStatus(responseEntry?.status || activeShift?.status);
                const statusLabel = status === 'accepted' ? 'Accepted' : status === 'declined' ? 'Declined' : 'Pending';

                return (
                  <React.Fragment key={card.nurseId}>
                    {isPatientPending ? (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Requested Nurse</Text>
                        <View style={styles.card}>
                          <View style={styles.cardHeader}>
                            {card.nurse.photo ? (
                              <Image source={{ uri: card.nurse.photo }} style={styles.avatar} resizeMode="cover" />
                            ) : (
                              <View style={styles.avatarFallback}>
                                <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.nurseName}>{card.nurse.name}</Text>
                              <Text style={styles.nurseMeta}>{card.nurse.specialty}</Text>
                              {card.nurse.code ? <Text style={styles.nurseCode}>{card.nurse.code}</Text> : null}
                            </View>
                            <TouchableWeb
                              style={styles.statusChip}
                              onPress={() => setSelectedNurseForDetails(card.nurse)}
                            >
                              <LinearGradient
                                colors={SAFE_GRADIENTS.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.statusChipGradient}
                              >
                                <MaterialCommunityIcons name="eye" size={14} color={COLORS.white} />
                                <Text style={styles.statusChipText}>View</Text>
                              </LinearGradient>
                            </TouchableWeb>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Service Information</Text>

                      <View
                        style={[
                          styles.card,
                          isSplitScheduleShift && isCurrentlyClockedIn ? styles.cardClockedIn : null,
                          status === 'pending' && contextType !== 'nurse' ? { borderColor: COLORS.primary, backgroundColor: COLORS.white } : null,
                          shouldFadeServiceCard ? styles.cardFaded : null,
                        ]}
                      >
                        {!isPatientPending ? (
                        <View style={styles.cardHeader}>
                        {card.nurse.photo ? (
                          <Image source={{ uri: card.nurse.photo }} style={styles.avatar} resizeMode="cover" />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nurseName}>{card.nurse.name}</Text>
                          <Text style={styles.nurseMeta}>{card.nurse.specialty}</Text>
                          {card.nurse.code ? <Text style={styles.nurseCode}>{card.nurse.code}</Text> : null}
                        </View>
                        <TouchableWeb
                          style={styles.statusChip}
                          onPress={() => {
                            if (useClockDetailsView && isClockedInForThisNurse) {
                              onOpenClockDetails?.({
                                shift: activeShift,
                                nurse: card.nurse,
                                nurseId,
                                nurseCode,
                              });
                            } else {
                              setSelectedNurseForDetails(card.nurse);
                            }
                          }}
                        >
                          <LinearGradient
                            colors={useClockDetailsView && isClockedInForThisNurse ? SAFE_GRADIENTS.warning : SAFE_GRADIENTS.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.statusChipGradient}
                          >
                            <MaterialCommunityIcons name="eye" size={14} color={COLORS.white} />
                            <Text style={styles.statusChipText}>View</Text>
                          </LinearGradient>
                        </TouchableWeb>
                      </View>
                        ) : null}

                      <View style={styles.row}>
                        <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
                        <Text style={styles.rowText}>{displayService}</Text>
                      </View>

                      <View style={styles.daysContainer}>
                        <Text style={styles.daysLabel}>Assigned Days</Text>
                        {(() => {
                          const daysToShow = (card.days && card.days.length ? card.days : recurringDaysForDisplay) || [];

                          if (!daysToShow.length) {
                            return <Text style={styles.helperText}>No specific days assigned</Text>;
                          }

                          return (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              {daysToShow.map((d) => (
                                <View key={d} style={styles.dayPill}>
                                  <LinearGradient
                                    colors={SAFE_GRADIENTS.header}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={styles.dayPillGradient}
                                  >
                                    <Text style={styles.dayPillText}>{DAY_LABELS[d]}</Text>
                                  </LinearGradient>
                                </View>
                              ))}
                            </ScrollView>
                          );
                        })()}
                      </View>

                      <View style={styles.timeGrid}>
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="clock-start" size={16} color={COLORS.success} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Start</Text>
                            <Text style={styles.timeValue}>{formatTimeTo12Hour(startTime) || 'N/A'}</Text>
                          </View>
                        </View>
                        <View style={styles.timeDivider} />
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="clock-end" size={16} color={COLORS.error} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>End</Text>
                            <Text style={styles.timeValue}>{formatTimeTo12Hour(endTime) || 'N/A'}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.timeGrid}>
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="calendar-start" size={16} color={COLORS.success} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Start Date</Text>
                            <Text style={styles.timeValue}>{formatDate(startDate || endDate)}</Text>
                          </View>
                        </View>
                        <View style={styles.timeDivider} />
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="calendar-end" size={16} color={COLORS.error} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>End Date</Text>
                            <Text style={styles.timeValue}>{formatDate(endDate || startDate)}</Text>
                          </View>
                        </View>
                      </View>

                      {!isPatientPending ? (
                        <Text style={styles.helperText}>Status: {statusLabel}</Text>
                      ) : null}
                    </View>
                  </View>

                  {isPatientPending && card.nurse ? (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Requested Nurse</Text>
                      <View style={styles.card}>
                        <View style={[styles.cardHeader, styles.cardHeaderNoDivider]}>
                          {card.nurse.photo ? (
                            <Image source={{ uri: card.nurse.photo }} style={styles.avatar} resizeMode="cover" />
                          ) : (
                            <View style={styles.avatarFallback}>
                              <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.nurseName}>{card.nurse.name}</Text>
                          </View>
                          <TouchableWeb
                            style={styles.statusChip}
                            onPress={() => setSelectedNurseForDetails(card.nurse)}
                          >
                            <LinearGradient
                              colors={SAFE_GRADIENTS.primary}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={styles.statusChipGradient}
                            >
                              <MaterialCommunityIcons name="eye" size={14} color={COLORS.white} />
                              <Text style={styles.statusChipText}>View</Text>
                            </LinearGradient>
                          </TouchableWeb>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  </React.Fragment>
                );
              })
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Service Information</Text>
                  <View style={styles.card}>
                    {!isPatientPending && primaryServiceNurseCard && primaryServiceNurseCard.nurse && (
                      <View style={styles.cardHeader}>
                      {primaryServiceNurseCard.nurse.photo ? (
                        <Image source={{ uri: primaryServiceNurseCard.nurse.photo }} style={styles.avatar} resizeMode="cover" />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.nurseName}>{primaryServiceNurseCard.nurse.name}</Text>
                        <Text style={styles.nurseMeta}>{primaryServiceNurseCard.nurse.specialty}</Text>
                        {primaryServiceNurseCard.nurse.code ? <Text style={styles.nurseCode}>{primaryServiceNurseCard.nurse.code}</Text> : null}
                      </View>
                      <TouchableWeb
                        style={styles.statusChip}
                        onPress={() => {
                          const useClockDetailsView = contextType !== 'nurse' && typeof onOpenClockDetails === 'function';
                          const isClockedIn = getNurseClockStatus(primaryServiceNurseCard.nurseId, primaryServiceNurseCard.nurse?.code);

                          if (useClockDetailsView && isClockedIn) {
                            onOpenClockDetails?.({
                              shift: activeShift,
                              nurse: primaryServiceNurseCard.nurse,
                              nurseId: primaryServiceNurseCard.nurseId,
                              nurseCode: primaryServiceNurseCard.nurse?.code || null,
                            });
                          } else {
                            setSelectedNurseForDetails(primaryServiceNurseCard.nurse);
                          }
                        }}
                      >
                        <LinearGradient
                          colors={
                            contextType !== 'nurse' &&
                            typeof onOpenClockDetails === 'function' &&
                            getNurseClockStatus(primaryServiceNurseCard.nurseId, primaryServiceNurseCard.nurse?.code)
                              ? SAFE_GRADIENTS.warning
                              : SAFE_GRADIENTS.primary
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.statusChipGradient}
                        >
                          <MaterialCommunityIcons name="eye" size={14} color={COLORS.white} />
                          <Text style={styles.statusChipText}>View</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    </View>
                    )}
                    <View style={styles.row}>
                    <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
                    <Text style={styles.rowText}>{activeShift?.service || 'N/A'}</Text>
                  </View>

                  {(primaryServiceNurseCard && primaryServiceNurseCard.days && primaryServiceNurseCard.days.length > 0) ||
                  recurringDaysForDisplay.length > 0 ? (
                    <View style={styles.daysContainer}>
                      <Text style={styles.daysLabel}>Assigned Days</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {(primaryServiceNurseCard && primaryServiceNurseCard.days && primaryServiceNurseCard.days.length > 0
                          ? primaryServiceNurseCard.days
                          : recurringDaysForDisplay
                        ).map((d) => (
                          <View key={d} style={styles.dayPill}>
                            <LinearGradient
                              colors={SAFE_GRADIENTS.header}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={styles.dayPillGradient}
                            >
                              <Text style={styles.dayPillText}>{DAY_LABELS[d]}</Text>
                            </LinearGradient>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  <View style={styles.timeGrid}>
                    <View style={styles.timeItem}>
                      <MaterialCommunityIcons name="clock-start" size={16} color={COLORS.success} />
                      <View style={styles.timeContent}>
                        <Text style={styles.timeLabel}>Start</Text>
                        <Text style={styles.timeValue}>{formatTimeTo12Hour(startTime) || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.timeDivider} />
                    <View style={styles.timeItem}>
                      <MaterialCommunityIcons name="clock-end" size={16} color={COLORS.error} />
                      <View style={styles.timeContent}>
                        <Text style={styles.timeLabel}>End</Text>
                        <Text style={styles.timeValue}>{formatTimeTo12Hour(endTime) || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.timeGrid}>
                    <View style={styles.timeItem}>
                      <MaterialCommunityIcons name="calendar-start" size={16} color={COLORS.success} />
                      <View style={styles.timeContent}>
                        <Text style={styles.timeLabel}>Start Date</Text>
                        <Text style={styles.timeValue}>{formatDate(startDate || endDate)}</Text>
                      </View>
                    </View>
                    <View style={styles.timeDivider} />
                    <View style={styles.timeItem}>
                      <MaterialCommunityIcons name="calendar-end" size={16} color={COLORS.error} />
                      <View style={styles.timeContent}>
                        <Text style={styles.timeLabel}>End Date</Text>
                        <Text style={styles.timeValue}>{formatDate(endDate || startDate)}</Text>
                      </View>
                    </View>
                  </View>
                    {!isPatientPending ? (
                      <Text style={styles.durationText}>{calculateDuration(startTime, endTime)}</Text>
                    ) : null}
                  </View>
                </View>

                {isPatientPending && primaryServiceNurseCard && primaryServiceNurseCard.nurse ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Requested Nurse</Text>
                    <View style={styles.card}>
                      <View style={[styles.cardHeader, styles.cardHeaderNoDivider]}>
                        {primaryServiceNurseCard.nurse.photo ? (
                          <Image source={{ uri: primaryServiceNurseCard.nurse.photo }} style={styles.avatar} resizeMode="cover" />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <MaterialCommunityIcons name="account" size={30} color={COLORS.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nurseName}>{primaryServiceNurseCard.nurse.name}</Text>
                        </View>
                        <TouchableWeb
                          style={styles.statusChip}
                          onPress={() => setSelectedNurseForDetails(primaryServiceNurseCard.nurse)}
                        >
                          <LinearGradient
                            colors={SAFE_GRADIENTS.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.statusChipGradient}
                          >
                            <MaterialCommunityIcons name="eye" size={14} color={COLORS.white} />
                            <Text style={styles.statusChipText}>View</Text>
                          </LinearGradient>
                        </TouchableWeb>
                      </View>
                    </View>
                  </View>
                ) : null}
              </>
            )}

            {!isPatientPending ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Emergency Backup Nurses</Text>
                {typeof onManageBackupNurses === 'function' ? (
                  <TouchableWeb onPress={() => onManageBackupNurses(activeShift)} style={styles.iconButton}>
                    <LinearGradient
                      colors={SAFE_GRADIENTS.warning}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.iconButtonGradient}
                    >
                      <MaterialCommunityIcons name="account-plus" size={18} color={COLORS.white} />
                    </LinearGradient>
                  </TouchableWeb>
                ) : null}
              </View>

              {backupNurses && backupNurses.length > 0 ? (
                <>
                  <Text style={styles.helperText}>Priority order for emergency coverage</Text>
                  {backupNurses.map((backup, index) => {
                    const backupId = normalizeId(backup?.nurseId || backup?.uid || backup?.id || backup?._id);
                    const backupCode = normalizeCode(
                      backup?.staffCode || backup?.nurseCode || backup?.code || backup?.username
                    );

                    let clockEntry = null;
                    let hasClockIn = false;
                    let isActivelyClockedIn = false;
                    let clockInValue = null;
                    let clockOutValue = null;

                    if (mergedClockByNurse && typeof mergedClockByNurse === 'object') {
                      const idCandidates = [
                        backupId,
                        normalizeId(backup?.nurseId),
                        normalizeId(backup?.uid),
                        normalizeId(backup?.id),
                        normalizeId(backup?._id),
                      ]
                        .filter(Boolean)
                        .map((v) => String(v).trim());

                      const codeCandidates = [
                        backupCode,
                        normalizeCode(backup?.staffCode),
                        normalizeCode(backup?.nurseCode),
                        normalizeCode(backup?.code),
                      ]
                        .filter(Boolean)
                        .map((v) => String(v).trim());

                      const lookupKeys = [...idCandidates, ...codeCandidates].filter(Boolean);

                      for (const rawKey of lookupKeys) {
                        const key = String(rawKey).trim();
                        if (!key) continue;
                        if (mergedClockByNurse[key]) {
                          clockEntry = mergedClockByNurse[key];
                          break;
                        }
                        const upper = key.toUpperCase();
                        if (mergedClockByNurse[upper]) {
                          clockEntry = mergedClockByNurse[upper];
                          break;
                        }
                        const lower = key.toLowerCase();
                        if (mergedClockByNurse[lower]) {
                          clockEntry = mergedClockByNurse[lower];
                          break;
                        }
                      }

                      if (!clockEntry) {
                        const values = Object.values(mergedClockByNurse);
                        clockEntry =
                          values.find((v) => {
                            if (!v || typeof v !== 'object') return false;
                            const vId = normalizeId(v.nurseId || v.id || v._id || v.uid);
                            const vCode = normalizeCode(v.nurseCode || v.staffCode || v.code);
                            if (backupId && vId && backupId === vId) return true;
                            if (backupCode && vCode && backupCode === vCode) return true;
                            return false;
                          }) || null;
                      }

                      if (clockEntry && typeof clockEntry === 'object') {
                        clockInValue =
                          clockEntry.lastClockInTime ||
                          clockEntry.actualStartTime ||
                          clockEntry.clockInTime ||
                          clockEntry.startedAt ||
                          null;
                        clockOutValue =
                          clockEntry.lastClockOutTime ||
                          clockEntry.actualEndTime ||
                          clockEntry.clockOutTime ||
                          clockEntry.completedAt ||
                          null;

                        hasClockIn = Boolean(clockInValue);
                        isActivelyClockedIn = Boolean(clockInValue) && !Boolean(clockOutValue);
                      }

                      // Backup clock debug logging removed per request
                    }

                    const canViewClockDetails = contextType !== 'nurse' && typeof onOpenClockDetails === 'function';
                    const shiftStatusRaw = String(activeShift?.status || '').trim().toLowerCase();
                    const shiftIsPending =
                      !shiftStatusRaw ||
                      shiftStatusRaw.includes('pending') ||
                      shiftStatusRaw.includes('request') ||
                      shiftStatusRaw.includes('assign');

                    return (
                    <View key={backup?.nurseId || backup?.id || index} style={{ marginBottom: 10 }}>
                      <View style={styles.backupPriorityBadge}>
                        <Text style={styles.backupPriorityText}>{index + 1}</Text>
                      </View>
                      <NurseInfoCard
                        nurse={backup}
                        nursesRoster={nurses}
                        openDetailsOnPress={!(hasClockIn && canViewClockDetails)}
                        hideSpecialty={true}
                        hideCode={true}
                        contextType={contextType}
                        style={[
                          isActivelyClockedIn ? styles.cardClockedIn : undefined,
                          shiftIsPending && !isActivelyClockedIn && contextType !== 'nurse'
                            ? { borderColor: COLORS.primary, backgroundColor: COLORS.white }
                            : undefined,
                        ]}
                        showViewButton={false}
                        actionButton={
                             <TouchableWeb
                                style={styles.statusChip}
                                onPress={() => {
                                  if (hasClockIn && canViewClockDetails) {
                                    onOpenClockDetails?.({ 
                                        shift: activeShift, 
                                        nurse: backup, 
                                        nurseId: backupId, 
                                        nurseCode: backupCode 
                                    });
                                  } else {
                                     // Fallback to opening nurse details if no clock-in
                                     setSelectedNurseForDetails(backup);
                                  }
                                }}
                             >
                                <LinearGradient
                                    colors={hasClockIn && canViewClockDetails ? SAFE_GRADIENTS.warning : SAFE_GRADIENTS.primary}
                                    start={{x:0, y:0}}
                                    end={{x:0, y:1}}
                                    style={styles.statusChipGradient}
                                >
                                    <MaterialCommunityIcons name="eye" size={14} color={COLORS.white} />
                                    <Text style={styles.statusChipText}>View</Text>
                                </LinearGradient>
                             </TouchableWeb>
                        }
                      />
                    </View>
                  );
                })}
                </>
              ) : (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <MaterialCommunityIcons name="account-multiple-outline" size={48} color={COLORS.textLight} />
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      color: COLORS.textLight,
                      fontStyle: 'italic',
                      textAlign: 'center',
                    }}
                  >
                    No backup nurses assigned yet
                  </Text>
                </View>
              )}
            </View>
            ) : null}

            {contextType === 'patient' && showPatientPostVisitSections ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Invoices</Text>
                {patientIsLoadingInvoices ? (
                  <View style={styles.patientInfoCard}>
                    <View style={styles.patientInfoRow}>
                      <MaterialCommunityIcons name="progress-clock" size={18} color={COLORS.textLight} />
                      <Text style={styles.patientInfoText}>Loading invoices...</Text>
                    </View>
                  </View>
                ) : Array.isArray(patientInvoices) && patientInvoices.length > 0 ? (
                  <TouchableWeb
                    style={styles.patientInvoiceCard}
                    onPress={() => onOpenPatientInvoice?.(patientInvoices[0])}
                    activeOpacity={0.75}
                  >
                    <View style={styles.patientInvoiceHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientInvoiceNumber}>
                          {patientInvoices[0]?.invoiceId?.replace('CARE-INV', 'NUR-INV') || '#Pending'}
                        </Text>
                      </View>
                      <View style={styles.statusChip}>
                        <LinearGradient
                          colors={SAFE_GRADIENTS.warning}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.statusChipGradient}
                        >
                          {String(patientInvoices[0]?.status || 'Pending').toLowerCase() === 'pending' ? null : (
                            <MaterialCommunityIcons name="file-document-outline" size={14} color={COLORS.white} />
                          )}
                          <Text style={styles.statusChipText}>{patientInvoices[0]?.status || 'Pending'}</Text>
                        </LinearGradient>
                      </View>
                    </View>
                  </TouchableWeb>
                ) : (
                  <View style={styles.patientInvoiceEmptyRow}>
                    <View style={styles.patientInvoiceEmptyLeft}>
                      <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.textLight} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientInvoiceEmptyText}>
                          Invoice not found for this completed visit yet. If the nurse just clocked out, refresh in a moment.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            {contextType === 'patient' && showPatientPostVisitSections ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medical Notes</Text>
                {medicalNotesUnlocked ? (
                  <View style={styles.patientSecureNotesCard}>
                    <View style={styles.patientSecureNotesHeader}>
                      <View style={styles.patientSecureNotesHeaderLeft}>
                        <MaterialCommunityIcons name="shield-lock" size={16} color={COLORS.success} />
                        <Text style={styles.patientSecureNotesTitle}>Secured Medical Notes</Text>
                      </View>
                      {typeof onLockMedicalNotes === 'function' ? (
                        <TouchableWeb onPress={() => onLockMedicalNotes?.()} style={styles.patientSecureNotesClose} activeOpacity={0.6}>
                          <MaterialCommunityIcons name="close" size={18} color={COLORS.textLight} />
                        </TouchableWeb>
                      ) : null}
                    </View>

                    {isSplitScheduleShift ? (
                      <NotesAccordionList
                        items={splitScheduleNurseNotes.map((item) => ({
                          id: item.key,
                          date: item.noteDate,
                          title: item.nurseName,
                          subtitle: item.nurseCode || item.nurseId || '',
                          body: item.note || '',
                          photoUrls: shiftNurseNotePhotos,
                        }))}
                        emptyText="No notes yet"
                        onPhotoPress={openPhotoPreview}
                      />
                    ) : (
                      <View style={styles.notesRow}>
                        <Text style={styles.notesText}>{nurseNotesText || 'No additional notes provided by the nurse.'}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.patientLockedNotesCard}>
                    <View style={styles.patientLockedNotesTopRow}>
                      <MaterialCommunityIcons name="file-document-outline" size={22} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientLockedNotesTitle}>Medical Notes</Text>
                        <Text style={styles.patientLockedNotesSub}>JMD $500 to unlock</Text>
                      </View>
                      <TouchableWeb style={buttonStyles.warningPillButton} onPress={() => onUnlockMedicalNotes?.()} activeOpacity={0.85}>
                        <LinearGradient colors={SAFE_GRADIENTS.warning} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={buttonStyles.warningPillGradient}>
                          <Text style={buttonStyles.warningPillText}>Unlock</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            {(() => {
              const patientCandidates = [
                activeShift?.patientNotes,
                activeShift?.bookingNotes,
                activeShift?.clientNotes,
                activeShift?.specialInstructions,
              ];

              const legacyNotes = activeShift?.notes; // Legacy field (historically patient notes, but sometimes used for nurse notes)
              const legacyTrimmed = legacyNotes === null || legacyNotes === undefined ? '' : String(legacyNotes).trim();
              const nurseTrimmed = nurseNotesText === null || nurseNotesText === undefined ? '' : String(nurseNotesText).trim();
              const splitNurseNotes = Array.isArray(splitScheduleNurseNotes)
                ? splitScheduleNurseNotes.map((n) => (n?.note === null || n?.note === undefined ? '' : String(n.note).trim())).filter(Boolean)
                : [];

              const legacyLooksLikeNurseNotes =
                Boolean(legacyTrimmed) &&
                (legacyTrimmed === nurseTrimmed || splitNurseNotes.some((t) => t === legacyTrimmed));

              const candidates = legacyLooksLikeNurseNotes
                ? patientCandidates
                : [...patientCandidates, legacyNotes];

              const text = candidates.find((value) => {
                if (value === null || value === undefined) return false;
                const str = String(value).trim();
                return Boolean(str);
              });

              if (!text) return null;

              const dateCandidate =
                activeShift?.requestedAt ||
                activeShift?.createdAt ||
                activeShift?.bookingCreatedAt ||
                activeShift?.bookingRequestedAt ||
                activeShift?.updatedAt ||
                null;

              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Patient Notes</Text>
                  <NotesAccordionList
                    showTime
                    items={[
                      {
                        id: `patient-notes-${activeShift?.id || activeShift?._id || activeShift?.shiftId || 'note'}`,
                        date: dateCandidate,
                        title: shiftClientName || 'Patient Note',
                        subtitle: 'From booking',
                        body: String(text).trim(),
                      },
                    ]}
                    emptyText="No notes yet"
                    onPhotoPress={openPhotoPreview}
                  />
                </View>
              );
            })()}

            {(() => {
              const isNurseContext = contextType === 'nurse';
              const isPatientContext = contextType === 'patient';
              const isAdminContext = !isNurseContext && !isPatientContext;

              // For nurses: keep existing rule (hide section while decision buttons are shown).
              if (isNurseContext && shouldShowNurseDecisionButtons) return null;

              // Build items array (split schedule nurse notes)
              const items = Array.isArray(splitScheduleNurseNotes)
                ? splitScheduleNurseNotes.filter((n) => n?.note)
                : [];

              const hasSplitNotes = items.length > 0;
              const hasNurseText = Boolean(nurseNotesText);
              const hasAnyNurseNotes = hasSplitNotes || hasNurseText;

              // Determine if anyone has clocked in (admin should see Nurses Notes section once clock-in starts)
              const hasAnyClockIn = (() => {
                if (!mergedClockByNurse || typeof mergedClockByNurse !== 'object') return false;
                const values = Object.values(mergedClockByNurse);
                return values.some((entry) => {
                  if (!entry || typeof entry !== 'object') return false;
                  const clockInValue =
                    entry.lastClockInTime ||
                    entry.actualStartTime ||
                    entry.clockInTime ||
                    entry.startedAt ||
                    null;
                  return Boolean(clockInValue);
                });
              })();

              // Nurse context: don't render section if no notes exist (per nurse UX requirement).
              if (isNurseContext && !hasAnyNurseNotes) return null;

              // Patient context never shows Nurses Notes (patients use Medical Notes section instead).
              if (isPatientContext) return null;

              // Admin context: show section once clock-in starts, or if notes exist.
              if (isAdminContext && !hasAnyClockIn && !hasAnyNurseNotes) return null;

              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Nurses Notes</Text>
                  <NotesAccordionList
                    showTime
                    items={(() => {
                      if (items.length > 0) {
                        return items.map((item) => ({
                          id: item.key,
                          date: item.noteDate,
                          title: item.nurseName,
                          subtitle: item.nurseCode || item.nurseId || '',
                          body: item.note || '',
                          photoUrls: shiftNurseNotePhotos,
                        }));
                      }

                      if (!nurseNotesText) return [];

                      const fallbackDate =
                        activeShift?.nurseNotesUpdatedAt ||
                        activeShift?.notesUpdatedAt ||
                        activeShift?.completedAt ||
                        activeShift?.actualEndTime ||
                        activeShift?.updatedAt ||
                        activeShift?.scheduledDate ||
                        activeShift?.date ||
                        activeShift?.shiftDate ||
                        activeShift?.startDate ||
                        activeShift?.serviceDate ||
                        activeShift?.requestedDate ||
                        activeShift?.recurringStartDate ||
                        activeShift?.recurringPeriodStart ||
                        activeShift?.createdAt ||
                        activeShift?.requestedAt ||
                        null;

                      const primaryNoteNurseCard =
                        primaryServiceNurseCard || (nurseCards && nurseCards.length > 0 ? nurseCards[0] : null);

                      const nurseTitle =
                        (primaryNoteNurseCard && (primaryNoteNurseCard.nurse?.name || primaryNoteNurseCard.nurseName)) ||
                        'Nurse Note';

                      const nurseSubtitle =
                        (primaryNoteNurseCard && (primaryNoteNurseCard.nurse?.code || primaryNoteNurseCard.nurseCode)) ||
                        null;

                      return [
                        {
                          id: 'primary-nurse-note',
                          date: fallbackDate,
                          title: nurseTitle,
                          subtitle: nurseSubtitle,
                          body: nurseNotesText,
                          photoUrls: shiftNurseNotePhotos,
                        },
                      ];
                    })()}
                    emptyText="No notes yet"
                    onPhotoPress={openPhotoPreview}
                  />
                </View>
              );
            })()}
          </ScrollView>

          {shouldHideFooter ? null : (
            <View style={styles.footer}>
              {contextType === 'nurse' ? (
                pendingCoverageForCurrentNurse ? (
                  hasCoverageDecisionActions ? (
                    <>
                      <TouchableWeb onPress={() => onCoverageDecline?.(activeShift, pendingCoverageForCurrentNurse)} style={[styles.footerButton, styles.footerDecline]}>
                        <Text style={styles.footerDeclineText}>Decline</Text>
                      </TouchableWeb>
                      <TouchableWeb onPress={() => onCoverageAccept?.(activeShift, pendingCoverageForCurrentNurse)} style={[styles.footerButton, styles.footerAccept]}>
                        <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.footerAcceptGradient}>
                          <Text style={styles.footerAcceptText}>Accept</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    </>
                  ) : null
                ) : shouldShowNurseDecisionButtons ? (
                  <>
                    <TouchableWeb onPress={() => onDecline?.(activeShift)} style={[styles.footerButton, styles.footerDecline]}>
                      <Text style={styles.footerDeclineText}>Decline</Text>
                    </TouchableWeb>
                    <TouchableWeb onPress={() => onAccept?.(activeShift)} style={[styles.footerButton, styles.footerAccept]}>
                      <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.footerAcceptGradient}>
                        <Text style={styles.footerAcceptText}>Accept</Text>
                      </LinearGradient>
                    </TouchableWeb>
                  </>
                ) : shouldShowNurseClockOutButtons ? (
                  <>
                    <TouchableWeb onPress={() => onAddNote?.(activeShift)} style={[styles.footerButton, styles.footerCancel]}>
                      <Text style={styles.footerCancelText}>Add Notes</Text>
                    </TouchableWeb>
                    <TouchableWeb onPress={() => onClockOut?.(activeShift)} style={[styles.footerButton, styles.footerAccept]}>
                      <LinearGradient colors={['#ef4444', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.footerAcceptGradient}>
                        <Text style={styles.footerAcceptText}>Clock Out</Text>
                      </LinearGradient>
                    </TouchableWeb>
                  </>
                ) : (
                  <>
                    <TouchableWeb onPress={() => onAddNote?.(activeShift)} style={[styles.footerButton, styles.footerCancel]}>
                      <Text style={styles.footerCancelText}>Add Note</Text>
                    </TouchableWeb>
                    <TouchableWeb onPress={() => onRequestBackup?.(activeShift)} style={[styles.footerButton, styles.footerCancel]}>
                      <Text style={styles.footerCancelText}>Back-up</Text>
                    </TouchableWeb>
                    {(() => {
                      const isClockInDisabled =
                        !canClockInNow ||
                        !isAssignedToCurrentNurse ||
                        acceptedCoverageForOtherNurse ||
                        hasActiveBackupCoverageForOtherNurse;

                      const clockInColors = isClockInDisabled
                        ? ['#cbd5f5', '#cbd5f5']
                        : ['#10b981', '#059669'];

                      return (
                    <TouchableWeb
                      onPress={() => onClockIn?.(activeShift)}
                      disabled={isClockInDisabled}
                      style={[styles.footerButton, styles.footerAccept]}
                    >
                      <LinearGradient
                        colors={clockInColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.footerAcceptGradient}
                      >
                        <Text style={styles.footerAcceptText}>Clock In</Text>
                      </LinearGradient>
                    </TouchableWeb>
                      );
                    })()}
                  </>
                )
              ) : (
                <>
                  <TouchableWeb onPress={onClose} style={[styles.footerButton, styles.footerCancel]}>
                    <Text style={styles.footerCancelText}>Cancel</Text>
                  </TouchableWeb>
                  {typeof onOpenAssignNurseModal === 'function' ? (
                    <TouchableWeb onPress={() => onOpenAssignNurseModal(activeShift)} style={[styles.footerButton, styles.footerPrimary]}>
                      <LinearGradient colors={SAFE_GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.footerPrimaryGradient}>
                        <Text style={styles.footerPrimaryText}>Assign Nurse</Text>
                      </LinearGradient>
                    </TouchableWeb>
                  ) : null}
                </>
              )}
            </View>
          )}
        </View>


          {photoPreviewVisible && photoPreviewUri ? (
            <View style={styles.photoPreviewOverlayInModal}>
              <TouchableWeb style={styles.photoPreviewOverlayTapArea} activeOpacity={1} onPress={closePhotoPreview}>
                <View style={styles.photoPreviewImageFrame}>
                  <Image source={{ uri: photoPreviewUri }} style={styles.photoPreviewImage} resizeMode="contain" />
                </View>
              </TouchableWeb>
            </View>
          ) : null}
        <NurseDetailsModal visible={!!selectedNurseForDetails} nurse={selectedNurseForDetails} nursesRoster={nurses} onClose={() => setSelectedNurseForDetails(null)} showQualificationsRequest={contextType === 'patient'} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: Platform.OS === 'android' ? '93%' : '85%',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  photoPreviewOverlayInModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 50,
    elevation: 50,
  },
  photoPreviewOverlayTapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewImageFrame: {
    width: '100%',
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  containerWide: {
    width: '95%',
    maxWidth: 860,
  },
  containerNarrow: {
    width: '95%',
    maxWidth: 860,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: 6,
    marginLeft: 10,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  emergencyTextOnly: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
  patientAlertsBanner: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: SPACING.lg,
  },
  patientAlertsTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.error,
    marginBottom: 2,
  },
  patientAlertsText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  subTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardClockedIn: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  cardFaded: {
    opacity: 0.45,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardHeaderNoDivider: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E6ECF5',
    overflow: 'hidden',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E6ECF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nurseName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  nurseMeta: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  nurseCode: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
  },
  statusChip: {
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 8,
  },
  statusChipGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  notesRow: {},
  notesText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  rowText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
    flex: 1,
  },
  daysContainer: {
    marginBottom: SPACING.md,
  },
  daysLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 8,
  },
  dayPill: {
    marginRight: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dayPillGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayPillText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  timeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  iconButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  iconButtonGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  backupPriorityBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    zIndex: 10,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  backupPriorityText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footerCancel: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerCancelText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  footerDecline: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerDeclineText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.error,
  },
  footerAccept: {
    overflow: 'hidden',
  },
  footerAcceptGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  footerAcceptText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  footerPrimary: {
    overflow: 'hidden',
  },
  footerPrimaryGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerPrimaryText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  patientInfoCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 14,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientInfoText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  patientInvoiceCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 14,
  },
  patientInvoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientInvoiceNumber: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  patientInvoiceHint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  patientInvoiceEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  patientInvoiceEmptyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  patientInvoiceEmptyText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  patientLockedNotesCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 14,
  },
  patientLockedNotesTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  patientLockedNotesTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  patientLockedNotesSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  patientSecureNotesCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 14,
  },
  patientSecureNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  patientSecureNotesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  patientSecureNotesTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  patientSecureNotesClose: {
    padding: 4,
    marginLeft: 10,
  },
});
