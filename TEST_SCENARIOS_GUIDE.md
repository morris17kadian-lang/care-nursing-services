# 🧪 876Nurses App - TestFlight Scenarios Guide

This guide details all appointment and shift types, plus the full lifecycle from request → completed → invoice/payslip.

---

## 📋 1. Core Shift & Appointment Types

### **A. Single Appointment (One-Time)**
*   **Created By:** Patient (via App) or Admin (via Dashboard).
*   **Scenario:** A user books a specific service for one specific date and time.
*   **Test Steps:**
    1.  Log in as **Patient**.
    2.  Go to "Book Service".
    3.  Select a service (e.g., "Wound Care").
    4.  Choose a single date and time.
    5.  Submit request.
    6.  **Verify:** Admin sees it in "Pending Appointments".

### **B. Recurring Shift (Standard)**
*   **Created By:** Admin (typically) or Patient (via "Recurring" option).
*   **Scenario:** A service that repeats on specific days (e.g., Every Mon/Wed/Fri) for a set duration.
*   **Test Steps:**
    1.  Log in as **Admin**.
    2.  Go to "Shifts" → "Create Recurring Shift".
    3.  Select Client & Service.
    4.  Choose "Single Nurse" assignment type.
    5.  Select Days: Monday, Wednesday, Friday.
    6.  Assign **NURSE001**.
    7.  **Verify:** Nurse gets notification. Admin shows under "Pending" until accepted.

---

## 👥 2. Advanced Assignment Scenarios (New Features)

These are the critical new features that need robust testing.

### **C. Single Nurse with Backup**
*   **Scenario:** One primary nurse is assigned to all days, but backup nurses are listed in case of emergency.
*   **Test Steps:**
    1.  **Admin:** Create Recurring Shift.
    2.  **Assignment Type:** Select **"Single Nurse"**.
    3.  **Primary:** Assign Nurse A.
    4.  **Backup:** Click "Add Backup Nurses" and select Nurse B and Nurse C.
    5.  **Verify:**
        *   Shift Card shows "Primary: Nurse A".
        *   Details view shows "Backup Support: 2 Nurses".

### **D. Split Schedule (Multi-Nurse)**
*   **Scenario:** Different nurses cover different days of the week (e.g., Nurse A on Mon/Wed, Nurse B on Fri).
*   **Test Steps:**
    1.  **Admin:** Create Recurring Shift.
    2.  **Assignment Type:** Select **"Split Schedule"**.
    3.  **Days:** Select Mon, Wed, Fri.
    4.  **Assign:**
        *   Tap "Monday" → Select Nurse A.
        *   Tap "Wednesday" → Select Nurse A.
        *   Tap "Friday" → Select Nurse B.
    5.  **Verify:**
        *   Shift Card shows "Split Team" or multiple avatars.
        *   Nurse A only sees Mon/Wed in their calendar.
        *   Nurse B only sees Fri in their calendar.

### **E. Coverage Request (Emergency)**
*   **Scenario:** The assigned nurse cannot make it and requests coverage from the backup pool.
*   **Test Steps:**
    1.  **Nurse A (Primary):** Open an upcoming shift instance.
    2.  **Action:** Tap "Request Coverage" (or "Emergency").
    3.  **Verify:**
        *   Nurse B (Backup) receives a "Coverage Request" notification.
        *   Admin sees "Coverage Requested" status on that specific day.
    4.  **Nurse B:** Accepts the request.
    5.  **Verify:** The specific day is reassigned to Nurse B, while the rest of the schedule remains with Nurse A.

---

## 🔄 3. Status & Workflow Testing (End-to-End)

| Status | Trigger | Expected Outcome |
| :--- | :--- | :--- |
| **Pending** | Admin creates assignment | Visible to Nurse under "Pending". Visible to Admin under "Pending" (orange button). |
| **Accepted** | Nurse accepts shift | Moves to "Upcoming" for Nurse. **Removes from "Pending" for Admin** (Fix Verified). |
| **Clocked In** | Nurse starts shift | Status changes to "In Progress". GPS location recorded. |
| **Clocked Out** | Nurse ends shift | Status changes to "Completed". Visit History log created. |
| **Completed** | Admin verifies/auto-completes | Completed section shows. Invoice generated for patient. |

