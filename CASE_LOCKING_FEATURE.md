# Case Locking Feature - Medical-Legal Compliance

## 🔒 Purpose

This feature ensures **medical-legal compliance** and **audit trail integrity** by preventing unauthorized modifications to finalized case sheets.

Once a case is locked, it becomes **READ-ONLY** and cannot be edited.

---

## ✅ Why This is Important:

### **Legal & Regulatory Compliance:**
1. **Audit Trail Integrity:** Prevents tampering with medical records
2. **Legal Documentation:** Ensures records remain unchanged for legal proceedings
3. **HIPAA Compliance:** Protects patient data integrity
4. **Medicolegal Protection:** Protects doctors from liability claims about altered records
5. **Regulatory Requirements:** Meets healthcare regulatory standards

### **Clinical Benefits:**
- Prevents accidental modifications to discharged patients
- Clear distinction between "in-progress" and "final" documentation
- Encourages thorough review before finalizing
- Supports quality assurance processes

---

## 🎯 How It Works:

### **Backend Implementation:**

**New Database Fields:**
```javascript
is_locked: boolean (default: false)
locked_at: datetime (when case was locked)
locked_by_user_id: string (who locked it)
```

**API Protection:**
- PUT `/api/cases/{id}?lock_case=true` - Save and lock
- PUT `/api/cases/{id}?lock_case=false` - Save without locking
- If case is already locked, API returns **403 Forbidden** error
- Error message: "Case is locked and cannot be edited. This is for legal and audit compliance."

---

### **Frontend Implementation:**

**1. Pre-Save Warning Modal:**
When saving an existing case, user sees a modal with:
- ⚠️ Review checklist
- Security & legal compliance explanation
- 3 options:
  - **Cancel** - Don't save
  - **Save Without Locking** - Allow future edits
  - **Save & Lock Case 🔒** - Finalize and lock permanently

**2. Locked Case Indicators:**
- **Red banner** at top: "🔒 CASE LOCKED - READ ONLY"
- **Save button** shows: "🔒 Locked" (disabled)
- **All form fields** grayed out and disabled (opacity-60, pointer-events-none)
- **Warning toast** when opening locked case

**3. Form Behavior:**
- New cases: Save without showing lock modal (not yet finalized)
- Existing cases: Show lock warning modal on save
- Locked cases: All inputs disabled, save button disabled

---

## 📋 User Workflow:

### **Creating New Case:**
1. Create case → Fill data → Click "Save Case"
2. Case is saved but **NOT locked** (allows edits)
3. Continue making changes as needed

### **Finalizing Case:**
1. Review all information thoroughly
2. Click "Save Case"
3. Modal appears with warning and checklist
4. Choose one of:
   - **Save Without Locking** - Can edit later
   - **Save & Lock Case** - Finalized, no edits allowed

### **Opening Locked Case:**
1. Case opens in **READ-ONLY mode**
2. Red banner shows: "CASE LOCKED"
3. All fields grayed out
4. Can still:
   - View all information
   - Download PDF
   - View discharge summary
5. Cannot:
   - Edit any fields
   - Save changes
   - Use voice input

---

## ⚠️ Warning Modal Content:

**Checklist Before Saving:**
- ☑️ Patient information is complete and accurate
- ☑️ All vitals and examination findings documented
- ☑️ Investigation orders are correct
- ☑️ Treatment plan is finalized
- ☑️ Disposition decision is appropriate
- ☑️ EM Resident and Consultant names are filled

**Security Notice:**
- Once locked, NO further edits allowed
- Ensures legal compliance and audit trail integrity
- Prevents unauthorized modifications
- Recommended: Lock after final review and before discharge

---

## 🔓 Unlocking Cases (Future Feature):

Currently, there is **NO unlock functionality** (intentional for security).

If unlock is needed (exceptional circumstances only):
- Contact system administrator
- Direct database access required
- Audit log should record who unlocked and why
- Should require special permissions (admin only)

**Recommendation:** Instead of unlocking, create an "Amendment Note" or "Correction" feature that:
- Adds timestamped corrections
- Preserves original data
- Shows who made correction and why
- Maintains complete audit trail

---

## 🎨 UI Elements:

### **Lock Warning Modal:**
- **Amber/Yellow theme** (warning colors)
- Large alert icon
- Clear, bold text
- Comprehensive checklist
- 3 action buttons with clear labels

