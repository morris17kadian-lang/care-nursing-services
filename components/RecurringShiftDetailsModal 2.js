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
  if (!s) return false;
  if (s.toUpperCase().includes('NURSE')) return false;
  return s.length >= 20;
};

const formatDate = (value) => {
                  if (!value) return 'N/A';
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
                  onOpenAssignNurseModal,
                  onManageBackupNurses,
                  onOpenClockDetails,
                  onAddNote,
                  onRequestBackup,
                  onClockIn,
                  onClockOut,
                }) {
                  const [selectedNurseForDetails, setSelectedNurseForDetails] = useState(null);
                  const activeShift = shift || {};

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
                    if (schedule && typeof schedule === 'object' && Object.keys(schedule).length > 0) return true;
                    const assigned = Array.isArray(activeShift?.assignedNurses) ? activeShift.assignedNurses : [];
                    if (assigned.length > 1) return true;
                    const responses = activeShift?.nurseResponses;
                    if (responses && typeof responses === 'object') {
                      const ids = new Set();
                      Object.entries(responses).forEach(([k, v]) => {
                        const fromValue = v && typeof v === 'object' ? (v.nurseId || v.uid) : null;
                        const fromKey = looksLikeFirebaseUid(k) ? k : null;
                        const resolved = normalizeId(fromValue || fromKey);
                        if (resolved) ids.add(resolved);
                      });
                      if (ids.size > 1) return true;
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
                    
                    // Handle if address is an object
                    if (addr && typeof addr === 'object') {
                      // Try to extract string from object
                      return addr.address || addr.location || addr.street || addr.formattedAddress || null;
                    }
                    
                    // Handle if address is a string
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
                    // Try common object shapes
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
                      // Try by id
                      for (const id of idCandidates) {
                        const sid = resolveString(id);
                        if (!sid) continue;
                        const found = clients.find((c) => resolveString(c?.id) === sid || resolveString(c?._id) === sid);
                        if (found) return found;
                      }
                      // Try by name
                      if (nameCand) {
                        const foundByName = clients.find((c) => resolveString(c?.fullName) === nameCand || resolveString(c?.name) === nameCand);
                        if (foundByName) return foundByName;
                      }
                    }
                    return null;
                  })();

                  const clientEmail = (
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
                    null
                  );

                  const clientPhone = (
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
                    null
                  );

                  const clientAddress = (
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
                    null
                  );

                  const nurseNotesText =
                    resolveString(activeShift?.nurseNotes) ||
                    resolveString(activeShift?.notes) ||
                    resolveString(activeShift?.completionNotes) ||
                    resolveString(activeShift?.lastCompletionNotes) ||
                    null;

                  const [nowTs, setNowTs] = useState(() => Date.now());

                  useEffect(() => {
                    if (!visible) return;
                    const id = setInterval(() => setNowTs(Date.now()), 30_000);
                    return () => clearInterval(id);
                  }, [visible]);

                  const parseTimeToDateOnDay = (timeValue, baseDate = new Date()) => {
                    if (!timeValue) return null;
                    const raw = String(timeValue).trim();
                    if (!raw) return null;

                    // Full date/time string
                    if (raw.includes('T') || /\d{4}-\d{2}-\d{2}/.test(raw)) {
                      const dt = new Date(raw);
                      if (!Number.isNaN(dt.getTime())) return dt;
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
                  }, [activeShift]);

                  const canClockInNow = useMemo(() => {
                    if (!getShiftScheduledStartDateTime) return true;
                    return new Date(nowTs) >= getShiftScheduledStartDateTime;
                  }, [getShiftScheduledStartDateTime, nowTs]);

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

                    // Fallback: scan entries by embedded nurse identifiers
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

                  const startDate =
                    activeShift?.recurringStartDate ||
                    activeShift?.recurringPeriodStart ||
                    activeShift?.startDate ||
                    activeShift?.date ||
                    null;
                  const endDate =
                    activeShift?.recurringEndDate ||
                    activeShift?.recurringPeriodEnd ||
                    activeShift?.endDate ||
                    null;

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

                      // If the nurses roster isn't available (patient modal), try to canonicalize codes -> uid using shift data.
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
                        const foundAssignedId = normalizeId(foundAssigned?.nurseId || foundAssigned?.uid || foundAssigned?.id || foundAssigned?._id);
                        if (foundAssignedId) return foundAssignedId;
                      }

                      return raw;
                    };

                    const schedule = activeShift?.nurseSchedule;
                    if (schedule && typeof schedule === 'object') {
                      Object.entries(schedule).forEach(([dayKey, nurseId]) => {
                        const id = resolveCanonicalId(nurseId);
                        const day = Number.parseInt(dayKey, 10);
                        if (!id || Number.isNaN(day)) return;
                        const existing = byId.get(id) || { nurseId: id, days: new Set() };
                        existing.days.add(day);
                        byId.set(id, existing);
                      });
                    }
                    assigned.forEach((entry) => {
                      const id = resolveCanonicalId(entry?.nurseId || entry?.id || entry?._id || entry, entry);
                      if (!id) return;
                      // Check if this nurse already exists by checking all existing IDs
                      let alreadyExists = byId.has(id);
                      const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode || entry?.code);

                      if (!alreadyExists && entryCode) {
                        // Check if a nurse with this code is already in byId (even if ID is different)
                        for (const existing of byId.values()) {
                          if (existing.code && existing.code === entryCode) {
                             alreadyExists = true;
                             break;
                          }
                          // Fallback to iterating roster if stored code is missing (legacy path)
                          const existingNurse = roster.find(n => normalizeId(n?.id || n?._id || n?.uid) === existing.nurseId);
                          const existingCode = normalizeCode(existingNurse?.code || existingNurse?.nurseCode || existingNurse?.staffCode);
                          if (existingCode === entryCode) {
                            alreadyExists = true;
                            // Update the existing entry with the found code for faster future lookups
                            existing.code = existingCode;
                            break;
                          }
                        }
                      }
                      if (!alreadyExists) byId.set(id, { nurseId: id, days: new Set(), code: entryCode });
                    });

                    if (responses && typeof responses === 'object') {
                      Object.entries(responses).forEach(([k, v]) => {
                        const fromValue = v && typeof v === 'object' ? (v.nurseId || v.uid) : null;
                        const fromKey = looksLikeFirebaseUid(k) ? k : null;
                        const id = resolveCanonicalId(fromValue || fromKey || k, v);
                        if (!id) return;
                        // Check if this nurse already exists by checking all existing IDs and codes
                        let alreadyExists = byId.has(id);
                        const responseCode = normalizeCode(v?.nurseCode || v?.staffCode);

                        if (!alreadyExists && responseCode) {
                          for (const existing of byId.values()) {
                             if (existing.code && existing.code === responseCode) {
                                alreadyExists = true;
                                break;
                             }
                              const existingNurse = roster.find(n => normalizeId(n?.id || n?._id || n?.uid) === existing.nurseId);
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

                    const primary = resolveCanonicalId(activeShift?.primaryNurseId || activeShift?.nurseId);
                    if (primary && !byId.has(primary)) byId.set(primary, { nurseId: primary, days: new Set() });

                    const resolveNurse = (id) => {
                      const fromNurses = roster.find((n) => {
                        const rosterId = normalizeId(n?.id || n?._id || n?.uid || n?.nurseId);
                        return rosterId === id;
                      }) || null;

                      const rosterCode = normalizeCode(fromNurses?.code || fromNurses?.nurseCode || fromNurses?.staffCode || fromNurses?.username);
                      const responseObj = responses && typeof responses === 'object'
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

                    // Final safety net: merge duplicates that represent the same nurse but came through as both code + uid.
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
                        const note =
                          resolveString(entry?.nurseNotes) ||
                          resolveString(entry?.lastCompletionNotes) ||
                          null;

                        const noteDateRaw =
                          entry?.nurseNotesUpdatedAt ||
                          entry?.nurseNotesDate ||
                          entry?.notesUpdatedAt ||
                          entry?.updatedAt ||
                          entry?.lastClockOutTime ||
                          entry?.actualEndTime ||
                          null;

                        const nurseName =
                          resolveString(card?.nurse?.name) ||
                          resolveString(card?.nurseName) ||
                          'Assigned Nurse';

                        const nurseCode =
                          resolveString(card?.nurse?.code) ||
                          resolveString(card?.code) ||
                          null;

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
                      nurseName: (c?.nurse?.name || c?.nurseName || 'Assigned Nurse'),
                    }));

                    const safeResolvedNotes = (Array.isArray(splitScheduleNurseNotes) ? splitScheduleNurseNotes : []).map((n) => ({
                      key: n?.key || null,
                      nurseId: n?.nurseId || null,
                      nurseCode: n?.nurseCode || null,
                      nurseName: n?.nurseName || null,
                      hasNote: Boolean(n?.note),
                      noteLength: typeof n?.note === 'string' ? n.note.length : 0,
                    }));

                    // Avoid printing note content (could contain client info).
                    console.log('[RecurringShiftDetailsModal][split-notes-debug]', {
                      shiftId,
                      assignmentType: activeShift?.assignmentType || null,
                      status: activeShift?.status || null,
                      currentNurseId: currentNurseId || null,
                      currentNurseCode: currentNurseCode || null,
                      clockBuckets: {
                        root: bucketKeys(rootMap),
                        clockDetails: bucketKeys(clockDetailsMap),
                        activeShift: bucketKeys(activeShiftMap),
                        shiftDetails: bucketKeys(shiftDetailsMap),
                        shift: bucketKeys(shiftMap),
                      },
                      mergedClockByNurseKeys: bucketKeys(mergedClockByNurse).slice(0, 10),
                      mergedClockByNurseKeyCount: mergedCount,
                      nurseCards: safeNurseCards,
                      resolvedNotes: safeResolvedNotes,
                      fallbackShiftNotesPresent: Boolean(nurseNotesText),
                    });
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

                    const clockMap =
                      clockRoot?.clockByNurse && typeof clockRoot.clockByNurse === 'object'
                        ? clockRoot.clockByNurse
                        : null;
                    if (!clockMap) return { allClockedOut: false, byNurseId: {} };

                    const responses = activeShift?.nurseResponses && typeof activeShift.nurseResponses === 'object'
                      ? activeShift.nurseResponses
                      : null;

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

                  const hasNurseDecisionActions =
                    contextType === 'nurse' && (typeof onAccept === 'function' || typeof onDecline === 'function');

                  const shouldShowNurseDecisionButtons = useMemo(() => {
                    if (contextType !== 'nurse') return false;
                    if (!hasNurseDecisionActions) return false;
                    const raw = String(activeShift?.status || '').toLowerCase();
                    // Booked/accepted shifts shouldn't show Accept/Decline.
                    if (raw.includes('book') || raw.includes('accept') || raw.includes('approved') || raw.includes('completed')) return false;
                    // Pending/assigned/requested should.
                    if (raw.includes('pending') || raw.includes('assign') || raw.includes('request')) return true;
                    // Default to Close-only to avoid showing wrong actions in Booked.
                    return false;
                  }, [activeShift?.status, contextType, hasNurseDecisionActions]);

                  const shouldShowNurseClockOutButtons = useMemo(() => {
                    if (contextType !== 'nurse') return false;

                    const statusRaw = String(activeShift?.status || '').toLowerCase();
                    const statusSuggestsActive = statusRaw.includes('active') || statusRaw.includes('clock');

                    // For split schedules, only show Clock Out if *this nurse* is clocked in.
                    if (isSplitScheduleShift) {
                      return currentNurseHasClockIn && !currentNurseHasClockOut;
                    }

                    const startedByRaw = clockRoot?.startedBy;
                    const startedById = normalizeId(
                      typeof startedByRaw === 'object' && startedByRaw !== null
                        ? (startedByRaw.id || startedByRaw._id || startedByRaw.uid || startedByRaw.nurseId)
                        : startedByRaw
                    );
                    const startedByCode = normalizeCode(
                      typeof startedByRaw === 'object' && startedByRaw !== null
                        ? (startedByRaw.nurseCode || startedByRaw.staffCode || startedByRaw.code)
                        : startedByRaw
                    );
                    const currentId = normalizeId(currentNurseId);
                    const currentCode = normalizeCode(currentNurseCode);
                    const startedByMe =
                      Boolean(currentId && startedById && startedById === currentId) ||
                      Boolean(currentCode && startedByCode && startedByCode === currentCode);

                    const hasClockIn = Boolean(
                      clockRoot?.actualStartTime ||
                        clockRoot?.startedAt ||
                        clockRoot?.clockInTime ||
                        clockRoot?.clockInLocation
                    );
                    const hasClockOut = Boolean(
                      clockRoot?.actualEndTime ||
                        clockRoot?.completedAt ||
                        clockRoot?.clockOutTime ||
                        clockRoot?.clockOutLocation
                    );

                    // Only show Clock Out actions once clocked in and not yet clocked out.
                    // We also accept status="active" (or startedByMe) even if some clock fields are missing.
                    return (hasClockIn || statusSuggestsActive || startedByMe || currentNurseHasClockIn) && !hasClockOut;
                  }, [activeShift?.status, clockRoot, contextType, currentNurseCode, currentNurseHasClockIn, currentNurseHasClockOut, currentNurseId, isSplitScheduleShift]);

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

                  const shouldHideFooter = shouldHideNonNurseFooter || (contextType === 'nurse' && hideFooter);

                  return (
                    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onClose}>
                      <View style={styles.overlay}>
                        <View style={[
                          styles.container,
                          contextType === 'nurse' ? styles.containerNarrow : styles.containerWide
                        ]}>
                          <View style={styles.header}>
                            <Text style={styles.title}>{modalTitle}</Text>
                            <TouchableWeb onPress={onClose} style={styles.closeButton}>
                              <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                            </TouchableWeb>
                          </View>

                          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 80 }}>
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

                            {isSplitScheduleShift ? (
                              nurseCards.map((card) => {
                                const responses = activeShift?.nurseResponses;
                                const nurseId = normalizeId(card?.nurseId);
                                const nurseCode = normalizeCode(card?.nurse?.code);

                                const responseEntry =
                                  responses && typeof responses === 'object'
                                    ? (responses[nurseId] && typeof responses[nurseId] === 'object'
                                        ? responses[nurseId]
                                        : (responses[nurseCode] && typeof responses[nurseCode] === 'object'
                                            ? responses[nurseCode]
                                            : Object.values(responses).find((entry) => {
                                                if (!entry || typeof entry !== 'object') return false;
                                                const entryId = normalizeId(entry?.nurseId || entry?.uid);
                                                if (entryId && nurseId && entryId === nurseId) return true;
                                                const entryCode = normalizeCode(entry?.nurseCode || entry?.staffCode);
                                                if (entryCode && nurseCode && entryCode === nurseCode) return true;
                                                return false;
                                              }) || null))
                                    : null;

                                const responseNurseId = normalizeId(responseEntry?.nurseId || responseEntry?.uid);

                                const hasAnyClockData = Boolean(
                                  clockRoot?.actualStartTime ||
                                    clockRoot?.startedAt ||
                                    clockRoot?.clockInLocation ||
                                    clockRoot?.clockInTime ||
                                    clockRoot?.actualEndTime ||
                                    clockRoot?.completedAt ||
                                    clockRoot?.clockOutLocation ||
                                    clockRoot?.clockOutTime ||
                                    (clockRoot?.clockByNurse &&
                                      typeof clockRoot.clockByNurse === 'object' &&
                                      Object.keys(clockRoot.clockByNurse).length > 0)
                                );

                                const useClockDetailsView =
                                  contextType !== 'nurse' && typeof onOpenClockDetails === 'function' && hasAnyClockData;

                                const clockMap =
                                  clockRoot?.clockByNurse && typeof clockRoot.clockByNurse === 'object'
                                    ? clockRoot.clockByNurse
                                    : null;

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

                                // IMPORTANT: For split schedules, only highlight the nurse that has per-nurse clock data.
                                // Do NOT fall back to shift-level actualStartTime/startedAt, because one nurse clocking in
                                // can populate those fields globally and would incorrectly highlight every nurse card.
                                const clockInTime =
                                  clockEntry?.lastClockInTime ||
                                  clockEntry?.actualStartTime ||
                                  clockEntry?.clockInTime ||
                                  clockEntry?.startedAt ||
                                  null;
                                const clockOutTime =
                                  clockEntry?.lastClockOutTime ||
                                  clockEntry?.actualEndTime ||
                                  clockEntry?.clockOutTime ||
                                  clockEntry?.completedAt ||
                                  null;

                                const startedByRaw = clockRoot?.startedBy;
                                const startedById = normalizeId(
                                  typeof startedByRaw === 'object' && startedByRaw !== null
                                    ? (startedByRaw.id || startedByRaw._id || startedByRaw.uid || startedByRaw.nurseId)
                                    : startedByRaw
                                );
                                const startedByCode = normalizeCode(
                                  typeof startedByRaw === 'object' && startedByRaw !== null
                                    ? (startedByRaw.nurseCode || startedByRaw.staffCode || startedByRaw.code)
                                    : startedByRaw
                                );
                                const startedByMatchesThisNurse =
                                  Boolean(startedById && (startedById === nurseId || startedById === responseNurseId)) ||
                                  Boolean(startedByCode && startedByCode === nurseCode);

                                const shiftHasClockIn = Boolean(
                                  clockRoot?.actualStartTime ||
                                    clockRoot?.startedAt ||
                                    clockRoot?.clockInTime ||
                                    clockRoot?.clockInLocation
                                );
                                const shiftHasClockOut = Boolean(
                                  clockRoot?.actualEndTime ||
                                    clockRoot?.completedAt ||
                                    clockRoot?.clockOutTime ||
                                    clockRoot?.clockOutLocation
                                );

                                const isClockedInForThisNurse = clockEntry
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
                                    : (activeShift?.splitNurseServices && typeof activeShift.splitNurseServices === 'object'
                                      ? activeShift.splitNurseServices
                                      : null);

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

                                const shiftService =
                                  typeof activeShift?.service === 'string' && activeShift.service.trim().length
                                    ? activeShift.service.trim()
                                    : null;

                                const displayService =
                                  perNurseService ||
                                  (shiftService && shiftService !== 'Split Schedule Services' ? shiftService : null) ||
                                  'N/A';

                                const status = normalizeStatus(responseEntry?.status || activeShift?.status);
                                const statusLabel = status === 'accepted' ? 'Accepted' : status === 'declined' ? 'Declined' : 'Pending';
                                const statusColors = status === 'accepted'
                                  ? SAFE_GRADIENTS.success
                                  : status === 'declined'
                                    ? SAFE_GRADIENTS.error
                                    : SAFE_GRADIENTS.warning;

                                return (
                                  <View key={card.nurseId} style={styles.section}>
                                    <Text style={styles.sectionTitle}>Service Information</Text>

                                    <View
                                      style={[
                                        styles.card,
                                        isClockedInForThisNurse ? styles.cardClockedIn : null,
                                        shouldFadeServiceCard ? styles.cardFaded : null,
                                      ]}
                                    >
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
                                          {card.nurse.code ? (
                                            <Text style={styles.nurseCode}>{card.nurse.code}</Text>
                                          ) : null}
                                        </View>
                                        <TouchableWeb
                                          style={styles.statusChip}
                                          onPress={() => {
                                            if (useClockDetailsView) {
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
                                            colors={useClockDetailsView ? SAFE_GRADIENTS.warning : SAFE_GRADIENTS.primary}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={styles.statusChipGradient}
                                          >
                                            <MaterialCommunityIcons
                                              name="eye"
                                              size={14}
                                              color={COLORS.white}
                                            />
                                            <Text style={styles.statusChipText}>View</Text>
                                          </LinearGradient>
                                        </TouchableWeb>
                                      </View>

                                    <View style={styles.row}>
                                      <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
                                      <Text style={styles.rowText}>{displayService}</Text>
                                    </View>

                                    <View style={styles.daysContainer}>
                                      <Text style={styles.daysLabel}>Assigned Days</Text>
                                      {card.days.length ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                          {card.days.map((d) => (
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
                                      ) : (
                                        <Text style={styles.helperText}>No specific days assigned</Text>
                                      )}
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
                                          <Text style={styles.timeValue}>{formatDate(startDate)}</Text>
                                        </View>
                                      </View>
                                      <View style={styles.timeDivider} />
                                      <View style={styles.timeItem}>
                                        <MaterialCommunityIcons name="calendar-end" size={16} color={COLORS.error} />
                                        <View style={styles.timeContent}>
                                          <Text style={styles.timeLabel}>End Date</Text>
                                          <Text style={styles.timeValue}>{endDate ? formatDate(endDate) : 'Ongoing'}</Text>
                                        </View>
                                      </View>
                                    </View>

                                    {/** Duration row removed to match admin split-schedule details modal */}
                                  </View>
                                </View>
                                );
                              })
                            ) : (
                              <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Service Information</Text>
                                <View style={styles.card}>
                                  <View style={styles.row}>
                                    <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
                                    <Text style={styles.rowText}>{activeShift?.service || 'N/A'}</Text>
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
                                </View>
                              </View>
                            )}

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
                                  {backupNurses.map((backup, index) => (
                                    <View key={backup?.nurseId || backup?.id || index} style={{ marginBottom: 10 }}>
                                      <View style={styles.backupPriorityBadge}>
                                        <Text style={styles.backupPriorityText}>{index + 1}</Text>
                                      </View>
                                      <NurseInfoCard
                                        nurse={backup}
                                        nursesRoster={nurses}
                                        openDetailsOnPress={true}
                                        hideSpecialty={true}
                                        hideCode={true}
                                      />
                                    </View>
                                  ))}
                                </>
                              ) : (
                                <View style={{ padding: 16, alignItems: 'center' }}>
                                  <MaterialCommunityIcons name="account-multiple-outline" size={48} color={COLORS.textLight} />
                                  <Text style={{ marginTop: 8, fontSize: 14, color: COLORS.textLight, fontStyle: 'italic', textAlign: 'center' }}>
                                    No backup nurses assigned yet
                                  </Text>
                                </View>
                              )}
                            </View>

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
                                        <Text style={styles.patientInvoiceHint}>Tap to view</Text>
                                      </View>
                                      <View style={styles.statusChip}>
                                        <LinearGradient
                                          colors={SAFE_GRADIENTS.warning}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 0, y: 1 }}
                                          style={styles.statusChipGradient}
                                        >
                                          <MaterialCommunityIcons name="file-document-outline" size={14} color={COLORS.white} />
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
                                        <Text style={styles.patientInvoiceEmptyText}>No invoice available yet</Text>
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
                                        <TouchableWeb
                                          onPress={() => onLockMedicalNotes?.()}
                                          style={styles.patientSecureNotesClose}
                                          activeOpacity={0.6}
                                        >
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
                                        }))}
                                        emptyText="No notes yet"
                                      />
                                    ) : (
                                      <View style={styles.notesRow}>
                                        <Text style={styles.notesText}>
                                          {nurseNotesText || 'No additional notes provided by the nurse.'}
                                        </Text>
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
                                      <TouchableWeb
                                        style={buttonStyles.warningPillButton}
                                        onPress={() => onUnlockMedicalNotes?.()}
                                        activeOpacity={0.85}
                                      >
                                        <LinearGradient
                                          colors={SAFE_GRADIENTS.warning}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 0, y: 1 }}
                                          style={buttonStyles.warningPillGradient}
                                        >
                                          <Text style={buttonStyles.warningPillText}>Unlock</Text>
                                        </LinearGradient>
                                      </TouchableWeb>
                                    </View>
                                  </View>
                                )}
                              </View>
                            ) : null}

                            {contextType === 'nurse' ? (
                              <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Nurses Notes</Text>
                                {isSplitScheduleShift ? (
                                  <NotesAccordionList
                                    items={splitScheduleNurseNotes.map((item) => ({
                                      id: item.key,
                                      date: item.noteDate,
                                      title: item.nurseName,
                                      subtitle: item.nurseCode || item.nurseId || '',
                                      body: item.note || '',
                                    }))}
                                    emptyText="No notes yet"
                                  />
                                ) : (
                                  <View style={styles.notesRow}>
                                    <Text style={styles.notesText}>{nurseNotesText || 'No notes yet'}</Text>
                                  </View>
                                )}
                              </View>
                            ) : null}
                          </ScrollView>

                          {shouldHideFooter ? null : (
                          <View style={styles.footer}>
                            {contextType === 'nurse' ? (
                              shouldShowNurseDecisionButtons ? (
                                <>
                                  <TouchableWeb
                                    onPress={() => onDecline?.(activeShift)}
                                    style={[styles.footerButton, styles.footerDecline]}
                                  >
                                    <Text style={styles.footerDeclineText}>Decline</Text>
                                  </TouchableWeb>
                                  <TouchableWeb
                                    onPress={() => onAccept?.(activeShift)}
                                    style={[styles.footerButton, styles.footerAccept]}
                                  >
                                    <LinearGradient
                                      colors={['#10b981', '#059669']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 0, y: 1 }}
                                      style={styles.footerAcceptGradient}
                                    >
                                      <Text style={styles.footerAcceptText}>Accept</Text>
                                    </LinearGradient>
                                  </TouchableWeb>
                                </>
                              ) : shouldShowNurseClockOutButtons ? (
                                <>
                                  <TouchableWeb
                                    onPress={() => onAddNote?.(activeShift)}
                                    style={[styles.footerButton, styles.footerCancel]}
                                  >
                                    <Text style={styles.footerCancelText}>Add Notes</Text>
                                  </TouchableWeb>
                                  <TouchableWeb
                                    onPress={() => onClockOut?.(activeShift)}
                                    style={[styles.footerButton, styles.footerAccept]}
                                  >
                                    <LinearGradient
                                      colors={['#ef4444', '#dc2626']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 0, y: 1 }}
                                      style={styles.footerAcceptGradient}
                                    >
                                      <Text style={styles.footerAcceptText}>Clock Out</Text>
                                    </LinearGradient>
                                  </TouchableWeb>
                                </>
                              ) : (
                                <>
                                  <TouchableWeb
                                    onPress={() => onAddNote?.(activeShift)}
                                    style={[styles.footerButton, styles.footerCancel]}
                                  >
                                    <Text style={styles.footerCancelText}>Add Note</Text>
                                  </TouchableWeb>
                                  <TouchableWeb
                                    onPress={() => onRequestBackup?.(activeShift)}
                                    style={[styles.footerButton, styles.footerCancel]}
                                  >
                                    <Text style={styles.footerCancelText}>Back-up</Text>
                                  </TouchableWeb>
                                  <TouchableWeb
                                    onPress={() => onClockIn?.(activeShift)}
                                    disabled={!canClockInNow}
                                    style={[styles.footerButton, styles.footerAccept]}
                                  >
                                    <LinearGradient
                                      colors={['#10b981', '#059669']}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 0, y: 1 }}
                                      style={styles.footerAcceptGradient}
                                    >
                                      <Text style={styles.footerAcceptText}>Clock In</Text>
                                    </LinearGradient>
                                  </TouchableWeb>
                                </>
                              )
                            ) : (
                              <>
                                <TouchableWeb onPress={onClose} style={[styles.footerButton, styles.footerCancel]}>
                                  <Text style={styles.footerCancelText}>Cancel</Text>
                                </TouchableWeb>
                                {typeof onOpenAssignNurseModal === 'function' ? (
                                  <TouchableWeb
                                    onPress={() => onOpenAssignNurseModal(activeShift)}
                                    style={[styles.footerButton, styles.footerPrimary]}
                                  >
                                    <LinearGradient
                                      colors={SAFE_GRADIENTS.primary}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 0, y: 1 }}
                                      style={styles.footerPrimaryGradient}
                                    >
                                      <Text style={styles.footerPrimaryText}>Assign Nurse</Text>
                                    </LinearGradient>
                                  </TouchableWeb>
                                ) : null}
                              </>
                            )}
                          </View>
                          )}
                        </View>
                        <NurseDetailsModal
                          visible={!!selectedNurseForDetails}
                          nurse={selectedNurseForDetails}
                          nursesRoster={nurses}
                          onClose={() => setSelectedNurseForDetails(null)}
                        />
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
                    maxHeight: Platform.OS === 'android' ? '93%' : '85%',
                    overflow: 'hidden',
                  },
                  containerWide: {
                    width: '95%',
                    maxWidth: 860,
                  },
                  containerNarrow: {
                    width: '100%',
                    maxWidth: 380,
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
                  notesList: {
                    gap: 10,
                  },
                  notesCard: {
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: COLORS.white,
                  },
                  notesCardHeader: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    gap: 8,
                  },
                  notesCardTitle: {
                    fontSize: 14,
                    fontFamily: 'Poppins_600SemiBold',
                    color: COLORS.text,
                  },
                  notesCardSub: {
                    marginTop: 2,
                    fontSize: 12,
                    fontFamily: 'Poppins_500Medium',
                    color: COLORS.textLight,
                  },
                  notesCardBody: {
                    paddingHorizontal: 12,
                    paddingBottom: 12,
                  },
                  notesText: {
                    flex: 1,
                    fontSize: 14,
                    fontFamily: 'Poppins_400Regular',
                    color: COLORS.text,
                  },
                  rowText: {
                    fontSize: 12,
                    fontFamily: 'Poppins_500Medium',
                    color: COLORS.text,
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
                  backupRow: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.background,
                    borderRadius: 12,
                    padding: SPACING.md,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    marginBottom: SPACING.sm,
                  },
                  backupName: {
                    fontSize: 14,
                    fontFamily: 'Poppins_600SemiBold',
                    color: COLORS.text,
                  },
                  backupCode: {
                    fontSize: 12,
                    fontFamily: 'Poppins_400Regular',
                    color: COLORS.textLight,
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
                  patientInfoSubText: {
                    marginTop: 2,
                    fontSize: 12,
                    fontFamily: 'Poppins_400Regular',
                    color: COLORS.textLight,
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