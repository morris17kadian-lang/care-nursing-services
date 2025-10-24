// Brand colors matching the CARE logo gradient
export const COLORS = {
  // Primary brand gradients (teal to blue)
  primary: '#0a7fb8',
  primaryDark: '#085a8a',
  primaryLight: '#1fb3d4',
  
  // Accent teal/cyan from logo
  accent: '#22d0cd',
  accentLight: '#3ee9e6',
  accentDark: '#00a6a3',
  
  // Supporting colors
  white: '#ffffff',
  background: '#f5f9fc',
  text: '#0c3d56',
  textLight: '#5a7c8f',
  textMuted: '#8fa8b7',
  
  // Status colors
  success: '#22d0cd',
  successLight: '#e0f7f7',
  warning: '#ffa726',
  warningLight: '#fff3e0',
  error: '#ef5350',
  errorLight: '#ffebee',
  info: '#1fb3d4',
  infoLight: '#e1f5fe',
  
  // UI elements
  border: '#d4e6f0',
  card: '#ffffff',
  shadow: 'rgba(10, 127, 184, 0.15)',
};

export const GRADIENTS = {
  primary: ['#0a7fb8', '#1fb3d4'],
  accent: ['#22d0cd', '#3ee9e6'],
  header: ['#4169E1', '#1E90FF', '#00BFFF', '#00CED1'],
  card: ['#ffffff', '#f8fcff'],
  splash: ['#FFFFFF', '#00FFFF'], // Inverted: white to cyan gradient for splash/login/signup
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

export const SERVICES = [
  {
    id: '1',
    title: 'Dressings',
    description: 'Professional wound care and sterile dressing changes for all types of wounds',
    icon: 'bandage',
    category: 'Clinical',
    price: '$45',
    duration: '30 mins'
  },
  {
    id: '2',
    title: 'Medication Administration',
    description: 'Safe and accurate medication management with proper documentation',
    icon: 'pill',
    category: 'Clinical',
    price: '$35',
    duration: '20 mins'
  },
  {
    id: '3',
    title: 'NG Tubes',
    description: 'Expert nasogastric tube insertion and management with patient comfort',
    icon: 'stomach',
    category: 'Clinical',
    price: '$85',
    duration: '45 mins'
  },
  {
    id: '4',
    title: 'Urinary Catheter',
    description: 'Professional catheter insertion and care with dignity and comfort',
    icon: 'water-outline',
    category: 'Clinical',
    price: '$75',
    duration: '40 mins'
  },
  {
    id: '5',
    title: 'IV Access',
    description: 'Skilled intravenous access and IV therapy management',
    icon: 'needle',
    category: 'Clinical',
    price: '$65',
    duration: '35 mins'
  },
  {
    id: '6',
    title: 'Tracheostomy Care',
    description: 'Specialized tracheostomy maintenance and suctioning services',
    icon: 'lungs',
    category: 'Clinical',
    price: '$95',
    duration: '50 mins'
  },
  {
    id: '7',
    title: 'Physiotherapy',
    description: 'Professional physical rehabilitation and mobility improvement services',
    icon: 'walk',
    category: 'Therapy',
    price: '$80',
    duration: '60 mins'
  },
  {
    id: '8',
    title: 'Home Nursing',
    description: 'Comprehensive nursing care in the comfort of your home',
    icon: 'home-heart',
    category: 'Home Care',
    price: '$120/hr',
    duration: 'Hourly'
  },
  {
    id: '9',
    title: 'Hospital Sitter',
    description: 'Compassionate bedside care and patient advocacy at the hospital',
    icon: 'hospital-building',
    category: 'Support',
    price: '$100/hr',
    duration: 'Hourly'
  },
  {
    id: '10',
    title: 'Blood Draws',
    description: 'Professional phlebotomy and blood sample collection services',
    icon: 'water-check',
    category: 'Clinical',
    price: '$40',
    duration: '15 mins'
  },
  {
    id: '11',
    title: 'Vital Signs',
    description: 'Regular monitoring of blood pressure, temperature, and other vital signs',
    icon: 'heart-pulse',
    category: 'Monitoring',
    price: '$30',
    duration: '15 mins'
  },
  {
    id: '12',
    title: 'Wound Care',
    description: 'Advanced wound assessment, cleaning, and specialized treatment',
    icon: 'medical-bag',
    category: 'Clinical',
    price: '$70',
    duration: '45 mins'
  },
  {
    id: '13',
    title: 'Injection Services',
    description: 'Professional administration of injections and immunizations',
    icon: 'needle-off',
    category: 'Clinical',
    price: '$35',
    duration: '15 mins'
  },
  {
    id: '14',
    title: 'Health Assessments',
    description: 'Comprehensive health evaluations and wellness checks',
    icon: 'clipboard-pulse',
    category: 'Monitoring',
    price: '$90',
    duration: '60 mins'
  },
  {
    id: '15',
    title: 'Elderly Care',
    description: 'Specialized care and assistance for senior patients',
    icon: 'human-cane',
    category: 'Home Care',
    price: '$110/hr',
    duration: 'Hourly'
  },
  {
    id: '16',
    title: 'Post-Surgery Care',
    description: 'Expert post-operative monitoring and recovery support',
    icon: 'hospital-box',
    category: 'Support',
    price: '$150',
    duration: '90 mins'
  },
  {
    id: '17',
    title: 'Diabetic Care',
    description: 'Blood sugar monitoring, insulin administration, and diabetic management',
    icon: 'diabetes',
    category: 'Monitoring',
    price: '$55',
    duration: '30 mins'
  },
  {
    id: '18',
    title: 'Palliative Care',
    description: 'Compassionate comfort care and pain management services',
    icon: 'hand-heart',
    category: 'Support',
    price: '$130/hr',
    duration: 'Hourly'
  },
];

export const CONTACT_INFO = {
  phone: '876-288-7304',
  email: 'nursingservicesandmorecare@gmail.com',
  instagram: '@carenursingservices',
  whatsapp: '876-288-7304',
  emergency: '876-288-7304',
  hours: {
    weekday: 'Mon-Fri: 9:00-17:00',
    saturday: 'Sat: 10:00-14:00',
    emergency: '24/7 Emergency',
  },
};
