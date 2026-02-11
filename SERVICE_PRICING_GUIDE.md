# 876Nurses Service Pricing & Implementation Guide
**Updated: January 21, 2026**  
**Source: Nurse Bernard's WhatsApp Message**

---

## 📋 **Service Pricing Structure (Client Billing)**

### **1. Wound Care Services**
| Service | Price (JMD) | Supplies Included |
|---------|------------|-------------------|
| Wound Care - With Supplies | $15,000 | ✅ Yes |
| Wound Care - Without Supplies | $9,500 | ❌ No |

**Key:** `'Wound Care - With Supplies'` or `'Wound Care - Without Supplies'`

---

### **2. NG Tube Services**
| Service | Price (JMD) | Supplies Included |
|---------|------------|-------------------|
| NG Tube Repass - With Supplies | $15,000 | ✅ Yes |
| NG Tube Repass - Without Supplies | $8,500 | ❌ No |

**Key:** `'NG Tube Repass - With Supplies'` or `'NG Tube Repass - Without Supplies'`

---

### **3. Urinary Catheter Services**
| Service | Price (JMD) | Supplies Included |
|---------|------------|-------------------|
| Repass Urine Catheter - With Supplies | $16,500 | ✅ Yes |
| Repass Urine Catheter - Without Supplies | $10,000 | ❌ No |

**Key:** `'Repass Urine Catheter - With Supplies'` or `'Repass Urine Catheter - Without Supplies'`

---

### **4. IV Services**
| Service | Price (JMD) | Duration/Notes |
|---------|------------|----------------|
| IV Therapy Monitoring | $27,350 | 2 hours |
| IV Cannulation | $8,500 | Single procedure |

**Key:** `'IV Therapy Monitoring (2hrs)'` or `'IV Cannulation'`

---

### **5. Nursing Services - Practical Nurse (PN)**
| Service | Price (JMD) | Duration |
|---------|------------|----------|
| PN - 8 Hour Service | $7,500 | 8 hours |
| PN - 12 Hour Service | $9,500 | 12 hours |

**Key:** `'PN - 8 Hour Service'` or `'PN - 12 Hour Service'`

---

### **6. Registered Nurse (RN)**
| Service | Price (JMD) | Rate Type |
|---------|------------|-----------|
| RN - Hourly | $4,500 | Per hour |

**Key:** `'RN - Hourly'` or `'Registered Nurse Hourly'`

---

### **7. Physiotherapy**
| Service | Price (JMD) | Duration |
|---------|------------|----------|
| Physiotherapy | $10,000 | 2 hours |

**Key:** `'Physiotherapy (2hrs)'` or `'Physiotherapy'`

---

### **8. Doctors Visits**
| Service | Price (JMD) | Notes |
|---------|------------|-------|
| Doctors Visits | Location-based | Calculated based on location |

**Key:** `'Doctors Visits'` (Price set to 0, requires manual calculation)

---

### **9. Live-in Care Services**
| Service | Price (JMD) | Duration |
|---------|------------|----------|
| Weekly Live-in Care | $55,000 | 7 days |
| Monthly Live-in Care | $170,000 | 4 weeks (28 days) |

**Key:** `'Weekly Live-in Care (7 days)'` or `'Monthly Live-in Care (4 weeks)'`

---

## 💰 **Nurse Pay Rates (What Nurses Earn)**

### **Base Rates**
| Nurse Type | Rate (JMD) | Notes |
|------------|-----------|--------|
| RN Hourly | $3,000/hr | Base hourly rate |
| PN 8-Hour Shift | $5,000 | Per shift |
| PN 12-Hour Shift | $6,500 | Per shift |
| Weekly Live-in | $38,000 | 7 days |
| Monthly Live-in | $120,000 | 4 weeks |

**Note:** Nurses only receive bonuses for holiday shifts (already implemented separately). No specialized service bonuses are applied.

---

## 📊 **Profit Margins (Client Price vs Nurse Pay)**

### **Example Calculations**

#### **Wound Care (Without Supplies)**
- Client Pays: $9,500
- Nurse Gets: $5,000 (base 8hr PN rate)
- **Profit Margin: $4,500 (47%)**

