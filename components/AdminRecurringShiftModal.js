import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, SERVICES, GRADIENTS } from '../constants';
import ApiService from '../services/ApiService';
import { useNotifications } from '../context/NotificationContext';
import NurseDetailsModal from './NurseDetailsModal';

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function AdminRecurringShiftModal({
  visible,
  onClose,
  onSuccess,
  nurses = [],
  clients = [],
}) {
  // Form state
  const [selectedNurse, setSelectedNurse] = useState(null); // For single nurse mode
  const [splitScheduleNurse, setSplitScheduleNurse] = useState(null); // For split schedule mode
  const [selectedClient, setSelectedClient] = useState(null);
  const [service, setService] = useState('');
  const [splitNurseServices, setSplitNurseServices] = useState({});
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [loading, setLoading] = useState(false);

  const [assignmentType, setAssignmentType] = useState('single-nurse');
  const [backupNurses, setBackupNurses] = useState([]);
  const [nurseSchedule, setNurseSchedule] = useState({});
  const [showBackupNurseModal, setShowBackupNurseModal] = useState(false);
  const [backupNurseSearch, setBackupNurseSearch] = useState('');
  const [nurseDetailsModalVisible, setNurseDetailsModalVisible] = useState(false);
  const [selectedNurseDetails, setSelectedNurseDetails] = useState(null);
  const [nurseDetailsMode, setNurseDetailsMode] = useState(null); // 'backup' | 'select'
  const { sendNotificationToUser } = useNotifications();
  const [splitSelectedNurses, setSplitSelectedNurses] = useState([]);

  const closeBackupNurseModal = () => {
    setShowBackupNurseModal(false);
    setBackupNurseSearch('');
  };

  const toggleDay = (dayValue) => {
    setSelectedDays(prev => {
      const list = Array.isArray(prev) ? prev : [];
      if (list.includes(dayValue)) {
        return list.filter(d => d !== dayValue);
      }
      return [...list, dayValue].sort((a, b) => a - b);
    });
  };

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [nurseSearch, setNurseSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isNurseFocused, setIsNurseFocused] = useState(false);
  const [isClientFocused, setIsClientFocused] = useState(false);

  const currentNurse = assignmentType === 'single-nurse' ? selectedNurse : splitScheduleNurse;
  const setCurrentNurse = assignmentType === 'single-nurse' ? setSelectedNurse : setSplitScheduleNurse;

  const currentSplitNurseId = splitScheduleNurse?._id || splitScheduleNurse?.id || null;
  const currentSplitService = currentSplitNurseId
    ? (splitNurseServices?.[currentSplitNurseId] || '')
    : '';

  const filteredNurses = useMemo(() => {
    const allNurses = Array.isArray(nurses) ? nurses : [];
    const query = (nurseSearch || '').trim().toLowerCase();

    const getNurseName = (nurse) =>
      (
        nurse?.fullName ||
        nurse?.displayName ||
        nurse?.name ||
        `${nurse?.firstName || ''} ${nurse?.lastName || ''}`.trim()
      );

    const matchesQuery = (nurse) => {
      if (!query) return true;
      const name = (getNurseName(nurse) || '').toLowerCase();
      const email = (nurse?.email || nurse?.contactEmail || '').toLowerCase();
      const code = String(nurse?.code || nurse?.nurseCode || nurse?.username || '').toLowerCase();
      return name.includes(query) || email.includes(query) || code.includes(query);
    };

    const results = allNurses.filter(matchesQuery);
    results.sort((a, b) => (getNurseName(a) || '').localeCompare(getNurseName(b) || ''));
    return results;
  }, [nurses, nurseSearch]);

  const filteredClients = useMemo(() => {
    const allClients = Array.isArray(clients) ? clients : [];
    const query = (clientSearch || '').trim().toLowerCase();

    const getClientName = (client) =>
      (
        client?.name ||
        client?.fullName ||
        client?.displayName ||
        `${client?.firstName || ''} ${client?.lastName || ''}`.trim()
      );

    const matchesQuery = (client) => {
      if (!query) return true;
      const name = (getClientName(client) || '').toLowerCase();
      const email = (client?.email || client?.contactEmail || '').toLowerCase();
      const phone = String(client?.phone || client?.contactNumber || '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    };

    const results = allClients.filter(matchesQuery);
    results.sort((a, b) => (getClientName(a) || '').localeCompare(getClientName(b) || ''));
    return results;
  }, [clients, clientSearch]);

  // Compute summary of nurses in split-schedule with their assigned days
  const splitAssignmentSummaries = useMemo(() => {
    if (assignmentType !== 'split-schedule' || !Array.isArray(splitSelectedNurses) || splitSelectedNurses.length === 0) {
      return [];
    }
    return splitSelectedNurses.map(nurse => {
      const nurseId = nurse._id || nurse.id;
      const assignedDays = Object.keys(nurseSchedule)
        .filter((dayValue) => nurseSchedule[dayValue] === nurseId)
        .map((dayValue) => Number(dayValue))
        .filter((dayValue) => !Number.isNaN(dayValue))
        .sort((a, b) => a - b);
      const staffCodeRaw = nurse?.code || nurse?.nurseCode || nurse?.staffCode || nurse?.username || null;
      const staffCodeKey = staffCodeRaw ? String(staffCodeRaw).trim().toUpperCase() : null;
      const nurseService =
        (nurseId ? splitNurseServices?.[nurseId] : null) ||
        (staffCodeKey ? splitNurseServices?.[staffCodeKey] : null) ||
        null;
      return {
        nurse,
        nurseId,
        assignedDays,
        nurseService,
      };
    });
  }, [assignmentType, splitSelectedNurses, nurseSchedule, splitNurseServices]);

  const getDayLabelByValue = (dayValue) => {
    const parsed = Number(dayValue);
    const match = DAYS_OF_WEEK.find(day => day.value === parsed);
    return match ? match.label : `Day ${dayValue}`;
  };

  const formatSelectedDayList = (dayList = []) => {
    if (!Array.isArray(dayList) || dayList.length === 0) {
      return 'No days selected';
    }
    return dayList
      .map(day => getDayLabelByValue(day))
      .join(', ');
  };

  const getClientDisplayName = (client) => {
    if (!client) return 'your care schedule';
    return (
      client.name ||
      client.fullName ||
      `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
      'your care schedule'
    );
  };

  const enrichBackupNurseDetails = (backupList = []) => {
    if (!Array.isArray(backupList) || backupList.length === 0) return [];
    return backupList.map((backup, index) => {
      const nurseRecord =
        nurses.find(n => (n._id || n.id) === backup.nurseId)
        || (backup?.staffCode
          ? nurses.find((n) => {
              const code = (n?.code || n?.nurseCode || n?.staffCode || n?.username || '').toString().trim().toUpperCase();
              const needle = backup.staffCode.toString().trim().toUpperCase();
              return code && needle && code === needle;
            })
          : null)
        || {};
      const rawName = nurseRecord.fullName || `${nurseRecord.firstName || ''} ${nurseRecord.lastName || ''}`.trim();
      const staffCodeResolved =
        backup?.staffCode
        || nurseRecord?.code
        || nurseRecord?.nurseCode
        || nurseRecord?.staffCode
        || nurseRecord?.username
        || null;
      return {
        ...backup,
        nurseId: backup.nurseId,
        priority: backup.priority || index + 1,
        // Store both legacy + snapshot fields so all UIs can render consistently.
        fullName: rawName || backup.name || 'Backup Nurse',
        nurseName: rawName || backup.name || backup.nurseName || 'Backup Nurse',
        staffCode: staffCodeResolved,
        nurseCode: staffCodeResolved,
        email: nurseRecord.email || nurseRecord.contactEmail || null,
        phone: nurseRecord.phone || nurseRecord.contactNumber || null,
        profilePhoto: nurseRecord.profilePhoto || nurseRecord.profileImage || nurseRecord.photoUrl || null,
      };
    });
  };

  const handleDateChange = (event, date, isEnd = false) => {
    if (date) {
      if (isEnd) {
        setEndDate(date);
      } else {
        setStartDate(date);
      }
    }
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  // Helper to parse time string to Date object for picker
  const parseTime = (timeStr) => {
    const d = new Date();
    const [hours, minutes] = timeStr.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return d;
  };

  const handleTimeChange = (event, date, isEnd = false) => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      if (isEnd) {
        setEndTime(timeStr);
      } else {
        setStartTime(timeStr);
      }
    }
    // Don't close immediately on iOS spinner, wait for confirm
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
    }
  };

  const getTimeParts = (time) => {
    if (!time) return null;

    if (time instanceof Date && !isNaN(time.getTime())) {
      return { hours: time.getHours(), minutes: time.getMinutes() };
    }

    const timeString = typeof time === 'string' ? time.trim() : String(time);

    const detailedMatch = timeString.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    const simpleMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const match = detailedMatch || simpleMatch;
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return { hours, minutes };
      }
    }

    const parsed = new Date(timeString);
    if (!isNaN(parsed.getTime())) {
      return { hours: parsed.getHours(), minutes: parsed.getMinutes() };
    }

    return null;
  };

  const formatTime12Hour = (time) => {
    const parts = getTimeParts(time);
    if (!parts) return typeof time === 'string' ? time : 'N/A';

    const { hours, minutes } = parts;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minutesPadded = String(minutes).padStart(2, '0');
    return `${hour12}:${minutesPadded} ${ampm}`;
  };

  const formatTime = (time) => {
    const parts = getTimeParts(time);
    if (!parts) return typeof time === 'string' ? time : '00:00';

    const hoursPadded = String(parts.hours).padStart(2, '0');
    const minutesPadded = String(parts.minutes).padStart(2, '0');
    return `${hoursPadded}:${minutesPadded}`;
  };

  // Add/update nurse in split-schedule list (avoid duplicates)
  const upsertSplitNurse = (nurse) => {
    if (!nurse) return;
    const nurseId = nurse._id || nurse.id;
    setSplitSelectedNurses(prev => {
      const exists = prev.some(n => (n._id || n.id) === nurseId);
      if (exists) return prev;
      return [...prev, nurse];
    });
  };

  // Route nurse selection based on assignment mode
  const handleNurseSelect = (nurse) => {
    if (assignmentType === 'split-schedule') {
      setSplitScheduleNurse(nurse);
      upsertSplitNurse(nurse);
      setNurseSearch('');
      setIsNurseFocused(false);
      Keyboard.dismiss();
    } else {
      setSelectedNurse(nurse);
      setNurseSearch('');
      setIsNurseFocused(false);
      Keyboard.dismiss();
    }
  };

  // Remove nurse from split-schedule list and clear their day assignments
  const handleRemoveSplitNurse = (nurseId) => {
    const currentSelectedId = splitScheduleNurse?._id || splitScheduleNurse?.id;
    if (currentSelectedId === nurseId) {
      setSplitScheduleNurse(null);
    }

    const nurseRecord = (Array.isArray(splitSelectedNurses) ? splitSelectedNurses : []).find(
      (n) => (n?._id || n?.id) === nurseId
    );
    const staffCodeKey = nurseRecord?.code || nurseRecord?.nurseCode || nurseRecord?.staffCode || nurseRecord?.username || null;

    setSplitSelectedNurses(prev => prev.filter(n => (n._id || n.id) !== nurseId));
    setSplitNurseServices(prev => {
      if (!prev || typeof prev !== 'object') return {};
      const updated = { ...prev };
      delete updated[nurseId];
      if (staffCodeKey) {
        delete updated[String(staffCodeKey).trim().toUpperCase()];
      }
      return updated;
    });
    setNurseSchedule(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach((dayValue) => {
        if (updated[dayValue] === nurseId) {
          delete updated[dayValue];
        }
      });
      return updated;
    });
  };

  const notifyStakeholders = async ({
    shiftId,
    clientSnapshot,
    scheduleDays,
    serviceTitle,
    startTimeValue,
    endTimeValue,
    primaryNurseName,
    assignmentDescriptor,
    backupDetails,
    assignmentTypeKey,
  }) => {
    try {
      const notificationTasks = [];
      const formattedDays = formatSelectedDayList(scheduleDays);
      const formattedStart = formatTime12Hour(startTimeValue);
      const formattedEnd = formatTime12Hour(endTimeValue);
      const clientName = getClientDisplayName(clientSnapshot);
      const patientId = clientSnapshot?._id || clientSnapshot?.id || clientSnapshot?.userId;

      if (patientId && typeof sendNotificationToUser === 'function') {
        notificationTasks.push(
          sendNotificationToUser(
            patientId,
            'patient',
            'Recurring care schedule confirmed',
            `${primaryNurseName} is scheduled for ${serviceTitle} on ${formattedDays} (${formattedStart} - ${formattedEnd}).`,
            {
              type: 'recurring_shift_assignment',
              shiftId,
              service: serviceTitle,
              days: scheduleDays,
              startTime: startTimeValue,
              endTime: endTimeValue,
              assignment: assignmentDescriptor,
              backupNurses: backupDetails,
            }
          )
        );
      }

      if (assignmentTypeKey !== 'split-schedule' && backupDetails.length && typeof sendNotificationToUser === 'function') {
        backupDetails.forEach(backup => {
          if (!backup.nurseId) return;
          notificationTasks.push(
            sendNotificationToUser(
              backup.nurseId,
              'nurse',
              'Emergency backup assignment',
              `You are priority ${backup.priority} backup for ${clientName} (${serviceTitle}) on ${formattedDays}.`,
              {
                type: 'backup_nurse_assignment',
                shiftId,
                clientId: clientSnapshot?._id || clientSnapshot?.id || null,
                priority: backup.priority,
                service: serviceTitle,
                days: scheduleDays,
              }
            )
          );
        });
      }

      if (notificationTasks.length) {
        await Promise.allSettled(notificationTasks);
      }
    } catch (error) {
      console.error('Failed to deliver schedule notifications:', error);
    }
  };

  const validateForm = () => {
    if (assignmentType === 'single-nurse') {
      if (!selectedNurse) {
        Alert.alert('Error', 'Please select a nurse');
        return false;
      }
    } else if (assignmentType === 'split-schedule') {
      const selectedCount = Array.isArray(splitSelectedNurses) ? splitSelectedNurses.length : 0;
      const scheduleMap = nurseSchedule || {};
      const dayAssignmentsCount = Object.keys(scheduleMap).length;
      const assignedIdsCount = Object.values(scheduleMap).filter(Boolean).length;
      if (selectedCount === 0) {
        Alert.alert('Error', 'Please select at least one nurse');
        return false;
      }
      if (dayAssignmentsCount === 0) {
        Alert.alert('Error', 'Please assign at least one day');
        return false;
      }
      if (assignedIdsCount === 0) {
        Alert.alert('Error', 'Please assign at least one day to a nurse');
        return false;
      }
      // For split schedule, check that each assigned nurse has a service
      const servicesMap = splitNurseServices || {};
      const assignedNurseIds = Object.values(scheduleMap).filter(Boolean);
      const nursesWithoutService = assignedNurseIds.filter(nurseId => !servicesMap[nurseId]);
      if (nursesWithoutService.length > 0) {
        Alert.alert('Error', 'Please assign a service to each nurse in the schedule');
        return false;
      }
    }
    
    // Only require global service for single nurse assignment
    if (assignmentType === 'single-nurse' && (!service || service.trim() === '')) {
      Alert.alert('Error', 'Please select a service');
      return false;
    }
    
    // For single nurse, check selectedDays
    if (assignmentType === 'single-nurse' && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return false;
    }
    
    if (!startDate) {
      Alert.alert('Error', 'Please select a start date');
      return false;
    }
    if (!startTime) {
      Alert.alert('Error', 'Please select a start time');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // For split schedule, use days from nurseSchedule; for single nurse, use selectedDays
      const daysToUse = assignmentType === 'split-schedule' 
        ? Object.keys(nurseSchedule).map(Number).sort((a, b) => a - b)
        : [...selectedDays].sort((a, b) => a - b);
        
      const sortedDays = daysToUse;
      const assignedNurseIds = assignmentType === 'split-schedule'
        ? [...new Set(Object.values(nurseSchedule || {}).filter(Boolean))]
        : [selectedNurse?._id || selectedNurse?.id].filter(Boolean);

      const primaryNurseId = assignmentType === 'split-schedule'
        ? (assignedNurseIds[0] || (splitSelectedNurses?.[0]?._id || splitSelectedNurses?.[0]?.id))
        : (selectedNurse?._id || selectedNurse?.id);

      const primaryNurseRecord = assignmentType === 'split-schedule'
        ? (splitSelectedNurses || []).find((n) => (n?._id || n?.id) === primaryNurseId) ||
          (Array.isArray(nurses) ? nurses.find((n) => (n?._id || n?.id) === primaryNurseId) : null)
        : selectedNurse;

      const nurseName = primaryNurseRecord?.fullName || `${primaryNurseRecord?.firstName || ''} ${primaryNurseRecord?.lastName || ''}`.trim();
      const nurseEmail = primaryNurseRecord?.email || primaryNurseRecord?.contactEmail || null;
      const nursePhone = primaryNurseRecord?.phone || primaryNurseRecord?.contactNumber || null;
      const nurseUid = primaryNurseRecord?.uid || primaryNurseRecord?.id || primaryNurseRecord?._id || null;
      const nurseCode = primaryNurseRecord?.nurseCode || primaryNurseRecord?.code || primaryNurseRecord?.staffCode || primaryNurseRecord?.username || null;
      const startDateIso = startDate.toISOString().split('T')[0];
      const endDateIso = endDate ? endDate.toISOString().split('T')[0] : null;
      const nowIso = new Date().toISOString();

      const backupDetails = enrichBackupNurseDetails(assignmentType === 'single-nurse' ? backupNurses : []);
      const clientSnapshot = selectedClient ? { ...selectedClient } : null;
      const assignmentDescriptor = assignmentType === 'split-schedule'
        ? 'Split Schedule (Multiple Nurses)'
        : backupDetails.length > 0
          ? `Single Nurse + ${backupDetails.length} Backup${backupDetails.length > 1 ? 's' : ''}`
          : 'Single Nurse Assignment';

      // Build nurseResponses map with all nurse identifiers for reliable matching
      const nurseResponses = {};
      const nursesToRespond = assignmentType === 'split-schedule'
        ? (Array.isArray(splitSelectedNurses) ? splitSelectedNurses : [])
        : [primaryNurseRecord].filter(Boolean);

      for (const nurse of nursesToRespond) {
        const keys = [
          nurse?.uid,
          nurse?.id,
          nurse?._id,
          nurse?.nurseCode,
          nurse?.code,
          nurse?.staffCode,
          nurse?.username,
        ].filter(v => v && String(v).trim());

        const responseEntry = {
          status: 'pending',
          assignedAt: nowIso,
          nurseId: nurse?.uid || nurse?.id || nurse?._id || null,
          nurseName: nurse?.fullName || `${nurse?.firstName || ''} ${nurse?.lastName || ''}`.trim() || 'Nurse',
          uid: nurse?.uid || null,
          email: nurse?.email || nurse?.contactEmail || null,
          nurseCode: nurse?.nurseCode || nurse?.code || nurse?.staffCode || null,
        };

        // Add entry under each key variant for robust lookup
        for (const key of keys) {
          if (key) nurseResponses[String(key).trim()] = responseEntry;
        }
      }

      const payload = {
        nurseId: nurseCode || nurseUid || primaryNurseId,
        nurseName: nurseName || 'Assigned Nurse',
        nurseEmail,
        nursePhone,
        nurseUid,
        nurseCode,
        staffCode: nurseCode,
        clientId: selectedClient?._id || selectedClient?.id || null,
        clientName: selectedClient ? (selectedClient.name || selectedClient.fullName || `${selectedClient.firstName} ${selectedClient.lastName}`.trim()) : null,
        patientName: selectedClient ? (selectedClient.name || selectedClient.fullName || `${selectedClient.firstName} ${selectedClient.lastName}`.trim()) : null,
        clientEmail: selectedClient?.email || null,
        clientPhone: selectedClient?.phone || null,
        clientAddress: selectedClient?.address || null,
        service: assignmentType === 'split-schedule' ? 'Split Schedule Services' : service.trim(),
        nurseServices: assignmentType === 'split-schedule' ? splitNurseServices : null,
        startDate: startDateIso,
        endDate: endDateIso,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        daysOfWeek: sortedDays,
        recurringDaysOfWeek: sortedDays,
        recurringDaysOfWeekList: sortedDays,
        recurringStartTime: formatTime(startTime),
        recurringEndTime: formatTime(endTime),
        recurringPeriodStart: startDateIso,
        recurringPeriodEnd: endDateIso,
        location: selectedClient?.address ? { address: selectedClient.address } : null,
        requestDate: nowIso,
        requestedAt: nowIso,
        status: 'pending',
        isShift: true,
        adminRecurring: true,
        nurseResponses: Object.keys(nurseResponses).length > 0 ? nurseResponses : null,
        // NEW: Backup nurse and split schedule fields
        assignmentType,
        backupNurses: assignmentType === 'single-nurse' && backupDetails.length > 0 ? backupDetails : null,
        nurseSchedule: assignmentType === 'split-schedule' && Object.keys(nurseSchedule).length > 0 ? nurseSchedule : null,
        primaryNurseId,
        assignedNurses: assignmentType === 'split-schedule' ? assignedNurseIds : assignedNurseIds,
      };

      const response = await ApiService.makeRequest('/shifts/request/admin-recurring', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success || response.shiftRequest) {
        const createdShift = response.shiftRequest || response.data?.shiftRequest || response.data || null;
        try {
          await notifyStakeholders({
            shiftId: createdShift?._id || createdShift?.id || null,
            clientSnapshot,
            scheduleDays: sortedDays,
            serviceTitle: service.trim(),
            startTimeValue: formatTime(startTime),
            endTimeValue: formatTime(endTime),
            primaryNurseName: nurseName || 'Assigned Nurse',
            assignmentDescriptor,
            backupDetails,
            assignmentTypeKey: assignmentType,
          });
        } catch (notificationError) {
          console.error('Recurring shift notification error:', notificationError);
        }
        Alert.alert('Success', 'Recurring shift request created successfully');
        resetForm();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Error', response.error || 'Failed to create recurring shift request');
      }
    } catch (error) {
      console.error('Error creating recurring shift:', error);
      Alert.alert('Error', error.message || 'Failed to create recurring shift request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedNurse(null);
    setSplitScheduleNurse(null);
    setSelectedClient(null);
    setService('');
    setSplitNurseServices({});
    setSelectedDays([]);
    setStartDate(new Date());
    setEndDate(null);
    setStartTime('09:00');
    setEndTime('10:00');
    setNurseSearch('');
    setClientSearch('');
    setIsNurseFocused(false);
    setIsClientFocused(false);
    // NEW: Reset backup/split schedule state
    setAssignmentType('single-nurse');
    setBackupNurses([]);
    setNurseSchedule({});
    setSplitSelectedNurses([]);
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Clear AsyncStorage data (temporary utility)
  const handleClearAsyncStorage = async () => {
    Alert.alert(
      'Clear Local Data',
      'This will remove all locally stored data including duplicate invoices. The app will now use Firestore for all data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.clear();
              Alert.alert(
                'Success',
                `Cleared ${keys.length} items from local storage. New invoices will start from NUR-INV-0001 and save to Firestore.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear local data: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const selectedClientPhoto = selectedClient?.profilePhoto
    || selectedClient?.profileImage
    || selectedClient?.photoUrl
    || selectedClient?.image
    || null;
  const selectedClientName = selectedClient?.name
    || selectedClient?.fullName
    || selectedClient?.displayName
    || `${selectedClient?.firstName || ''} ${selectedClient?.lastName || ''}`.trim()
    || 'Client';
  const selectedClientInitials = selectedClientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'C';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Recurring Shift</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={handleClearAsyncStorage} 
                style={{ 
                  backgroundColor: COLORS.error, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 8,
                  marginRight: 8 
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>
                  Clear Data
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Assignment Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Assignment Type</Text>
              <View style={styles.assignmentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeChip,
                    assignmentType === 'single-nurse' && styles.assignmentTypeChipActiveWrapper
                  ]}
                  onPress={() => {
                    setAssignmentType('single-nurse');
                    setSplitScheduleNurse(null);
                    setSplitSelectedNurses([]);
                    setNurseSchedule({});
                  }}
                >
                  {assignmentType === 'single-nurse' ? (
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.assignmentTypeChipGradient}
                    >
                      <MaterialCommunityIcons name="account" size={18} color={COLORS.white} />
                      <Text style={styles.assignmentTypeTextActive}>Single Nurse</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.assignmentTypeChipInactive}>
                      <MaterialCommunityIcons name="account" size={18} color={COLORS.primary} />
                      <Text style={styles.assignmentTypeText}>Single Nurse</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.assignmentTypeChip,
                    assignmentType === 'split-schedule' && styles.assignmentTypeChipActiveWrapper
                  ]}
                  onPress={() => {
                    setAssignmentType('split-schedule');
                    if (selectedNurse) {
                      setSplitScheduleNurse(selectedNurse);
                      upsertSplitNurse(selectedNurse);
                    }
                  }}
                >
                  {assignmentType === 'split-schedule' ? (
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.assignmentTypeChipGradient}
                    >
                      <MaterialCommunityIcons name="account-multiple" size={18} color={COLORS.white} />
                      <Text style={styles.assignmentTypeTextActive}>Split Schedule</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.assignmentTypeChipInactive}>
                      <MaterialCommunityIcons name="account-multiple" size={18} color={COLORS.primary} />
                      <Text style={styles.assignmentTypeText}>Split Schedule</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {assignmentType === 'split-schedule' && (
                <Text style={styles.helperText}>
                  Assign different nurses to specific days of the week
                </Text>
              )}
            </View>

            {/* Nurse Selection */}
            <View
              style={[
                styles.section,
                (isNurseFocused || (nurseSearch.length > 0 && !selectedNurse)) && { zIndex: 4000 },
              ]}
            >
              <Text style={styles.label}>Select Nurse *</Text>
              {!currentNurse ? (
                <TouchableOpacity
                  style={styles.selectNurseButton}
                  onPress={() => setIsNurseFocused(true)}
                >
                  <MaterialCommunityIcons name="account-search" size={20} color={COLORS.primary} />
                  <Text style={styles.selectNurseButtonText}>Select Nurse</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}

              {currentNurse && (
                <View style={styles.selectedNurseCardWrapper}>
                  <View
                    style={[
                      styles.nurseCard,
                      styles.nurseCardSelected,
                      assignmentType === 'split-schedule' ? null : { borderBottomWidth: 0 },
                    ]}
                  >
                    {currentNurse.profilePhoto || currentNurse.profileImage || currentNurse.photoUrl ? (
                      <Image
                        source={{ uri: currentNurse.profilePhoto || currentNurse.profileImage || currentNurse.photoUrl }}
                        style={styles.nurseAvatar}
                      />
                    ) : (
                      <View style={[styles.nurseAvatar, styles.nurseAvatarFallback]}>
                        <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.white} />
                      </View>
                    )}
                    <View style={styles.nurseInfo}>
                      <Text style={styles.nurseName} numberOfLines={1}>
                        {currentNurse.fullName || `${currentNurse.firstName || ''} ${currentNurse.lastName || ''}`.trim() || 'Nurse'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsNurseFocused(true)} style={styles.changeButton}>
                      <LinearGradient
                        colors={GRADIENTS.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.changeButtonGradient}
                      >
                        <Text style={styles.changeButtonText}>Change</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Shift Details for Split Schedule */}
                  {assignmentType === 'split-schedule' && (
                    <>
                      {/* Service Selection */}
                      <View style={styles.nurseShiftDetailRow}>
                        <View style={styles.shiftDetailIconWrapper}>
                          <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
                        </View>
                        <View style={styles.shiftDetailContent}>
                          <Text style={styles.shiftDetailLabel}>Service</Text>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.inlineServiceScroll}
                          >
                            {SERVICES.map((srv) => (
                              <TouchableOpacity
                                key={srv.id}
                                style={[styles.inlineServiceChip]}
                                onPress={() => {
                                  const nurseId = splitScheduleNurse?._id || splitScheduleNurse?.id;
                                  const staffCode = (
                                    splitScheduleNurse?.code ||
                                    splitScheduleNurse?.nurseCode ||
                                    splitScheduleNurse?.staffCode ||
                                    splitScheduleNurse?.username ||
                                    null
                                  );
                                  if (nurseId) {
                                    // For split schedule, only set the service for the specific nurse
                                    setSplitNurseServices(prev => ({
                                      ...(prev && typeof prev === 'object' ? prev : {}),
                                      [nurseId]: srv.title,
                                      ...(staffCode
                                        ? { [String(staffCode).trim().toUpperCase()]: srv.title }
                                        : null),
                                    }));
                                    // Don't set global service for split schedule, it confuses the fallback logic
                                  } else {
                                    // If no nurse selected, set as global service
                                    setService(srv.title);
                                  }
                                }}
                              >
                                {(currentSplitService || service) === srv.title ? (
                                  <LinearGradient
                                    colors={GRADIENTS.header}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={styles.inlineServiceChipGradient}
                                  >
                                    <MaterialCommunityIcons name={srv.icon} size={14} color={COLORS.white} />
                                    <Text style={styles.inlineServiceTextSelected} numberOfLines={1}>{srv.title}</Text>
                                  </LinearGradient>
                                ) : (
                                  <View style={styles.inlineServiceChipInactive}>
                                    <MaterialCommunityIcons name={srv.icon} size={14} color={COLORS.primary} />
                                    <Text style={styles.inlineServiceText} numberOfLines={1}>{srv.title}</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>

                      {/* Days Assignment */}
                      <View style={styles.nurseShiftDetailRow}>
                        <View style={styles.shiftDetailIconWrapper}>
                          <MaterialCommunityIcons name="calendar-week" size={16} color={COLORS.primary} />
                        </View>
                        <View style={styles.shiftDetailContent}>
                          <Text style={styles.shiftDetailLabel}>Assign Days</Text>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.nurseDayPillsScroll}
                          >
                            {DAYS_OF_WEEK.map(day => {
                              const isAssigned = nurseSchedule[day.value] === (splitScheduleNurse?._id || splitScheduleNurse?.id);
                              return (
                                <TouchableOpacity
                                  key={day.value}
                                  style={styles.nurseDayPill}
                                  onPress={() => {
                                    setNurseSchedule(prev => {
                                      const updated = { ...prev };
                                      if (isAssigned) {
                                        delete updated[day.value];
                                      } else {
                                        updated[day.value] = splitScheduleNurse?._id || splitScheduleNurse?.id;
                                      }
                                      return updated;
                                    });
                                  }}
                                >
                                  {isAssigned ? (
                                    <LinearGradient
                                      colors={GRADIENTS.header}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 0, y: 1 }}
                                      style={styles.nurseDayPillGradient}
                                    >
                                      <Text style={styles.nurseDayPillTextSelected}>{day.label}</Text>
                                    </LinearGradient>
                                  ) : (
                                    <View style={styles.nurseDayPillInactive}>
                                      <Text style={styles.nurseDayPillText}>{day.label}</Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </View>

                      {/* Time Pickers */}
                      <View style={styles.nurseShiftDetailRow}>
                        <View style={styles.shiftDetailIconWrapper}>
                          <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.primary} />
                        </View>
                        <View style={styles.shiftDetailContent}>
                          <Text style={styles.shiftDetailLabel}>Shift Time</Text>
                          <View style={styles.inlineTimePickersRow}>
                            <TouchableOpacity 
                              style={styles.inlineTimeButton}
                              onPress={() => setShowStartTimePicker(true)}
                            >
                              <MaterialCommunityIcons name="clock-start" size={14} color={COLORS.primary} />
                              <Text style={styles.inlineTimeText}>{formatTime12Hour(startTime)}</Text>
                            </TouchableOpacity>
                            <Text style={styles.timeSeparator}>to</Text>
                            <TouchableOpacity 
                              style={styles.inlineTimeButton}
                              onPress={() => setShowEndTimePicker(true)}
                            >
                              <MaterialCommunityIcons name="clock-end" size={14} color={COLORS.primary} />
                              <Text style={styles.inlineTimeText}>{formatTime12Hour(endTime)}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Done Button */}
                      <View style={styles.addShiftRow}>
                        <TouchableOpacity
                          style={styles.addShiftButton}
                          onPress={() => {
                            if (splitScheduleNurse) {
                              upsertSplitNurse(splitScheduleNurse);
                            }
                            setService('');
                            setSplitScheduleNurse(null);
                            setNurseSearch('');
                            setIsNurseFocused(false);
                            Keyboard.dismiss();
                          }}
                        >
                          <LinearGradient
                            colors={GRADIENTS.header}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.addShiftButtonGradient}
                          >
                            <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.white} />
                            <Text style={styles.addShiftButtonText}>Done</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
              
              {/* Nurse Selection Modal */}
              <Modal
                visible={isNurseFocused}
                animationType="slide"
                transparent
                onRequestClose={() => setIsNurseFocused(false)}
              >
                <TouchableOpacity
                  style={styles.backupModalOverlay}
                  activeOpacity={1}
                  onPress={() => setIsNurseFocused(false)}
                >
                  <View
                    style={styles.backupModalContainer}
                    onStartShouldSetResponder={() => true}
                  >
                    <View style={styles.backupModalHeader}>
                      <Text style={styles.backupModalTitle}>Select Nurse</Text>
                      <TouchableOpacity
                        onPress={() => setIsNurseFocused(false)}
                        style={styles.backupModalCloseButton}
                      >
                        <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                      <View style={[styles.inputContainer, { marginBottom: 0 }]}>
                        <MaterialCommunityIcons name="account-search" size={20} color={COLORS.primary} />
                        <TextInput
                          placeholder="Search nurse name..."
                          style={styles.input}
                          value={nurseSearch}
                          onChangeText={setNurseSearch}
                          placeholderTextColor={COLORS.textMuted}
                          autoFocus
                        />
                        {nurseSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setNurseSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <ScrollView
                      style={styles.backupModalContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      <Text style={styles.availableNursesLabel}>Available Nurses</Text>
                      {filteredNurses.map((nurse) => (
                        <View
                          key={nurse._id || nurse.id}
                          style={styles.backupNurseOption}
                        >
                          {nurse.profilePhoto || nurse.profileImage || nurse.photoUrl ? (
                            <Image
                              source={{ uri: nurse.profilePhoto || nurse.profileImage || nurse.photoUrl }}
                              style={styles.backupNurseAvatar}
                            />
                          ) : (
                            <View style={[styles.backupNurseAvatar, styles.backupNurseAvatarFallback]}>
                              <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.white} />
                            </View>
                          )}
                          <View style={styles.backupNurseOptionInfo}>
                            <Text style={styles.backupNurseOptionName}>
                              {nurse.fullName || `${nurse.firstName} ${nurse.lastName}`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.backupNurseAddButton}
                            onPress={() => {
                              setSelectedNurseDetails(nurse);
                              setNurseDetailsMode('select');
                              setIsNurseFocused(false);
                              setTimeout(() => {
                                setNurseDetailsModalVisible(true);
                              }, 300);
                            }}
                          >
                            <LinearGradient
                              colors={GRADIENTS.header}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={styles.backupNurseAddButtonGradient}
                            >
                              <Text style={styles.backupNurseAddButtonText}>View</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            {assignmentType === 'split-schedule' && splitAssignmentSummaries.length > 0 && (
              <View style={styles.splitSummaryContainer}>
                <Text style={styles.splitSummaryTitle}>Currently splitting between</Text>
                {splitAssignmentSummaries.map(({ nurse, nurseId, assignedDays, nurseService }) => (
                  <View key={nurseId} style={styles.splitSummaryCard}>
                    {nurse.profilePhoto || nurse.profileImage || nurse.photoUrl ? (
                      <Image
                        source={{ uri: nurse.profilePhoto || nurse.profileImage || nurse.photoUrl }}
                        style={styles.splitSummaryAvatar}
                      />
                    ) : (
                      <View style={[styles.splitSummaryAvatar, styles.nurseAvatarFallback]}>
                        <MaterialCommunityIcons name="account-heart" size={18} color={COLORS.white} />
                      </View>
                    )}
                    <View style={styles.splitSummaryInfo}>
                      <Text style={styles.splitSummaryName} numberOfLines={1}>
                        {nurse.fullName || `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() || 'Nurse'}
                      </Text>
                      {nurseService && (
                        <Text style={styles.splitSummaryService} numberOfLines={1}>
                          <MaterialCommunityIcons name="medical-bag" size={12} color={COLORS.primary} /> {nurseService}
                        </Text>
                      )}
                      <Text style={styles.splitSummaryMeta} numberOfLines={1}>
                        {assignedDays.length > 0
                          ? `Days: ${assignedDays.map(day => getDayLabelByValue(day)).join(', ')}`
                          : 'No days assigned yet'}
                      </Text>
                    </View>
                    <View style={styles.splitSummaryActions}>
                      <TouchableOpacity
                        style={styles.splitSummaryIconButton}
                        onPress={() => {
                          setAssignmentType('split-schedule');
                          setSplitScheduleNurse(nurse);
                          upsertSplitNurse(nurse);
                          setNurseSearch('');
                          setIsNurseFocused(false);
                          Keyboard.dismiss();
                        }}
                      >
                        <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.splitSummaryIconButton}
                        onPress={() => handleRemoveSplitNurse(nurseId)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Backup Nurses (Emergency Coverage) - Only for Single Nurse */}
            {assignmentType === 'single-nurse' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.label}>Emergency Backup Nurses</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowBackupNurseModal(true)}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.addButtonGradient}
                    >
                      <MaterialCommunityIcons name="plus-circle" size={16} color={COLORS.white} />
                      <Text style={styles.addButtonText}>Add Backup</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Nurses who can cover this shift in emergencies (ordered by priority)
                </Text>
                {backupNurses.length > 0 ? (
                  backupNurses.map((backup, index) => {
                    const nurse = nurses.find(n => (n._id || n.id) === backup.nurseId);
                    const photoUri = nurse?.profilePhoto || nurse?.profileImage || nurse?.photoUrl || null;
                    return (
                      <View key={backup.nurseId || index} style={styles.backupNurseCard}>
                        <View style={styles.priorityBadge}>
                          {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.priorityBadgeImage} />
                          ) : (
                            <MaterialCommunityIcons name="account-heart" size={18} color={COLORS.white} />
                          )}
                        </View>
                        <View style={styles.backupNurseInfo}>
                          <Text style={styles.backupNurseName}>
                            {nurse?.fullName || `${nurse?.firstName} ${nurse?.lastName}` || 'Unknown Nurse'}
                          </Text>
                          <Text style={styles.backupNurseMeta}>
                            {nurse?.specialization || nurse?.qualifications || 'General Nursing'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setBackupNurses(prev => prev.filter(b => b.nurseId !== backup.nurseId));
                          }}
                          style={styles.removeBackupButton}
                        >
                          <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyBackupState}>
                    <MaterialCommunityIcons name="account-alert" size={32} color={COLORS.textMuted} />
                    <Text style={styles.emptyBackupText}>No backup nurses assigned</Text>
                    <Text style={styles.emptyBackupSubtext}>Tap "Add Backup" to assign emergency coverage</Text>
                  </View>
                )}
              </View>
            )}

            {/* Client Selection (Optional) */}
            <View
              style={[
                styles.section,
                (isClientFocused || (clientSearch.length > 0 && !selectedClient)) && { zIndex: 3000 },
              ]}
            >
              <Text style={styles.label}>Select Client (Optional)</Text>
              <View style={styles.inputContainer}>
                {selectedClient ? (
                  selectedClientPhoto ? (
                    <Image source={{ uri: selectedClientPhoto }} style={styles.clientAvatar} />
                  ) : (
                    <View style={styles.clientAvatarFallback}>
                      <Text style={styles.clientInitials}>{selectedClientInitials}</Text>
                    </View>
                  )
                ) : (
                  <MaterialCommunityIcons name="account-group" size={20} color={COLORS.primary} />
                )}
                <TextInput
                  style={styles.input}
                  placeholder="Search client name..."
                  value={selectedClient ? selectedClientName : clientSearch}
                  onChangeText={(text) => {
                    setClientSearch(text);
                    setSelectedClient(null);
                  }}
                  onFocus={() => setIsClientFocused(true)}
                  onBlur={() => setTimeout(() => setIsClientFocused(false), 200)}
                  placeholderTextColor={COLORS.textMuted}
                />
                {selectedClient && (
                  <TouchableOpacity onPress={() => {
                    setSelectedClient(null);
                    setClientSearch('');
                  }}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Autocomplete List */}
              {(isClientFocused || (clientSearch.length > 0 && !selectedClient)) && (
                <View style={styles.suggestionsContainer}>
                  {filteredClients.length > 0 ? (
                    filteredClients.slice(0, 5).map((client) => {
                      const clientPhoto = client.profilePhoto || client.profileImage || client.photoUrl || client.image;
                      const clientName = client.name || `${client.firstName} ${client.lastName}`;
                      const initials = clientName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() || '')
                        .join('') || 'C';
                      
                      return (
                        <TouchableOpacity
                          key={client._id || client.id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setSelectedClient(client);
                            setClientSearch('');
                            setIsClientFocused(false);
                          }}
                        >
                          {clientPhoto ? (
                            <Image source={{ uri: clientPhoto }} style={styles.clientAvatar} />
                          ) : (
                            <View style={styles.clientAvatarFallback}>
                              <Text style={styles.clientInitials}>{initials}</Text>
                            </View>
                          )}
                          <Text style={styles.suggestionText}>
                            {clientName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.noSuggestionsContainer}>
                      <Text style={styles.noSuggestionsText}>No clients found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Service Selection - Only for Single Nurse */}
            {assignmentType === 'single-nurse' && (
              <View style={styles.section}>
                <Text style={styles.label}>Service *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.serviceScroll}
                >
                  {SERVICES.map((srv) => (
                    <TouchableOpacity
                      key={srv.id}
                      style={[
                        styles.serviceChip,
                        service === srv.title && { overflow: 'hidden' }
                      ]}
                      onPress={() => setService(srv.title)}
                    >
                      {service === srv.title ? (
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.serviceChipGradient}
                        >
                          <MaterialCommunityIcons
                            name={srv.icon}
                            size={16}
                            color={COLORS.white}
                          />
                          <Text style={styles.serviceChipTextSelected} numberOfLines={1}>
                            {srv.title}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.inactiveServiceChip}>
                          <MaterialCommunityIcons
                            name={srv.icon}
                            size={16}
                            color={COLORS.primary}
                          />
                          <Text style={styles.serviceChipText} numberOfLines={1}>
                            {srv.title}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Days of Week - Only for Single Nurse */}
            {assignmentType === 'single-nurse' && (
              <View style={styles.section}>
                <Text style={styles.label}>Days of Week *</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.daysScroll}
                >
                  {DAYS_OF_WEEK.map(day => (
                    <TouchableOpacity
                      key={day.value}
                      style={styles.dayPill}
                      onPress={() => toggleDay(day.value)}
                    >
                      {selectedDays.includes(day.value) ? (
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.dayPillGradient}
                        >
                          <Text style={styles.dayChipTextSelected}>
                            {day.label}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.inactiveDayPill}>
                          <Text style={styles.dayChipText}>
                            {day.label}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Dates Row */}
            <View style={styles.rowContainer}>
              {/* Start Date */}
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>Start Date *</Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.selectedText}>{formatDateDisplay(startDate)}</Text>
                </TouchableOpacity>
              </View>

              {/* End Date */}
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={endDate ? styles.selectedText : styles.placeholder}>
                    {endDate ? formatDateDisplay(endDate) : 'Ongoing'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Times Row - Only for Single Nurse */}
            {assignmentType === 'single-nurse' && (
              <View style={styles.rowContainer}>
                {/* Start Time */}
                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.label}>Start Time *</Text>
                  <TouchableOpacity 
                    style={styles.inputContainer}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <MaterialCommunityIcons name="clock-start" size={20} color={COLORS.primary} />
                    <Text style={styles.selectedText}>{formatTime12Hour(startTime)}</Text>
                  </TouchableOpacity>
                </View>

                {/* End Time */}
                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.label}>End Time</Text>
                  <TouchableOpacity 
                    style={styles.inputContainer}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <MaterialCommunityIcons name="clock-end" size={20} color={COLORS.primary} />
                    <Text style={styles.selectedText}>{formatTime12Hour(endTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </ScrollView>

          {/* Footer with Submit Button */}
          <View style={styles.detailsModalFooter}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitText}>Create Recurring Shift</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Start Date Picker Overlay */}
          {showStartDatePicker && (
            <View style={styles.inlinePickerOverlay}>
              <View style={styles.inlinePickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Start Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    style={styles.pickerCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      handleDateChange(event, date, false);
                    } else {
                      if (date) setStartDate(date);
                    }
                  }}
                  style={{ backgroundColor: COLORS.white }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerConfirmButton}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* End Date Picker Overlay */}
          {showEndDatePicker && (
            <View style={styles.inlinePickerOverlay}>
              <View style={styles.inlinePickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select End Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(false)}
                    style={styles.pickerCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate || startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      handleDateChange(event, date, true);
                    } else {
                      if (date) setEndDate(date);
                    }
                  }}
                  minimumDate={startDate}
                  style={{ backgroundColor: COLORS.white }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerConfirmButton}
                    onPress={() => {
                      // If the user confirms without moving the spinner,
                      // `onChange` may never fire and `endDate` can stay null.
                      // In that case, treat it as a single-day range.
                      setEndDate(endDate || startDate);
                      setShowEndDatePicker(false);
                    }}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Start Time Picker Overlay */}
          {showStartTimePicker && (
            <View style={styles.inlinePickerOverlay}>
              <View style={styles.inlinePickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Start Time</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartTimePicker(false)}
                    style={styles.pickerCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={parseTime(startTime)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      handleTimeChange(event, date, false);
                    } else {
                      if (date) {
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        setStartTime(`${hours}:${minutes}`);
                      }
                    }
                  }}
                  style={{ backgroundColor: COLORS.white }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerConfirmButton}
                    onPress={() => setShowStartTimePicker(false)}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* End Time Picker Overlay */}
          {showEndTimePicker && (
            <View style={styles.inlinePickerOverlay}>
              <View style={styles.inlinePickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select End Time</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndTimePicker(false)}
                    style={styles.pickerCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={parseTime(endTime)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      handleTimeChange(event, date, true);
                    } else {
                      if (date) {
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        setEndTime(`${hours}:${minutes}`);
                      }
                    }
                  }}
                  style={{ backgroundColor: COLORS.white }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.pickerConfirmButton}
                    onPress={() => setShowEndTimePicker(false)}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Backup Nurse Selection Modal */}
          <Modal
            visible={showBackupNurseModal}
            animationType="slide"
            transparent
            onRequestClose={closeBackupNurseModal}
          >
            <TouchableOpacity 
              style={styles.backupModalOverlay}
              activeOpacity={1}
              onPress={closeBackupNurseModal}
            >
              <View 
                style={styles.backupModalContainer}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.backupModalHeader}>
                  <Text style={styles.backupModalTitle}>Add Backup Nurse</Text>
                  <TouchableOpacity
                    onPress={closeBackupNurseModal}
                    style={styles.backupModalCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.backupModalContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.backupSearchContainer}>
                    <MaterialCommunityIcons name="account-search" size={20} color={COLORS.primary} />
                    <TextInput
                      style={styles.backupSearchInput}
                      placeholder="Search by name or code"
                      placeholderTextColor={COLORS.textLight}
                      value={backupNurseSearch}
                      onChangeText={setBackupNurseSearch}
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                  </View>

                  <Text style={styles.availableNursesLabel}>Available Nurses</Text>
                  {nurses
                    .filter((nurse) => {
                      const nurseId = nurse?._id || nurse?.id;
                      const staffCode = nurse?.code || nurse?.nurseCode || nurse?.username || null;
                      return !backupNurses.some((b) => b?.nurseId === nurseId || (staffCode && b?.staffCode === staffCode));
                    })
                    .filter((nurse) => {
                      const nurseId = nurse?._id || nurse?.id;
                      const staffCode = nurse?.code || nurse?.nurseCode || nurse?.username || null;
                      const currentId = currentNurse?._id || currentNurse?.id;
                      const currentCode = currentNurse?.code || currentNurse?.nurseCode || currentNurse?.username || null;
                      if (nurseId && currentId && nurseId === currentId) return false;
                      if (staffCode && currentCode && staffCode === currentCode) return false;
                      return true;
                    })
                    .filter((nurse) => {
                      const q = (backupNurseSearch || '').trim().toLowerCase();
                      if (!q) return true;

                      const name = (
                        nurse?.fullName ||
                        nurse?.name ||
                        `${nurse?.firstName || ''} ${nurse?.lastName || ''}`.trim() ||
                        ''
                      ).toLowerCase();
                      const code = (
                        nurse?.code ||
                        nurse?.nurseCode ||
                        nurse?.username ||
                        ''
                      ).toLowerCase();

                      return name.includes(q) || code.includes(q);
                    })
                    .map((nurse) => (
                      <View
                        key={nurse._id || nurse.id}
                        style={styles.backupNurseOption}
                      >
                        {nurse.profilePhoto || nurse.profileImage || nurse.photoUrl ? (
                          <Image
                            source={{ uri: nurse.profilePhoto || nurse.profileImage || nurse.photoUrl }}
                            style={styles.backupNurseAvatar}
                          />
                        ) : (
                          <View style={[styles.backupNurseAvatar, styles.backupNurseAvatarFallback]}>
                            <MaterialCommunityIcons name="account" size={24} color={COLORS.white} />
                          </View>
                        )}
                        <View style={styles.backupNurseOptionInfo}>
                          <Text style={styles.backupNurseOptionName}>
                            {nurse.fullName || `${nurse.firstName} ${nurse.lastName}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.backupNurseAddButton}
                          onPress={() => {
                            setSelectedNurseDetails(nurse);
                            setNurseDetailsMode('backup');
                            setShowBackupNurseModal(false);
                            setTimeout(() => {
                              setNurseDetailsModalVisible(true);
                            }, 300);
                          }}
                        >
                          <LinearGradient
                            colors={GRADIENTS.header}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.backupNurseAddButtonGradient}
                          >
                            <Text style={styles.backupNurseAddButtonText}>View</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          <NurseDetailsModal
            visible={nurseDetailsModalVisible}
            onClose={() => {
              setNurseDetailsModalVisible(false);
              setSelectedNurseDetails(null);
              setNurseDetailsMode(null);
            }}
            nurse={selectedNurseDetails}
            nursesRoster={nurses}
            footer={
              nurseDetailsMode === 'select' ? (
                <TouchableOpacity
                  onPress={() => {
                    if (!selectedNurseDetails) return;
                    handleNurseSelect(selectedNurseDetails);
                    setNurseDetailsModalVisible(false);
                    setSelectedNurseDetails(null);
                    setNurseDetailsMode(null);
                    setNurseSearch('');
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={GRADIENTS.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16, color: COLORS.white, fontWeight: '600' }}>
                      Select This Nurse
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    const staffCode =
                      selectedNurseDetails?.code ||
                      selectedNurseDetails?.nurseCode ||
                      selectedNurseDetails?.username ||
                      null;
                    setBackupNurses((prev) => [
                      ...prev,
                      {
                        nurseId: selectedNurseDetails?._id || selectedNurseDetails?.id,
                        staffCode,
                        priority: prev.length + 1,
                      },
                    ]);
                    setNurseDetailsModalVisible(false);
                    setSelectedNurseDetails(null);
                    setNurseDetailsMode(null);
                    setTimeout(() => {
                      setShowBackupNurseModal(true);
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={GRADIENTS.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16, color: COLORS.white, fontWeight: '600' }}>
                      Add Backup Nurse
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )
            }
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: Platform.OS === 'android' ? '93%' : '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
    position: 'relative',
    zIndex: 1,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  selectNurseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  selectNurseButtonText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 4,
  },
  selectedText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  placeholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suggestionItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
  },
  clientAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInitials: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  nurseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
  },
  nurseCardSelected: {
    backgroundColor: '#F2F7FF',
  },
  selectedNurseCard: {
    // (kept for backward compatibility; border now lives on selectedNurseCardWrapper)
  },
  nurseAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6ECF5',
  },
  nurseAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  nurseInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  nurseMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  nurseCode: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  changeButton: {
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    marginLeft: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  changeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  changeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  // Nurse Day Pills Styles (for Split Schedule)
  selectedNurseCardWrapper: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  splitSummaryContainer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8F9FA',
    gap: SPACING.md,
  },
  splitSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  splitSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  splitSummaryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6ECF5',
  },
  splitSummaryInfo: {
    flex: 1,
  },
  splitSummaryName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  splitSummaryService: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  splitSummaryMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  splitSummaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  splitSummaryIconButton: {
    padding: 6,
    borderRadius: 10,
  },
  nurseDayPillsContainer: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  nurseDayPillsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  nurseDayPillsScroll: {
    marginTop: SPACING.xs,
  },
  nurseDayPill: {
    marginRight: SPACING.sm,
    borderRadius: 20,
    minWidth: 50,
    overflow: 'hidden',
  },
  nurseDayPillGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nurseDayPillInactive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nurseDayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  nurseDayPillTextSelected: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  // Nurse Time Pickers Styles (for Split Schedule)
  nurseTimePickersContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  nurseTimePickerWrapper: {
    flex: 1,
  },
  nurseTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  nurseTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  nurseTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  noSuggestionsContainer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  noSuggestionsText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  serviceScroll: {
    marginTop: SPACING.xs,
  },
  serviceChip: {
    marginRight: SPACING.sm,
    borderRadius: 20,
  },
  serviceChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minHeight: 36,
  },
  inactiveServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minHeight: 36,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
  serviceChipTextSelected: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.white,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayChip: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 20,
  },
  dayChipGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  inactiveDayChip: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  dayChipTextSelected: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  detailsModalFooter: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New styles for overlay pickers
  inlinePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  inlinePickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 15,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pickerCloseButton: {
    padding: 5,
  },
  pickerConfirmButton: {
    borderRadius: 8,
    marginTop: 20,
    overflow: 'hidden',
  },
  pickerConfirmGradient: {
    padding: 12,
    alignItems: 'center',
  },
  pickerConfirmText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  daysScroll: {
    marginTop: SPACING.xs,
  },
  dayPill: {
    marginRight: SPACING.sm,
    borderRadius: 20,
    minWidth: 50,
  },
  dayPillGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveDayPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Assignment Type Styles
  assignmentTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  assignmentTypeChip: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  assignmentTypeChipActiveWrapper: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentTypeChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: SPACING.xs,
    borderRadius: 12,
  },
  assignmentTypeChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  assignmentTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  assignmentTypeTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  // Split Schedule Styles
  dayAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  dayLabel: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  dayLabelText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  dayNurseSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  dayNurseSelectorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  dayNurseSelectorPlaceholder: {
    color: COLORS.textMuted,
  },
  // Inline Shift Details for Split Schedule
  nurseShiftDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E6ED',
    gap: SPACING.sm,
  },
  shiftDetailIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  shiftDetailContent: {
    flex: 1,
  },
  shiftDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineServiceScroll: {
    marginTop: 4,
  },
  inlineServiceChip: {
    marginRight: SPACING.sm,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inlineServiceChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  inlineServiceChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inlineServiceText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.primary,
  },
  inlineServiceTextSelected: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.white,
  },
  inlineTimePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  inlineTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  inlineTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  timeSeparator: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  addShiftRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E6ED',
  },
  addShiftButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  addShiftButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  addShiftButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  // Backup Nurses Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  backupNurseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8F9FA',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadgeImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  priorityBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  backupNurseInfo: {
    flex: 1,
  },
  backupNurseName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  backupNurseMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  removeBackupButton: {
    padding: 4,
  },
  emptyBackupState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  emptyBackupText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  emptyBackupSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // Backup Nurse Modal Styles
  backupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  backupModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  backupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backupModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  backupModalCloseButton: {
    padding: SPACING.xs,
  },
  backupModalContent: {
    padding: SPACING.lg,
  },
  backupSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  backupSearchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  availableNursesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  backupNurseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: SPACING.md,
  },
  backupNurseAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  backupNurseAvatarFallback: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupNurseOptionInfo: {
    flex: 1,
  },
  backupNurseOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  backupNurseAddButton: {
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 80,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backupNurseAddButtonGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupNurseAddButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  nurseCardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nurseCardModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  nurseCardModalHeader: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  nurseCardModalCloseButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
    padding: SPACING.xs,
  },
  nurseCardModalPhotoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  nurseCardModalPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  nurseCardModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  nurseCardModalBody: {
    maxHeight: '60%',
  },
  nurseCardInfoSection: {
    padding: SPACING.lg,
  },
  nurseCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  nurseCardInfoContent: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  nurseCardInfoLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    fontWeight: '500',
  },
  nurseCardInfoValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '400',
  },
  nurseCardInfoHint: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});