### ✅ Invoice / Payslip Verification (Final Step)
1. **After Clock-Out**, verify the shift appears under **Completed** for Admin.
2. **Patient** should see an **Invoice** entry tied to that completed visit.
3. **Nurse** should see a **Payslip** or earnings record (if enabled) tied to the same visit.
4. Confirm invoice amount matches service price and duration.

---

## 🛠 4. Specific Edge Cases to Test

1.  **"Stale" Pending Shifts:**
    *   Check if any old/accepted shifts still appear in the Admin "Pending" tab. (Should be fixed now).

2.  **Notification Routing:**
    *   Verify that when a "Split Schedule" is created, *both* nurses get their specific invites, not just one.

3.  **Patient Photo Consistency:**
    *   Check that the patient's profile photo appears correctly on the Recurring Shift Card (new feature).

4.  **Admin Edit Mode:**
    *   Try to **Edit** an existing recurring shift and change it from "Single Nurse" to "Split Schedule". Verify the old schedule is overwritten correctly.

---

## ✅ Summary
Yes—this guide now covers **all appointment and shift types**, plus the **full lifecycle** through Completed and **Invoice generation** for TestFlight testing.

---

## 🧭 5. Full Role-Based Flow (Patient, Nurse, Admin)

Use this section as the **exact step-by-step flow** for each role to test end‑to‑end behavior.

### **Flow A: One‑Time Appointment (Patient‑Created)**

**Patient Actions**
1. Book a one‑time appointment (select service, date, time, address).
2. Submit request.
3. Verify request appears as “Pending”.

**Admin Actions**
1. Open Admin Dashboard → Pending Appointments.
2. Assign a nurse.
3. Verify appointment moves to Assigned/Upcoming for Nurse.

**Nurse Actions**
1. Open Pending → Accept appointment.
2. Clock In at start time.
3. Clock Out at end time with notes.

**Completion + Billing**
1. Admin verifies appointment is Completed.
2. Patient sees Invoice for that visit.
3. Nurse sees Payslip/Earnings entry.

---

### **Flow B: Recurring Shift (Single Nurse)**

**Admin Actions**
1. Create Recurring Shift → Single Nurse.
2. Select days (Mon/Wed/Fri) and assign Nurse A.
3. Submit request.

**Nurse Actions**
1. Accept recurring request.
2. Verify recurring instances appear in Upcoming.
3. Clock In/Out for at least one instance.

**Admin Actions**
1. Verify shift moves out of Pending after acceptance.
2. Completed instance appears in Completed section.

**Patient Actions**
1. View appointment history.
2. Confirm invoice generated per completed instance.

---

### **Flow C: Recurring Shift (Split Schedule)**

**Admin Actions**
1. Create Recurring Shift → Split Schedule.
2. Assign Nurse A (Mon/Wed), Nurse B (Fri).
3. Submit request.

**Nurse Actions**
1. Nurse A accepts assigned days.
2. Nurse B accepts assigned day.
3. Each nurse only sees their days in Upcoming.
4. Each nurse clocks in/out on their assigned day.

**Admin Actions**
1. Confirm Pending disappears when both accept.
2. Completed instances show correctly for each day.

**Patient Actions**
1. Sees invoices per completed instance.

---

### **Flow D: Recurring Shift with Backup Nurses (Coverage)**

**Admin Actions**
1. Create Recurring Shift → Single Nurse.
2. Add Backup Nurses (B, C).
3. Submit request.

**Nurse Actions (Primary)**
1. Accept shift.
2. For a future date, tap “Request Coverage”.

**Backup Nurse Actions**
1. Receive coverage request notification.
2. Accept coverage for the date.

**Admin Actions**
1. Verify coverage request shows as accepted.
2. Verify day is reassigned to Backup Nurse.

**Patient Actions**
1. Completed visit generates invoice under patient.

---

### **Flow E: Patient‑Created Recurring Request**

**Patient Actions**
1. Create recurring request (days/time/service).
2. Submit request.

**Admin Actions**
1. Approve/assign a nurse.
2. Verify request is no longer in Pending after nurse acceptance.

**Nurse Actions**
1. Accept the recurring assignment.
2. Clock In/Out for a completed instance.

**Completion + Billing**
1. Admin sees Completed instance.
2. Patient invoice generated for that instance.
3. Nurse earnings updated.
