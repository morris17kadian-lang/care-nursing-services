# Backup Nurse & Split Schedule Implementation Guide

## Implementation Status

✅ **Completed:**
1. Added coverage badge to NurseInfoCard component
2. Added props for `isCoverage`, `primaryNurseName`, `compact`
3. Added data structure fields to AdminRecurringShiftModal
4. Updated payload to include backup nurses and split schedule data

## Remaining Steps

### 1. AdminRecurringShiftModal UI Components

Add after the nurse selection section (around line 400):

```javascript
{/* Assignment Type Toggle */}
{selectedNurse && (
  <View style={styles.section}>
    <Text style={styles.label}>Nurse Assignment</Text>
    <View style={styles.assignmentTypeContainer}>
      <TouchableOpacity
        style={[styles.assignmentTypeButton, assignmentType === 'single-nurse' && styles.assignmentTypeButtonActive]}
        onPress={() => setAssignmentType('single-nurse')}
      >
        <MaterialCommunityIcons 
          name="account" 
          size={20} 
          color={assignmentType === 'single-nurse' ? COLORS.white : COLORS.primary} 
        />
        <Text style={[styles.assignmentTypeText, assignmentType === 'single-nurse' && styles.assignmentTypeTextActive]}>
          Single Nurse
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.assignmentTypeButton, assignmentType === 'split-schedule' && styles.assignmentTypeButtonActive]}
        onPress={() => setAssignmentType('split-schedule')}
      >
        <MaterialCommunityIcons 
          name="account-multiple" 
          size={20} 
          color={assignmentType === 'split-schedule' ? COLORS.white : COLORS.primary} 
        />
        <Text style={[styles.assignmentTypeText, assignmentType === 'split-schedule' && styles.assignmentTypeTextActive]}>
          Split Schedule
        </Text>
      </TouchableOpacity>
    </View>
    
    {/* Backup Nurses Button */}
    {assignmentType === 'single-nurse' && (
      <TouchableOpacity
        style={styles.backupNursesButton}
        onPress={() => setShowBackupNurseModal(true)}
      >
        <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.primary} />
        <Text style={styles.backupNursesButtonText}>
          {backupNurses.length > 0 
            ? `${backupNurses.length} Backup Nurse${backupNurses.length > 1 ? 's' : ''} Added`
            : 'Add Backup Nurses'}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    )}
  </View>
)}
```

### 2. Split Schedule Day Assignment UI

Add after the days selection:

```javascript
{/* Split Schedule: Day-by-Day Assignment */}
{assignmentType === 'split-schedule' && selectedDays.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.label}>Assign Nurse per Day</Text>
    {selectedDays.map(dayValue => {
      const dayLabel = DAYS_OF_WEEK.find(d => d.value === dayValue)?.label;
      const assignedNurseId = nurseSchedule[dayValue];
      const assignedNurse = nurses.find(n => (n._id || n.id) === assignedNurseId);
      
      return (
        <View key={dayValue} style={styles.dayAssignmentRow}>
          <View style={styles.dayLabel}>
            <Text style={styles.dayLabelText}>{dayLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.dayNurseSelector}
            onPress={() => {
              // Show nurse picker for this day
              setSelectedDayForAssignment(dayValue);
              setShowDayNursePicker(true);
            }}
          >
            {assignedNurse ? (
              <>
                {assignedNurse.profilePhoto && (
                  <Image source={{ uri: assignedNurse.profilePhoto }} style={styles.miniAvatar} />
                )}
                <Text style={styles.assignedNurseName} numberOfLines={1}>
                  {assignedNurse.fullName || 'Nurse'}
                </Text>
              </>
            ) : (
              <Text style={styles.unassignedText}>Tap to assign nurse</Text>
            )}
            <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      );
    })}
  </View>
)}
```

### 3. Backup Nurse Selection Modal

Add a new modal component:

```javascript
{/* Backup Nurse Selection Modal */}
<Modal
  visible={showBackupNurseModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowBackupNurseModal(false)}
>
  <View style={styles.backupModalOverlay}>
    <View style={styles.backupModalContainer}>
      <View style={styles.backupModalHeader}>
        <Text style={styles.backupModalTitle}>Add Backup Nurses</Text>
        <TouchableOpacity onPress={() => setShowBackupNurseModal(false)}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.backupModalContent}>
        <Text style={styles.backupModalDescription}>
          Select nurses who can cover if the primary nurse is unavailable
        </Text>
        
        {nurses
          .filter(n => (n._id || n.id) !== (selectedNurse?._id || selectedNurse?.id))
          .map(nurse => {
            const isBackup = backupNurses.some(b => b.nurseId === (nurse._id || nurse.id));
            return (
              <TouchableOpacity
                key={nurse._id || nurse.id}
                style={[styles.backupNurseCard, isBackup && styles.backupNurseCardSelected]}
                onPress={() => {
                  if (isBackup) {
                    setBackupNurses(prev => prev.filter(b => b.nurseId !== (nurse._id || nurse.id)));
                  } else {
                    setBackupNurses(prev => [...prev, {
                      nurseId: nurse._id || nurse.id,
                      nurseName: nurse.fullName,
                      priority: prev.length + 1
                    }]);
                  }
                }}
              >
                {nurse.profilePhoto && (
                  <Image source={{ uri: nurse.profilePhoto }} style={styles.backupNurseAvatar} />
                )}
                <View style={styles.backupNurseInfo}>
                  <Text style={styles.backupNurseName}>{nurse.fullName || 'Nurse'}</Text>
                  <Text style={styles.backupNurseSpecialty}>{nurse.specialization || 'General'}</Text>
                </View>
                <MaterialCommunityIcons 
                  name={isBackup ? "check-circle" : "plus-circle-outline"} 
                  size={24} 
                  color={isBackup ? COLORS.success : COLORS.textMuted} 
                />
              </TouchableOpacity>
            );
          })}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.backupModalDoneButton}
        onPress={() => setShowBackupNurseModal(false)}
      >
        <Text style={styles.backupModalDoneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

### 4. RecurringShiftDetailsModal - Dynamic Nurse Display

Update nurse data fetching logic:

```javascript
// Add new state
const [currentDayNurseId, setCurrentDayNurseId] = useState(null);

// Helper to get assigned nurse for current or selected day
const getAssignedNurseIdForDay = (dateOrDayOfWeek) => {
  if (shift.assignmentType === 'split-schedule' && shift.nurseSchedule) {
    const dayOfWeek = typeof dateOrDayOfWeek === 'number' 
      ? dateOrDayOfWeek 
      : new Date(dateOrDayOfWeek).getDay();
    return shift.nurseSchedule[dayOfWeek] || shift.primaryNurseId || shift.nurseId;
  }
  
  // Check for coverage override
  if (shift.occurrenceOverrides) {
    const dateKey = typeof dateOrDayOfWeek === 'number'
      ? null
      : new Date(dateOrDayOfWeek).toISOString().split('T')[0];
    if (dateKey && shift.occurrenceOverrides[dateKey]) {
      return shift.occurrenceOverrides[dateKey].assignedNurseId;
    }
  }
  
  return shift.nurseId || shift.primaryNurseId;
};

// Update fetch effect
React.useEffect(() => {
  const fetchNurseData = async () => {
    if (!visible || !shift) return;
    
    const nurseId = getAssignedNurseIdForDay(new Date());
    setCurrentDayNurseId(nurseId);
    
    if (!nurseId) {
      setFreshNurseData(null);
      return;
    }

    try {
      const result = await FirebaseService.getUser(nurseId);
      if (result.success && result.user) {
        setFreshNurseData(result.user);
      }
    } catch (error) {
      console.error('Failed to fetch fresh nurse data:', error);
    }
  };

  fetchNurseData();
}, [visible, shift?.id, shift?.nurseSchedule, shift?.occurrenceOverrides]);
```

### 5. Request Coverage Button

Add to nurse view in RecurringShiftDetailsModal:

```javascript
{user?.role === 'nurse' && user?.id === (shift.nurseId || shift.primaryNurseId) && (
  <TouchableOpacity
    style={styles.requestCoverageButton}
    onPress={handleRequestCoverage}
    disabled={loading}
  >
    <MaterialCommunityIcons name="account-switch" size={20} color={COLORS.primary} />
    <Text style={styles.requestCoverageButtonText}>Request Coverage</Text>
  </TouchableOpacity>
)}

// Handler function
const handleRequestCoverage = async () => {
  Alert.alert(
    'Request Coverage',
    'Select which date you need coverage for:',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Today',
        onPress: () => submitCoverageRequest(new Date())
      },
      {
        text: 'Choose Date',
        onPress: () => setShowCoverageDatePicker(true)
      }
    ]
  );
};

