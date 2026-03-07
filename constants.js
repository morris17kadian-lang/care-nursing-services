// CARE brand colors (original palette)
export const COLORS = {
  // Primary brand (CARE blue)
  primary: '#2196F3',
  primaryDark: '#1976D2',
  primaryLight: '#64B5F6',

  // Accent (CARE cyan)
  accent: '#00BCD4',
  accentLight: '#4DD0E1',
  accentDark: '#0097A7',

  // Neutral / supporting colors
  white: '#ffffff',
  background: '#ffffff',
  card: '#ffffff',

  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',

  gray: '#9E9E9E',
  lightGray: '#E5E7EB',

  // Status colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FFA726',
  warningLight: '#FFF3E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  // UI elements
  border: '#E5E7EB',
  shadow: 'rgba(33, 150, 243, 0.15)',
};

// Debug flags
// Set to true temporarily when you need verbose console logging.
export const ENABLE_DEBUG_LOGS = false;

export const GRADIENTS = {
  primary: ['#2196F3', '#1976D2'],
  accent: ['#00BCD4', '#4DD0E1'],
  header: ['#2196F3', '#1E88E5', '#1976D2', '#1565C0'],
  card: ['#ffffff', '#E3F2FD'],
  warning: ['#FFA500', '#FF8C00'],
  splash: ['#FFFFFF', '#FFFFFF'], // Pure white background for splash
};

// Service Pricing Structure (in JMD) - Updated Jan 21, 2026
export const SERVICE_RATES = {
  // Wound Care Services
  'Wound Care - With Supplies': 15000,
  'Wound Care - Without Supplies': 9500,
  'Wound Care': 9500, // Default without supplies
  
  // NG Tube Services
  'NG Tube Repass - With Supplies': 15000,
  'NG Tube Repass - Without Supplies': 8500,
  'NG Tubes': 8500, // Default without supplies
  
  // Urinary Catheter Services
  'Repass Urine Catheter - With Supplies': 16500,
  'Repass Urine Catheter - Without Supplies': 10000,
  'Urinary Catheter': 10000, // Default without supplies
  
  // IV Services
  'IV Therapy Monitoring (2hrs)': 27350,
  'IV Cannulation': 8500,
  'IV Access': 8500, // Alias for IV Cannulation
  
  // Nursing Services - Practical Nurse (PN)
  'PN - 8 Hour Service': 7500,
  'PN - 12 Hour Service': 9500,
  
  // Registered Nurse (RN)
  'RN - Hourly': 4500,
  'Registered Nurse Hourly': 4500,
  
  // Physiotherapy
  'Physiotherapy (2hrs)': 10000,
  'Physiotherapy': 10000,
  
  // Doctors Visits
  'Doctors Visits': 0, // Location-based pricing - to be calculated
  
  // Live-in Care Services
  'Weekly Live-in Care (7 days)': 55000,
  'Monthly Live-in Care (4 weeks)': 170000,
  
  // Legacy/Backward Compatibility Services
  'Dressings': 6750,
  'Medication Administration': 5275,
  'Tracheostomy Care': 14300,
  'Blood Draws': 6025,
  'Injection Services': 5275,
  'Home Nursing': 18100,
  'Elderly Care': 16575,
  'Hospital Sitter': 15075,
  'Post-Surgery Care': 22575,
  'Palliative Care': 19575,
  'Vital Signs': 4525,
  'Health Assessments': 13575,
  'Diabetic Care': 8300,
};

// Nurse Pay Rates (what nurses earn) - in JMD
// NOTE: These are the rates paid to nurses, not what clients are charged
// Bonuses are only paid for holiday shifts (already implemented separately)
export const NURSE_PAY_RATES = {
  // Registered Nurses (RN)
  RN: {
    hourly: 3000, // Base hourly rate for RN
    description: 'Registered Nurse hourly pay rate'
  },
  
  // Practical Nurses (PN)
  PN: {
    shift_8hrs: 5000,
    shift_12hrs: 6500,
    description: 'Practical Nurse shift pay rates'
  },
  
  // Live-in Care
  live_in: {
    weekly: 38000, // Weekly pay for live-in nurse (7 days)
    monthly: 120000, // Monthly pay for live-in nurse (4 weeks)
  },
};

