/**
 * Get formatted nurse name from nurse object
 * @param {Object} nurse - Nurse object from appointment
 * @returns {string} Formatted name or fallback
 */
export const getNurseName = (nurse) => {
  if (!nurse) return 'Unassigned';
  
  if (typeof nurse === 'string') return nurse;
  
  if (nurse.fullName) return nurse.fullName;
  
  if (nurse.firstName && nurse.lastName) {
    return `${nurse.firstName} ${nurse.lastName}`;
  }
  
  if (nurse.firstName) return nurse.firstName;
  if (nurse.lastName) return nurse.lastName;
  if (nurse.name) return nurse.name;
  
  // If we have an object but no name fields, check if it has an ID but no name
  if (nurse._id || nurse.id) return 'Assigned Nurse';
  
  return 'Unassigned';
};

/**
 * Format time string from 24-hour to 12-hour format
 * @param {string} timeString - Time in HH:MM format or already in 12h format
 * @returns {string} Time in 12-hour format with AM/PM
 */
export const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return 'N/A';
  
  const str = String(timeString).trim();
  
  // If already in 12-hour format (contains AM or PM), return as-is
  if (/AM|PM/i.test(str)) {
    return str;
  }
  
  // Try to parse HH:MM or HH:MM:SS format
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return str; // Return original if not in expected format
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }
  
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Get formatted patient name from patient object
 * @param {Object} patient - Patient object from appointment
 * @returns {string} Formatted name or fallback
 */
export const getPatientName = (patient) => {
  if (!patient) return 'Unknown Patient';
  
  if (typeof patient === 'string') return patient;
  
  if (patient.fullName) return patient.fullName;
  
  if (patient.firstName && patient.lastName) {
    return `${patient.firstName} ${patient.lastName}`;
  }
  
  if (patient.firstName) return patient.firstName;
  if (patient.lastName) return patient.lastName;
  if (patient.name) return patient.name;
  
  return 'Unknown Patient';
};

/**
 * Format address by removing duplicates and empty values
 * @param {Object|string} address - Address object or string
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return 'N/A';
  
  // If it's already a string, return as-is
  if (typeof address === 'string') {
    return address.trim() || 'N/A';
  }
  
  // Handle object with street, city, parish structure
  if (typeof address === 'object') {
    const parts = [];
    
    // Add street if available
    if (address.street && address.street.trim()) {
      parts.push(address.street.trim());
    }
    
    // Create a Set to track unique location parts
    const locationParts = new Set();
    
    // Add city if available and not duplicate
    if (address.city && address.city.trim()) {
      locationParts.add(address.city.trim());
    }
    
    // Add parish if available and not duplicate of city
    if (address.parish && address.parish.trim()) {
      locationParts.add(address.parish.trim());
    }
    
    // Convert Set back to array and add to parts
    if (locationParts.size > 0) {
      parts.push(...Array.from(locationParts));
    }
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }
  
  return 'N/A';
};
