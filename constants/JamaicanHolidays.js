/**
 * Jamaican Public Holidays
 * These dates are statutory holidays where workers receive overtime pay (typically 2x rate)
 * 
 * Note: Some holidays are moveable (e.g., Easter-related dates change yearly)
 * This list includes holidays for 2024-2027
 */

export const JAMAICAN_HOLIDAYS = {
  // 2024 Holidays
  '2024-01-01': 'New Year\'s Day',
  '2024-02-14': 'Ash Wednesday',
  '2024-03-29': 'Good Friday',
  '2024-04-01': 'Easter Monday',
  '2024-05-23': 'Labour Day',
  '2024-08-01': 'Emancipation Day',
  '2024-08-06': 'Independence Day (observed)',
  '2024-10-21': 'National Heroes Day',
  '2024-12-25': 'Christmas Day',
  '2024-12-26': 'Boxing Day',

  // 2025 Holidays
  '2025-01-01': 'New Year\'s Day',
  '2025-03-05': 'Ash Wednesday',
  '2025-04-18': 'Good Friday',
  '2025-04-21': 'Easter Monday',
  '2025-05-23': 'Labour Day',
  '2025-08-01': 'Emancipation Day',
  '2025-08-06': 'Independence Day',
  '2025-10-20': 'National Heroes Day',
  '2025-12-25': 'Christmas Day',
  '2025-12-26': 'Boxing Day',

  // 2026 Holidays
  '2026-01-01': 'New Year\'s Day',
  '2026-02-18': 'Ash Wednesday',
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Easter Monday',
  '2026-05-25': 'Labour Day (observed)',
  '2026-08-03': 'Emancipation Day (observed)',
  '2026-08-06': 'Independence Day',
  '2026-10-19': 'National Heroes Day',
  '2026-12-25': 'Christmas Day',
  '2026-12-28': 'Boxing Day (observed)',

  // 2027 Holidays
  '2027-01-01': 'New Year\'s Day',
  '2027-02-10': 'Ash Wednesday',
  '2027-03-26': 'Good Friday',
  '2027-03-29': 'Easter Monday',
  '2027-05-24': 'Labour Day (observed)',
  '2027-08-02': 'Emancipation Day (observed)',
  '2027-08-06': 'Independence Day',
  '2027-10-18': 'National Heroes Day',
  '2027-12-27': 'Christmas Day (observed)',
  '2027-12-28': 'Boxing Day (observed)',
};

/**
 * Check if a given date is a Jamaican public holiday
 * @param {string|Date} date - Date in YYYY-MM-DD format or Date object
 * @returns {boolean} - True if the date is a public holiday
 */
export const isJamaicanHoliday = (date) => {
  if (!date) return false;
  
  let dateStr;
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0];
  } else if (typeof date === 'string') {
    // Extract YYYY-MM-DD from various formats
    if (date.includes('T')) {
      dateStr = date.split('T')[0];
    } else {
      dateStr = date;
    }
  } else {
    return false;
  }
  
  return Boolean(JAMAICAN_HOLIDAYS[dateStr]);
};

/**
 * Get the holiday name for a given date
 * @param {string|Date} date - Date in YYYY-MM-DD format or Date object
 * @returns {string|null} - Holiday name or null if not a holiday
 */
export const getHolidayName = (date) => {
  if (!date) return null;
  
  let dateStr;
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0];
  } else if (typeof date === 'string') {
    if (date.includes('T')) {
      dateStr = date.split('T')[0];
    } else {
      dateStr = date;
    }
  } else {
    return null;
  }
  
  return JAMAICAN_HOLIDAYS[dateStr] || null;
};

/**
 * Get all holidays for a given year
 * @param {number} year - Year (e.g., 2026)
 * @returns {Object} - Object with date keys and holiday name values
 */
export const getHolidaysForYear = (year) => {
  const yearStr = String(year);
  const holidays = {};
  
  for (const [date, name] of Object.entries(JAMAICAN_HOLIDAYS)) {
    if (date.startsWith(yearStr)) {
      holidays[date] = name;
    }
  }
  
  return holidays;
};

/**
 * Get all holidays within a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} - Object with date keys and holiday name values
 */
export const getHolidaysInRange = (startDate, endDate) => {
  const holidays = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (const [date, name] of Object.entries(JAMAICAN_HOLIDAYS)) {
    const holidayDate = new Date(date);
    if (holidayDate >= start && holidayDate <= end) {
      holidays[date] = name;
    }
  }
  
  return holidays;
};
