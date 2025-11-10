/**
 * Script to update existing sample invoices with correct pricing
 */
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Updated service rates matching InvoiceService.js
const SERVICE_RATES = {
  // Clinical Services
  'Dressings': 6750,
  'Medication Administration': 5275,
  'NG Tubes': 12800,
  'Urinary Catheter': 11300,
  'IV Access': 9800,
  'Tracheostomy Care': 14300,
  'Blood Draws': 6025,
  'Wound Care': 10550,
  'Injection Services': 5275,
  
  // Therapy
  'Physiotherapy': 12050,
  'Physical Therapy': 12050,
  
  // Home Care (hourly rates)
  'Home Nursing': 18100,
  'Elderly Care': 16575,
  
  // Support Services
  'Hospital Sitter': 15075,
  'Post-Surgery Care': 22575,
  'Post-Surgical Care': 22575,
  'Palliative Care': 19575,
  
  // Monitoring
  'Vital Signs': 4525,
  'Health Assessments': 13575,
  'Health Assessment': 13575,
  'Diabetic Care': 8300,
  
  // Legacy/Generic services (fallback)
  'Home Visit': 18100,
  'Health Monitoring': 8300,
  'General Nursing': 18100,
  'Emergency Care': 22575,
  'Consultation': 13575
};

function getServicePrice(serviceName) {
  if (!serviceName) return 18100;
  
  // Direct match
  if (SERVICE_RATES[serviceName]) {
    return SERVICE_RATES[serviceName];
  }
  
  // Case-insensitive match
  const serviceKey = Object.keys(SERVICE_RATES).find(
    key => key.toLowerCase() === serviceName.toLowerCase()
  );
  
  if (serviceKey) {
    return SERVICE_RATES[serviceKey];
  }
  
  // Partial match
  const partialMatch = Object.keys(SERVICE_RATES).find(
    key => key.toLowerCase().includes(serviceName.toLowerCase()) ||
           serviceName.toLowerCase().includes(key.toLowerCase())
  );
  
  if (partialMatch) {
    return SERVICE_RATES[partialMatch];
  }
  
  return 18100; // Default
}

async function updateInvoicePrices() {
  try {
    console.log('🔄 Starting invoice price update...\n');
    
    const STORAGE_KEY = '@care_invoices';
    const invoicesStr = await AsyncStorage.getItem(STORAGE_KEY);
    
    if (!invoicesStr) {
      console.log('ℹ️  No invoices found to update');
      return;
    }
    
    const invoices = JSON.parse(invoicesStr);
    console.log(`📊 Found ${invoices.length} invoices\n`);
    
    let updatedCount = 0;
    
    const updatedInvoices = invoices.map(invoice => {
      const service = invoice.service;
      const hours = invoice.hours || 1;
      const oldRate = invoice.rate;
      const oldTotal = invoice.total;
      
      // Get new rate
      const newRate = getServicePrice(service);
      const newTotal = newRate * hours;
      
      // Update if different
      if (oldRate !== newRate || oldTotal !== newTotal) {
        console.log(`📝 Updating ${invoice.invoiceId}:`);
        console.log(`   Service: ${service}`);
        console.log(`   Hours: ${hours}`);
        console.log(`   Old Rate: $${oldRate} → New Rate: J$${newRate.toLocaleString()}`);
        console.log(`   Old Total: $${oldTotal} → New Total: J$${newTotal.toLocaleString()}`);
        console.log('');
        
        updatedCount++;
        
        return {
          ...invoice,
          rate: newRate,
          total: newTotal,
          subtotal: newTotal,
          finalTotal: newTotal,
          // Update items array if it exists
          items: invoice.items ? invoice.items.map(item => ({
            ...item,
            price: newRate,
            total: newTotal
          })) : [{
            description: service,
            detailedDescription: `Professional ${service.toLowerCase()} services provided`,
            quantity: hours,
            price: newRate,
            total: newTotal,
            serviceDates: invoice.serviceDate || invoice.date,
            nurseNames: invoice.nurseName || 'Care Professional'
          }]
        };
      }
      
      return invoice;
    });
    
    // Save updated invoices
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
    
    console.log(`\n✅ Update complete!`);
    console.log(`   Total invoices: ${invoices.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Unchanged: ${invoices.length - updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error updating invoices:', error);
    throw error;
  }
}

// Run the update
updateInvoicePrices()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
