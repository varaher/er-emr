import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateCaseSheetPDF = (caseData) => {
  try {
    const doc = new jsPDF();
    
    // Safe getter for nested properties
    const get = (obj, path, defaultValue = 'N/A') => {
      try {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
      } catch {
        return defaultValue;
      }
    };
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('EMERGENCY DEPARTMENT CASE SHEET', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('(Print on Hospital Letterhead)', 105, 22, { align: 'center' });
    
    let yPos = 35;
    
    // Patient Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 14, yPos);
    yPos += 7;
    
    doc.autoTable({
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      head: [['Field', 'Value']],
      body: [
        ['UHID', get(caseData, 'patient.uhid')],
        ['Name', get(caseData, 'patient.name')],
        ['Age/Sex', `${get(caseData, 'patient.age')} / ${get(caseData, 'patient.sex')}`],
        ['Phone', get(caseData, 'patient.phone')],
        ['Address', get(caseData, 'patient.address')],
        ['Arrival Date & Time', caseData.patient?.arrival_datetime ? new Date(caseData.patient.arrival_datetime).toLocaleString() : 'N/A'],
        ['Mode of Arrival', get(caseData, 'patient.mode_of_arrival')],
        ['MLC', caseData.patient?.mlc ? 'Yes' : 'No']
      ]
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  
    // Vitals at Arrival
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Vitals at Arrival', 14, yPos);
    yPos += 7;
    
    doc.autoTable({
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      head: [['Vital', 'Value']],
      body: [
        ['Heart Rate', `${get(caseData, 'vitals_at_arrival.hr')} bpm`],
        ['Blood Pressure', `${get(caseData, 'vitals_at_arrival.bp_systolic')}/${get(caseData, 'vitals_at_arrival.bp_diastolic')} mmHg`],
        ['Respiratory Rate', `${get(caseData, 'vitals_at_arrival.rr')} /min`],
        ['SpO2', `${get(caseData, 'vitals_at_arrival.spo2')}%`],
        ['Temperature', `${get(caseData, 'vitals_at_arrival.temperature')}°C`],
        ['GCS', `E${get(caseData, 'vitals_at_arrival.gcs_e', '-')} V${get(caseData, 'vitals_at_arrival.gcs_v', '-')} M${get(caseData, 'vitals_at_arrival.gcs_m', '-')}`],
        ['Pain Score', get(caseData, 'vitals_at_arrival.pain_score')]
      ]
    });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
    // Presenting Complaint
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Presenting Complaint', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const complaintText = doc.splitTextToSize(
      `${get(caseData, 'presenting_complaint.text')}\nDuration: ${get(caseData, 'presenting_complaint.duration')}\nOnset: ${get(caseData, 'presenting_complaint.onset_type')}`,
      180
    );
    doc.text(complaintText, 14, yPos);
    yPos += complaintText.length * 5 + 10;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
    // Primary Assessment (ABCDE)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Primary Assessment (ABCDE)', 14, yPos);
    yPos += 7;
    
    doc.autoTable({
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      head: [['Component', 'Assessment']],
      body: [
        ['Airway', `Status: ${get(caseData, 'primary_assessment.airway_status')}`],
        ['Breathing', `RR: ${get(caseData, 'primary_assessment.breathing_rr')}, SpO2: ${get(caseData, 'primary_assessment.breathing_spo2')}%, Work: ${get(caseData, 'primary_assessment.breathing_work')}`],
        ['Circulation', `HR: ${get(caseData, 'primary_assessment.circulation_hr')}, BP: ${get(caseData, 'primary_assessment.circulation_bp_systolic')}/${get(caseData, 'primary_assessment.circulation_bp_diastolic')}`],
        ['Disability', `AVPU: ${get(caseData, 'primary_assessment.disability_avpu')}, GCS: E${get(caseData, 'primary_assessment.disability_gcs_e', '-')}V${get(caseData, 'primary_assessment.disability_gcs_v', '-')}M${get(caseData, 'primary_assessment.disability_gcs_m', '-')}`],
        ['Exposure', `Temperature: ${get(caseData, 'primary_assessment.exposure_temperature')}°C`]
      ]
    });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
    // VBG if present
    const hasECG = get(caseData, 'primary_assessment.ecg_findings', '') !== 'N/A' && get(caseData, 'primary_assessment.ecg_findings', '') !== '';
    const hasVBG = get(caseData, 'primary_assessment.vbg_ph', '') !== 'N/A' && get(caseData, 'primary_assessment.vbg_ph', '') !== '';
    const hasEcho = get(caseData, 'primary_assessment.bedside_echo_findings', '') !== 'N/A' && get(caseData, 'primary_assessment.bedside_echo_findings', '') !== '';
    
    if (hasECG || hasVBG || hasEcho) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Adjuvants to Primary Assessment', 14, yPos);
      yPos += 7;
      
      const adjuvantData = [];
      if (hasECG) {
        adjuvantData.push(['ECG', get(caseData, 'primary_assessment.ecg_findings')]);
      }
      if (hasVBG) {
        adjuvantData.push(['VBG', `PH: ${get(caseData, 'primary_assessment.vbg_ph')}, PCO2: ${get(caseData, 'primary_assessment.vbg_pco2')}, HCO3: ${get(caseData, 'primary_assessment.vbg_hco3')}`]);
      }
      if (hasEcho) {
        adjuvantData.push(['Bedside Echo', get(caseData, 'primary_assessment.bedside_echo_findings')]);
      }
      
      if (adjuvantData.length > 0) {
        doc.autoTable({
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          head: [['Test', 'Findings']],
          body: adjuvantData
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }
    }
  
    // History
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('History', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const hpi = get(caseData, 'history.hpi', '');
    if (hpi && hpi !== 'N/A') {
      const hpiText = doc.splitTextToSize(`HPI: ${hpi}`, 180);
      doc.text(hpiText, 14, yPos);
      yPos += hpiText.length * 5 + 5;
    }
    
    const pastMedical = caseData.history?.past_medical || [];
    if (Array.isArray(pastMedical) && pastMedical.length > 0) {
      doc.text(`Past Medical History: ${pastMedical.join(', ')}`, 14, yPos);
      yPos += 7;
    }
    
    const allergies = caseData.history?.allergies || [];
    if (Array.isArray(allergies) && allergies.length > 0) {
      doc.text(`Allergies: ${allergies.join(', ')}`, 14, yPos);
      yPos += 10;
    }
  
  // Examination
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Physical Examination', 14, yPos);
  yPos += 7;
  
  const examData = [];
  const cvsStatus = get(caseData, 'examination.cvs_status', '');
  if (cvsStatus && cvsStatus !== 'N/A') {
    const cvsDetails = cvsStatus === 'Abnormal' 
      ? `${cvsStatus} - ${get(caseData, 'examination.cvs_s1_s2', '')} ${get(caseData, 'examination.cvs_pulse', '')}`
      : cvsStatus;
    examData.push(['CVS', cvsDetails]);
  }
  const respStatus = get(caseData, 'examination.respiratory_status', '');
  if (respStatus && respStatus !== 'N/A') {
    examData.push(['Respiratory', respStatus]);
  }
  const abdStatus = get(caseData, 'examination.abdomen_status', '');
  if (abdStatus && abdStatus !== 'N/A') {
    examData.push(['Abdomen', abdStatus]);
  }
  const cnsStatus = get(caseData, 'examination.cns_status', '');
  if (cnsStatus && cnsStatus !== 'N/A') {
    examData.push(['CNS', cnsStatus]);
  }
  
  if (examData.length > 0) {
    doc.autoTable({
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      head: [['System', 'Findings']],
      body: examData
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // Investigations
  const panelsSelected = caseData.investigations?.panels_selected || [];
  if (Array.isArray(panelsSelected) && panelsSelected.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Investigations Ordered', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(panelsSelected.join(', '), 14, yPos);
    yPos += 10;
  }
  
  // Treatment
  const interventions = caseData.treatment?.interventions || [];
  if (Array.isArray(interventions) && interventions.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Treatment Given', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(interventions.join(', '), 14, yPos);
    yPos += 10;
  }
  
  // Disposition
  if (caseData.disposition) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Disposition', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Type: ${get(caseData, 'disposition.type')}`, 14, yPos);
    yPos += 5;
    doc.text(`Condition: ${get(caseData, 'disposition.condition_at_discharge')}`, 14, yPos);
  }
  
  // Signature section
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('_______________________', 14, yPos);
  doc.text('_______________________', 140, yPos);
  yPos += 5;
  doc.text('EM Resident Signature', 14, yPos);
  doc.text('EM Consultant Signature', 140, yPos);
  yPos += 5;
  doc.text(`Dr. ${get(caseData, 'em_resident')}`, 14, yPos);
  doc.text(`Dr. ${get(caseData, 'em_consultant')}`, 140, yPos);
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 290);
    doc.text(`EM Resident: ${caseData.em_resident || 'N/A'}`, 180, 290, { align: 'right' });
  }
  
  return doc;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

export const generateDischargeSummaryPDF = (summaryData, caseData) => {
  try {
    const doc = new jsPDF();
    
    // Safe getter for nested properties
    const get = (obj, path, defaultValue = 'N/A') => {
      try {
        const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
      } catch {
        return defaultValue;
      }
    };
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DISCHARGE SUMMARY', 105, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('(Print on Hospital Letterhead)', 105, 22, { align: 'center' });
  
  let yPos = 35;
  
  // Patient Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', 14, yPos);
  yPos += 7;
  
  doc.autoTable({
    startY: yPos,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    head: [['Field', 'Value']],
    body: [
      ['UHID', caseData.patient.uhid || 'N/A'],
      ['Name', caseData.patient.name],
      ['Age/Sex', `${caseData.patient.age} / ${caseData.patient.sex}`],
      ['Admission Date', new Date(caseData.patient.arrival_datetime).toLocaleDateString()],
      ['Discharge Date', new Date().toLocaleDateString()]
    ]
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // Presenting Complaint
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Presenting Complaint', 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const complaintText = doc.splitTextToSize(summaryData.presenting_complaint || 'N/A', 180);
  doc.text(complaintText, 14, yPos);
  yPos += complaintText.length * 5 + 10;
  
  // Clinical Course
  if (summaryData.clinical_course) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Course', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const courseText = doc.splitTextToSize(summaryData.clinical_course, 180);
    doc.text(courseText, 14, yPos);
    yPos += courseText.length * 5 + 10;
  }
  
  // Investigations & Results
  if (summaryData.investigations_summary) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Investigations & Results', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const invText = doc.splitTextToSize(summaryData.investigations_summary, 180);
    doc.text(invText, 14, yPos);
    yPos += invText.length * 5 + 10;
  }
  
  // Final Diagnosis
  if (summaryData.final_diagnosis) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Final Diagnosis', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const diagText = doc.splitTextToSize(summaryData.final_diagnosis, 180);
    doc.text(diagText, 14, yPos);
    yPos += diagText.length * 5 + 10;
  }
  
  // Treatment Given
  if (summaryData.treatment_given) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Treatment Given', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const treatText = doc.splitTextToSize(summaryData.treatment_given, 180);
    doc.text(treatText, 14, yPos);
    yPos += treatText.length * 5 + 10;
  }
  
  // Condition at Discharge
  if (summaryData.condition_at_discharge) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Condition at Discharge', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(summaryData.condition_at_discharge, 14, yPos);
    yPos += 10;
  }
  
  // Discharge Instructions
  if (summaryData.discharge_instructions) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Discharge Instructions & Follow-up', 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const instrText = doc.splitTextToSize(summaryData.discharge_instructions, 180);
    doc.text(instrText, 14, yPos);
    yPos += instrText.length * 5 + 10;
  }
  
  // Signature section
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('_______________________', 14, yPos);
  doc.text('_______________________', 140, yPos);
  yPos += 5;
  doc.text('EM Resident Signature', 14, yPos);
  doc.text('EM Consultant Signature', 140, yPos);
  yPos += 5;
  doc.text(`Dr. ${get(caseData, 'em_resident')}`, 14, yPos);
  doc.text(`Dr. ${get(caseData, 'em_consultant')}`, 140, yPos);
  
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 290);
      doc.text(`EM Resident: ${get(caseData, 'em_resident')}`, 180, 290, { align: 'right' });
    }
    
    return doc;
  } catch (error) {
    console.error('Discharge Summary PDF Error:', error);
    throw new Error(`Discharge summary PDF generation failed: ${error.message}`);
  }
};