// Helper functions for calculating rates
export const SHIFT_RATES = {
  // CLIENT BILLING RATES
  getRNRate: (hours) => {
    return SERVICE_RATES['RN - Hourly'];
  },
  
  getPNShiftRate: (shiftType) => {
    const rates = {
      '8hr': SERVICE_RATES['PN - 8 Hour Service'],
      '12hr': SERVICE_RATES['PN - 12 Hour Service'],
      'weekly_live_in': SERVICE_RATES['Weekly Live-in Care (7 days)'],
      'monthly_live_in': SERVICE_RATES['Monthly Live-in Care (4 weeks)']
    };
    return rates[shiftType] || SERVICE_RATES['PN - 8 Hour Service'];
  },
  
  // Calculate total cost for RN services
  calculateRNTotal: (hours) => {
    return hours * SERVICE_RATES['RN - Hourly'];
  },
  
  // Get service rate by name
  getServiceRate: (serviceName) => {
    return SERVICE_RATES[serviceName] || 0;
  },
  
  // Calculate nurse pay
  calculateNursePay: (serviceType, duration, nurseType = 'PN') => {
    if (nurseType === 'RN') {
      return duration * NURSE_PAY_RATES.RN.hourly;
    }
    
    // PN rates
    if (duration <= 8) {
      return NURSE_PAY_RATES.PN.shift_8hrs;
    } else if (duration <= 12) {
      return NURSE_PAY_RATES.PN.shift_12hrs;
    }
    
    return NURSE_PAY_RATES.PN.shift_8hrs;
  }
};

