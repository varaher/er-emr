// Investigation Panel Definitions
export const investigationPanels = {
  "ER Basic Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Urea Nitrogen (Urea)",
      "Serum Creatinine",
      "Serum Electrolytes (Na+, K+, Cl-)"
    ],
    color: "blue"
  },
  "ER Advance Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "C-Reactive Protein (CRP)",
      "Renal Function Test (RFT)",
      "Liver Function Test (LFT)",
      "Blood Urea Nitrogen (Urea)",
      "Serum Electrolytes (Na+, K+, Cl-)"
    ],
    color: "purple"
  },
  "NSTEMI Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "C-Reactive Protein (CRP)",
      "Renal Function Test (RFT)",
      "Liver Function Test (LFT)",
      "Serum Electrolytes (Na+, K+, Cl-)",
      "Blood Urea Nitrogen (Urea)",
      "Troponin I/T",
      "CK-MB",
      "PT/INR"
    ],
    color: "red"
  },
  "STEMI Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "C-Reactive Protein (CRP)",
      "Renal Function Test (RFT)",
      "Liver Function Test (LFT)",
      "Serum Electrolytes (Na+, K+, Cl-)",
      "Blood Urea Nitrogen (Urea)",
      "Blood Grouping with Antibody Screening",
      "HBsAg",
      "Anti HCV",
      "HIV Antigen and Antibody"
    ],
    color: "red"
  },
  "Acute Stroke Code 7 Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Grouping with Antibody Screening",
      "Liver Function Test (LFT)",
      "Serum Electrolytes (Na+, K+, Cl-)",
      "PT/INR",
      "Blood Urea Nitrogen (Urea)",
      "CT Angiogram",
      "MRI Single Sequence",
      "X-Ray Chest AP",
      "HIV Antigen and Antibody",
      "HBsAg",
      "Anti HCV"
    ],
    color: "orange"
  },
  "Pedia Mini Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Glucose",
      "Serum Electrolytes (Na+, K+, Cl-)"
    ],
    color: "green"
  },
  "Adult Seizure Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "Renal Function Test (RFT)",
      "Liver Function Test (LFT)",
      "Serum Electrolytes (Na+, K+, Cl-)",
      "Blood Glucose",
      "Serum Calcium",
      "Serum Magnesium",
      "CT Brain (if first seizure or focal signs)"
    ],
    color: "purple"
  },
  "Pedia Febrile Seizure Panel": {
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Glucose",
      "Serum Electrolytes (Na+, K+, Cl-)",
      "Serum Calcium",
      "Blood Culture (if indicated)"
    ],
    color: "green"
  }
};

// Normal Vital Signs Reference
export const normalVitals = {
  adult: {
    hr: { min: 60, max: 100, unit: "bpm", label: "Heart Rate" },
    bp_systolic: { min: 90, max: 120, unit: "mmHg", label: "BP Systolic" },
    bp_diastolic: { min: 60, max: 80, unit: "mmHg", label: "BP Diastolic" },
    rr: { min: 12, max: 20, unit: "/min", label: "Respiratory Rate" },
    spo2: { min: 95, max: 100, unit: "%", label: "SpO2" },
    temperature: { min: 36.1, max: 37.2, unit: "°C", label: "Temperature" },
    gcs: { min: 15, max: 15, unit: "", label: "GCS" },
    map: { min: 70, max: 100, unit: "mmHg", label: "MAP" }
  },
  pediatric: {
    "0-3months": {
      hr: { min: 100, max: 160, unit: "bpm" },
      rr: { min: 30, max: 60, unit: "/min" },
      bp_systolic: { min: 65, max: 85, unit: "mmHg" }
    },
    "3-6months": {
      hr: { min: 90, max: 120, unit: "bpm" },
      rr: { min: 30, max: 60, unit: "/min" },
      bp_systolic: { min: 70, max: 90, unit: "mmHg" }
    },
    "6-12months": {
      hr: { min: 80, max: 120, unit: "bpm" },
      rr: { min: 24, max: 40, unit: "/min" },
      bp_systolic: { min: 80, max: 100, unit: "mmHg" }
    },
    "1-3years": {
      hr: { min: 80, max: 130, unit: "bpm" },
      rr: { min: 22, max: 30, unit: "/min" },
      bp_systolic: { min: 90, max: 105, unit: "mmHg" }
    },
    "3-5years": {
      hr: { min: 80, max: 120, unit: "bpm" },
      rr: { min: 20, max: 28, unit: "/min" },
      bp_systolic: { min: 95, max: 110, unit: "mmHg" }
    },
    "6-12years": {
      hr: { min: 70, max: 110, unit: "bpm" },
      rr: { min: 18, max: 25, unit: "/min" },
      bp_systolic: { min: 100, max: 120, unit: "mmHg" }
    },
    "12+years": {
      hr: { min: 60, max: 100, unit: "bpm" },
      rr: { min: 12, max: 20, unit: "/min" },
      bp_systolic: { min: 110, max: 135, unit: "mmHg" }
    },
    general: {
      spo2: { min: 95, max: 100, unit: "%" },
      temperature: { min: 36.5, max: 37.5, unit: "°C" },
      capillary_refill: { min: 0, max: 2, unit: "sec" }
    }
  }
};

export const getVitalStatus = (value, vitalType, ageGroup = 'adult') => {
  if (!value) return 'unknown';
  
  const ranges = normalVitals[ageGroup];
  if (!ranges || !ranges[vitalType]) return 'unknown';
  
  const { min, max } = ranges[vitalType];
  
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'normal';
};
