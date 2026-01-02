// Emergency Department Drug Formulary

export const ADULT_DRUGS = [
  { name: "Adrenaline", strength: "1mg/mL", doses: ["0.5mg IM", "1mg IV"], category: "Resuscitation" },
  { name: "Atropine", strength: "0.6mg/mL", doses: ["0.6mg IV", "1.2mg IV"], category: "Cardiac" },
  { name: "Amiodarone", strength: "150mg/3mL", doses: ["150mg IV", "300mg IV"], category: "Cardiac" },
  { name: "Aspirin", strength: "325mg", doses: ["325mg PO", "150mg PO"], category: "Cardiac" },
  { name: "Clopidogrel", strength: "75mg", doses: ["300mg loading", "75mg maintenance"], category: "Cardiac" },
  { name: "Diazepam", strength: "10mg/2mL", doses: ["5mg IV", "10mg IV", "5mg PR"], category: "Sedation" },
  { name: "Dopamine", strength: "200mg/5mL", doses: ["5mcg/kg/min", "10mcg/kg/min", "15mcg/kg/min"], category: "Vasopressor" },
  { name: "Dobutamine", strength: "250mg/20mL", doses: ["5mcg/kg/min", "10mcg/kg/min"], category: "Inotrope" },
  { name: "Dexamethasone", strength: "4mg/mL", doses: ["4mg IV", "8mg IV"], category: "Steroid" },
  { name: "Fentanyl", strength: "50mcg/mL", doses: ["50mcg IV", "100mcg IV"], category: "Analgesic" },
  { name: "Furosemide", strength: "20mg/2mL", doses: ["20mg IV", "40mg IV", "80mg IV"], category: "Diuretic" },
  { name: "Hydrocortisone", strength: "100mg", doses: ["100mg IV", "200mg IV"], category: "Steroid" },
  { name: "Heparin", strength: "5000U/mL", doses: ["5000U SC", "60U/kg bolus"], category: "Anticoagulant" },
  { name: "Insulin Regular", strength: "100U/mL", doses: ["10U IV", "0.1U/kg/hr"], category: "Metabolic" },
  { name: "Ketamine", strength: "50mg/mL", doses: ["1mg/kg IV", "2mg/kg IM"], category: "Sedation" },
  { name: "Labetalol", strength: "5mg/mL", doses: ["20mg IV", "40mg IV"], category: "Antihypertensive" },
  { name: "Lidocaine", strength: "2%", doses: ["1mg/kg IV", "1.5mg/kg IV"], category: "Antiarrhythmic" },
  { name: "Magnesium Sulfate", strength: "50%", doses: ["2g IV", "4g IV"], category: "Electrolyte" },
  { name: "Midazolam", strength: "5mg/mL", doses: ["2mg IV", "5mg IV", "5mg IM"], category: "Sedation" },
  { name: "Morphine", strength: "10mg/mL", doses: ["2mg IV", "4mg IV", "5mg SC"], category: "Analgesic" },
  { name: "Naloxone", strength: "0.4mg/mL", doses: ["0.4mg IV", "0.8mg IV", "2mg IN"], category: "Reversal" },
  { name: "Nitroglycerin", strength: "5mg/mL", doses: ["0.4mg SL", "5mcg/min infusion"], category: "Cardiac" },
  { name: "Noradrenaline", strength: "4mg/4mL", doses: ["0.1mcg/kg/min", "0.2mcg/kg/min"], category: "Vasopressor" },
  { name: "Ondansetron", strength: "4mg/2mL", doses: ["4mg IV", "8mg IV"], category: "Antiemetic" },
  { name: "Pantoprazole", strength: "40mg", doses: ["40mg IV", "80mg IV bolus"], category: "GI" },
  { name: "Paracetamol", strength: "1g/100mL", doses: ["1g IV", "650mg PO"], category: "Analgesic" },
  { name: "Phenytoin", strength: "250mg/5mL", doses: ["15mg/kg IV", "20mg/kg IV"], category: "Anticonvulsant" },
  { name: "Propofol", strength: "10mg/mL", doses: ["1mg/kg IV", "2mg/kg IV"], category: "Sedation" },
  { name: "Rocuronium", strength: "50mg/5mL", doses: ["0.6mg/kg IV", "1.2mg/kg IV"], category: "Paralytic" },
  { name: "Salbutamol Neb", strength: "5mg/mL", doses: ["2.5mg neb", "5mg neb"], category: "Respiratory" },
  { name: "Sodium Bicarbonate", strength: "8.4%", doses: ["50mEq IV", "1mEq/kg IV"], category: "Electrolyte" },
  { name: "Succinylcholine", strength: "100mg/5mL", doses: ["1mg/kg IV", "1.5mg/kg IV"], category: "Paralytic" },
  { name: "Tramadol", strength: "50mg/mL", doses: ["50mg IV", "100mg IV"], category: "Analgesic" },
  { name: "Tranexamic Acid", strength: "500mg/5mL", doses: ["1g IV", "1g IV over 10min"], category: "Hemostatic" },
  { name: "Vasopressin", strength: "20U/mL", doses: ["40U IV", "0.03U/min infusion"], category: "Vasopressor" },
];

