# Deposit Payment Implementation Plan

## Overview
Implement 50% deposit payment system for appointment bookings with Fygaro integration.

## Changes Required

### 1. BookScreen.js
- ✅ Change service selection from single to multiple (checkbox-based)
- ✅ Calculate total price from selected services
- ✅ Show deposit payment modal (50%) before submission
- ✅ Integrate Fygaro payment for deposit
- ✅ Create partial invoice with 50% paid status
- ✅ Pass invoice data to appointment

### 2. InvoiceService.js
- ✅ Add `createPartialInvoice()` method
- ✅ Support `paidAmount` and `outstandingAmount` fields
- ✅ Add payment status tracking (pending, partial, paid)

### 3. AdminDashboardScreen.js (Pending Appointments)
- ✅ Show invoice card with partial payment info
- ✅ Add "View Invoice" button
- ✅ Display paid vs outstanding amounts

### 4. InvoiceDisplayScreen.js (or new InvoicePreviewScreen.js)
- ✅ Show subtotal
- ✅ Show paid amount (deposit)
- ✅ Show outstanding amount
- ✅ Add "Pay Balance" button for remaining 50%

### 5. Database Schema Updates
**Appointments Collection:**
```javascript
{
  services: ['Service 1', 'Service 2'], // Array instead of single string
  totalAmount: 10000,
  depositAmount: 5000, // 50%
  paidAmount: 5000,
  outstandingAmount: 5000,
  depositPaid: true,
  depositTransactionId: 'TXN_xxx',
  invoiceId: 'INV_xxx'
}
```

**Invoices Collection:**
```javascript
{
  services: [{name: 'Service 1', price: 5000}, ...],
  subtotal: 10000,
  paidAmount: 5000,
  outstandingAmount: 5000,
  paymentStatus: 'partial', // pending, partial, paid
  payments: [
    {
      amount: 5000,
      transactionId: 'TXN_xxx',
      type: 'deposit',
      date: '2026-01-02',
      method: 'fygaro'
    }
  ]
}
```

## Implementation Steps

1. Update service selection UI in BookScreen
2. Add deposit payment modal with Fygaro
3. Create partial invoice on booking
4. Update admin pending view with invoice card
5. Create/update invoice preview with payment breakdown
6. Add balance payment flow

## Files to Modify
- `/screens/BookScreen.js`
- `/services/InvoiceService.js`
- `/services/FygaroPaymentService.js`
- `/screens/AdminDashboardScreen.js`
- `/screens/InvoiceDisplayScreen.js`
- `/services/ApiService.js` (if needed)
