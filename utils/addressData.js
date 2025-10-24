// Common Jamaica addresses for autocomplete suggestions
export const JAMAICA_LOCATIONS = {
  parishes: [
    'Kingston',
    'St. Andrew',
    'St. Catherine',
    'Clarendon',
    'Manchester',
    'St. Elizabeth',
    'Westmoreland',
    'Hanover',
    'St. James',
    'Trelawny',
    'St. Ann',
    'St. Mary',
    'Portland',
    'St. Thomas',
  ],
  commonAreas: [
    // Kingston & St. Andrew
    'New Kingston, Kingston',
    'Half Way Tree, St. Andrew',
    'Liguanea, St. Andrew',
    'Cross Roads, Kingston',
    'Downtown Kingston',
    'Constant Spring, St. Andrew',
    'Manor Park, Kingston',
    'Mona, St. Andrew',
    'Papine, St. Andrew',
    'Barbican, St. Andrew',
    
    // St. Catherine
    'Spanish Town, St. Catherine',
    'Portmore, St. Catherine',
    'Old Harbour, St. Catherine',
    
    // St. James
    'Montego Bay, St. James',
    'Rose Hall, St. James',
    'Ironshore, St. James',
    
    // Manchester
    'Mandeville, Manchester',
    
    // St. Ann
    'Ocho Rios, St. Ann',
    'St. Ann\'s Bay, St. Ann',
    
    // Portland
    'Port Antonio, Portland',
    
    // Westmoreland
    'Negril, Westmoreland',
    'Savanna-la-Mar, Westmoreland',
  ],
};

export const getAddressSuggestions = (input) => {
  if (!input || input.length < 2) return [];
  
  const searchTerm = input.toLowerCase();
  
  // Search in common areas
  const areaSuggestions = JAMAICA_LOCATIONS.commonAreas.filter(area =>
    area.toLowerCase().includes(searchTerm)
  );
  
  // Search in parishes
  const parishSuggestions = JAMAICA_LOCATIONS.parishes
    .filter(parish => parish.toLowerCase().includes(searchTerm))
    .map(parish => `${parish} Parish`);
  
  return [...areaSuggestions, ...parishSuggestions].slice(0, 5);
};
