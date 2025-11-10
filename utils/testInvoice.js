// Quick test file to verify invoice functionality
import InvoiceService from '../services/InvoiceService';

// Test invoice generation
const testInvoiceGeneration = () => {
  const mockAppointment = {
    id: 'test-001',
    patientName: 'John Doe',
    email: 'john@example.com',
    phone: '876-555-0123',
    address: '123 Test Street, Kingston',
    service: 'Dressings',
    serviceName: 'Dressings',
    preferredDate: '2024-11-01',
    preferredTime: '10:00 AM',
    nurseName: 'Test Nurse',
    status: 'completed'
  };

  try {
    const result = InvoiceService.generateInvoiceFromCompletedAppointment(mockAppointment);
    console.log('✅ Invoice generation test passed');
    console.log('Generated invoice:', result);
    return true;
  } catch (error) {
    console.log('❌ Invoice generation test failed:', error);
    return false;
  }
};

export { testInvoiceGeneration };