import React, { useMemo } from 'react';
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
import { formatTimeTo12Hour } from '../utils/formatters';
import NurseInfoCard from './NurseInfoCard';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SAFE_GRADIENTS = {
  header: Array.isArray(GRADIENTS?.header) ? GRADIENTS.header : [COLORS.primary, COLORS.primary],
  primary: Array.isArray(GRADIENTS?.primary) ? GRADIENTS.primary : [COLORS.primary, COLORS.primary],
  success: Array.isArray(GRADIENTS?.success) ? GRADIENTS.success : ['#10b981', '#059669'],
  error: Array.isArray(GRADIENTS?.error) ? GRADIENTS.error : [COLORS.error, COLORS.error],
  warning: [COLORS.warning, COLORS.warning],
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
                  onClose,
                  onAccept,
                  onDecline,
                  onOpenAssignNurseModal,
                  onManageBackupNurses,
                }) {
                  const activeShift = shift || {};

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
                    const resolveCanonicalId = (value, response) => {
                      const raw = normalizeId(value);
                      const code = normalizeCode(value);
                      const responseCode = normalizeCode(response?.nurseCode || response?.staffCode);
                      const responseId = normalizeId(response?.nurseId || response?.uid);

                      const match = roster.find((n) => {
                        const rosterId = normalizeId(n?.id || n?._id || n?.uid || n?.nurseId);
                        const rosterCode = normalizeCode(n?.code || n?.nurseCode || n?.staffCode || n?.username);
                        if (raw && rosterId && rosterId === raw) return true;
                        if (responseId && rosterId && rosterId === responseId) return true;
                        if (code && rosterCode && rosterCode === code) return true;
                        if (responseCode && rosterCode && rosterCode === responseCode) return true;
                        return false;
                      });

                      return normalizeId(match?.id || match?._id || match?.uid || match?.nurseId) || raw;
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

                    const assigned = Array.isArray(activeShift?.assignedNurses) ? activeShift.assignedNurses : [];
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

                    const responses = activeShift?.nurseResponses;
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

                      const assignedObj = assigned.find((a) => {
                        const cand = normalizeId(a?.nurseId || a?.id || a?._id || a);
                        return cand === id;
                      });

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

                    return [...byId.values()].map((entry) => {
                      const nurse = resolveNurse(entry.nurseId);
                      const days = [...entry.days].sort((a, b) => a - b);
                      return { nurseId: entry.nurseId, nurse, days };
                    });
                  }, [activeShift, nurses]);

                  const backupNurses = Array.isArray(activeShift?.backupNurses) ? activeShift.backupNurses : [];

                  const hasNurseDecisionActions =
                    contextType === 'nurse' && (typeof onAccept === 'function' || typeof onDecline === 'function');

                  return (
                    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onClose}>
                      <View style={styles.overlay}>
                        <View style={[
                          styles.container,
                          (contextType === 'nurse' || !onOpenAssignNurseModal) ? styles.containerNarrow : styles.containerWide
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

                                const responseEntry = responses && typeof responses === 'object'
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

                                    <View style={styles.card}>
                                      <View style={styles.cardHeader}>
                                        {card.nurse.photo ? (
                                          <Image source={{ uri: card.nurse.photo }} style={styles.avatar} />
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
                                        <View style={styles.statusChip}>
                                          <LinearGradient
                                            colors={statusColors}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={styles.statusChipGradient}
                                          >
                                            <Text style={styles.statusChipText}>{statusLabel}</Text>
                                          </LinearGradient>
                                        </View>
                                      </View>

                                    <View style={styles.row}>
                                      <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
                                      <Text style={styles.rowText}>{activeShift?.service || 'Split Schedule Services'}</Text>
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
                          </ScrollView>

                          {/* Footer removed */}
                        </View>
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
                    fontFamily: 'Poppins_700Bold',
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
                    fontFamily: 'Poppins_700Bold',
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
                });