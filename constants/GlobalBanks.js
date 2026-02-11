// Global Bank Database with Real Banking Institutions
// This includes major banks from multiple countries with their real branches

export const GLOBAL_BANKS = [
  // United States
  {
    id: 'us_jpmorgan',
    name: 'JPMorgan Chase Bank',
    country: 'United States',
    code: 'JPMC',
    branches: [
      'Manhattan Main Branch',
      'Brooklyn Heights',
      'Los Angeles Downtown',
      'Chicago Loop',
      'Miami Brickell',
      'Houston Galleria',
      'Atlanta Midtown',
      'Boston Back Bay'
    ]
  },
  {
    id: 'us_bankofamerica',
    name: 'Bank of America',
    country: 'United States',
    code: 'BOA',
    branches: [
      'Times Square Branch',
      'Wall Street Branch',
      'Beverly Hills Branch',
      'Chicago Michigan Avenue',
      'Dallas Downtown',
      'Phoenix Central',
      'Denver Cherry Creek'
    ]
  },
  {
    id: 'us_wells_fargo',
    name: 'Wells Fargo Bank',
    country: 'United States',
    code: 'WF',
    branches: [
      'San Francisco Union Square',
      'New York Madison Avenue',
      'Los Angeles Wilshire',
      'Seattle Downtown',
      'Portland Pearl District',
      'Austin Sixth Street'
    ]
  },

  // United Kingdom
  {
    id: 'uk_barclays',
    name: 'Barclays Bank',
    country: 'United Kingdom',
    code: 'BARC',
    branches: [
      'London Canary Wharf',
      'Manchester Piccadilly',
      'Birmingham New Street',
      'Edinburgh Princes Street',
      'Glasgow Buchanan Street',
      'Liverpool Lord Street',
      'Leeds City Centre'
    ]
  },
  {
    id: 'uk_hsbc',
    name: 'HSBC Bank',
    country: 'United Kingdom',
    code: 'HSBC',
    branches: [
      'London Oxford Street',
      'Leeds Headrow',
      'Manchester Market Street',
      'Birmingham Bull Ring',
      'Cardiff Queen Street',
      'Newcastle Grainger Street'
    ]
  },
  {
    id: 'uk_lloyds',
    name: 'Lloyds Bank',
    country: 'United Kingdom',
    code: 'LLOY',
    branches: [
      'London King\'s Road',
      'Bristol Cabot Circus',
      'Sheffield High Street',
      'Nottingham Market Square',
      'Southampton Above Bar'
    ]
  },

  // Canada
  {
    id: 'ca_rbc',
    name: 'Royal Bank of Canada (RBC)',
    country: 'Canada',
    code: 'RBC',
    branches: [
      'Toronto King Street',
      'Vancouver Robson Street',
      'Montreal Ste-Catherine',
      'Calgary Stephen Avenue',
      'Ottawa Rideau Centre',
      'Winnipeg Portage Avenue'
    ]
  },
  {
    id: 'ca_td',
    name: 'Toronto-Dominion Bank (TD)',
    country: 'Canada',
    code: 'TD',
    branches: [
      'Toronto Bay Street',
      'Vancouver Granville',
      'Montreal McGill College',
      'Calgary 8th Avenue',
      'Edmonton Jasper Avenue'
    ]
  },

  // Jamaica
  {
    id: 'jm_ncb',
    name: 'National Commercial Bank (NCB)',
    country: 'Jamaica',
    code: 'NCB',
    branches: [
      'Half Way Tree',
      'Cross Roads',
      'King Street',
      'Liguanea',
      'Constant Spring',
      'New Kingston',
      'Spanish Town',
      'Mandeville',
      'Montego Bay',
      'Ocho Rios',
      'Port Antonio',
      'Negril'
    ]
  },
  {
    id: 'jm_scotia',
    name: 'Scotiabank Jamaica',
    country: 'Jamaica',
    code: 'SCOTIA',
    branches: [
      'Scotia Centre',
      'Half Way Tree',
      'Cross Roads',
      'Liguanea',
      'Mandeville',
      'Montego Bay',
      'Ocho Rios',
      'Spanish Town',
      'May Pen',
      'Port Maria'
    ]
  },
  {
    id: 'jm_jmmb',
    name: 'Jamaica Money Market Brokers (JMMB)',
    country: 'Jamaica',
    code: 'JMMB',
    branches: [
      'Knutsford Boulevard',
      'Half Way Tree',
      'Cross Roads',
      'Mandeville',
      'Montego Bay',
      'Ocho Rios',
      'Spanish Town'
    ]
  },
  {
    id: 'jm_firstglobal',
    name: 'First Global Bank',
    country: 'Jamaica',
    code: 'FGB',
    branches: [
      'New Kingston',
      'Half Way Tree',
      'Mandeville',
      'Montego Bay',
      'Ocho Rios'
    ]
  },

  // Australia
  {
    id: 'au_commonwealth',
    name: 'Commonwealth Bank of Australia',
    country: 'Australia',
    code: 'CBA',
    branches: [
      'Sydney Martin Place',
      'Melbourne Collins Street',
      'Brisbane Queen Street',
      'Perth St Georges Terrace',
      'Adelaide Rundle Mall',
      'Canberra City Centre'
    ]
  },
  {
    id: 'au_westpac',
    name: 'Westpac Banking Corporation',
    country: 'Australia',
    code: 'WBC',
    branches: [
      'Sydney Kent Street',
      'Melbourne Bourke Street',
      'Brisbane Edward Street',
      'Perth Murray Street',
      'Adelaide King William Street'
    ]
  },

  // Germany
  {
    id: 'de_deutsche',
    name: 'Deutsche Bank',
    country: 'Germany',
    code: 'DB',
    branches: [
      'Frankfurt Taunusanlage',
      'Berlin Unter den Linden',
      'Munich Maximilianstrasse',
      'Hamburg Jungfernstieg',
      'Cologne Hohenzollernring',
      'Stuttgart Königstrasse'
    ]
  },
  {
    id: 'de_commerzbank',
    name: 'Commerzbank',
    country: 'Germany',
    code: 'CBK',
    branches: [
      'Frankfurt Kaiserplatz',
      'Berlin Friedrichstrasse',
      'Munich Theatinerstrasse',
      'Hamburg Mönckebergstrasse',
      'Düsseldorf Königsallee'
    ]
  },

  // France
  {
    id: 'fr_bnp',
    name: 'BNP Paribas',
    country: 'France',
    code: 'BNP',
    branches: [
      'Paris Champs-Élysées',
      'Lyon Part-Dieu',
      'Marseille Canebière',
      'Toulouse Capitole',
      'Nice Promenade des Anglais',
      'Bordeaux Cours de l\'Intendance'
    ]
  },
  {
    id: 'fr_credit_agricole',
    name: 'Crédit Agricole',
    country: 'France',
    code: 'CA',
    branches: [
      'Paris Opera',
      'Lyon Bellecour',
      'Marseille Vieux-Port',
      'Toulouse Wilson',
      'Strasbourg Kléber'
    ]
  },

  // Japan
  {
    id: 'jp_mitsubishi',
    name: 'Mitsubishi UFJ Financial Group',
    country: 'Japan',
    code: 'MUFG',
    branches: [
      'Tokyo Marunouchi',
      'Osaka Umeda',
      'Kyoto Kawaramachi',
      'Yokohama Minato Mirai',
      'Nagoya Sakae',
      'Kobe Sannomiya'
    ]
  },
  {
    id: 'jp_sumitomo',
    name: 'Sumitomo Mitsui Banking Corporation',
    country: 'Japan',
    code: 'SMBC',
    branches: [
      'Tokyo Ginza',
      'Osaka Honten',
      'Nagoya Nishiki',
      'Fukuoka Tenjin',
      'Sapporo Odori'
    ]
  },

  // Singapore
  {
    id: 'sg_dbs',
    name: 'DBS Bank',
    country: 'Singapore',
    code: 'DBS',
    branches: [
      'Marina Bay Financial Centre',
      'Raffles Place',
      'Orchard Road',
      'Jurong East',
      'Tampines',
      'Woodlands'
    ]
  },
  {
    id: 'sg_ocbc',
    name: 'Oversea-Chinese Banking Corporation (OCBC)',
    country: 'Singapore',
    code: 'OCBC',
    branches: [
      'Chulia Street',
      'Orchard Road',
      'Marina Bay',
      'Jurong Point',
      'Changi Airport',
      'Sentosa'
    ]
  }
];

// Helper function to search banks by name
export const searchBanks = (query) => {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase();
  return GLOBAL_BANKS.filter(bank => 
    bank.name.toLowerCase().includes(searchTerm) ||
    bank.country.toLowerCase().includes(searchTerm) ||
    bank.code.toLowerCase().includes(searchTerm)
  ).slice(0, 10); // Limit to 10 results
};

// Helper function to get branches for a specific bank
export const getBankBranches = (bankId) => {
  const bank = GLOBAL_BANKS.find(b => b.id === bankId);
  return bank ? bank.branches : [];
};

// Helper function to search branches within a bank
export const searchBranches = (bankId, query) => {
  const branches = getBankBranches(bankId);
  if (!query || query.length < 2) return branches;
  
  const searchTerm = query.toLowerCase();
  return branches.filter(branch => 
    branch.toLowerCase().includes(searchTerm)
  ).slice(0, 10);
};

// Get banks by country
export const getBanksByCountry = (country) => {
  return GLOBAL_BANKS.filter(bank => 
    bank.country.toLowerCase() === country.toLowerCase()
  );
};

// Get all countries with banks
export const getAllCountries = () => {
  const countries = [...new Set(GLOBAL_BANKS.map(bank => bank.country))];
  return countries.sort();
};