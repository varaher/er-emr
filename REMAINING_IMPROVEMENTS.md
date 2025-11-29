# Remaining Improvements to Implement

## ✅ COMPLETED:
1. Auto-save functionality (every 30 seconds)
2. Last saved timestamp display
3. Auto-save indicator
4. Next button added to Patient Info tab

## 📋 TODO - Navigation Buttons:

Add these navigation buttons before `</TabsContent>` for each tab:

### Vitals Tab (after line ~1310):
```jsx
<div className="flex justify-between gap-2 mt-6">
  <Button variant="outline" onClick={goToPreviousTab}>← Back: Patient Info</Button>
  <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">Next: ABCDE →</Button>
</div>
```

### Primary (ABCDE) Tab (after line ~1510):
```jsx
<div className="flex justify-between gap-2 mt-6">
  <Button variant="outline" onClick={goToPreviousTab}>← Back: Vitals</Button>
  <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">Next: History →</Button>
</div>
```

### History Tab (after line ~1730):
```jsx
<div className="flex justify-between gap-2 mt-6">
  <Button variant="outline" onClick={goToPreviousTab}>← Back: ABCDE</Button>
  <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">Next: Examination →</Button>
</div>
```

### Examination Tab (after line ~2340):
```jsx
<div className="flex justify-between gap-2 mt-6">
  <Button variant="outline" onClick={goToPreviousTab}>← Back: History</Button>
  <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">Next: Investigations →</Button>
</div>
```

### Investigations Tab (after line ~2620):
```jsx
<div className="flex justify-between gap-2 mt-6">
  <Button variant="outline" onClick={goToPreviousTab}>← Back: Examination</Button>
  <Button onClick={goToNextTab} className="bg-sky-600 hover:bg-sky-700">Next: Treatment →</Button>
</div>
```

### Treatment Tab (last tab, after line ~2850):
```jsx
<div className="flex justify-between gap-2 mt-6">
  <Button variant="outline" onClick={goToPreviousTab}>← Back: Investigations</Button>
  <Button onClick={handleSaveClick} className="bg-green-600 hover:bg-green-700">
    <Save className="h-4 w-4 mr-2" />
    Final Save & Review
  </Button>
</div>
```

---

## 📋 TODO - Better Save Confirmation:

Update the `handleSave` function to show better toast notifications:

```javascript
// After successful save:
toast.success('✅ Case saved successfully!', {
  description: `Saved at ${new Date().toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})} IST`,
  duration: 3000,
});

// For lock:
toast.success('🔒 Case locked successfully!', {
  description: 'No further edits allowed. Use Addendum to add notes.',
  duration: 5000,
});
```

---

## 📋 TODO - Discharge Summary Auto-population:

Update `/app/frontend/src/pages/DischargeSummaryNew.js`:

### 1. Auto-capture discharge time on page load:
```javascript
useEffect(() => {
  if (caseData) {
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Set discharge datetime
    setDischargeData(prev => ({
      ...prev,
      discharge_datetime: istTime
    }));
  }
}, [caseData]);
```

### 2. Auto-populate fields from case sheet:
```javascript
useEffect(() => {
  if (caseData) {
    setDischargeData(prev => ({
      ...prev,
      // Auto-populate presenting complaint
      presenting_complaint: caseData.presenting_complaint?.text || '',
      
      // Auto-populate physical examination summary
      physical_examination: generateExamSummary(caseData.examination),
      
      // Auto-populate course in ER
      course_in_er: generateCourseSummary(caseData),
      
      // Auto-populate treatment given
      treatment_given: generateTreatmentSummary(caseData.treatment),
      
      // Auto-capture discharge time
      discharge_datetime: new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})
    }));
  }
}, [caseData]);

// Helper functions:
const generateExamSummary = (exam) => {
  let summary = [];
  if (exam.general_notes) summary.push(`General: ${exam.general_notes}`);
  if (exam.cvs_status) summary.push(`CVS: ${exam.cvs_status}`);
  if (exam.respiratory_status) summary.push(`Respiratory: ${exam.respiratory_status}`);
  if (exam.abdomen_status) summary.push(`Abdomen: ${exam.abdomen_status}`);
  if (exam.cns_status) summary.push(`CNS: ${exam.cns_status}`);
  return summary.join('\n');
};

const generateCourseSummary = (caseData) => {
  const arrival = new Date(caseData.patient?.arrival_datetime).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
  const hpi = caseData.history?.hpi || 'Not documented';
  const vitals = `HR: ${caseData.vitals_at_arrival?.hr}, BP: ${caseData.vitals_at_arrival?.bp_systolic}/${caseData.vitals_at_arrival?.bp_diastolic}`;
  
  return `Patient arrived at ${arrival} with complaint of ${caseData.presenting_complaint?.text}.\n\nHistory: ${hpi}\n\nVitals: ${vitals}\n\nPrimary assessment was stable. Patient was managed in ER and observed.`;
};

const generateTreatmentSummary = (treatment) => {
  if (!treatment?.interventions || treatment.interventions.length === 0) {
    return 'Supportive care given.';
  }
  return treatment.interventions.join(', ');
};
```