export const PEDIATRIC_DRUGS = [
  { name: "Adrenaline", strength: "1:10000", doses: ["0.01mg/kg IV", "0.1mg/kg ETT"], category: "Resuscitation" },
  { name: "Atropine", strength: "0.6mg/mL", doses: ["0.02mg/kg IV (min 0.1mg)"], category: "Cardiac" },
  { name: "Amoxicillin", strength: "250mg/5mL", doses: ["25mg/kg PO", "50mg/kg PO"], category: "Antibiotic" },
  { name: "Ceftriaxone", strength: "1g", doses: ["50mg/kg IV", "100mg/kg IV (meningitis)"], category: "Antibiotic" },
  { name: "Dexamethasone", strength: "4mg/mL", doses: ["0.15mg/kg IV", "0.6mg/kg PO (croup)"], category: "Steroid" },
  { name: "Diazepam", strength: "10mg/2mL", doses: ["0.2mg/kg IV", "0.5mg/kg PR"], category: "Anticonvulsant" },
  { name: "Ibuprofen", strength: "100mg/5mL", doses: ["10mg/kg PO"], category: "Analgesic" },
  { name: "Midazolam", strength: "5mg/mL", doses: ["0.1mg/kg IV", "0.2mg/kg IN", "0.5mg/kg buccal"], category: "Sedation" },
  { name: "Ondansetron", strength: "4mg/2mL", doses: ["0.15mg/kg IV (max 4mg)"], category: "Antiemetic" },
  { name: "Paracetamol", strength: "250mg/5mL", doses: ["15mg/kg PO", "20mg/kg PR"], category: "Analgesic" },
  { name: "Phenobarbital", strength: "200mg/mL", doses: ["20mg/kg IV loading"], category: "Anticonvulsant" },
  { name: "Prednisolone", strength: "5mg/5mL", doses: ["1mg/kg PO", "2mg/kg PO (asthma)"], category: "Steroid" },
  { name: "Salbutamol Neb", strength: "5mg/mL", doses: ["2.5mg neb (<5y)", "5mg neb (>5y)"], category: "Respiratory" },
  { name: "Sodium Bicarbonate", strength: "4.2%", doses: ["1mEq/kg IV"], category: "Electrolyte" },
];