#### **Wound Care (With Supplies)**
- Client Pays: $15,000
- Nurse Gets: $5,000 (base 8hr PN rate)
- Supply Costs: ~$5,000
- **Profit Margin: $5,000 (33%)**

#### **PN 8-Hour Service**
- Client Pays: $7,500
- Nurse Gets: $5,000
- **Profit Margin: $2,500 (33%)**

#### **RN Hourly (4 hours)**
- Client Pays: $4,500 × 4 = $18,000
- Nurse Gets: $3,000 × 4 = $12,000
- **Profit Margin: $6,000 (33%)**

#### **Weekly Live-in Care**
- Client Pays: $55,000
- Nurse Gets: $38,000
- **Profit Margin: $17,000 (31%)**

#### **Monthly Live-in Care**
- Client Pays: $170,000
- Nurse Gets: $120,000
- **Profit Margin: $50,000 (29%)**

---

## 🔧 **Implementation Guide**

### **1. Files Updated**
✅ `/constants.js` - Added `SERVICE_RATES` and `NURSE_PAY_RATES`  
✅ `/services/InvoiceService.js` - Updated `SERVICE_RATES` with new pricing

### **2. How to Use in Code**

#### **Get Service Price (Client Billing)**
```javascript
import { SERVICE_RATES, SHIFT_RATES } from '../constants';

// Get specific service rate
const price = SERVICE_RATES['Wound Care - With Supplies']; // $15,000

// Or use helper function
const price = SHIFT_RATES.getServiceRate('PN - 8 Hour Service'); // $7,500
```

#### **Calculate Nurse Payment**
```javascript
import { NURSE_PAY_RATES, SHIFT_RATES } from '../constants';

// No specialized bonuses - only holiday bonuses (already implemented separately)
// Calculate PN pay
const nursePay = SHIFT_RATES.calculateNursePay('PN', 8, 'PN'); // $5,000 (8hr shift)

// Add specialized service bonus
const totalPay = NURSE_PAY_RATES.PN.shift_8hrs + NURSE_PAY_RATES.specialized['Wound Care'];
// $5,000 + $2,000 = $7,000
```

#### **Invoice Generation Example**
```javascript
// In InvoiceService or appointment creation
const serviceType = 'Wound Care - With Supplies';
const clientPrice = InvoiceService.SERVICE_RATES[serviceType]; // $15,000

// Calculate nurse payment
const nursePay = NURSE_PAY_RATES.PN.shift_8hrs + NURSE_PAY_RATES.specialized['Wound Care'];
// $7,000

// Create invoice
const invoice = await InvoiceService.generateInvoice({
  appointmentId: appointment.id,
  service: serviceType,
  amount: clientPrice,
  nursePay: nursePay,
  profitMargin: clientPrice - nursePay
});
```

### **3. Admin Dashboard Integration**

When admins create appointments or shifts, they should be able to:
1. **Select service type** from dropdown
2. **Choose "With Supplies" or "Without Supplies"** for applicable services
3. **See automatic price calculation** based on selection
4. **View nurse payment breakdown** for transparency

#### **Service Selection UI Example**
```javascript
// In AdminDashboardScreen or appointment creation modal
<Picker
  selectedValue={selectedService}
  onValueChange={(value) => {
    setSelectedService(value);
    setServicePrice(SERVICE_RATES[value]);
  }}
>
  <Picker.Item label="Wound Care - With Supplies ($15,000)" value="Wound Care - With Supplies" />
  <Picker.Item label="Wound Care - Without Supplies ($9,500)" value="Wound Care - Without Supplies" />
  <Picker.Item label="NG Tube Repass - With Supplies ($15,000)" value="NG Tube Repass - With Supplies" />
  <Picker.Item label="NG Tube Repass - Without Supplies ($8,500)" value="NG Tube Repass - Without Supplies" />
  <Picker.Item label="PN - 8 Hour Service ($7,500)" value="PN - 8 Hour Service" />
  <Picker.Item label="RN - Hourly ($4,500/hr)" value="RN - Hourly" />
  <Picker.Item label="Physiotherapy 2hrs ($10,000)" value="Physiotherapy (2hrs)" />
  <Picker.Item label="Weekly Live-in Care ($55,000)" value="Weekly Live-in Care (7 days)" />
  <Picker.Item label="Monthly Live-in Care ($170,000)" value="Monthly Live-in Care (4 weeks)" />
</Picker>

<Text>Client Price: ${servicePrice.toLocaleString()}</Text>
<Text>Nurse Payment: ${nursePay.toLocaleString()}</Text>
<Text>Profit: ${(servicePrice - nursePay).toLocaleString()}</Text>
```