const submitCoverageRequest = async (date) => {
  try {
    setLoading(true);
    const dateKey = date.toISOString().split('T')[0];
    
    const response = await ApiService.makeRequest(
      `/shifts/recurring/${shift.id}/request-coverage`,
      {
        method: 'POST',
        body: JSON.stringify({
          date: dateKey,
          requestingNurseId: user.id,
          reason: 'Nurse requested coverage'
        })
      }
    );
    
    if (response.success) {
      Alert.alert('Success', 'Coverage request sent to backup nurses and admin');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      Alert.alert('Error', response.error || 'Failed to request coverage');
    }
  } catch (error) {
    console.error('Coverage request error:', error);
    Alert.alert('Error', error.message || 'Failed to request coverage');
  } finally {
    setLoading(false);
  }
};
```

### 6. Notification System Integration

Create CoverageRequestNotification component:

```javascript
// In components/CoverageRequestNotification.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export default function CoverageRequestNotification({ notification, onAccept, onDecline }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="account-alert" size={24} color="#F59E0B" />
        <Text style={styles.title}>Coverage Request</Text>
      </View>
      
      <Text style={styles.message}>
        {notification.primaryNurseName} needs coverage for {notification.service}
      </Text>
      <Text style={styles.details}>
        Date: {new Date(notification.date).toLocaleDateString()}
        {'\n'}Time: {notification.startTime} - {notification.endTime}
        {'\n'}Client: {notification.clientName}
      </Text>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.declineButton]} 
          onPress={() => onDecline(notification)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.acceptButton]} 
          onPress={() => onAccept(notification)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### 7. Backend API Endpoints Needed

```javascript
// Backend routes to implement:

// 1. Request coverage
POST /shifts/recurring/:id/request-coverage
Body: { date, requestingNurseId, reason }
Action: Create coverage request, notify backup nurses + admin

// 2. Accept coverage
PUT /shifts/recurring/:id/coverage/:coverageRequestId/accept
Body: { backupNurseId }
Action: Assign backup to date, notify patient + admin + primary nurse

// 3. Decline coverage
PUT /shifts/recurring/:id/coverage/:coverageRequestId/decline
Body: { backupNurseId, reason }
Action: Mark declined, notify next backup or admin

// 4. Clock-out with visit history
PUT /shifts/recurring/:id/clock-out
Body: { clockOutLocation, clockInTime, clockOutTime, notes, addToVisitHistory }
Action: Add completed visit to shift.visitHistory array, keep status as 'booked'
```

### 8. Styles to Add

```javascript
// Add to AdminRecurringShiftModal styles:
assignmentTypeContainer: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 12,
},
assignmentTypeButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: COLORS.primary,
  gap: 8,
},
assignmentTypeButtonActive: {
  backgroundColor: COLORS.primary,
},
assignmentTypeText: {
  fontSize: 13,
  fontFamily: 'Poppins_600SemiBold',
  color: COLORS.primary,
},
assignmentTypeTextActive: {
  color: COLORS.white,
},
backupNursesButton: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 14,
  backgroundColor: COLORS.background,
  borderRadius: 10,
  gap: 10,
  marginTop: 8,
},
backupNursesButtonText: {
  flex: 1,
  fontSize: 13,
  fontFamily: 'Poppins_500Medium',
  color: COLORS.text,
},
dayAssignmentRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginBottom: 10,
},
dayLabel: {
  width: 50,
  paddingVertical: 8,
  paddingHorizontal: 10,
  backgroundColor: COLORS.primary,
  borderRadius: 8,
  alignItems: 'center',
},
dayLabelText: {
  fontSize: 12,
  fontFamily: 'Poppins_600SemiBold',
  color: COLORS.white,
},
dayNurseSelector: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  backgroundColor: COLORS.background,
  borderRadius: 10,
  gap: 8,
},
miniAvatar: {
  width: 32,
  height: 32,
  borderRadius: 16,
},
assignedNurseName: {
  flex: 1,
  fontSize: 13,
  fontFamily: 'Poppins_500Medium',
  color: COLORS.text,
},
unassignedText: {
  flex: 1,
  fontSize: 13,
  fontFamily: 'Poppins_400Regular',
  color: COLORS.textMuted,
  fontStyle: 'italic',
},
requestCoverageButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 14,
  paddingHorizontal: 20,
  backgroundColor: '#FEF3C7',
  borderRadius: 12,
  marginTop: 16,
},
requestCoverageButtonText: {
  fontSize: 14,
  fontFamily: 'Poppins_600SemiBold',
  color: '#92400E',
},
```

## Testing Checklist

- [ ] Create recurring shift with single nurse
- [ ] Add backup nurses and verify they're saved
- [ ] Create split schedule with different nurses per day
- [ ] Verify nurse card shows correct nurse based on day
- [ ] Request coverage as primary nurse
- [ ] Accept coverage as backup nurse
- [ ] Verify patient receives notification
- [ ] Clock in/out still works
- [ ] Notes button still works
- [ ] Approve/deny still works
- [ ] Visit history displays after clock-out
- [ ] Coverage badge displays on nurse card

## Next Steps

1. Implement backend API endpoints
2. Add notification handling in NotificationContext
3. Test all flows end-to-end
4. Add error handling and loading states
5. Update admin dashboard to show coverage requests