export const PROCEDURE_OPTIONS = [
  { id: "cpr", name: "CPR", category: "Resuscitation" },
  { id: "intubation", name: "Endotracheal Intubation", category: "Airway" },
  { id: "lma", name: "LMA Insertion", category: "Airway" },
  { id: "cricothyrotomy", name: "Cricothyrotomy", category: "Airway" },
  { id: "bvm", name: "Bag-Valve-Mask Ventilation", category: "Airway" },
  { id: "central_line", name: "Central Line Insertion", category: "Vascular" },
  { id: "peripheral_iv", name: "Peripheral IV Access", category: "Vascular" },
  { id: "io_access", name: "Intraosseous Access", category: "Vascular" },
  { id: "arterial_line", name: "Arterial Line", category: "Vascular" },
  { id: "chest_tube", name: "Chest Tube Insertion", category: "Chest" },
  { id: "needle_decompression", name: "Needle Decompression", category: "Chest" },
  { id: "pericardiocentesis", name: "Pericardiocentesis", category: "Chest" },
  { id: "thoracentesis", name: "Thoracentesis", category: "Chest" },
  { id: "lumbar_puncture", name: "Lumbar Puncture", category: "Neuro" },
  { id: "foleys", name: "Foley's Catheter", category: "GU" },
  { id: "ng_tube", name: "NG Tube Insertion", category: "GI" },
  { id: "gastric_lavage", name: "Gastric Lavage", category: "GI" },
  { id: "wound_closure", name: "Wound Closure/Suturing", category: "Wound" },
  { id: "wound_irrigation", name: "Wound Irrigation", category: "Wound" },
  { id: "fracture_splint", name: "Fracture Splinting", category: "Ortho" },
  { id: "joint_reduction", name: "Joint Reduction", category: "Ortho" },
  { id: "cardioversion", name: "Cardioversion", category: "Cardiac" },
  { id: "defibrillation", name: "Defibrillation", category: "Cardiac" },
  { id: "pacing", name: "Transcutaneous Pacing", category: "Cardiac" },
  { id: "ecg", name: "12-Lead ECG", category: "Monitoring" },
  { id: "abg", name: "ABG/VBG", category: "Monitoring" },
];

export const DRUG_CATEGORIES = [
  "Resuscitation",
  "Cardiac",
  "Vasopressor",
  "Inotrope",
  "Analgesic",
  "Sedation",
  "Anticonvulsant",
  "Respiratory",
  "Antibiotic",
  "Steroid",
  "Antiemetic",
  "Diuretic",
  "Anticoagulant",
  "Antihypertensive",
  "Electrolyte",
  "GI",
  "Hemostatic",
  "Reversal",
  "Paralytic",
  "Metabolic"
];

export const PROCEDURE_CATEGORIES = [
  "Resuscitation",
  "Airway",
  "Vascular",
  "Chest",
  "Neuro",
  "GU",
  "GI",
  "Wound",
  "Ortho",
  "Cardiac",
  "Monitoring"
];