// Nurse Payout Rates (what nurses actually receive - 60% of billing rates)
export const NURSE_PAYOUT_RATES = {
  // Registered Nurses (RN) - NURSE PAYOUT (60% of billing)
  RN: {
    hourly_up_to_4hrs: 2700, // 60% of 4500
    hourly_5hrs_plus: 2100,  // 60% of 3500
    payout_percentage: 0.6
  },
  
  // Practical Nurses (PN) - NURSE PAYOUT (60% of billing)
  PN: {
    shift_8hrs: 3900,        // 60% of 6500
    shift_12hrs: 5100,       // 60% of 8500
    daily_live_in_24hrs: 5400, // 60% of 9000
    weekly_live_in: 27000,   // 60% of 45000
    payout_percentage: 0.6
  },
  
  // Calculate actual nurse payout for RN
  calculateRNPayout: (hours) => {
    const billingTotal = SHIFT_RATES.calculateRNTotal(hours);
    return billingTotal * 0.6;
  },
  
  // Get PN payout rate
  getPNPayout: (shiftType) => {
    const billingRate = SHIFT_RATES.getPNShiftRate(shiftType);
    return billingRate * 0.6;
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
};

// Increment this when the default SERVICES catalog changes in a way that should
// propagate to existing installs.
export const SERVICES_CATALOG_VERSION = '876nurses-services-v2';

export const SERVICES = [
  {
    id: '1',
    title: 'Wound Care - With Supplies',
    description: 'Professional wound care including cleaning, dressing changes, and all medical supplies',
    icon: 'medical-bag',
    category: 'Clinical',
    price: '15000',
    duration: ''
  },
  {
    id: '2',
    title: 'Wound Care - Without Supplies',
    description: 'Professional wound care service (patient provides own supplies)',
    icon: 'medical-bag',
    category: 'Clinical',
    price: '9500',
    duration: ''
  },
  {
    id: '3',
    title: 'NG Tube Repass - With Supplies',
    description: 'Nasogastric tube replacement with all necessary supplies provided',
    icon: 'test-tube',
    category: 'Clinical',
    price: '15000',
    duration: ''
  },
  {
    id: '4',
    title: 'NG Tube Repass - Without Supplies',
    description: 'Nasogastric tube replacement service (patient provides supplies)',
    icon: 'test-tube',
    category: 'Clinical',
    price: '8500',
    duration: ''
  },
  {
    id: '5',
    title: 'Repass Urine Catheter - With Supplies',
    description: 'Urinary catheter replacement with all supplies included',
    icon: 'water',
    category: 'Clinical',
    price: '16500',
    duration: ''
  },
  {
    id: '6',
    title: 'Repass Urine Catheter - Without Supplies',
    description: 'Urinary catheter replacement service (patient provides supplies)',
    icon: 'water',
    category: 'Clinical',
    price: '10000',
    duration: ''
  },
  {
    id: '7',
    title: 'IV Therapy Monitoring',
    description: 'Professional IV therapy monitoring and care for 2 hours',
    icon: 'needle',
    category: 'Clinical',
    price: '27350',
    duration: '2 hours'
  },
  {
    id: '8',
    title: 'IV Cannulation',
    description: 'Professional IV line insertion and setup',
    icon: 'needle',
    category: 'Clinical',
    price: '8500',
    duration: ''
  },
  {
    id: '9',
    title: 'PN - 8 Hour Service',
    description: 'Practical Nurse service for 8-hour shift',
    icon: 'clock-outline',
    category: 'Nursing',
    price: '7500',
    duration: '8 hours'
  },
  {
    id: '10',
    title: 'PN - 12 Hour Service',
    description: 'Practical Nurse service for 12-hour shift',
    icon: 'clock-outline',
    category: 'Nursing',
    price: '9500',
    duration: '12 hours'
  },
  {
    id: '11',
    title: 'RN - Hourly',
    description: 'Registered Nurse hourly service',
    icon: 'account-tie',
    category: 'Nursing',
    price: '4500',
    duration: 'Per hour'
  },
  {
    id: '12',
    title: 'Physiotherapy',
    description: 'Physical rehabilitation and mobility improvement services',
    icon: 'walk',
    category: 'Therapy',
    price: '10000',
    duration: '2 hours'
  },
  {
    id: '13',
    title: 'Weekly Live-in Care',
    description: 'Live-in nursing care for 7 days (one week)',
    icon: 'home-heart',
    category: 'Live-in Care',
    price: '55000',
    duration: '7 days'
  },
  {
    id: '14',
    title: 'Monthly Live-in Care',
    description: 'Live-in nursing care for 4 weeks (one month)',
    icon: 'home-heart',
    category: 'Live-in Care',
    price: '170000',
    duration: '4 weeks'
  },
  {
    id: '15',
    title: 'Doctors Visits',
    description: 'Doctor home visits - pricing varies by location',
    icon: 'doctor',
    category: 'Medical',
    price: '',
    duration: ''
  },
];

export const CONTACT_INFO = {
  // Primary contact (Weekdays 9:00am - 5:00pm)
  phone: '(876) 618-9876',
  phoneWeekday: '(876) 618-9876',
  // After-hours / weekends
  phoneAfterHours: ['(876) 431-4072', '(876) 431-3244'],
  emergency: '(876) 431-4072',
  email: '876nurses@gmail.com',
  website: 'www.876nurses.com',
  instagram: '@876_nurses',
  // Not listed on the provided contact card; set to main line for now.
  whatsapp: '8766189876',
  address:
    '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies',
  hours: {
    weekday: 'Weekdays: 9:00am - 5:00pm',
    afterHours: 'Weekends & weekdays (after 5:00pm)',
  },
};

export const COMPANY_INFO = {
  displayName: '876Nurses',
  legalName: '876 Nurses Home Care Services Limited',
  tagline: 'Premium healthcare services to Jamaicans islandwide',
};

// Invoice Configuration
export const INVOICE_CONFIG = {
  companyInfo: {
    name: '876Nurses',
    fullName: '876 NURSES HOME CARE SERVICES LIMITED',
    address: '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies',
    phone: '(876) 618-9876',
    email: '876nurses@gmail.com',
    taxId: '', // Add if applicable
  },
  template: {
    header: {
      colors: ['#4169E1', '#1E90FF', '#00BFFF', '#00CED1'], // Matches your gradient
      logo: '876Nurses', // Will use your existing logo
    },
    terms: {
      paymentDue: 3, // days
      paymentText: 'Please send payment within 3 days of receiving this invoice.',
    },
    numberPrefix: 'INV-',
  },
};

// Invoice Line Item Structure
export const INVOICE_ITEM_TEMPLATE = {
  description: '',
  quantity: 1,
  price: 0,
  total: 0,
};

// Sample invoice data structure
export const SAMPLE_INVOICE = {
  invoiceNumber: 'INV-2024-001',
  date: '2024-11-01',
  dueDate: '2024-11-04',
  billTo: {
    name: '',
    address: '',
    phone: '',
    email: '',
  },
  items: [
    // Will be populated with services from SERVICES array
  ],
  subtotal: 0,
  tax: 0,
  total: 0,
  paymentInfo: {
    method: '', // Cash, Card, Bank Transfer, etc.
    bankDetails: '', // If bank transfer
  },
  status: 'pending', // pending, paid, overdue
  notes: '',
};
