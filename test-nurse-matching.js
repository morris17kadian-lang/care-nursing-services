// Test script to check nurse ID matching
const nurse = {
  id: 'abc123',
  code: 'NURSE001',
  nurseCode: 'NURSE001'
};

const appointment = {
  id: 'appt1',
  patientName: 'John Doe',
  status: 'assigned',
  nurseId: 'abc123', // Using the ID
  // or: nurseCode: 'NURSE001'
};

console.log('Nurse ID:', nurse.id);
console.log('Appointment nurseId:', appointment.nurseId);
console.log('Match:', appointment.nurseId === nurse.id);
