# Fix Invoice Sequence Guide

## Problem
Your recurring shifts for February 5 and 6 both have invoice numbers ending in 0001 (NUR-INV-0001). They should be sequentially numbered as NUR-INV-0001 and NUR-INV-0002.

## Solution
I've created a script that will:
1. Check all invoice numbers in your Firebase database
2. Find any duplicates
3. Automatically resequence them in chronological order
4. Update the invoice counter to prevent future duplicates

## How to Run

### Step 1: Install Dependencies (if needed)
```bash
cd /Users/Kadian/Desktop/876nurses
npm install
```

### Step 2: Run the Fix Script
```bash
node fix-invoice-sequence.js
```

### Step 3: Review the Output
The script will:
- Show you all duplicate invoice numbers
- Display which invoices will be resequenced
- Automatically fix the duplicates
- Update the counter to the correct value

## What It Does

The script will:
1. Find your Feb 5 invoice with NUR-INV-0001 (keep as is)
2. Change your Feb 6 invoice from NUR-INV-0001 to NUR-INV-0002
3. Update the invoice counter to 0002
4. Store the original invoice number in case you need to reference it

## After Running

Once complete:
- Your Feb 5 invoice will remain as NUR-INV-0001
- Your Feb 6 invoice will be updated to NUR-INV-0002
- Future invoices will continue from NUR-INV-0003
- The app will automatically show the updated invoice numbers

## Verification

After running the script, you can verify the fix by:
1. Checking the nurse appointments screen - Past section
2. Looking at the invoice numbers for each recurring shift
3. They should now be sequential (0001, 0002, etc.)

## Prevention

To prevent this from happening again, the script also:
- Ensures the Firestore counter is properly initialized
- Updates it to the highest invoice number in use
- This prevents race conditions that can cause duplicates

## Need Help?

If you encounter any issues:
1. Check that your Firebase credentials are in `credentials.json`
2. Make sure you're connected to the internet
3. Verify you have write permissions to the Firebase database
4. Check the console output for specific error messages
