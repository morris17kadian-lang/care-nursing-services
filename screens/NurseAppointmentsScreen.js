import { TouchableWeb } from "../components/TouchableWeb";
import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  Animated,
  PanResponder,
  useWindowDimensions,
  Pressable,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppointments } from '../context/AppointmentContext';
import { useNurses } from '../context/NurseContext';
import { useShifts } from '../context/ShiftContext';
import { useServices } from '../context/ServicesContext';

export default function NurseAppointmentsScreen({ navigation, route }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Add error boundary check
  try {
    const { user } = useAuth();
    const { unreadCount, sendNotificationToUser } = useNotifications();
    const { nurses, updateNurseActiveStatus } = useNurses();
    const { 
      appointments,
      getAppointmentsByNurse, 
      acceptAppointment, 
      declineAppointment,
      completeAppointment,
      clearCompletedAppointments,
      updateNurseAvailability,
      updateAppointmentNotes
    } = useAppointments();
    const { 
      submitShiftRequest: submitShiftToContext, 
      getApprovedShiftsByNurse,
      getShiftRequestsByNurse,
      clearAllShiftRequests,
      startShift,
      completeShift,
      refreshShiftRequests,
      shiftRequests  // Add to track global context changes
    } = useShifts();
    const { services } = useServices();
  
  // Find current nurse in NurseContext and get their availability status
  const currentNurse = nurses.find(nurse => nurse.code === user?.nurseCode);
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Time tracking state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnShift, setIsOnShift] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [actionType, setActionType] = useState(''); // 'clockin', 'clockout', 'break'
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  
  // Shift booking state
  const [hasApprovedShift, setHasApprovedShift] = useState(false); // This would come from backend in real app
  const [hasClockOut, setHasClockOut] = useState(false); // Track if user has clocked out
  const [activeShifts, setActiveShifts] = useState([]); // Track active shifts - cleared for testing
  const [completedShifts, setCompletedShifts] = useState([]); // Track completed shifts - cleared for testing
  const [shiftBookingModal, setShiftBookingModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState(new Date());
  const [selectedEndTime, setSelectedEndTime] = useState(new Date());
  const [shiftDetails, setShiftDetails] = useState({
    date: '',
    startTime: '',
    endTime: '',
    service: '',
    notes: '',
    clientId: '',
    clientName: ''
  });
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  
  // Client search state
  const [clientSearchText, setClientSearchText] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  
  // Draggable floating button state
  const [fabPosition] = useState(() => new Animated.ValueXY({
    x: screenWidth - 80, // Default position (right side)
    y: screenHeight - 200 // Default position (bottom)
  }));
  const [isDragging, setIsDragging] = useState(false);

  // PanResponder for draggable floating button
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only allow dragging if the gesture is significant enough
      return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
    },
    onPanResponderGrant: () => {
      setIsDragging(true);
      fabPosition.setOffset({
        x: fabPosition.x._value,
        y: fabPosition.y._value,
      });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: fabPosition.x, dy: fabPosition.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (evt, gestureState) => {
      setIsDragging(false);
      fabPosition.flattenOffset();
      
      // Snap to edges with animation
      // Use values from useWindowDimensions hook (already defined at line 37)
      const buttonSize = 56;
      const margin = 20;
      
      let newX = fabPosition.x._value;
      let newY = fabPosition.y._value;
      
      // Snap to left or right edge
      if (newX < screenWidth / 2) {
        newX = margin; // Snap to left
      } else {
        newX = screenWidth - buttonSize - margin; // Snap to right
      }
      
      // Keep within vertical bounds
      if (newY < margin) {
        newY = margin;
      } else if (newY > screenHeight - buttonSize - margin - 100) { // Account for tab bar
        newY = screenHeight - buttonSize - margin - 100;
      }
      
      // Animate to final position
      Animated.spring(fabPosition, {
        toValue: { x: newX, y: newY },
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    },
  }), [screenWidth, screenHeight, fabPosition]);

  // Check for approved shifts when component mounts and periodically
  useEffect(() => {
    const actualUserId = user?.id || '';
    const nurseId = actualUserId === 'nurse-001' ? 'NURSE001' : (actualUserId || 'NURSE001'); // Convert nurse-001 to NURSE001
    if (nurseId) {
      let lastApprovedCount = 0;
      
      const checkApprovedShifts = () => {
        const approvedShifts = getApprovedShiftsByNurse(nurseId);
        const currentCount = approvedShifts.length;
        
        // Only log when count changes or when shifts are found
        if (currentCount !== lastApprovedCount) {
          console.log('🔄 NURSE: Approved shifts check - Found:', currentCount);
          if (currentCount > lastApprovedCount && lastApprovedCount >= 0) {
            console.log('🎉 NURSE: New approved shifts detected!', currentCount);
          }
          lastApprovedCount = currentCount;
        }
        
        setHasApprovedShift(currentCount > 0);
      };
      
      // Initial check
      checkApprovedShifts();
      
      // Poll for new approved shifts every 30 seconds (reduced frequency to minimize logs)
      const interval = setInterval(checkApprovedShifts, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id, getApprovedShiftsByNurse]);
  
  // Debug log to check nurse matching (only when issues occur)
  useEffect(() => {
    if (!currentNurse && user?.nurseCode) {
      console.log('Nurse lookup issue - Code:', user.nurseCode, 'Available:', nurses?.length || 0);
    }
  }, [user?.nurseCode, nurses?.length]);

  // Initialize toggle state from nurse data only once when nurse is found
  useEffect(() => {
    if (currentNurse && currentNurse.isActive !== undefined) {
      setIsAvailable(currentNurse.isActive);
    }
  }, [currentNurse?.id, currentNurse?.isActive]);

  // Load active shifts from AsyncStorage on mount
  useEffect(() => {
    const loadActiveShifts = async () => {
      try {
        const stored = await AsyncStorage.getItem('@nurse_active_shifts');
        if (stored) {
          setActiveShifts(JSON.parse(stored));
          console.log('✅ Loaded active shifts from storage');
        }
      } catch (error) {
        console.error('Error loading active shifts:', error);
      }
    };
    loadActiveShifts();
  }, []);

  // Persist active shifts to AsyncStorage whenever they change
  useEffect(() => {
    const saveActiveShifts = async () => {
      try {
        if (activeShifts.length > 0) {
          await AsyncStorage.setItem('@nurse_active_shifts', JSON.stringify(activeShifts));
          console.log('💾 Saved active shifts to storage:', activeShifts.length);
        } else {
          // Clear storage if no active shifts
          await AsyncStorage.removeItem('@nurse_active_shifts');
        }
      } catch (error) {
        console.error('Error saving active shifts:', error);
      }
    };
    saveActiveShifts();
  }, [activeShifts]);

  // Load completed shifts from AsyncStorage on mount
  useEffect(() => {
    const loadCompletedShifts = async () => {
      try {
        const stored = await AsyncStorage.getItem('@nurse_completed_shifts');
        if (stored) {
          setCompletedShifts(JSON.parse(stored));
          console.log('✅ Loaded completed shifts from storage');
        }
      } catch (error) {
        console.error('Error loading completed shifts:', error);
      }
    };
    loadCompletedShifts();
  }, []);

  // Persist completed shifts to AsyncStorage whenever they change
  useEffect(() => {
    const saveCompletedShifts = async () => {
      try {
        if (completedShifts.length > 0) {
          await AsyncStorage.setItem('@nurse_completed_shifts', JSON.stringify(completedShifts));
          console.log('💾 Saved completed shifts to storage:', completedShifts.length);
        } else {
          await AsyncStorage.removeItem('@nurse_completed_shifts');
        }
      } catch (error) {
        console.error('Error saving completed shifts:', error);
      }
    };
    saveCompletedShifts();
  }, [completedShifts]);

  // Clear all shift requests for clean testing environment (commented out to reduce log spam)
  /*
  useEffect(() => {
    const clearShifts = async () => {
      try {
        await clearAllShiftRequests();
        console.log('✅ Cleared all shift requests for clean testing');
      } catch (error) {
        console.error('Error clearing shift requests:', error);
      }
    };
    clearShifts();
  }, []); // Empty dependency array = runs once on mount
  */

  // Handle navigation parameters from notifications
  useEffect(() => {
    if (route?.params?.initialTab) {
      setSelectedCard(route.params.initialTab);
      
      // Clear the params after handling
      navigation.setParams({ 
        initialTab: undefined, 
        highlightShift: undefined 
      });
    }
  }, [route?.params, navigation]);
  
  // Get appointments for this nurse
  const nurseAppointments = getAppointmentsByNurse(currentNurse?.id || user?.id || 'nurse-1') || [];
  
  const pendingAssignments = nurseAppointments.filter(app => app.status === 'nurse_assigned');
  const activeAppointments = nurseAppointments.filter(app => app.status === 'confirmed');
  const completedAppointments = nurseAppointments.filter(app => app.status === 'completed');

  // Get shift requests for this nurse
  const actualUserId = user?.id || '';
  const nurseId = actualUserId === 'nurse-001' ? 'NURSE001' : (actualUserId || 'NURSE001'); // Convert nurse-001 to NURSE001
  const nurseShiftRequests = getShiftRequestsByNurse(nurseId) || [];
  
  // Use useMemo to ensure these update when nurseShiftRequests changes
  const pendingShiftRequests = React.useMemo(
    () => nurseShiftRequests.filter(request => request.status === 'pending'),
    [nurseShiftRequests]
  );
  
  // Filter shifts by status from nurseShiftRequests
  const activeShiftsFromRequests = React.useMemo(
    () => nurseShiftRequests.filter(request => request.status === 'active'),
    [nurseShiftRequests]
  );
  
  const completedShiftsFromRequests = React.useMemo(
    () => nurseShiftRequests.filter(request => request.status === 'completed'),
    [nurseShiftRequests]
  );

  // Only update contexts when user manually toggles (not on initial load)
  const handleAvailabilityToggle = (value) => {
    setIsAvailable(value);
    
    if (currentNurse) {
      // Update nurse availability in contexts
      updateNurseAvailability(user?.id || 'nurse-1', value);
      updateNurseActiveStatus(currentNurse.id, value);
    }
    
    Alert.alert(
      value ? 'Available' : 'Offline',
      value 
        ? 'You are now available for new assignments.' 
        : 'You are now offline and will not receive new assignments.'
    );
  };

  // Time tracking functions
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateHoursWorked = () => {
    if (!shiftStartTime) return '0.0';
    const diff = currentTime - shiftStartTime;
    const hours = diff / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  // Calculate hours worked from clock in/out times
  const calculateHoursFromClockTimes = (startTime, endTime) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end - start;
      const hours = diffMs / (1000 * 60 * 60);
      return hours.toFixed(1);
    } catch (error) {
      return '0.0';
    }
  };

  const handleClockAction = (action) => {
    if (action === 'clockin') {
      // Clock in immediately without notes
      const now = new Date();
      setIsOnShift(true);
      setShiftStartTime(now);
      
      // Move approved shift to active status using context
      const actualUserId = user?.id || '';
      const nurseId = actualUserId === 'nurse-001' ? 'NURSE001' : (actualUserId || 'NURSE001'); // Convert nurse-001 to NURSE001
      const approvedShifts = getApprovedShiftsByNurse(nurseId);
      if (approvedShifts.length > 0) {
        const currentShift = approvedShifts[0]; // Assuming first approved shift
        
        // Use context function to start the shift
        startShift(currentShift.id, now.toISOString(), nurseId);
        
        // Add to local active shifts for immediate UI update
        const activeShift = {
          ...currentShift,
          status: 'active',
          startedAt: now.toISOString()
        };
        setActiveShifts(prev => [...prev, activeShift]);
        
        // Notify admin that nurse has started their shift
        sendNotificationToUser(
          'ADMIN001', // Admin user ID - matching your actual admin ID
          'admin',
          'Nurse Started Shift',
          `${user?.name || 'Nurse'} has clocked in and started their ${currentShift.service} shift.`,
          {
            nurseId: user?.id,
            nurseName: user?.name,
            shiftId: currentShift.id,
            type: 'shift_started'
          }
        ).catch(error => {
          console.error('Failed to send start shift notification to admin:', error);
        });
      }
      
      Alert.alert(
        'Clocked In Successfully',
        `Welcome! Your shift started at ${formatTime(now)}`
      );
    } else if (action === 'clockout') {
      // Show notes modal for clock out
      setActionType(action);
      setNotesModalVisible(true);
    }
  };

  const confirmClockAction = async () => {
    const now = new Date();
    
    if (actionType === 'clockout') {
      if (isOnBreak) {
        Alert.alert('Error', 'Please end your break before clocking out.');
        setNotesModalVisible(false);
        return;
      }
      
      setIsOnShift(false);
      setHasClockOut(true); // Set clock out state to change button color
      
      // Move active shift to completed status using context
      if (activeShifts.length > 0) {
        const currentActiveShift = activeShifts[0]; // Assuming first active shift
        const actualUserId = user?.id || '';
        const nurseId = actualUserId === 'nurse-001' ? 'NURSE001' : (actualUserId || 'NURSE001'); // Convert nurse-001 to NURSE001
        
        // Calculate hours worked from actual start and end times
        let hoursWorked = calculateHoursWorked(); // Fallback to state-based calculation
        if (currentActiveShift.startedAt && now) {
          hoursWorked = calculateHoursFromClockTimes(currentActiveShift.startedAt, now.toISOString());
        }
        
        // Use context function to complete the shift with actual clock times
        completeShift(currentActiveShift.id, now.toISOString(), hoursWorked, shiftNotes, nurseId);
        
        // Add to local completed shifts for immediate UI update with actual clock times
        const completedShift = {
          ...currentActiveShift,
          status: 'completed',
          completedAt: now.toISOString(),
          actualEndTime: now.toISOString(),
          hoursWorked: hoursWorked,
          completionNotes: shiftNotes
        };
        setCompletedShifts(prev => [...prev, completedShift]);
        
        // Remove from active shifts
        setActiveShifts(prev => prev.filter(shift => shift.id !== currentActiveShift.id));
        
        // Notify admin that nurse has completed their shift
        try {
          await sendNotificationToUser(
            'ADMIN001', // Admin user ID - matching your actual admin ID
            'admin',
            'Shift Completed',
            `${user?.name || 'Nurse'} has completed their ${currentActiveShift.service} shift. Total hours: ${hoursWorked}${shiftNotes ? '. Notes: ' + shiftNotes : ''}`,
            {
              nurseId: user?.id,
              nurseName: user?.name,
              shiftId: currentActiveShift.id,
              hoursWorked: hoursWorked,
              completionNotes: shiftNotes,
              completedAt: now.toISOString(),
              type: 'shift_completed'
            }
          );
        } catch (error) {
          console.error('Failed to send completion notification to admin:', error);
        }
      }
      
      setShiftStartTime(null);
      setBreakStartTime(null);
      
      Alert.alert(
        'Clocked Out Successfully',
        `Shift completed! Total hours: ${hoursWorked}${shiftNotes ? '\nNotes: ' + shiftNotes : ''}`
      );
    }
    
    setNotesModalVisible(false);
    setShiftNotes('');
  };

  // Handle showing appointment/shift details
  const handleShowDetails = (item) => {
    // Ensure patient contact info is included
    const itemWithDetails = {
      ...item,
      patientName: item.patientName || item.clientName || 'N/A',
      clientName: item.clientName || item.patientName || 'N/A',
      email: item.email || item.patientEmail || item.clientEmail || 'N/A',
      patientEmail: item.patientEmail || item.clientEmail || item.email || 'N/A',
      phone: item.phone || item.patientPhone || item.clientPhone || 'N/A',
      patientPhone: item.patientPhone || item.clientPhone || item.phone || 'N/A',
      address: item.address || item.clientAddress || 'N/A',
      // Mark as shift if it doesn't have an appointmentId (shifts have shiftId or different structure)
      isShift: !item.appointmentId || item.isShift === true,
    };
    
    setSelectedItemDetails(itemWithDetails);
    setDetailsModalVisible(true);
  };

  // Shift booking functions
  const handleBookShift = () => {
    const today = new Date();
    setShiftDetails({
      ...shiftDetails,
      date: today.toISOString().split('T')[0]
    });
    setShiftBookingModal(true);
  };

  // Client selection handler
  const handleClientSelect = (selectedClient) => {
    console.log('Client selected:', selectedClient); // Debug log
    setShiftDetails(prev => ({
      ...prev,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      clientPhone: selectedClient.phone,
      clientAddress: selectedClient.address
    }));
    setClientSearchText(selectedClient.name);
    setShowClientDropdown(false);
  };

  // Reset shift form
  const resetShiftForm = () => {
    setShiftDetails({
      date: '',
      startTime: '',
      endTime: '',
      service: '',
      notes: '',
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: ''
    });
    setClientSearchText('');
    setShowClientDropdown(false);
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  };

  const submitShiftRequest = async () => {
    // Validate required fields
    if (!shiftDetails.date || !shiftDetails.startTime || !shiftDetails.endTime || !shiftDetails.service) {
      Alert.alert('Missing Information', 'Please fill in date, start time, end time, and service.');
      return;
    }

    // Calculate total hours - handles both 12-hour (AM/PM) and 24-hour formats
    const calculateHours = (start, end) => {
      // Function to convert time string to minutes
      const timeToMinutes = (timeStr) => {
        // Check if it's 12-hour format (contains AM/PM)
        const is12Hour = /AM|PM/i.test(timeStr);
        
        if (is12Hour) {
          // Parse 12-hour format (e.g., "12:56 AM" or "3:45 PM")
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 0;
          
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'AM' && hours === 12) hours = 0;
          if (period === 'PM' && hours !== 12) hours += 12;
          
          return hours * 60 + minutes;
        } else {
          // Parse 24-hour format (e.g., "13:30")
          const parts = timeStr.split(':');
          const hours = parseInt(parts[0], 10) || 0;
          const minutes = parseInt(parts[1], 10) || 0;
          return hours * 60 + minutes;
        }
      };
      
      let startMinutes = timeToMinutes(start);
      let endMinutes = timeToMinutes(end);
      
      // Handle overnight shifts
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }
      
      const totalMinutes = endMinutes - startMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      // Return hours with decimal (e.g., 8.5 for 8 hours 30 minutes)
      return minutes > 0 ? `${hours}.${Math.round((minutes / 60) * 100)}` : `${hours}`;
    };

    const totalHours = calculateHours(shiftDetails.startTime, shiftDetails.endTime);

    // Create shift request data
    const requestData = {
      nurseId: user?.id === 'nurse-001' ? 'NURSE001' : (user?.id || 'NURSE001'), // Convert nurse-001 to NURSE001
      nurseName: user?.username || user?.name || currentNurse?.name || 'Nurse',
      nurseCode: user?.nurseCode || currentNurse?.code || 'N/A',
      date: shiftDetails.date,
      startTime: shiftDetails.startTime,
      endTime: shiftDetails.endTime,
      totalHours: totalHours,
      service: shiftDetails.service,
      notes: shiftDetails.notes,
      clientId: shiftDetails.clientId,
      clientName: shiftDetails.clientName,
      clientEmail: shiftDetails.clientEmail || 'N/A',
      clientPhone: shiftDetails.clientPhone || 'N/A',
      clientAddress: shiftDetails.clientAddress || 'N/A',
      patientName: shiftDetails.clientName, // Alias for consistent field naming
      patientEmail: shiftDetails.clientEmail || 'N/A',
      patientPhone: shiftDetails.clientPhone || 'N/A',
      address: shiftDetails.clientAddress || 'N/A',
      isShift: true // Mark as shift request
    };

    // Submit the request using context
    const newRequest = submitShiftToContext(requestData);
    console.log('🚀 NURSE: Shift request submitted:', {
      id: newRequest.id,
      nurseId: requestData.nurseId,
      service: requestData.service,
      date: requestData.date,
      clientName: requestData.clientName
    });

    // Send notification to admin about the new shift request
    try {
      const clientInfo = shiftDetails.clientName ? ` for ${shiftDetails.clientName}` : '';
      await sendNotificationToUser(
        'ADMIN001', // Admin user ID - matching your actual admin ID
        'admin',
        'New Shift Request',
        `${requestData.nurseName} has requested a ${requestData.service} shift on ${requestData.date}${clientInfo}`,
        {
          shiftRequestId: newRequest.id,
          nurseId: requestData.nurseId,
          type: 'shift_request'
        }
      );
    } catch (error) {
      console.error('Failed to send notification to admin:', error);
    }

    Alert.alert(
      'Shift Request Submitted',
      'Your shift request has been sent to admin for approval. You will be notified once it\'s reviewed.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShiftBookingModal(false);
            setShiftDetails({
              date: '',
              startTime: '',
              endTime: '',
              service: '',
              notes: '',
              clientId: '',
              clientName: '',
              clientEmail: '',
              clientPhone: '',
              clientAddress: ''
            });
            setClientSearchText('');
            setShowClientDropdown(false);
            // Force a refresh to show the new shift request immediately
            setRefreshKey(prev => prev + 1);
            // If pending card is already selected, keep it selected to show the new request
            if (selectedCard !== 'pending') {
              setSelectedCard('pending');
            }
          }
        }
      ]
    );
  };

  // Date and time picker handlers
  const onDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const onStartTimeChange = (event, time) => {
    if (time) {
      setSelectedStartTime(time);
    }
  };

  const onEndTimeChange = (event, time) => {
    if (time) {
      setSelectedEndTime(time);
    }
  };

  const confirmDateSelection = () => {
    const formattedDate = selectedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    setShiftDetails({ ...shiftDetails, date: formattedDate });
    setShowDatePicker(false);
  };

  const confirmStartTimeSelection = () => {
    const formattedTime = selectedStartTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    setShiftDetails({ ...shiftDetails, startTime: formattedTime });
    setShowStartTimePicker(false);
  };

  const confirmEndTimeSelection = () => {
    const formattedTime = selectedEndTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    setShiftDetails({ ...shiftDetails, endTime: formattedTime });
    setShowEndTimePicker(false);
  };

  const handleCardPress = (cardType) => {
    setSelectedCard(selectedCard === cardType ? null : cardType);
  };

  const handleAccept = async (appointmentId) => {
    try {
      await acceptAppointment(appointmentId);
      Alert.alert('Success', 'Appointment accepted successfully');
    } catch (error) {
      console.error('Error accepting appointment:', error);
      Alert.alert('Error', 'Failed to accept appointment');
    }
  };

  const handleDecline = async (appointmentId) => {
    try {
      await declineAppointment(appointmentId);
      Alert.alert('Success', 'Appointment declined successfully');
    } catch (error) {
      console.error('Error declining appointment:', error);
      Alert.alert('Error', 'Failed to decline appointment');
    }
  };

  const handleComplete = async (appointmentId, notes = '') => {
    try {
      await completeAppointment(appointmentId, notes);
      
      // Force refresh of appointments after completion
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 100);
      
      Alert.alert('Success', 'Appointment completed successfully');
    } catch (error) {
      console.error('Error completing appointment:', error);
      Alert.alert('Error', 'Failed to complete appointment');
    }
  };

  // Handle clock in for shifts
  const handleClockIn = async (shift) => {
    try {
      const startTime = new Date().toISOString();
      await startShift(shift.id, startTime, nurseId);
      
      // Refresh shift data globally (syncs to admin dashboard)
      await refreshShiftRequests();
      
      // Close modal and refresh UI
      setDetailsModalVisible(false);
      setRefreshKey(prev => prev + 1);
      
      Alert.alert('Success', 'Clocked in successfully. Shift moved to Active section and synced to admin dashboard.');
    } catch (error) {
      console.error('Error clocking in:', error);
      Alert.alert('Error', 'Failed to clock in');
    }
  };

  // Handle clock out for shifts
  const handleClockOut = async (shift) => {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(shift.actualStartTime);
      const hoursWorked = ((new Date(endTime) - startTime) / (1000 * 60 * 60)).toFixed(2);
      
      await completeShift(shift.id, endTime, hoursWorked, shift.notes || '', nurseId);
      
      // Refresh shift data globally (syncs to admin dashboard)
      await refreshShiftRequests();
      
      // Close modal and refresh UI
      setDetailsModalVisible(false);
      setRefreshKey(prev => prev + 1);
      
      Alert.alert('Success', 'Clocked out successfully. Shift moved to Completed section and synced to admin dashboard.');
    } catch (error) {
      console.error('Error clocking out:', error);
      Alert.alert('Error', 'Failed to clock out');
    }
  };

  // Get approved shifts for current nurse (use useMemo to update when context changes)
  const approvedShifts = React.useMemo(
    () => getApprovedShiftsByNurse(nurseId),
    [nurseId, getApprovedShiftsByNurse, shiftRequests]
  );

  // Get unique clients from appointments data
  // Get unique clients from both appointments data and admin clients data
  const getAllClients = () => {
    let clients = [];
    
    // Get clients from appointments (existing implementation)
    if (appointments && Array.isArray(appointments)) {
      const appointmentClients = appointments.map(apt => ({
        id: apt.patientId || apt.id,
        name: apt.patientName,
        email: apt.patientEmail,
        phone: apt.patientPhone,
        address: apt.address
      }));
      
      clients = [...clients, ...appointmentClients];
    }
    
    // Add admin clients data (this would normally come from a shared context)
    const adminClients = [
      {
        id: 1,
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '(876) 555-0123',
        address: '123 Kingston Road, Kingston 10'
      }
      // Add more admin clients here as they're created
    ];
    
    clients = [...clients, ...adminClients];
    
    // Remove duplicates based on client ID and filter out entries with missing data
    const uniqueClients = clients.filter((client, index, self) => 
      client.name && // Must have a name
      index === self.findIndex(c => c.id === client.id)
    );
    
    return uniqueClients;
  };

  // Filter clients based on search text
  useEffect(() => {
    if (clientSearchText.trim() === '') {
      setFilteredClients([]);
      setShowClientDropdown(false);
    } else {
      const allClients = getAllClients();
      const filtered = allClients.filter(client => 
        client.name.toLowerCase().includes(clientSearchText.toLowerCase()) ||
        client.email.toLowerCase().includes(clientSearchText.toLowerCase()) ||
        client.phone.includes(clientSearchText)
      );
      setFilteredClients(filtered);
      setShowClientDropdown(filtered.length > 0);
    }
  }, [clientSearchText, appointments]);

  // Determine which appointments to display based on selected card
  const getDisplayedAppointments = () => {
    if (!selectedCard) return [];
    
    switch (selectedCard) {
      case 'active':
        // Show both regular active appointments and active shifts (from nurseShiftRequests with status='active')
        return [...activeAppointments, ...activeShiftsFromRequests];
      case 'pending':
        // Show both regular pending assignments and pending shift requests
        return [...pendingAssignments, ...pendingShiftRequests];
      case 'completed':
        // Show both regular completed appointments and completed shifts (from nurseShiftRequests with status='completed')
        return [...completedAppointments, ...completedShiftsFromRequests];
      case 'booked':
        // Only show approved shifts that haven't been started yet
        const filteredApprovedShifts = approvedShifts.filter(shift => 
          !activeShiftsFromRequests.find(active => active.id === shift.id) &&
          !completedShiftsFromRequests.find(completed => completed.id === shift.id)
        );
        
        return filteredApprovedShifts;
      default:
        return [];
    }
  };

  const displayedAppointments = getDisplayedAppointments();

  const onRefresh = () => {
    setRefreshing(true);
    
    // Simulate API call to refresh appointments
    setTimeout(() => {
      // You can add logic here to fetch fresh data from API
      Alert.alert('Refreshed', 'Appointments have been updated!');
      
      setRefreshing(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <LinearGradient
          colors={GRADIENTS.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableWeb 
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableWeb>

            <Text style={styles.welcomeText}>My Appointments</Text>

            <TouchableWeb 
              onPress={() => navigation.navigate('Profile')}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              {user?.profilePhoto ? (
                <Image 
                  source={{ uri: user.profilePhoto }} 
                  style={styles.headerProfileImage}
                />
              ) : (
                <MaterialCommunityIcons name="account-circle-outline" size={24} color={COLORS.white} />
              )}
            </TouchableWeb>
          </View>

          <View style={styles.availabilityToggle}>
            <Text style={styles.availabilityLabel}>Available</Text>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: COLORS.lightGray, true: COLORS.success }}
              thumbColor={isAvailable ? COLORS.white : COLORS.gray}
              style={styles.headerSwitch}
            />
          </View>
        </LinearGradient>

        {/* Stats Summary */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.statsContainer}>
            <TouchableWeb 
              style={styles.statCard}
              onPress={() => handleCardPress('pending')}
              activeOpacity={0.8}
            >
              {selectedCard === 'pending' ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statLabel}>Pending</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveStatCard}>
                  <Text style={styles.inactiveStatLabel}>Pending</Text>
                </View>
              )}
            </TouchableWeb>
            
            <TouchableWeb 
              style={styles.statCard}
              onPress={() => handleCardPress('booked')}
              activeOpacity={0.8}
            >
              {selectedCard === 'booked' ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statLabel}>Booked</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveStatCard}>
                  <Text style={styles.inactiveStatLabel}>Booked</Text>
                </View>
              )}
            </TouchableWeb>
            
            <TouchableWeb 
              style={styles.statCard}
              onPress={() => handleCardPress('active')}
              activeOpacity={0.8}
            >
              {selectedCard === 'active' ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statLabel}>Active</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveStatCard}>
                  <Text style={styles.inactiveStatLabel}>Active</Text>
                </View>
              )}
            </TouchableWeb>
            
            <TouchableWeb 
              style={styles.statCard}
              onPress={() => handleCardPress('completed')}
              activeOpacity={0.8}
            >
              {selectedCard === 'completed' ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statGradient}
                >
                  <Text style={styles.statLabel}>Completed</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveStatCard}>
                  <Text style={styles.inactiveStatLabel}>Completed</Text>
                </View>
              )}
            </TouchableWeb>
          </View>

          {/* Appointments List */}
          <View style={styles.appointmentsContainer}>
            {displayedAppointments.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyStateText}>
                  {selectedCard ? `No ${selectedCard} ${selectedCard === 'booked' ? 'shifts' : 'appointments'} found` : 'Select a category above to view appointments'}
                </Text>
              </View>
            ) : (
              displayedAppointments.map((item) => (
                <View key={item.id} style={styles.compactCard}>
                  <View style={styles.compactHeader}>
                    <MaterialCommunityIcons 
                      name={
                        selectedCard === 'booked' ? "calendar-check" : 
                        selectedCard === 'active' ? "clock-outline" : 
                        selectedCard === 'pending' ? "alert" : 
                        "check-circle"
                      } 
                      size={20} 
                      color={
                        selectedCard === 'booked' ? COLORS.primary : 
                        selectedCard === 'active' ? COLORS.accent : 
                        selectedCard === 'pending' ? COLORS.warning : 
                        COLORS.success
                      } 
                    />
                    <View style={styles.compactInfo}>
                      <Text style={styles.compactClient}>
                        {item.clientName || item.patientName || 'Patient Assignment'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.detailsButton} 
                      onPress={() => handleShowDetails(item)}
                    >
                      <LinearGradient
                        colors={GRADIENTS.header}
                        style={styles.previewBtnGradient}
                      >
                        <Text style={styles.detailsButtonText}>Details</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Appointment/Shift Details Modal */}
        <Modal
          visible={detailsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Appointment Details
                </Text>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              
              {selectedItemDetails && (
                <>
                  <ScrollView style={styles.appointmentDetailsContent} showsVerticalScrollIndicator={false}>
                    {/* Shift/Service Information - matching admin style */}
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>
                        {selectedItemDetails.isShift ? 'Shift Information' : 'Service Information'}
                      </Text>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Service</Text>
                          <Text style={styles.detailValue}>{selectedItemDetails.service || selectedItemDetails.serviceName || 'N/A'}</Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Date</Text>
                          <Text style={styles.detailValue}>
                            {(() => {
                              const dateStr = selectedItemDetails.isShift 
                                ? selectedItemDetails.date
                                : (selectedItemDetails.preferredDate || selectedItemDetails.date || selectedItemDetails.scheduledDate || selectedItemDetails.appointmentDate);
                              if (!dateStr) return 'N/A';
                              if (dateStr.match(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/)) return dateStr;
                              const parsedDate = new Date(dateStr);
                              if (!isNaN(parsedDate.getTime())) {
                                return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                              }
                              return dateStr;
                            })()}
                          </Text>
                        </View>
                      </View>
                      {/* Horizontal Start and End Times */}
                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.success} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Start Time</Text>
                            <Text style={styles.timeValue}>
                              {selectedItemDetails.time || selectedItemDetails.startTime || selectedItemDetails.preferredTime || 'N/A'}
                            </Text>
                          </View>
                        </View>
                        {selectedItemDetails.endTime && (
                          <>
                            <Text style={styles.timeDash}>—</Text>
                            <View style={styles.timeItem}>
                              <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.error} />
                              <View style={styles.timeContent}>
                                <Text style={styles.timeLabel}>End Time</Text>
                                <Text style={styles.timeValue}>{selectedItemDetails.endTime}</Text>
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                      {/* Horizontal Clock In and Clock Out Times */}
                      {selectedItemDetails.actualStartTime && selectedItemDetails.actualEndTime && (
                        <View style={styles.timeRow}>
                          <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="clock-in" size={20} color={COLORS.success} />
                            <View style={styles.timeContent}>
                              <Text style={styles.timeLabel}>Clock In</Text>
                              <Text style={styles.timeValue}>
                                {new Date(selectedItemDetails.actualStartTime).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.timeDash}>—</Text>
                          <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="clock-out" size={20} color={COLORS.error} />
                            <View style={styles.timeContent}>
                              <Text style={styles.timeLabel}>Clock Out</Text>
                              <Text style={styles.timeValue}>
                                {new Date(selectedItemDetails.actualEndTime).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                      {selectedItemDetails.actualStartTime && selectedItemDetails.actualEndTime && (() => {
                        const start = new Date(selectedItemDetails.actualStartTime);
                        const end = new Date(selectedItemDetails.actualEndTime);
                        const diffMs = end - start;
                        const hours = Math.floor(diffMs / (1000 * 60 * 60));
                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
                        
                        return (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="clock-check" size={20} color={COLORS.primary} />
                            <View style={styles.detailContent}>
                              <Text style={styles.detailLabel}>Total Hours</Text>
                              <Text style={styles.detailValue}>
                                {hours}h {minutes}m ({totalHours} hours)
                              </Text>
                            </View>
                          </View>
                        );
                      })()}
                    </View>

                    {/* Client/Patient Information - matching admin style */}
                    {(selectedItemDetails.patientName || selectedItemDetails.clientName) && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>
                          {selectedItemDetails.isShift ? 'Client Information' : 'Patient Information'}
                        </Text>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>{selectedItemDetails.isShift ? 'Client Name' : 'Name'}</Text>
                            <Text style={styles.detailValue}>{selectedItemDetails.patientName || selectedItemDetails.clientName}</Text>
                          </View>
                        </View>
                        {(selectedItemDetails.email || selectedItemDetails.patientEmail) && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
                            <View style={styles.detailContent}>
                              <Text style={styles.detailLabel}>Email</Text>
                              <Text style={styles.detailValue}>{selectedItemDetails.email || selectedItemDetails.patientEmail}</Text>
                            </View>
                          </View>
                        )}
                        {(selectedItemDetails.phone || selectedItemDetails.patientPhone) && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                            <View style={styles.detailContent}>
                              <Text style={styles.detailLabel}>Phone</Text>
                              <Text style={styles.detailValue}>{selectedItemDetails.phone || selectedItemDetails.patientPhone}</Text>
                            </View>
                          </View>
                        )}
                        {selectedItemDetails.address && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                            <View style={styles.detailContent}>
                              <Text style={styles.detailLabel}>Address</Text>
                              <Text style={styles.detailValue}>{selectedItemDetails.address}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Request/Assignment Details - matching admin style */}
                    {(selectedItemDetails.requestedAt || selectedItemDetails.createdAt) && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>
                          {selectedItemDetails.isShift ? 'Request Details' : 'Assignment Details'}
                        </Text>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="clock-alert-outline" size={20} color={COLORS.primary} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>
                              {selectedItemDetails.isShift ? 'Requested' : 'Assigned'}
                            </Text>
                            <Text style={styles.detailValue}>
                              {(() => {
                                const timestamp = selectedItemDetails.requestedAt || selectedItemDetails.createdAt;
                                const date = new Date(timestamp);
                                return `${date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })} at ${date.toLocaleTimeString()}`;
                              })()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Notes - matching admin style */}
                    {selectedItemDetails.notes && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <Text style={styles.detailsNotes}>{selectedItemDetails.notes}</Text>
                      </View>
                    )}

                    {/* Nurse/Completion Notes */}
                    {(selectedItemDetails.nurseNotes || selectedItemDetails.completionNotes) && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>
                          {selectedItemDetails.status === 'completed' ? 'Completion Notes' : 'Nurse Notes'}
                        </Text>
                        <Text style={styles.detailsNotes}>
                          {selectedItemDetails.completionNotes || selectedItemDetails.nurseNotes}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Action Buttons for pending assignments */}
                  {selectedItemDetails.status === 'nurse_assigned' && (
                    <View style={styles.modalFooter}>
                      <TouchableOpacity 
                        style={styles.modalDenyButton}
                        onPress={() => {
                          Alert.alert(
                            'Decline Assignment',
                            'Are you sure you want to decline this assignment?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Decline',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await handleDecline(selectedItemDetails.id);
                                    setDetailsModalVisible(false);
                                    Alert.alert('Success', 'Assignment declined');
                                  } catch (error) {
                                    Alert.alert('Error', 'Failed to decline assignment');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.modalDenyButtonText}>Decline</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalAcceptButton}
                        onPress={async () => {
                          try {
                            await handleAccept(selectedItemDetails.id);
                            setDetailsModalVisible(false);
                            Alert.alert('Success', 'Assignment accepted');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to accept assignment');
                          }
                        }}
                      >
                        <LinearGradient
                          colors={['#10b981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.modalAcceptButtonGradient}
                        >
                          <Text style={styles.modalAcceptButtonText}>Accept</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Action Buttons for confirmed appointments */}
                  {selectedItemDetails.status === 'confirmed' && (
                    <View style={styles.modalFooter}>
                      <TouchableOpacity 
                        style={styles.modalActionButton}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          Alert.prompt(
                            'Add Notes',
                            'Add notes about this appointment:',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Save',
                                onPress: (text) => {
                                  if (text) {
                                    updateAppointmentNotes(selectedItemDetails.id, text);
                                  }
                                }
                              }
                            ],
                            'plain-text',
                            selectedItemDetails.notes || ''
                          );
                        }}
                      >
                        <MaterialCommunityIcons name="note-text" size={18} color={COLORS.primary} />
                        <Text style={styles.modalActionButtonText}>Add Notes</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.modalCompleteButton}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          handleComplete(selectedItemDetails.id, selectedItemDetails.notes || '');
                        }}
                      >
                        <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.white} />
                        <Text style={styles.modalCompleteButtonText}>Mark Complete</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Action Buttons for approved/booked shifts */}
                  {(selectedItemDetails.status === 'approved' || selectedItemDetails.status === 'active') && selectedItemDetails.isShift && (
                    <View style={styles.modalFooter}>
                      {!selectedItemDetails.actualStartTime ? (
                        <TouchableOpacity
                          style={styles.clockInButton}
                          onPress={() => {
                            setDetailsModalVisible(false);
                            handleClockIn(selectedItemDetails);
                          }}
                        >
                          <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.clockButtonGradient}
                          >
                            <MaterialCommunityIcons name="clock-in" size={20} color={COLORS.white} />
                            <Text style={styles.clockButtonText}>Clock In</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : !selectedItemDetails.actualEndTime ? (
                        <>
                          <TouchableOpacity 
                            style={styles.modalActionButton}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              Alert.prompt(
                                'Add Notes',
                                'Add notes about this shift:',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Save',
                                    onPress: (text) => {
                                      if (text) {
                                        // Notes will be saved when shift completes
                                        Alert.alert('Success', 'Notes will be saved when shift completes');
                                      }
                                    }
                                  }
                                ],
                                'plain-text',
                                selectedItemDetails.notes || ''
                              );
                            }}
                          >
                            <MaterialCommunityIcons name="note-text" size={18} color={COLORS.primary} />
                            <Text style={styles.modalActionButtonText}>Notes</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.clockOutButton}
                            onPress={() => {
                              setDetailsModalVisible(false);
                              handleClockOut(selectedItemDetails);
                            }}
                          >
                            <LinearGradient
                              colors={['#ef4444', '#dc2626']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.clockButtonGradient}
                            >
                              <MaterialCommunityIcons name="clock-out" size={20} color={COLORS.white} />
                              <Text style={styles.clockButtonText}>Clock Out</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Time Tracking Notes Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={notesModalVisible}
          onRequestClose={() => setNotesModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {actionType === 'clockin' ? 'Starting Shift' : 'Ending Shift'}
              </Text>
              
              <Text style={styles.modalSubtitle}>
                {actionType === 'clockin' 
                  ? 'Add any notes for the start of your shift:' 
                  : 'Add any notes for the end of your shift:'
                }
              </Text>

              <TextInput
                style={styles.notesInput}
                placeholder="Enter shift notes (optional)..."
                placeholderTextColor={COLORS.textLight}
                value={shiftNotes}
                onChangeText={setShiftNotes}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setNotesModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmClockAction}
                >
                  <LinearGradient
                    colors={GRADIENTS.header}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>
                      {actionType === 'clockin' ? 'Clock In' : 'Clock Out'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Floating Action Button for Shift Booking */}
        <Animated.View
          style={[
            styles.floatingActionButton,
            {
              transform: fabPosition.getTranslateTransform(),
              opacity: isDragging ? 0.8 : 1,
              elevation: isDragging ? 8 : 4,
              shadowOpacity: isDragging ? 0.3 : 0.2,
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.fabTouchable}
            onPress={isDragging ? null : handleBookShift}
            activeOpacity={isDragging ? 1 : 0.7}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              style={styles.fabGradient}
            >
              <MaterialCommunityIcons name="plus" size={28} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Shift Booking Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={shiftBookingModal}
          onRequestClose={() => setShiftBookingModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.shiftModalOverlay}>
              <View style={styles.shiftModalContent}>
                <View style={styles.shiftModalHeader}>
                  <Text style={styles.shiftModalTitle}>Request New Shift</Text>
                  <TouchableOpacity onPress={() => {
                    resetShiftForm();
                    setShiftBookingModal(false);
                  }}>
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.modalSubtitle}>
                    Submit a shift request for admin approval
                  </Text>

                  <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Client (Optional)</Text>
                  <View style={styles.clientSearchContainer}>
                    <View style={styles.pickerInputContainer}>
                      <MaterialCommunityIcons name="account-search" size={20} color={COLORS.primary} />
                      <TextInput
                        style={styles.clientSearchInput}
                        value={clientSearchText}
                        onChangeText={(text) => {
                          setClientSearchText(text);
                          if (text.length > 0) {
                            setShowClientDropdown(true);
                          } else {
                            setShowClientDropdown(false);
                          }
                        }}
                        placeholder="Search for existing client..."
                        placeholderTextColor={COLORS.textLight}
                      />
                      {clientSearchText.length > 0 && (
                        <TouchableWeb
                          onPress={() => {
                            setClientSearchText('');
                            setShiftDetails({
                              ...shiftDetails,
                              clientId: '',
                              clientName: ''
                            });
                            setShowClientDropdown(false);
                          }}
                          style={styles.clearButton}
                        >
                          <MaterialCommunityIcons name="close" size={16} color={COLORS.textLight} />
                        </TouchableWeb>
                      )}
                    </View>
                    
                    {showClientDropdown && filteredClients.length > 0 && (
                      <View style={styles.clientDropdown}>
                        <ScrollView 
                          style={styles.clientDropdownScroll} 
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          {filteredClients.map((client) => (
                            <TouchableOpacity
                              key={client.id}
                              style={styles.clientItem}
                              onPress={() => handleClientSelect(client)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.clientItemContent}>
                                <Text style={styles.clientName}>{client.name}</Text>
                                <Text style={styles.clientDetails}>
                                  {client.email} • {client.phone}
                                </Text>
                                {client.address && (
                                  <Text style={styles.clientAddress}>{client.address}</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableWeb 
                    style={styles.pickerInputContainer}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                    <Text style={[styles.pickerInput, { color: shiftDetails.date ? COLORS.textDark : COLORS.textLight }]}>
                      {shiftDetails.date || 'Select Date'}
                    </Text>
                  </TouchableWeb>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TouchableWeb 
                      style={styles.pickerInputContainer}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <MaterialCommunityIcons name="clock" size={20} color={COLORS.primary} />
                      <Text style={[styles.pickerInput, { color: shiftDetails.startTime ? COLORS.textDark : COLORS.textLight }]}>
                        {shiftDetails.startTime || 'Select'}
                      </Text>
                    </TouchableWeb>
                  </View>
                  
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TouchableWeb 
                      style={styles.pickerInputContainer}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <MaterialCommunityIcons name="clock" size={20} color={COLORS.primary} />
                      <Text style={[styles.pickerInput, { color: shiftDetails.endTime ? COLORS.textDark : COLORS.textLight }]}>
                        {shiftDetails.endTime || 'Select'}
                      </Text>
                    </TouchableWeb>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Service</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.serviceScrollView}
                    contentContainerStyle={styles.serviceScrollContent}
                  >
                    {services.map((service) => (
                      <TouchableWeb
                        key={service.id}
                        style={[
                          styles.serviceChip,
                          shiftDetails.service === service.title && styles.serviceChipSelected
                        ]}
                        onPress={() => setShiftDetails({...shiftDetails, service: service.title})}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons 
                          name={service.icon} 
                          size={16} 
                          color={shiftDetails.service === service.title ? COLORS.white : COLORS.primary} 
                        />
                        <Text style={[
                          styles.serviceChipText,
                          shiftDetails.service === service.title && styles.serviceChipTextSelected
                        ]}>
                          {service.title}
                        </Text>
                      </TouchableWeb>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={shiftDetails.notes}
                    onChangeText={(text) => setShiftDetails({...shiftDetails, notes: text})}
                    placeholder="Any additional notes for this shift request..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    resetShiftForm();
                    setShiftBookingModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={submitShiftRequest}
                >
                  <LinearGradient
                    colors={GRADIENTS.header}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>Submit Request</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            {/* Date Picker - Inside Modal */}
            {showDatePicker && (
              <View style={styles.inlinePickerOverlay}>
                <View style={styles.inlinePickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Date</Text>
                    <TouchableWeb
                      onPress={() => setShowDatePicker(false)}
                      style={styles.pickerCloseButton}
                    >
                      <MaterialCommunityIcons name="close" size={24} color={COLORS.textDark} />
                    </TouchableWeb>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                    style={{ backgroundColor: COLORS.white }}
                  />
                  <TouchableWeb
                    style={styles.pickerConfirmButton}
                    onPress={confirmDateSelection}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              </View>
            )}

            {/* Start Time Picker - Inside Modal */}
            {showStartTimePicker && (
              <View style={styles.inlinePickerOverlay}>
                <View style={styles.inlinePickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Start Time</Text>
                    <TouchableWeb
                      onPress={() => setShowStartTimePicker(false)}
                      style={styles.pickerCloseButton}
                    >
                      <MaterialCommunityIcons name="close" size={24} color={COLORS.textDark} />
                    </TouchableWeb>
                  </View>
                  <DateTimePicker
                    value={selectedStartTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onStartTimeChange}
                    style={{ backgroundColor: COLORS.white }}
                  />
                  <TouchableWeb
                    style={styles.pickerConfirmButton}
                    onPress={confirmStartTimeSelection}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              </View>
            )}

            {/* End Time Picker - Inside Modal */}
            {showEndTimePicker && (
              <View style={styles.inlinePickerOverlay}>
                <View style={styles.inlinePickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select End Time</Text>
                    <TouchableWeb
                      onPress={() => setShowEndTimePicker(false)}
                      style={styles.pickerCloseButton}
                    >
                      <MaterialCommunityIcons name="close" size={24} color={COLORS.textDark} />
                    </TouchableWeb>
                  </View>
                  <DateTimePicker
                    value={selectedEndTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onEndTimeChange}
                    style={{ backgroundColor: COLORS.white }}
                  />
                  <TouchableWeb
                    style={styles.pickerConfirmButton}
                    onPress={confirmEndTimeSelection}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.pickerConfirmGradient}
                    >
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              </View>
            )}
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Details Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={detailsModalVisible}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <TouchableWeb 
            style={styles.detailsModalOverlay} 
            activeOpacity={1} 
            onPress={() => setDetailsModalVisible(false)}
          >
            <TouchableWeb 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <View style={styles.detailsModalContent}>
                <View style={styles.detailsModalHeader}>
                  <Text style={styles.detailsModalTitle}>
                    {selectedItemDetails?.isShift ? 'Shift Details' : 'Appointment Details'}
                  </Text>
                  <TouchableWeb onPress={() => setDetailsModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableWeb>
                </View>

                {selectedItemDetails && (
                  <ScrollView 
                    style={styles.appointmentDetailsContent}
                    contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
                  >
                    {/* Client/Patient Information */}
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>
                        {selectedItemDetails.isShift ? 'Client Information' : 'Patient Information'}
                      </Text>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Name</Text>
                          <Text style={styles.detailValue}>
                            {selectedItemDetails.patientName || selectedItemDetails.clientName || 'N/A'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Email</Text>
                          <Text style={styles.detailValue}>
                            {selectedItemDetails.email || selectedItemDetails.patientEmail || 'Not provided'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Phone</Text>
                          <Text style={styles.detailValue}>
                            {selectedItemDetails.phone || selectedItemDetails.patientPhone || 'Not provided'}
                          </Text>
                        </View>
                      </View>
                      {selectedItemDetails.address && (
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Address</Text>
                            <Text style={styles.detailValue}>{selectedItemDetails.address}</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Shift/Appointment Information */}
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>
                        {selectedItemDetails.isShift ? 'Shift Information' : 'Appointment Information'}
                      </Text>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Service</Text>
                          <Text style={styles.detailValue}>
                            {selectedItemDetails.service || selectedItemDetails.serviceName || 'N/A'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Date</Text>
                          <Text style={styles.detailValue}>
                            {(() => {
                              const dateStr = selectedItemDetails.isShift 
                                ? selectedItemDetails.date
                                : (selectedItemDetails.preferredDate || selectedItemDetails.date || selectedItemDetails.scheduledDate || selectedItemDetails.appointmentDate);
                              
                              if (!dateStr) return 'N/A';
                              
                              // Check if already formatted
                              if (dateStr.match(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/)) {
                                return dateStr;
                              }
                              
                              // Try to parse and format
                              const parsedDate = new Date(dateStr);
                              if (!isNaN(parsedDate.getTime())) {
                                return parsedDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                });
                              }
                              
                              return dateStr;
                            })()}
                          </Text>
                        </View>
                      </View>
                      
                      {selectedItemDetails.isShift ? (
                        // Show actual clock times for shifts
                        <>
                          {/* Horizontal Start and End Times */}
                          <View style={styles.timeRow}>
                            <View style={styles.timeItem}>
                              <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.success} />
                              <View style={styles.timeContent}>
                                <Text style={styles.timeLabel}>Start Time</Text>
                                <Text style={styles.timeValue}>
                                  {selectedItemDetails.startTime || 'N/A'}
                                </Text>
                              </View>
                            </View>
                            {selectedItemDetails.endTime && (
                              <>
                                <Text style={styles.timeDash}>—</Text>
                                <View style={styles.timeItem}>
                                  <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.error} />
                                  <View style={styles.timeContent}>
                                    <Text style={styles.timeLabel}>End Time</Text>
                                    <Text style={styles.timeValue}>
                                      {selectedItemDetails.endTime || 'N/A'}
                                    </Text>
                                  </View>
                                </View>
                              </>
                            )}
                          </View>
                          {/* Horizontal Clock In and Clock Out Times */}
                          {selectedItemDetails.actualStartTime && selectedItemDetails.actualEndTime && (
                            <View style={styles.timeRow}>
                              <View style={styles.timeItem}>
                                <MaterialCommunityIcons name="clock-in" size={20} color={COLORS.success} />
                                <View style={styles.timeContent}>
                                  <Text style={styles.timeLabel}>Clock In</Text>
                                  <Text style={styles.timeValue}>
                                    {new Date(selectedItemDetails.actualStartTime).toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.timeDash}>—</Text>
                              <View style={styles.timeItem}>
                                <MaterialCommunityIcons name="clock-out" size={20} color={COLORS.error} />
                                <View style={styles.timeContent}>
                                  <Text style={styles.timeLabel}>Clock Out</Text>
                                  <Text style={styles.timeValue}>
                                    {new Date(selectedItemDetails.actualEndTime).toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}
                          {selectedItemDetails.actualStartTime && selectedItemDetails.actualEndTime && (() => {
                            const start = new Date(selectedItemDetails.actualStartTime);
                            const end = new Date(selectedItemDetails.actualEndTime);
                            const diffMs = end - start;
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
                            
                            return (
                              <View style={styles.detailItem}>
                                <MaterialCommunityIcons name="clock-check" size={20} color={COLORS.primary} />
                                <View style={styles.detailContent}>
                                  <Text style={styles.detailLabel}>Total Hours</Text>
                                  <Text style={styles.detailValue}>
                                    {hours}h {minutes}m ({totalHours} hours)
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}
                        </>
                      ) : (
                        // Show regular appointment time
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Time</Text>
                            <Text style={styles.detailValue}>
                              {selectedItemDetails.time || selectedItemDetails.preferredTime || 'N/A'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {selectedItemDetails.completedAt && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>Completion Details</Text>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Completed</Text>
                            <Text style={styles.detailValue}>
                              {new Date(selectedItemDetails.completedAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })} at{' '}
                              {new Date(selectedItemDetails.completedAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {(selectedItemDetails.nurseNotes || selectedItemDetails.completionNotes) && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>Nurse Notes</Text>
                        <Text style={styles.detailsNotes}>
                          {selectedItemDetails.nurseNotes || selectedItemDetails.completionNotes}
                        </Text>
                      </View>
                    )}

                    {selectedItemDetails.notes && selectedItemDetails.notes.trim() !== '' && (
                      <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>
                          {selectedItemDetails.isShift ? 'Additional Notes' : 'Patient Notes'}
                        </Text>
                        <Text style={styles.detailsNotes}>{selectedItemDetails.notes}</Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* Clock In/Out Buttons for Booked Shifts */}
                {(() => {
                  const shouldShowButtons = selectedItemDetails?.status === 'approved' && selectedItemDetails?.isShift;
                  return shouldShowButtons;
                })() && (
                  <View style={styles.modalFooter}>
                    {!selectedItemDetails.actualStartTime && (
                      <TouchableOpacity 
                        style={styles.clockInButton}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          handleClockAction('clockin');
                          // Navigate to active section
                          setSelectedCard('active');
                        }}
                      >
                        <LinearGradient
                          colors={['#10b981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.clockButtonGradient}
                        >
                          <MaterialCommunityIcons name="clock-in" size={20} color={COLORS.white} />
                          <Text style={styles.clockButtonText}>Clock In</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    {selectedItemDetails.actualStartTime && !selectedItemDetails.actualEndTime && (
                      <TouchableOpacity 
                        style={styles.clockOutButton}
                        onPress={() => {
                          setDetailsModalVisible(false);
                          handleClockAction('clockout');
                        }}
                      >
                        <LinearGradient
                          colors={['#ef4444', '#dc2626']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.clockButtonGradient}
                        >
                          <MaterialCommunityIcons name="clock-out" size={20} color={COLORS.white} />
                          <Text style={styles.clockButtonText}>Clock Out</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </TouchableWeb>
          </TouchableWeb>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  } catch (error) {
    console.error('Error in NurseAppointmentsScreen:', error);
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading appointments. Please try again.</Text>
      </SafeAreaView>
    );
  }
}

// AppointmentCard component
const AppointmentCard = ({ 
  appointment, 
  onAccept, 
  onDecline, 
  onComplete,
  onUpdateNotes,
  onShowDetails,
  showActions = false,
  showCompleteAction = false,
  showDetailsButton = false
}) => {
  const [notes, setNotes] = useState(appointment.nurseNotes || '');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [originalNotes, setOriginalNotes] = useState(appointment.nurseNotes || '');

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return COLORS.success;
      case 'nurse_assigned':
        return COLORS.warning;
      case 'completed':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textMuted;
    }
  };

  const handleCompleteWithNotes = () => {
    if (onComplete) {
      onComplete(appointment.id, notes);
    }
  };

  const handleOpenMaps = (address) => {
    if (!address || address === 'Home Visit') {
      Alert.alert('No Address', 'No specific address provided for this appointment.');
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = Platform.OS === 'ios' 
      ? `http://maps.apple.com/?q=${encodedAddress}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps application.');
    });
  };

  const handleSaveNotes = async () => {
    try {
      await onUpdateNotes(appointment.id, notes);
      setOriginalNotes(notes);
      Alert.alert('Success', 'Notes saved successfully!');
      setShowNotesInput(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes');
    }
  };

  const handleDeleteNotes = () => {
    Alert.alert(
      'Delete Notes',
      'Are you sure you want to delete these notes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onUpdateNotes(appointment.id, '');
              setNotes('');
              setOriginalNotes('');
              Alert.alert('Success', 'Notes deleted successfully!');
            } catch (error) {
              console.error('Error deleting notes:', error);
              Alert.alert('Error', 'Failed to delete notes');
            }
          }
        }
      ]
    );
  };

  const handleCancelEdit = () => {
    setNotes(originalNotes);
    setShowNotesInput(false);
  };

  const formatDate = (dateString) => {
    try {
      // Check if the date is already formatted (contains month abbreviation)
      if (!dateString) return 'N/A';
      
      // If it's already formatted like "Nov 02, 2025", return it
      if (dateString.match(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/)) {
        return dateString;
      }
      
      // Try to parse and format the date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If parsing fails, return the original string
        return dateString;
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString || 'N/A';
    }
  };

  const hasNotesChanged = notes !== originalNotes;

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        {appointment.status === 'nurse_assigned' && (
          <MaterialCommunityIcons 
            name="alert" 
            size={20} 
            color={COLORS.warning} 
            style={{ marginRight: 8 }}
          />
        )}
        <View style={styles.appointmentInfo}>
          <Text style={styles.patientName}>{appointment.patientName}</Text>
          <Text style={styles.serviceName}>{appointment.service}</Text>
        </View>
        <View style={styles.headerRightContainer}>
          {appointment.status !== 'nurse_assigned' && (
            <LinearGradient
              colors={[getStatusColor(appointment.status), getStatusColor(appointment.status) + 'CC']}
              style={styles.statusBadge}
            >
              <Text style={styles.statusText}>
                {appointment.status === 'nurse_assigned' ? 'PENDING' : appointment.status.toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {(appointment.status === 'completed' || appointment.status === 'nurse_assigned') && (
            <TouchableWeb
              style={styles.detailsButton}
              onPress={() => {
                const details = [
                  `Patient: ${appointment.patientName}`,
                  `Service: ${appointment.service}`,
                  `Date: ${appointment.date}`,
                  `Time: ${appointment.time}`,
                  `Completion Notes: ${appointment.completionNotes || 'No completion notes'}`
                ];
                
                // Only add patient notes if they exist
                if (appointment.notes && appointment.notes.trim()) {
                  details.push(`Patient Notes: ${appointment.notes}`);
                }
                
                Alert.alert('Appointment Details', details.join('\n'));
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailsButtonGradient}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </LinearGradient>
            </TouchableWeb>
          )}
        </View>
      </View>

      {/* Patient Details Section - Hide for pending appointments */}
      {appointment.status !== 'nurse_assigned' && (
        <View style={styles.patientDetailsSection}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>
              {formatDate(appointment.date || appointment.scheduledDate)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>
              {appointment.time || appointment.scheduledTime}
            </Text>
          </View>
          <TouchableWeb 
            style={styles.detailRow}
            onPress={() => handleOpenMaps(appointment.address || 'Home Visit')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
            <Text style={[styles.detailText, styles.clickableAddress]}>
              {appointment.address || 'Home Visit'}
            </Text>
            <MaterialCommunityIcons name="open-in-new" size={14} color={COLORS.primary} />
          </TouchableWeb>
          {appointment.phone && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone" size={16} color={COLORS.textLight} />
              <Text style={styles.detailText}>{appointment.phone}</Text>
            </View>
          )}
          {appointment.specialRequests && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="note-text" size={16} color={COLORS.textLight} />
              <Text style={styles.detailText}>{appointment.specialRequests}</Text>
            </View>
          )}
        </View>
      )}

      {/* Notes Section */}
      {(showCompleteAction || appointment.status === 'completed') && (
        <View style={styles.notesSection}>
          <TouchableWeb 
            style={styles.notesHeader}
            onPress={() => setShowNotesInput(!showNotesInput)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="note-edit" size={18} color={COLORS.primary} />
            <Text style={styles.notesHeaderText}>
              {appointment.status === 'completed' ? 'Completion Notes' : 'Add Notes'}
            </Text>
            <MaterialCommunityIcons 
              name={showNotesInput ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={COLORS.textLight} 
            />
          </TouchableWeb>
          
          {showNotesInput && (
            <View>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes about this appointment..."
                placeholderTextColor={COLORS.textLight}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                editable={appointment.status !== 'completed'}
              />
              
              {appointment.status !== 'completed' && (
                <View style={styles.notesButtonContainer}>
                  {hasNotesChanged && (
                    <TouchableWeb 
                      style={styles.saveNotesButton}
                      onPress={handleSaveNotes}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="check" size={20} color={COLORS.white} />
                    </TouchableWeb>
                  )}
                  
                  {(notes.length > 0 || originalNotes.length > 0) && (
                    <TouchableWeb 
                      style={styles.deleteNotesButton}
                      onPress={handleDeleteNotes}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color={COLORS.white} />
                    </TouchableWeb>
                  )}
                  
                  {hasNotesChanged && (
                    <TouchableWeb 
                      style={styles.cancelNotesButton}
                      onPress={handleCancelEdit}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
                    </TouchableWeb>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* Display patient booking notes if they exist */}
          {appointment.notes && appointment.notes.trim() && (
            <View style={styles.existingNotes}>
              <Text style={styles.notesLabel}>Patient Notes (from booking):</Text>
              <Text style={styles.existingNotesText}>
                {appointment.notes}
              </Text>
            </View>
          )}
          
          {/* Display nurse/completion notes if they exist */}
          {(appointment.completionNotes || appointment.nurseNotes) && (
            <View style={styles.existingNotes}>
              <Text style={styles.notesLabel}>
                {appointment.status === 'completed' ? 'Completion Notes:' : 'Nurse Notes:'}
              </Text>
              <Text style={styles.existingNotesText}>
                {appointment.completionNotes || appointment.nurseNotes}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {showActions && (
        <View style={styles.actionContainer}>
          <TouchableWeb 
            style={styles.acceptButton} 
            onPress={() => onAccept(appointment.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableWeb>
          <TouchableWeb 
            style={styles.declineButton} 
            onPress={() => onDecline(appointment.id)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableWeb>
        </View>
      )}

      {showCompleteAction && (
        <View style={styles.actionContainer}>
          <TouchableWeb 
            style={styles.completeButton} 
            onPress={handleCompleteWithNotes}
          >
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </TouchableWeb>
        </View>
      )}

      {showDetailsButton && (
        <View style={styles.actionContainer}>
          <TouchableWeb 
            style={styles.detailsButton} 
            onPress={() => onShowDetails(appointment)}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableWeb>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clockButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  clockButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: 12,
  },
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 8,
  },
  compactClient: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  compactService: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  confirmedButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  confirmedButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  notesActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  notesActionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  completeActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  completeActionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  detailsActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  detailsActionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
  },
  previewBtn: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  previewBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  activeIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  compactClockButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactClockOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    borderRadius: 12,
  },
  redClockOutButton: {
    backgroundColor: COLORS.error,
  },
  compactClockButtonText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  availabilitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  availabilityLabel: {
    color: COLORS.white,
    fontSize: 14,
  },
  headerSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  statGradient: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveStatCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  inactiveStatLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 1,
  },
  inactiveStatNumber: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 1,
  },
  content: {
    flex: 1,
  },
  appointmentsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clearFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  appointmentsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    paddingLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 16,
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  pendingBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerRightContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
   detailsButton: {
      borderRadius: 8,
      overflow: 'hidden',
    },
    detailsButtonGradient: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsButtonText: {
      fontSize: 11,
      fontFamily: 'Poppins_600SemiBold',
      color: COLORS.white,
  },
  
  // Appointment Details Modal Styles (matching admin)
  appointmentDetailsContent: {
    padding: 20,
    paddingBottom: 30,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
    paddingBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  // Horizontal time row styles
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  timeDash: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginHorizontal: 8,
  },
  detailsNotes: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 22,
    marginTop: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailsLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    minWidth: 60,
  },
  detailsValue: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  notesContent: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 18,
  },
  
  patientDetailsSection: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  clickableAddress: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notesHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    textAlignVertical: 'top',
    marginBottom: 8,
    minHeight: 80,
  },
  notesButtonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  saveNotesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    padding: 8,
    borderRadius: 20,
  },
  saveNotesText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteNotesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    padding: 8,
    borderRadius: 20,
  },
  deleteNotesText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelNotesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
    padding: 8,
    borderRadius: 20,
  },
  cancelNotesText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  existingNotes: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  existingNotesText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  completeButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomPadding: {
    height: 20,
  },
  // Clock button styles
  clockButton: {
    borderRadius: 999,
    minWidth: 80,
    overflow: 'hidden',
    flex: 1,
  },
  clockInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRadius: 999,
  },
  greenClockInButton: {
    backgroundColor: COLORS.success,
  },
  clockOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRadius: 999,
  },
  clockButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Shift card styles
  shiftCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shiftCardGradient: {
    padding: 16,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  shiftCardContent: {
    gap: 8,
  },
  shiftCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftCardText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  // Modal styles (for shift booking)
  shiftModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shiftModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    flexDirection: 'column',
  },
  shiftModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  shiftModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalScrollView: {
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Floating Action Button styles
  floatingActionButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 1000,
  },
  fabTouchable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Shift booking modal styles
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  // Date/Time picker input styles
  pickerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  pickerInput: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  // Client search styles
  clientSearchContainer: {
    position: 'relative',
  },
  clientSearchInput: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  clientDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clientDropdownScroll: {
    maxHeight: 200,
  },
  clientItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  clientItemContent: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  clientDetails: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  // Date/Time picker overlay styles (from BookScreen)
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    width: '95%',
    maxWidth: 380,
    minWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
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
    color: COLORS.textDark,
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
    fontSize: 16,
    fontWeight: '600',
  },
  // Inline picker styles (within modal)
  inlinePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  // Service selector styles (BookScreen pill style)
  serviceScrollView: {
    marginTop: 8,
  },
  serviceScrollContent: {
    paddingRight: 20,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  serviceChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
  serviceChipTextSelected: {
    color: COLORS.white,
  },
  // Modal styles
  // Details Modal Styles (matching admin)
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailsModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  clockInButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  clockOutButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  clockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  clockButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    gap: 6,
  },
  modalActionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  modalCompleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    gap: 6,
  },
  modalCompleteButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  modalBody: {
    padding: 20,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  // Accept/Deny button styles (matching admin)
  modalDenyButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDenyButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalAcceptButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalAcceptButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAcceptButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
});