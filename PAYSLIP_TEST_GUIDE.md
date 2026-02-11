# View Sample Payslip

A test payslip screen has been created with sample data showing the nurse payslip format.

## Sample Data Included:

- **Employee**: kadian red (ID: 54231846)
- **Pay Period**: Jan 10 - Jan 17, 2026
- **Regular Hours**: 38.4 hours
- **Hourly Rate**: J$2,700 (RN rate at 60% of billing)
- **Gross Pay**: J$103,680.00
- **Net Pay**: J$103,680.00
- **Status**: Paid

## How to View:

### Option 1: Navigate in the app
Once logged in as an admin, you can navigate to the test screen by using the navigation system.

### Option 2: Add a quick access button
Add this code to any admin screen to create a test button:

```javascript
import { TouchableOpacity, Text } from 'react-native';

// Add this button anywhere in your render:
<TouchableOpacity 
  style={{ 
    backgroundColor: '#3498db', 
    padding: 15, 
    borderRadius: 8, 
    margin: 20 
  }}
  onPress={() => navigation.navigate('TestPayslip')}
>
  <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
    View Sample Payslip
  </Text>
</TouchableOpacity>
```

### Option 3: Test in Development
You can modify App.js temporarily to show the TestPayslipScreen directly for testing.

## Features Included:

✓ Professional payslip header with 876Nurses branding
✓ Pay To section with employee details
✓ Service hours breakdown table
✓ Regular hours and overtime calculations
✓ Payment information with subtotal and total
✓ Share PDF button
✓ Close preview functionality
✓ Status tabs (All, Pending, Paid, Overdue)
✓ Sample payslip list item

The payslip uses the same styling as your invoice screen with proper calculations based on the nurse pay structure.