---

## 📱 **Client-Facing Service List**

For the booking screen, clients should see:

```
🩹 Wound Care
   • With Supplies: $15,000
   • Without Supplies: $9,500

💉 NG Tube Repass
   • With Supplies: $15,000
   • Without Supplies: $8,500

🏥 Urinary Catheter Repass
   • With Supplies: $16,500
   • Without Supplies: $10,000

💧 IV Services
   • IV Therapy Monitoring (2hrs): $27,350
   • IV Cannulation: $8,500

👩‍⚕️ Nursing Services
   • Practical Nurse (8hrs): $7,500
   • Practical Nurse (12hrs): $9,500
   • Registered Nurse: $4,500/hour

🏃 Physiotherapy (2hrs): $10,000

👨‍⚕️ Doctors Visits: Location-based pricing

🏠 Live-in Care
   • Weekly (7 days): $55,000
   • Monthly (4 weeks): $170,000
```

---

## ⚙️ **Next Steps for Full Implementation**

### **1. Update Service Selection in Booking Flow**
- [ ] Add supply option toggle for applicable services (Wound Care, NG Tube, Catheter)
- [ ] Update service picker with new pricing
- [ ] Show price breakdown before booking confirmation

### **2. Update Invoice Generation**
- [ ] Ensure InvoiceService uses new SERVICE_RATES
- [ ] Add supply cost breakdown on invoices
- [ ] Calculate accurate nurse payments

### **3. Update Payslip Generation**
- [ ] Use NURSE_PAY_RATES for accurate payslip calculations
- [ ] Add specialized service bonuses to payslips
- [ ] Show breakdown of base pay + bonuses

### **4. Add Profit Reporting**
- [ ] Create analytics dashboard showing profit margins per service
- [ ] Track which services are most profitable
- [ ] Generate financial reports for management

### **5. Test All Calculations**
- [ ] Verify prices match Nurse Bernard's list
- [ ] Test invoice generation with new rates
- [ ] Confirm payslip calculations are accurate
- [ ] Check profit margin calculations

---

## 📝 **Important Notes**

1. **"Doctors Visits"** pricing is location-based and must be calculated manually or through a separate pricing API based on the doctor's location and travel distance.

2. **Supply Costs:** For services "with supplies," the $5,000-$7,000 difference covers:
   - Medical supplies cost
   - "Doctors Visits"** pricing is location-based and must be calculated manually or through a separate pricing API based on the doctor's location and travel distance.

3. **Supply Costs:** For services "with supplies," the price difference covers medical supplies, procurement, storage, inventory management, and delivery to patient location.

4. **Profit Margins:** Average 30-40% margin ensures nurse competitive compensation, company operational costs (admin, insurance, taxes), platform maintenance and growth, and emergency/contingency funds.

5. **Nurse Bonuses:** Nurses only receive bonuses for holiday shifts (already implemented separately). No specialized service bonuses are applied for specific procedur

## 🔄 **Backward Compatibility**

Legacy service names are maintained for existing appointments:
- Old "PN - 8 Hour Shift" → New "PN - 8 Hour Service" (updated price: $6,500 → $7,500)
- Old "PN - 12 Hour Shift" → New "PN - 12 Hour Service" (updated price: $8,500 → $9,500)
- Old "Weekly Live-in" → New pricing: $45,000 → $55,000
- Old "Wound Care" → New pricing: $10,550 → $9,500 (without supplies default)

Existing invoices will maintain their original pricing. New appointments use updated rates.

---

**For questions or pricing adjustments, contact Nurse Bernard (Managing Director).**
