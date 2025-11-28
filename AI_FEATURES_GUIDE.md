# AI Clinical Decision Support - User Guide

## Overview
The ER-EMR application includes two AI-powered features to assist with clinical decision-making:

1. **🚨 AI Red Flags** - Identifies critical findings requiring immediate attention
2. **💡 AI Diagnosis** - Suggests differential diagnoses based on case data

## Powered By
- **OpenAI GPT-5.1** - Latest AI model specialized in medical reasoning
- **Emergent LLM Key** - Secure, HIPAA-compliant integration
- **Real-time Analysis** - Generates insights in 3-5 seconds

---

## 1. AI Red Flags 🚨

### What It Does
Analyzes patient vitals, presenting complaint, and primary assessment to identify:
- **Critical findings** that require immediate intervention
- **Warning signs** that need close monitoring
- **Areas of concern** that might be overlooked in a busy ER

### When To Use It
✅ **Best Times:**
- After completing initial vitals and primary survey
- Before making disposition decisions
- When vitals are concerning but diagnosis unclear
- To double-check your assessment
- During handovers to highlight key concerns

❌ **Don't Use When:**
- Case data is incomplete (AI needs vitals + complaint)
- You haven't saved the case yet
- In life-threatening situations requiring immediate action (don't wait for AI)

### How To Use It

**Step 1: Complete Required Data**
Fill in at minimum:
- ✓ Vitals at arrival (HR, BP, RR, SpO2, Temp, GCS)
- ✓ Presenting complaint
- ✓ Primary assessment (ABCDE)

**Step 2: Save The Case**
Click "Save Case" button first - AI features only work on saved cases

**Step 3: Click "AI Red Flags"**
- Button turns red/orange in the header
- Takes 3-5 seconds to analyze
- Shows "Analyzing..." while processing

**Step 4: Review Results**
AI provides structured output:
```
🚨 CRITICAL RED FLAGS (Life-threatening)
⚠️ WARNING SIGNS (Urgent monitoring needed)
✅ REASSURING FEATURES
📋 RECOMMENDED IMMEDIATE ACTIONS
🔍 THINGS TO WATCH FOR
```

**Step 5: Take Action**
- Review each section carefully
- Copy relevant findings to your notes
- Implement recommended actions
- Use as clinical decision support (NOT replacement for judgment)

### Example Use Case

**Scenario:** 65yo male, chest pain, BP 145/90, HR 95, RR 18, SpO2 96%

**AI Red Flags Output:**
```
🚨 CRITICAL RED FLAGS:
• Chest pain in elderly male - rule out ACS
• Borderline tachycardia with chest symptoms

⚠️ WARNING SIGNS:
• Slightly elevated BP - could indicate pain/anxiety
• Need to assess pain characteristics (OPQRST)

✅ REASSURING FEATURES:
• Normal SpO2 and respiratory rate
• Hemodynamically stable at present

📋 RECOMMENDED IMMEDIATE ACTIONS:
1. 12-lead ECG immediately
2. Troponin I/T stat
3. Aspirin 325mg if no contraindications
4. IV access and continuous monitoring
5. Consider nitrates if BP tolerates

🔍 THINGS TO WATCH FOR:
• Worsening chest pain
• ECG changes (ST elevation/depression)
• BP trending down or up significantly
• New arrhythmias
```

**How This Helps:**
- Ensures you don't miss urgent cardiac workup
- Prioritizes immediate actions
- Reminds you of key monitoring parameters
- Structured approach to chest pain evaluation

---

## 2. AI Differential Diagnosis 💡

### What It Does
Suggests possible diagnoses based on:
- Presenting complaint and duration
- Vital signs patterns
- History of present illness
- Past medical history
- Physical examination findings

Provides:
- **Most likely diagnoses** (ranked by probability)
- **Dangerous diagnoses** you must rule out
- **Recommended tests** to confirm/exclude
- **Clinical pearls** specific to the case

### When To Use It
✅ **Best Times:**
- Unclear or atypical presentations
- Multiple possible diagnoses
- To consider alternatives you might have missed
- Before finalizing your provisional diagnosis
- For educational purposes (residents/students)
- Complex cases with multiple complaints

❌ **Don't Use When:**
- Obvious diagnosis (e.g., clear fracture on X-ray)
- Life-threatening situation requiring immediate treatment
- Very limited case data available

### How To Use It

**Step 1: Document Thoroughly**
For best results, complete:
- ✓ Presenting complaint with duration
- ✓ Vitals at arrival
- ✓ History of present illness (HPI)
- ✓ Past medical history
- ✓ Physical examination findings
- ✓ Any initial investigations

**Step 2: Save The Case**
AI only works on saved cases

**Step 3: Click "AI Diagnosis"**
- Purple/blue button in header
- Shows "Thinking..." while processing
- Takes 5-10 seconds for comprehensive analysis

**Step 4: Review Differential Diagnoses**
AI provides structured output:
```
🎯 MOST LIKELY DIAGNOSES (ranked)
   1. [Diagnosis] - Why + How to confirm + Key management
   2. [Diagnosis] - Why + How to confirm + Key management
   3-6. [Additional diagnoses]

⚠️ DON'T MISS (Dangerous diagnoses to rule out)

📊 NEXT DIAGNOSTIC STEPS (Priority order)

💡 CLINICAL PEARLS
```

**Step 5: Use Suggestions**
- Consider diagnoses you might not have thought of
- Prioritize dangerous conditions to rule out
- Order recommended tests
- **Always correlate with clinical findings**
- Document your final reasoning

### Example Use Case

**Scenario:** 28yo female, abdominal pain x 2 days, RLQ tenderness, T 38.2°C, HR 105

**AI Diagnosis Output:**
```
🎯 MOST LIKELY DIAGNOSES:

1. Acute Appendicitis
   📌 Why: RLQ tenderness, fever, tachycardia, duration 48hrs
   🔬 To confirm: CT abdomen/pelvis, WBC with differential
   ⚡ If this: NPO, IV fluids, surgical consult, antibiotics

2. Ovarian Torsion
   📌 Why: Young female, acute RLQ pain, tachycardia
   🔬 To confirm: Pelvic ultrasound with Doppler, β-hCG
   ⚡ If this: Urgent gynecology consult, avoid delay

3. Ectopic Pregnancy
   📌 Why: Female of reproductive age, abdominal pain
   🔬 To confirm: β-hCG, transvaginal ultrasound
   ⚡ If this: Gynecology consult, serial β-hCG if needed

4. Pelvic Inflammatory Disease
   📌 Why: Age group, fever, pelvic pain
   🔬 To confirm: Pelvic exam, cervical cultures, WBC
   ⚡ If this: Antibiotics (CDC guidelines), partner treatment

⚠️ DON'T MISS:
• Ruptured ectopic: β-hCG mandatory in all females of reproductive age
• Ovarian torsion: Time-sensitive, can lose ovary if delayed

📊 NEXT DIAGNOSTIC STEPS:
1. β-hCG (stat) - Rule out ectopic FIRST
2. CBC with differential
3. Urinalysis
4. Pelvic ultrasound
5. CT abdomen/pelvis if β-hCG negative

💡 CLINICAL PEARLS:
• Always get β-hCG in females 12-55 years with abdominal pain
• RLQ pain in young female = surgical consult even if likely GYN
• Fever with appendicitis suggests perforation risk
```

**How This Helps:**
- Ensures you don't miss ectopic pregnancy (most important rule-out)
- Considers both surgical and gynecological causes
- Prioritizes time-sensitive diagnoses (torsion)
- Clear testing sequence
- Specific management for each diagnosis

---

## Best Practices

### DO ✅
- **Fill in complete data** before using AI features
- **Use AI as a second opinion**, not first-line decision maker
- **Copy relevant points** to your documentation
- **Verify suggestions** with clinical findings and experience
- **Use for education** - learn from AI's reasoning process
- **Share insights** with team during handovers
- **Document your final reasoning** (don't just copy AI output)

### DON'T ❌
- **Rely solely on AI** for critical decisions
- **Use with incomplete data** - garbage in, garbage out
- **Ignore clinical judgment** if AI suggests unlikely diagnoses
- **Skip physical examination** thinking AI will catch everything
- **Delay treatment** waiting for AI analysis
- **Copy AI output verbatim** without understanding
- **Use in obvious cases** where it adds no value

---

## Understanding AI Limitations

### What AI Is Good At
✅ Pattern recognition across large datasets
✅ Considering multiple possibilities simultaneously
✅ Catching overlooked findings
✅ Structured differential diagnosis approach
✅ Suggesting evidence-based next steps
✅ Educational value (explaining reasoning)

### What AI Cannot Do
❌ Physical examination
❌ Seeing the patient's appearance and body language
❌ Clinical gestalt from years of experience
❌ Weighing patient's social situation
❌ Making final treatment decisions
❌ Taking responsibility for care
❌ Understanding local protocols/resources

### Accuracy & Reliability
- AI suggestions are **decision support**, not definitive diagnoses
- Accuracy depends on **quality of input data**
- Always **verify with established guidelines**
- **Cross-check** with your clinical findings
- AI can miss **rare or atypical presentations**
- **Local factors** (epidemiology, resources) not considered

---

## Privacy & Compliance

### Data Usage
- Patient data sent to OpenAI API for analysis
- **No patient identifiers** in AI prompts (name removed)
- Case data encrypted in transit (HTTPS)
- No audio/video sent to AI
- Text-only analysis

### HIPAA Compliance
✅ Using Emergent LLM Key (BAA in place)
✅ De-identified data sent to AI
✅ Secure API communication
✅ Audit trail maintained
✅ No data retention by AI provider

### Best Practices
- Don't include patient names in free-text fields before AI analysis
- Use AI features only in secure locations
- Log out when stepping away
- Follow hospital policies on AI use

---

## Troubleshooting

### "Please save the case first"
**Problem:** AI features only work on saved cases
**Solution:** Click "Save Case" button, then try AI again

### "AI suggestion failed"
**Possible causes:**
- Network connectivity issue
- API key expired (contact admin)
- Malformed case data
- Server timeout

**Solution:** Try again, or contact support if persists

### Slow AI Response
**Normal:** 5-10 seconds for complex analysis
**If longer:** Check network connection, or try again

### Inaccurate Suggestions
**Possible reasons:**
- Incomplete input data
- Atypical presentation
- Rare condition outside AI training

**Solution:** Use clinical judgment, seek senior advice

### Copy Button Not Working
**Solution:** Manually select text and copy (Ctrl+C / Cmd+C)

---

## Tips for Maximum Value

### For Residents
- Use AI Diagnosis for **learning** differential diagnosis thinking
- Compare AI suggestions with your initial diagnosis
- Discuss AI outputs with seniors
- Note when AI catches something you missed

### For Attendings
- Use AI Red Flags as **safety net** before disposition
- Review AI Diagnosis to **teach residents** systematic approach
- Cross-check AI against protocols
- Use for **complex cases** with multiple complaints

### For Busy Shifts
- Prioritize AI Red Flags for **high-risk cases** (chest pain, SOB, AMS)
- Use AI Diagnosis when **stuck** or time-limited differential
- Copy key points to notes for **documentation**
- Use as **handover tool** to highlight concerns

### For Quality Improvement
- Track cases where AI caught missed findings
- Compare AI suggestions to final diagnoses
- Identify patterns in AI usefulness
- Provide feedback to improve system

---

## Feedback & Support

### How to Provide Feedback
- Document cases where AI was particularly helpful
- Report inaccurate or misleading suggestions
- Suggest improvements to prompts/format
- Share use cases that worked well

### Getting Help
- Check this guide first
- Contact IT support for technical issues
- Discuss clinical questions with seniors
- Review AI outputs in M&M conferences

---

## Summary

### 🚨 AI Red Flags
**Purpose:** Safety net for critical findings
**Best for:** Every case before disposition
**Output:** Structured red flags + action items
**Time:** 3-5 seconds

### 💡 AI Diagnosis  
**Purpose:** Comprehensive differential diagnosis
**Best for:** Unclear or complex cases
**Output:** Ranked diagnoses + tests + pearls
**Time:** 5-10 seconds

### Key Takeaway
AI features are **powerful tools** for clinical decision support, but always remember:

> **The doctor makes the diagnosis, not the AI.**

Use AI to enhance your clinical reasoning, catch blind spots, and provide structured thinking - but **always verify with your clinical judgment and examination findings**.

---

**Questions?** Contact your ER medical director or IT support team.