### **Locked Banner:**
- **Red theme** (danger/locked)
- Prominent position at top
- Lock icon (🔒)
- Shows lock timestamp
- Cannot be dismissed

### **Disabled Form:**
- All inputs: `opacity-60` + `pointer-events-none`
- Visual feedback that editing is disabled
- Tooltip on hover explaining why disabled

---

## 🧪 Testing Scenarios:

### **Test 1: New Case (No Lock)**
1. Create new case
2. Fill some data
3. Click "Save Case"
4. ✅ Should save without lock modal
5. ✅ Can continue editing

### **Test 2: Save Without Lock**
1. Open existing case
2. Make changes
3. Click "Save Case"
4. Modal appears
5. Click "Save Without Locking"
6. ✅ Case saved, still editable

### **Test 3: Save & Lock**
1. Open existing case
2. Make final changes
3. Click "Save Case"
4. Modal appears
5. Click "Save & Lock Case"
6. ✅ Case saved and locked
7. ✅ Red banner appears
8. ✅ All fields disabled
9. ✅ Save button shows "🔒 Locked"

### **Test 4: Try to Edit Locked Case**
1. Open locked case
2. Try to type in any field
3. ✅ Fields are disabled
4. Click "Save Case"
5. ✅ Error toast: "Case is locked"

### **Test 5: API Protection**
1. Use API directly to update locked case
2. ✅ Should return 403 Forbidden
3. ✅ Error message explains case is locked

---

## 📊 Database Example:

**Before Locking:**
```json
{
  "id": "case-123",
  "patient": {...},
  "is_locked": false,
  "locked_at": null,
  "locked_by_user_id": null,
  "status": "draft"
}
```

**After Locking:**
```json
{
  "id": "case-123",
  "patient": {...},
  "is_locked": true,
  "locked_at": "2025-11-29T08:30:00Z",
  "locked_by_user_id": "user-456",
  "status": "completed"
}
```

---

## 🔐 Security Considerations:

1. **Backend Validation:** Always check `is_locked` on server side (not just frontend)
2. **Immutable Once Locked:** No unlock without admin access
3. **Audit Trail:** Lock timestamp and user ID are recorded
4. **Error Handling:** Clear error messages for locked cases
5. **User Education:** Warnings before locking are critical

---

## 💡 Best Practices:

### **When to Lock:**
✅ **DO Lock:**
- Before patient discharge
- After final review by consultant
- When sending to EMR
- For completed consultations
- After all investigations are back

❌ **DON'T Lock:**
- During initial assessment
- While waiting for lab results
- If patient is still in ER
- If more consultations pending

### **Workflow Recommendation:**
1. **Draft Phase:** Save multiple times without locking
2. **Review Phase:** Senior doctor reviews
3. **Finalization:** Lock after approval
4. **Discharge:** Patient leaves, case is locked

---

## 📱 Future Enhancements:

1. **Partial Lock:** Lock certain sections while allowing others to be edited
2. **Timed Lock:** Auto-lock after X hours of last edit
3. **Amendment System:** Add corrections without unlocking original
4. **Unlock Request:** Workflow for requesting unlock with approval
5. **Lock Levels:** Different lock levels (soft lock, hard lock, frozen)
6. **Audit Log Viewer:** UI to view who locked/unlocked when

---

## ⚖️ Legal & Compliance:

This feature helps meet:
- **HIPAA Security Rule:** Integrity controls
- **21 CFR Part 11:** Electronic records regulations
- **ISO 27001:** Information security management
- **Medical Council Regulations:** Record keeping requirements
- **Hospital Accreditation Standards:** Documentation requirements

---

## 🎯 Key Takeaway:

**Once locked, cases are IMMUTABLE for legal protection.** This protects both:
- **Patients:** Ensures accurate, unaltered medical records
- **Healthcare Providers:** Protection from liability due to record tampering

**Trade-off:** Convenience vs. Security
- We chose **Security** for legal compliance
- Users must review thoroughly before locking
- Better to lock late than never

---

**Implementation Status:** ✅ COMPLETE
- Backend: ✅ Lock field, API protection
- Frontend: ✅ Warning modal, visual indicators, form disabling
- Testing: ⚠️ Needs comprehensive testing
