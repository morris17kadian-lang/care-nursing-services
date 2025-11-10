import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';

const NurseTimeTrackingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnShift, setIsOnShift] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [actionType, setActionType] = useState(''); // 'clockin', 'clockout', 'break'

  // Mock nurse data - in real app, get from auth context
  const nurseInfo = {
    id: 'nurse_001',
    name: 'Jennifer Clarke',
    employeeId: 'EMP001',
    department: 'Home Care',
    shift: 'Day Shift (7AM - 7PM)'
  };

  // Mock time logs data
  const [timeLogs, setTimeLogs] = useState([
    {
      id: '1',
      date: '2025-10-31',
      clockIn: '07:00 AM',
      clockOut: '07:00 PM',
      breakStart: '12:00 PM',
      breakEnd: '01:00 PM',
      totalHours: '11.0',
      notes: 'Regular shift - completed all patient visits.',
      status: 'completed'
    },
    {
      id: '2',
      date: '2025-10-30',
      clockIn: '07:15 AM',
      clockOut: '07:30 PM',
      breakStart: '12:30 PM',
      breakEnd: '01:15 PM',
      totalHours: '11.5',
      notes: 'Emergency call extended shift. Patient required additional care.',
      status: 'completed'
    },
    {
      id: '3',
      date: '2025-10-29',
      clockIn: '06:45 AM',
      clockOut: '06:45 PM',
      breakStart: '11:45 AM',
      breakEnd: '12:30 PM',
      totalHours: '11.25',
      notes: 'Early start for patient preparation.',
      status: 'completed'
    }
  ]);

  // Update current time every minute
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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateHoursWorked = () => {
    if (!shiftStartTime) return '0.0';
    const diff = currentTime - shiftStartTime;
    const hours = diff / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  const handleClockAction = (action) => {
    setActionType(action);
    setNotesModalVisible(true);
  };

  const confirmClockAction = () => {
    const now = new Date();
    
    switch (actionType) {
      case 'clockin':
        setIsOnShift(true);
        setShiftStartTime(now);
        Alert.alert(
          'Clocked In Successfully',
          `Welcome! Your shift started at ${formatTime(now)}`
        );
        break;
        
      case 'clockout':
        if (isOnBreak) {
          Alert.alert('Error', 'Please end your break before clocking out.');
          setNotesModalVisible(false);
          return;
        }
        setIsOnShift(false);
        const hoursWorked = calculateHoursWorked();
        
        // Add to time logs
        const newLog = {
          id: Date.now().toString(),
          date: now.toISOString().split('T')[0],
          clockIn: formatTime(shiftStartTime),
          clockOut: formatTime(now),
          breakStart: breakStartTime ? formatTime(breakStartTime) : 'No break',
          breakEnd: breakStartTime ? formatTime(new Date(breakStartTime.getTime() + 60*60*1000)) : 'No break',
          totalHours: hoursWorked,
          notes: shiftNotes,
          status: 'completed'
        };
        
        setTimeLogs([newLog, ...timeLogs]);
        setShiftStartTime(null);
        setBreakStartTime(null);
        
        Alert.alert(
          'Clocked Out Successfully',
          `Shift completed! Total hours: ${hoursWorked}`
        );
        break;
        
      case 'break':
        if (isOnBreak) {
          setIsOnBreak(false);
          setBreakStartTime(null);
          Alert.alert('Break Ended', 'Welcome back! Your break has ended.');
        } else {
          setIsOnBreak(true);
          setBreakStartTime(now);
          Alert.alert('Break Started', 'Enjoy your break!');
        }
        break;
    }
    
    setNotesModalVisible(false);
    setShiftNotes('');
  };

  const getShiftStatus = () => {
    if (!isOnShift) return { status: 'Off Duty', color: COLORS.textLight, icon: 'clock-outline' };
    if (isOnBreak) return { status: 'On Break', color: COLORS.warning, icon: 'coffee' };
    return { status: 'On Duty', color: COLORS.success, icon: 'clock-check' };
  };

  const shiftStatus = getShiftStatus();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.clockButton, styles.clockInButton]}
            onPress={() => handleClockAction('clockin')}
            disabled={isOnShift}
          >
            <MaterialCommunityIcons 
              name="clock-in" 
              size={20} 
              color={isOnShift ? COLORS.textLight : COLORS.white} 
            />
            <Text style={[styles.clockButtonText, { 
              color: isOnShift ? COLORS.textLight : COLORS.white 
            }]}>
              Clock In
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Time Tracking</Text>
          
          <TouchableOpacity
            style={[styles.clockButton, styles.clockOutButton]}
            onPress={() => handleClockAction('clockout')}
            disabled={!isOnShift}
          >
            <MaterialCommunityIcons 
              name="clock-out" 
              size={20} 
              color={!isOnShift ? COLORS.textLight : COLORS.white} 
            />
            <Text style={[styles.clockButtonText, { 
              color: !isOnShift ? COLORS.textLight : COLORS.white 
            }]}>
              Clock Out
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.nurseInfo}>
              <Text style={styles.nurseName}>{nurseInfo.name}</Text>
              <Text style={styles.employeeId}>ID: {nurseInfo.employeeId}</Text>
              <Text style={styles.department}>{nurseInfo.department}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: shiftStatus.color }]}>
              <MaterialCommunityIcons name={shiftStatus.icon} size={20} color={COLORS.white} />
              <Text style={styles.statusText}>{shiftStatus.status}</Text>
            </View>
          </View>
          
          <View style={styles.timeDisplay}>
            <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
            <Text style={styles.currentDate}>{formatDate(currentTime)}</Text>
          </View>
          
          {isOnShift && (
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftLabel}>Shift Started:</Text>
              <Text style={styles.shiftTime}>{formatTime(shiftStartTime)}</Text>
              <Text style={styles.hoursWorked}>Hours Worked: {calculateHoursWorked()}</Text>
            </View>
          )}
        </View>

        {/* Break Button - Keep this for break functionality */}
        {isOnShift && (
          <View style={styles.breakButtonContainer}>
            <TouchableOpacity 
              style={styles.breakButton}
              onPress={() => handleClockAction('break')}
            >
              <LinearGradient
                colors={isOnBreak ? ['#FF9800', '#F57C00'] : ['#2196F3', '#1976D2']}
                style={styles.breakButtonGradient}
              >
                <MaterialCommunityIcons 
                  name={isOnBreak ? 'play' : 'coffee'} 
                  size={24} 
                  color={COLORS.white} 
                />
                <Text style={styles.breakButtonText}>
                  {isOnBreak ? 'End Break' : 'Take Break'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Time Logs */}
        <View style={styles.timeLogsSection}>
          <Text style={styles.sectionTitle}>Recent Time Logs</Text>
          
          {timeLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>{log.date}</Text>
                <View style={[styles.logStatusBadge, { 
                  backgroundColor: log.status === 'completed' ? COLORS.success : COLORS.warning 
                }]}>
                  <Text style={styles.logStatusText}>{log.status}</Text>
                </View>
              </View>
              
              <View style={styles.logDetails}>
                <View style={styles.logRow}>
                  <MaterialCommunityIcons name="clock-in" size={16} color={COLORS.success} />
                  <Text style={styles.logLabel}>Clock In:</Text>
                  <Text style={styles.logValue}>{log.clockIn}</Text>
                </View>
                
                <View style={styles.logRow}>
                  <MaterialCommunityIcons name="clock-out" size={16} color={COLORS.error} />
                  <Text style={styles.logLabel}>Clock Out:</Text>
                  <Text style={styles.logValue}>{log.clockOut}</Text>
                </View>
                
                <View style={styles.logRow}>
                  <MaterialCommunityIcons name="coffee" size={16} color={COLORS.warning} />
                  <Text style={styles.logLabel}>Break:</Text>
                  <Text style={styles.logValue}>{log.breakStart} - {log.breakEnd}</Text>
                </View>
                
                <View style={styles.logRow}>
                  <MaterialCommunityIcons name="clock" size={16} color={COLORS.primary} />
                  <Text style={styles.logLabel}>Total Hours:</Text>
                  <Text style={[styles.logValue, styles.totalHours]}>{log.totalHours} hrs</Text>
                </View>
              </View>
              
              {log.notes && (
                <View style={styles.logNotes}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{log.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notesModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'clockin' ? 'Clock In' : 
                 actionType === 'clockout' ? 'Clock Out' : 
                 actionType === 'break' ? (isOnBreak ? 'End Break' : 'Start Break') : 'Action'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setNotesModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.confirmText}>
                {actionType === 'clockin' ? 'Start your shift now?' : 
                 actionType === 'clockout' ? 'End your shift now?' : 
                 actionType === 'break' ? (isOnBreak ? 'End your break?' : 'Start your break?') : 'Confirm action?'}
              </Text>
              
              {(actionType === 'clockin' || actionType === 'clockout') && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Shift Notes (Optional):</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={shiftNotes}
                    onChangeText={setShiftNotes}
                    placeholder="Add any notes about your shift..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setNotesModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmClockAction}
                >
                  <LinearGradient
                    colors={actionType === 'clockout' ? ['#f44336', '#d32f2f'] : ['#4CAF50', '#45a049']}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clockButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clockInButton: {
    backgroundColor: '#4CAF50',
  },
  clockOutButton: {
    backgroundColor: '#f44336',
  },
  clockButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  nurseInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  department: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentTime: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  currentDate: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  shiftInfo: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shiftLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  hoursWorked: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  breakButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  breakButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  breakButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  breakButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  timeLogsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDate: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logStatusText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  logDetails: {
    marginBottom: 12,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  logLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    minWidth: 80,
  },
  logValue: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    flex: 1,
  },
  totalHours: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  logNotes: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    margin: 20,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
});

export default NurseTimeTrackingScreen;