### 3. Make fields editable (they should already be):
Ensure all TextArea fields have `onChange` handlers and are not `readOnly`.

### 4. Add discharge time display:
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
  <p className="text-sm font-semibold text-blue-900">
    📅 Discharge Time (IST): {dischargeData.discharge_datetime || 'Not set'}
  </p>
</div>
```

---

## 📋 TODO - Add Missing UI Modals:

### Timestamp Selection Modal (add after Lock Warning modal):
```jsx
{/* Timestamp Selection Modal */}
<Dialog open={showTimestampModal} onOpenChange={setShowTimestampModal}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        🕒 Select Documentation Time (IST)
      </DialogTitle>
      <DialogDescription>
        Select when documentation was actually done. Must be within 2 hours of current time.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="doc-date">Date</Label>
        <Input 
          id="doc-date"
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          max={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="doc-time">Time (24-hour format)</Label>
        <Input 
          id="doc-time"
          type="time" 
          value={selectedTime} 
          onChange={(e) => setSelectedTime(e.target.value)} 
        />
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-800">
          ⚠️ <strong>Midnight boundary:</strong> If documenting near 12 AM, ensure date is correct
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Current IST: {new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setShowTimestampModal(false)}>
        Cancel
      </Button>
      <Button onClick={() => { setShowLockWarning(true); setShowTimestampModal(false); }} className="bg-sky-600">
        Next: Review & Save →
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Addendum Modal (add after Timestamp modal):
```jsx
{/* Addendum Modal */}
<Dialog open={showAddendumModal} onOpenChange={setShowAddendumModal}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        📝 Add Addendum to Locked Case
      </DialogTitle>
      <DialogDescription>
        Add additional notes or corrections to this locked case. Addendums are timestamped and cannot be edited once saved.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="addendum-note">Addendum Note</Label>
        <Textarea 
          id="addendum-note"
          value={addendumNote} 
          onChange={(e) => setAddendumNote(e.target.value)} 
          rows={6}
          placeholder="Enter additional observations, corrections, or follow-up notes..."
          className="resize-none"
        />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          💡 <strong>Addendums are permanent:</strong> Once saved, addendums cannot be edited or deleted. They maintain the audit trail.
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setShowAddendumModal(false)}>
        Cancel
      </Button>
      <Button onClick={handleAddAddendum} disabled={loading || !addendumNote.trim()}>
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Saving...' : 'Save Addendum'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Add Addendum Button (in header, next to Download PDF):
```jsx
{isLocked && (
  <Button 
    onClick={() => setShowAddendumModal(true)} 
    variant="secondary"
    className="border-purple-200 hover:bg-purple-50"
  >
    📝 Add Addendum
  </Button>
)}
```

### Addendum Display Section (below locked banner):
```jsx
{isLocked && addendums.length > 0 && (
  <Card className="border-purple-200">
    <CardHeader className="bg-purple-50">
      <CardTitle className="text-base flex items-center gap-2">
        📋 Addendums ({addendums.length})
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 pt-4">
      {addendums.map((addendum, idx) => (
        <div key={idx} className="border-l-4 border-purple-400 bg-purple-50 rounded-r-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-purple-900">{addendum.added_by_name}</p>
              <p className="text-xs text-purple-600">
                {new Date(addendum.timestamp).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })} IST
              </p>
            </div>
            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
              Addendum #{idx + 1}
            </span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{addendum.note}</p>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

---

## 🎯 Implementation Priority:

1. **CRITICAL:** Add navigation buttons to all tabs (improves UX significantly)
2. **CRITICAL:** Add timestamp and addendum modals (required for IST feature)
3. **IMPORTANT:** Improve save confirmation toasts
4. **IMPORTANT:** Auto-populate discharge summary
5. **NICE TO HAVE:** Addendum display section styling

---

## ⚠️ Notes:

- Auto-save is already working (every 30 seconds)
- Backend for IST, timestamps, and addendums is complete
- Just need to add UI components
- All state management is ready
- All API endpoints are ready

---

## 🧪 Testing Checklist:

- [ ] Auto-save indicator shows every 30 seconds
- [ ] Navigation buttons work (Next/Back)
- [ ] Last tab shows "Final Save & Review" button
- [ ] Timestamp modal validates 2-hour window
- [ ] Addendum modal only appears for locked cases
- [ ] Addendums display with IST timestamp
- [ ] Discharge summary auto-populates from case sheet
- [ ] Discharge time auto-captures in IST
- [ ] Save confirmation toasts are clear and visible