// Pediatric Normal Vital Signs by Age Group
export const PEDIATRIC_VITALS = {
  newborn: { // 0-1 month
    ageRange: "0-1 month",
    hr: [100, 160],
    rr: [30, 60],
    sbp: [60, 90],
    dbp: [30, 60],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
  infant: { // 1-12 months
    ageRange: "1-12 months",
    hr: [100, 160],
    rr: [25, 50],
    sbp: [70, 100],
    dbp: [40, 65],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
  toddler: { // 1-3 years
    ageRange: "1-3 years",
    hr: [90, 150],
    rr: [20, 30],
    sbp: [80, 110],
    dbp: [50, 70],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
  preschool: { // 3-6 years
    ageRange: "3-6 years",
    hr: [80, 140],
    rr: [20, 25],
    sbp: [80, 110],
    dbp: [50, 70],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
  schoolAge: { // 6-12 years
    ageRange: "6-12 years",
    hr: [70, 120],
    rr: [15, 20],
    sbp: [90, 120],
    dbp: [55, 80],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
  adolescent: { // 12-16 years
    ageRange: "12-16 years",
    hr: [60, 100],
    rr: [12, 20],
    sbp: [100, 130],
    dbp: [60, 85],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
  adult: { // >16 years
    ageRange: ">16 years",
    hr: [60, 100],
    rr: [12, 20],
    sbp: [90, 140],
    dbp: [60, 90],
    temp: [36.5, 37.5],
    spo2: [95, 100],
  },
};

// Get age group from age string
export const getAgeGroup = (ageString) => {
  if (!ageString) return 'adult';
  
  const age = String(ageString).toLowerCase();
  let years = 0;
  let months = 0;
  
  const yearMatch = age.match(/(\d+)\s*(y|year|years)/i);
  const monthMatch = age.match(/(\d+)\s*(m|month|months)/i);
  const dayMatch = age.match(/(\d+)\s*(d|day|days)/i);
  const plainNumber = age.match(/^(\d+)$/);
  
  if (yearMatch) years = parseInt(yearMatch[1]);
  if (monthMatch) months = parseInt(monthMatch[1]);
  if (dayMatch) months = 0;
  if (plainNumber) years = parseInt(plainNumber[1]);
  
  const totalMonths = (years * 12) + months;
  
  if (totalMonths <= 1) return 'newborn';
  if (totalMonths <= 12) return 'infant';
  if (years <= 3) return 'toddler';
  if (years <= 6) return 'preschool';
  if (years <= 12) return 'schoolAge';
  if (years <= 16) return 'adolescent';
  return 'adult';
};

// Check vital alerts
export const getVitalAlerts = (vitals, ageString) => {
  const ageGroup = getAgeGroup(ageString);
  const norms = PEDIATRIC_VITALS[ageGroup];
  const alerts = [];
  
  if (!norms) return alerts;
  
  const checkVital = (value, min, max) => {
    if (!value || isNaN(parseFloat(value))) return 'unknown';
    const numValue = parseFloat(value);
    if (numValue < min) return 'low';
    if (numValue > max) return 'high';
    return 'normal';
  };
  
  if (vitals.hr) {
    const status = checkVital(vitals.hr, norms.hr[0], norms.hr[1]);
    if (status === 'low') alerts.push({ type: 'danger', vital: 'HR', message: `Bradycardia: HR ${vitals.hr} (Normal: ${norms.hr[0]}-${norms.hr[1]} for ${norms.ageRange})` });
    else if (status === 'high') alerts.push({ type: 'warning', vital: 'HR', message: `Tachycardia: HR ${vitals.hr} (Normal: ${norms.hr[0]}-${norms.hr[1]} for ${norms.ageRange})` });
  }
  
  if (vitals.rr) {
    const status = checkVital(vitals.rr, norms.rr[0], norms.rr[1]);
    if (status === 'low') alerts.push({ type: 'danger', vital: 'RR', message: `Bradypnea: RR ${vitals.rr} (Normal: ${norms.rr[0]}-${norms.rr[1]} for ${norms.ageRange})` });
    else if (status === 'high') alerts.push({ type: 'warning', vital: 'RR', message: `Tachypnea: RR ${vitals.rr} (Normal: ${norms.rr[0]}-${norms.rr[1]} for ${norms.ageRange})` });
  }
  
  if (vitals.sbp) {
    const status = checkVital(vitals.sbp, norms.sbp[0], norms.sbp[1]);
    if (status === 'low') alerts.push({ type: 'danger', vital: 'SBP', message: `Hypotension: SBP ${vitals.sbp} (Normal: ${norms.sbp[0]}-${norms.sbp[1]} for ${norms.ageRange})` });
    else if (status === 'high') alerts.push({ type: 'warning', vital: 'SBP', message: `Hypertension: SBP ${vitals.sbp} (Normal: ${norms.sbp[0]}-${norms.sbp[1]} for ${norms.ageRange})` });
  }
  
  if (vitals.temp) {
    const status = checkVital(vitals.temp, norms.temp[0], norms.temp[1]);
    if (status === 'low') alerts.push({ type: 'danger', vital: 'Temp', message: `Hypothermia: ${vitals.temp}°C (Normal: 36.5-37.5°C)` });
    else if (status === 'high') alerts.push({ type: 'warning', vital: 'Temp', message: `Fever: ${vitals.temp}°C (Normal: 36.5-37.5°C)` });
  }
  
  if (vitals.spo2) {
    const status = checkVital(vitals.spo2, norms.spo2[0], 100);
    if (status === 'low') alerts.push({ type: 'danger', vital: 'SpO2', message: `Hypoxia: SpO2 ${vitals.spo2}% (Normal: ≥95%)` });
  }
  
  return alerts;
};
