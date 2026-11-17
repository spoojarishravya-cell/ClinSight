import {
  BodySystemId,
  DiseaseAnalysisEnvelope,
  ImagingModalityId,
  ModalityConfig,
  SampleModalityStudy,
} from '../types/clinical';

export const BODY_SYSTEMS: {
  id: BodySystemId;
  label: string;
  focusPathologies: string[];
  defaultObservation: string;
}[] = [
  {
    id: 'respiratory',
    label: 'Respiratory',
    focusPathologies: [
      'Community / Hospital-Acquired Pneumonia',
      'Acute Pulmonary Embolism',
      'ARDS / Diffuse Alveolar Damage',
      'Pneumothorax / Pleural Effusion',
    ],
    defaultObservation:
      'Acute hypoxemic respiratory distress, SpO2 91% on 4L nasal cannula, fever 38.9 °C, productive cough, rales at right lung base.',
  },
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    focusPathologies: [
      'Acute ST-Elevation Myocardial Infarction',
      'Thoracic Aortic Dissection',
      'Pericardial Effusion / Tamponade',
      'Acute Decompensated Heart Failure',
    ],
    defaultObservation:
      'Substernal chest pressure radiating to left jaw, diaphoresis, SBP 94/58 mmHg, HR 112 bpm, Troponin-I 14.82 ng/mL.',
  },
  {
    id: 'neurological',
    label: 'Neurological',
    focusPathologies: [
      'Acute Ischemic Stroke (MCA Territory)',
      'Intracerebral Hemorrhage',
      'Subarachnoid Hemorrhage',
      'Cerebral Edema / Midline Shift',
    ],
    defaultObservation:
      'Sudden-onset right hemiparesis, expressive aphasia (NIHSS 11), paroxysmal atrial fibrillation on telemetry, BP 182/96 mmHg.',
  },
  {
    id: 'musculoskeletal',
    label: 'Musculoskeletal',
    focusPathologies: [
      'Intra-Articular Tibial Plateau Fracture',
      'Joint Effusion / Hemarthrosis',
      'Advanced Tricompartmental Osteoarthritis',
      'Acute Septic Arthritis / Osteomyelitis',
    ],
    defaultObservation:
      'Acute knee trauma with inability to bear weight, joint effusion, focal medial joint-line tenderness, intact distal neurovascular status.',
  },
  {
    id: 'abdominal',
    label: 'Abdominal',
    focusPathologies: [
      'Acute Calculous Cholecystitis / Cholelithiasis',
      'Acute Gallstone Pancreatitis',
      'Ascending Cholangitis',
      'Pneumoperitoneum / Hollow Viscus Perforation',
    ],
    defaultObservation:
      'Right upper quadrant and epigastric tenderness, positive Murphy sign, total bilirubin 3.1 mg/dL, lipase 1,480 U/L, fever 38.4 °C.',
  },
];

export const MODALITY_CONFIGS: Record<ImagingModalityId, ModalityConfig> = {
  xray: {
    id: 'xray',
    label: 'X-Ray Radiography',
    shortLabel: 'X-Ray',
    description:
      'Planar projection radiography for thoracic parenchymal infiltrates, pneumothorax, lines/tubes, and orthopedic cortical bone alignment.',
    compatibleModels: [
      {
        id: 'gemini-4-hydrogen',
        label: 'gemini-4-hydrogen (Thoracic & Orthopedic Vision)',
        capabilitySummary: 'Full multimodal radiograph synthesis with cortical/parenchymal reasoning',
        recommendedFor: 'Complex chest infiltrates, subtle fractures, line verification',
      },
      {
        id: 'gemini-3.1-flash-lite',
        label: 'gemini-3.1-flash-lite (Rapid Radiograph Triage)',
        capabilitySummary: 'Low-latency projection screening for acute cardiopulmonary flags',
        recommendedFor: 'Stat portable AP chest triage & pneumothorax screening',
      },
    ],
    blockedModels: [
      { id: 'gemini-3.5-transcribe', reason: 'Audio transcription only — no visual radiography input' },
      { id: 'gemini-embedding-2', reason: 'Vector embedding model — cannot generate diagnostic reads' },
      { id: 'lyria-3-clip-preview', reason: 'Audio synthesis model — incompatible with clinical imaging' },
    ],
    parameters: [
      {
        key: 'projection',
        label: 'Projection View',
        options: ['AP Portable', 'PA Erect', 'Lateral', 'AP Weight-Bearing'],
        defaultValue: 'AP Portable',
      },
      {
        key: 'windowPreset',
        label: 'Contrast Profile',
        options: ['Lung / Soft Tissue', 'Osseous / Cortical Bone', 'Mediastinal'],
        defaultValue: 'Lung / Soft Tissue',
      },
    ],
    defaultBodySystems: ['respiratory', 'musculoskeletal', 'cardiovascular', 'abdominal'],
  },
  ultrasound: {
    id: 'ultrasound',
    label: 'Ultrasound / Sonography',
    shortLabel: 'Ultrasound',
    description:
      'B-mode & POCUS acoustic sonography for hepatobiliary, free peritoneal fluid (FAST), pleural effusions, and cardiac chamber kinetics.',
    compatibleModels: [
      {
        id: 'gemini-4-hydrogen',
        label: 'gemini-4-hydrogen (Sonographic Acoustic Vision)',
        capabilitySummary: 'Echogenicity, acoustic shadowing, wall thickening & fluid pocket analysis',
        recommendedFor: 'RUQ gallbladder/hepatic POCUS, FAST exam, pleural/pericardial effusions',
      },
    ],
    blockedModels: [
      {
        id: 'gemini-3.1-flash-lite',
        reason: 'Restricted: Insufficient acoustic artifact & speckle differentiation for POCUS',
      },
      { id: 'gemini-3.8-flash-tts', reason: 'Speech synthesis only — no ultrasound vision input' },
      { id: 'gemini-embedding-2', reason: 'Embedding model — incompatible with sonography' },
    ],
    parameters: [
      {
        key: 'transducer',
        label: 'Transducer Probe',
        options: ['Curvilinear 3.5 MHz', 'Phased Array Cardiac', 'Linear Vascular 10 MHz'],
        defaultValue: 'Curvilinear 3.5 MHz',
      },
      {
        key: 'acousticMode',
        label: 'Imaging Mode',
        options: ['B-Mode Grayscale', 'Color Doppler Overlay', 'M-Mode'],
        defaultValue: 'B-Mode Grayscale',
      },
      {
        key: 'windowSite',
        label: 'Acoustic Window',
        options: ['RUQ / Hepatobiliary', 'Subxiphoid Cardiac', 'Pleural / Thoracic', 'MSK Tendon'],
        defaultValue: 'RUQ / Hepatobiliary',
      },
    ],
    defaultBodySystems: ['abdominal', 'cardiovascular', 'respiratory', 'musculoskeletal'],
  },
  ct: {
    id: 'ct',
    label: 'CT Cross-Sectional',
    shortLabel: 'CT Scan',
    description:
      'Volumetric Computed Tomography slices across lung, mediastinal, vascular CTA, abdominal, and osseous Hounsfield unit windows.',
    compatibleModels: [
      {
        id: 'gemini-4-hydrogen',
        label: 'gemini-4-hydrogen (Cross-Sectional Volumetric Vision)',
        capabilitySummary: 'Multi-organ density differentiation, vascular caliber & consolidation mapping',
        recommendedFor: 'Thoracic CT, CTA Aorta/PE, Abdominal CT, Head CT',
      },
    ],
    blockedModels: [
      {
        id: 'gemini-3.1-flash-lite',
        reason: 'Blocked for CT: High-density slice interpretation requires full Gemini 4 Hydrogen precision',
      },
      { id: 'gemini-3.5-transcribe', reason: 'Audio model — incompatible with volumetric CT slices' },
      { id: 'gemini-3.1-flash-lite-image', reason: 'Image generator — prohibited for diagnostic CT reading' },
    ],
    parameters: [
      {
        key: 'contrastPhase',
        label: 'Contrast Phase',
        options: ['Non-Contrast', 'IV Arterial / CTA', 'Portal Venous'],
        defaultValue: 'IV Arterial / CTA',
      },
      {
        key: 'hounsfieldWindow',
        label: 'HU Window Preset',
        options: ['Lung (-600 / 1500 HU)', 'Mediastinal (40 / 400 HU)', 'Abdomen (50 / 350 HU)', 'Bone (500 / 2000 HU)'],
        defaultValue: 'Lung (-600 / 1500 HU)',
      },
    ],
    defaultBodySystems: ['respiratory', 'cardiovascular', 'abdominal', 'neurological', 'musculoskeletal'],
  },
  mri: {
    id: 'mri',
    label: 'MRI Multi-Sequence',
    shortLabel: 'MRI Scan',
    description:
      'Magnetic Resonance Imaging for T1, T2/FLAIR, DWI/ADC ischemia, meningeal enhancement, cardiac viability, and articular soft tissue.',
    compatibleModels: [
      {
        id: 'gemini-4-hydrogen',
        label: 'gemini-4-hydrogen (Neuro & Soft-Tissue Signal Vision)',
        capabilitySummary: 'T1/T2/FLAIR/DWI signal hyperintensity, sulcal symmetry & soft-tissue planes',
        recommendedFor: 'Brain FLAIR/DWI stroke mapping, Spine/MSK cartilage & Cardiac MRI',
      },
    ],
    blockedModels: [
      {
        id: 'gemini-3.1-flash-lite',
        reason: 'Blocked for MRI: Multi-sequence soft-tissue signal interpretation requires Gemini 4 Hydrogen',
      },
      { id: 'gemini-3.8-live', reason: 'Live audio/voice model — not calibrated for MRI signal analysis' },
      { id: 'gemini-embedding-2', reason: 'Vector embedding model — incompatible with MRI imaging' },
    ],
    parameters: [
      {
        key: 'sequence',
        label: 'Pulse Sequence',
        options: ['T2 / FLAIR', 'DWI / ADC', 'T1 Post-Gadolinium', 'STIR Musculoskeletal'],
        defaultValue: 'T2 / FLAIR',
      },
      {
        key: 'fieldStrength',
        label: 'Field Strength',
        options: ['3.0 Tesla', '1.5 Tesla'],
        defaultValue: '3.0 Tesla',
      },
    ],
    defaultBodySystems: ['neurological', 'musculoskeletal', 'cardiovascular', 'abdominal'],
  },
  other: {
    id: 'other',
    label: 'Other Medical Image',
    shortLabel: 'Other Scan',
    description:
      'Additional supported medical imaging captures (DEXA, Angiography still frames, Endoscopy, Dermoscopy, or Bedside Clinical Photos).',
    compatibleModels: [
      {
        id: 'gemini-4-hydrogen',
        label: 'gemini-4-hydrogen (General Clinical Multimodal Vision)',
        capabilitySummary: 'Structured anatomical & clinical pattern observation for general medical images',
        recommendedFor: 'Specialized angiography frames, clinical photography, or general diagnostic captures',
      },
    ],
    blockedModels: [
      { id: 'gemini-3.5-transcribe', reason: 'Audio transcription only — incompatible with visual input' },
      { id: 'gemini-embedding-2', reason: 'Embedding model — cannot generate diagnostic observations' },
    ],
    parameters: [
      {
        key: 'captureType',
        label: 'Capture Source',
        options: ['Angiography Frame', 'Endoscopy / Bronchoscopy', 'DEXA / Nuclear', 'Bedside Clinical Capture'],
        defaultValue: 'Angiography Frame',
      },
      {
        key: 'orientation',
        label: 'View Orientation',
        options: ['Standard / Anterior', 'Oblique', 'Lateral'],
        defaultValue: 'Standard / Anterior',
      },
    ],
    defaultBodySystems: ['cardiovascular', 'respiratory', 'abdominal', 'musculoskeletal', 'neurological'],
  },
};

export const DISEASE_REASONING_MODELS = [
  {
    id: 'gemini-4-hydrogen',
    label: 'gemini-4-hydrogen (Multi-System Clinical Reasoning)',
    description: 'Full multi-system differential synthesis, ICD-10 mapping, and red-flag stratification.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'gemini-3.1-flash-lite (Rapid Triage Screening)',
    description: 'Low-latency initial differential ranking for rapid bedside triage.',
  },
];

export const SAMPLE_MODALITY_STUDIES: SampleModalityStudy[] = [
  {
    id: 'sample-xray-resp',
    modality: 'xray',
    bodySystem: 'respiratory',
    title: 'Portable AP Chest Radiograph — Thoracic Evaluation',
    patientContext: '68F, fever 38.9°C, hypoxemia (SpO2 91% on 4L), WBC 18.6 K/µL, Lactate 4.0 mmol/L.',
    imageUrl: '/src/assets/images/radiology_chest_xray_1794900182262.jpg',
    parameters: { projection: 'AP Portable', windowPreset: 'Lung / Soft Tissue' },
    simulatedReport: {
      primaryPathology: 'Right Basilar Parenchymal Opacity / Suspected Lobar Pneumonia',
      urgency: 'Urgent',
      confidence: 89.4,
      findings: [
        'Asymmetric patchy airspace opacity in the right lower lung zone with partial silhouetting of the medial right hemidiaphragm.',
        'Cardiomediastinal silhouette mildly prominent, typical of AP portable magnification.',
        'No large pneumothorax; left costophrenic sulcus appears sharp.',
      ],
      impression: 'Right basilar airspace disease consistent with acute pneumonia in the setting of sepsis.',
      anatomicalObservations: [
        { structure: 'Right Lung Field', status: 'Abnormal', detail: 'Basilar airspace opacity' },
        { structure: 'Left Lung Field', status: 'Clear', detail: 'Well-aerated without focal consolidation' },
        { structure: 'Pleural Space', status: 'Trace Fluid', detail: 'Blunted right costophrenic angle' },
      ],
      recommendedNextSteps: [
        'Correlate with CT Thorax if parapneumonic effusion drainage is considered',
        'Continue broad-spectrum sepsis antimicrobial coverage and serial SpO2 monitoring',
      ],
      limitations: 'Single portable AP projection limits posterior retrocardiac and small effusion sensitivity.',
    },
  },
  {
    id: 'sample-xray-msk',
    modality: 'xray',
    bodySystem: 'musculoskeletal',
    title: 'Bilateral AP Knee Radiograph — Orthopedic Joint Survey',
    patientContext: '54M, acute right knee pain and joint effusion after twisting fall; evaluating cortical margin & joint space.',
    imageUrl: '/src/assets/images/radiology_msk_xray_1794900610679.jpg',
    parameters: { projection: 'AP Weight-Bearing', windowPreset: 'Osseous / Cortical Bone' },
    simulatedReport: {
      primaryPathology: 'Medial Compartment Joint Space Narrowing & Subchondral Sclerosis',
      urgency: 'Routine',
      confidence: 91.2,
      findings: [
        'Preserved cortical continuity of the distal femoral condyles, patella, and proximal tibial plateau without displaced fracture.',
        'Symmetric mild medial tibiofemoral joint space narrowing with early marginal osteophytosis.',
        'No radiopaque intra-articular loose bodies or acute lytic bone lesions.',
      ],
      impression: 'No acute displaced fracture on AP view; mild-to-moderate medial compartment degenerative arthropathy.',
      anatomicalObservations: [
        { structure: 'Cortical Bone Margins', status: 'Intact', detail: 'No gross cortical step-off' },
        { structure: 'Tibiofemoral Joint Space', status: 'Narrowed', detail: 'Mild medial compartment narrowing' },
        { structure: 'Patellofemoral Alignment', status: 'Normal', detail: 'Centered patellar tracking' },
      ],
      recommendedNextSteps: [
        'Obtain lateral and sunrise views to exclude occult patellar or tibial plateau hairline fracture',
        'Consider MRI knee if clinical suspicion for meniscal or cruciate ligament injury persists',
      ],
      limitations: 'Single AP view cannot exclude non-displaced hairline fracture or soft-tissue ligamentous tears.',
    },
  },
  {
    id: 'sample-us-abd',
    modality: 'ultrasound',
    bodySystem: 'abdominal',
    title: 'RUQ Abdominal Sonogram — Hepatobiliary POCUS',
    patientContext: '45M, acute epigastric/RUQ pain, fever 38.4°C, Total Bilirubin 3.1 mg/dL, Lipase 1,480 U/L.',
    imageUrl: '/src/assets/images/radiology_ultrasound_1794900609828.jpg',
    parameters: {
      transducer: 'Curvilinear 3.5 MHz',
      acousticMode: 'B-Mode Grayscale',
      windowSite: 'RUQ / Hepatobiliary',
    },
    simulatedReport: {
      primaryPathology: 'Distended Gallbladder with Dependent Echogenic Sludge / Biliary Stasis',
      urgency: 'Urgent',
      confidence: 88.6,
      findings: [
        'Anechoic distended gallbladder lumen containing a dependent echogenic layering interface suggestive of biliary sludge.',
        'Hepatic parenchyma demonstrates homogeneous echotexture without focal intrahepatic mass.',
        'No gross free anechoic fluid in Morrison pouch on the visualized sector.',
      ],
      impression: 'Gallbladder distension with layering biliary sludge; evaluate clinically for acute biliary colic vs early cholecystitis.',
      anatomicalObservations: [
        { structure: 'Gallbladder Lumen', status: 'Abnormal', detail: 'Distended with dependent echogenic debris' },
        { structure: 'Hepatic Parenchyma', status: 'Normal', detail: 'Homogeneous mid-level echogenicity' },
        { structure: 'Morrison Pouch', status: 'Negative', detail: 'No free intraperitoneal fluid visualized' },
      ],
      recommendedNextSteps: [
        'Measure gallbladder wall thickness (< 3 mm normal) and common bile duct diameter in long axis',
        'Evaluate for sonographic Murphy sign and correlate with MRCP if bilirubin remains elevated',
      ],
      limitations: 'Single static B-mode frame cannot confirm ductal choledocholithiasis or Doppler wall hyperemia.',
    },
  },
  {
    id: 'sample-ct-thorax',
    modality: 'ct',
    bodySystem: 'cardiovascular',
    title: 'Axial CT Thorax — Mediastinal & Pulmonary Vasculature',
    patientContext: '59M, chest pain, D-Dimer 1,120 ng/mL, Troponin-I 14.82 ng/mL; aortic dissection & central PE evaluation.',
    imageUrl: '/src/assets/images/radiology_chest_ct_1794900181364.jpg',
    parameters: {
      contrastPhase: 'IV Arterial / CTA',
      hounsfieldWindow: 'Mediastinal (40 / 400 HU)',
    },
    simulatedReport: {
      primaryPathology: 'Patent Thoracic Aorta & Main Pulmonary Arteries (No Dissection Flap)',
      urgency: 'Urgent',
      confidence: 92.8,
      findings: [
        'Ascending and descending thoracic aorta demonstrate uniform contrast opacification without an intimal dissection flap.',
        'Main, right, and left pulmonary artery trunks appear patent at this axial slice level.',
        'Pericardial space is clear without hemopericardium.',
      ],
      impression: 'No acute thoracic aortic dissection or central saddle pulmonary embolus on displayed axial slice.',
      anatomicalObservations: [
        { structure: 'Thoracic Aorta', status: 'Patent', detail: 'No intimal flap or intramural hematoma' },
        { structure: 'Pulmonary Trunk', status: 'Patent', detail: 'Uniform luminal contrast opacification' },
        { structure: 'Lung Parenchyma', status: 'Clear', detail: 'Normal vascular branching pattern' },
      ],
      recommendedNextSteps: [
        'Proceed directly with coronary angiography / PCI pathway given Troponin-I 14.82 ng/mL',
        'Review full craniocaudal volumetric stack to exclude subsegmental PE',
      ],
      limitations: 'Single axial slice cannot exclude distal subsegmental emboli or non-aortic myocardial ischemia.',
    },
  },
  {
    id: 'sample-mri-neuro',
    modality: 'mri',
    bodySystem: 'neurological',
    title: 'Axial Brain MRI (T2/FLAIR) — Cerebrovascular Survey',
    patientContext: '74F, right hemiparesis, expressive aphasia (NIHSS 11), paroxysmal AFib, BP 178/94 mmHg.',
    imageUrl: '/src/assets/images/radiology_brain_mri_1794900182558.jpg',
    parameters: { sequence: 'T2 / FLAIR', fieldStrength: '3.0 Tesla' },
    simulatedReport: {
      primaryPathology: 'Left Temporal-Insular Cortical Signal Abnormality (MCA Territory)',
      urgency: 'Critical',
      confidence: 93.5,
      findings: [
        'Subtle asymmetric sulcal/cortical signal alteration in the left temporal-insular region within the left MCA distribution.',
        'Ventricular system is symmetric without midline shift or acute hydrocephalus.',
        'No gross parenchymal mass effect or extra-axial hemorrhage on FLAIR.',
      ],
      impression: 'Left MCA territory cortical signal abnormality compatible with acute/subacute ischemic infarct; no midline shift.',
      anatomicalObservations: [
        { structure: 'Left Temporal-Insular Cortex', status: 'Abnormal', detail: 'Focal asymmetric cortical signal change' },
        { structure: 'Ventricular System', status: 'Normal', detail: 'Symmetric frontal/occipital horns, midline intact' },
        { structure: 'Midline Structures', status: 'Intact', detail: '0 mm midline shift' },
      ],
      recommendedNextSteps: [
        'Correlate directly with DWI/ADC sequences for cytotoxic edema restriction and SWI for microhemorrhage',
        'Maintain post-thrombolysis permissive hypertension ceiling (< 180/105 mmHg)',
      ],
      limitations: 'FLAIR alone requires DWI/ADC and gradient-echo correlation to time infarct onset and exclude petechial blood.',
    },
  },
];

export const SIMULATED_DISEASE_BASELINE: Record<BodySystemId, DiseaseAnalysisEnvelope> = {
  respiratory: {
    provenance: 'simulated_demo',
    modelId: 'Simulated Demo Baseline',
    bodySystem: 'respiratory',
    analyzedAt: 'Baseline Reference',
    result: {
      systemRiskAssessment:
        'Simulated demonstration baseline: Elevated infectious inflammatory markers and hypoxemia point toward bacterial pneumonia vs. acute pulmonary embolism.',
      criticalRedFlags: [
        'SpO2 < 92% with tachypnea (RR >= 24/min) — monitor for impending respiratory fatigue',
        'Lactate >= 4.0 mmol/L — screen for septic shock progression',
      ],
      differentials: [
        {
          condition: 'Severe Community-Acquired Pneumonia with Sepsis',
          icd10: 'J18.9 / R65.20',
          confidence: 91.5,
          supportingEvidence: ['Focal basilar infiltrate', 'Procalcitonin elevation & leukocytosis'],
          contradictingFactors: ['Microbiology cultures pending'],
          recommendedWorkup: 'Blood/sputum cultures, serial ABG, procalcitonin trajectory',
        },
        {
          condition: 'Acute Submassive Pulmonary Embolism',
          icd10: 'I26.99',
          confidence: 44.0,
          supportingEvidence: ['Tachycardia + elevated D-Dimer + hypoxemia'],
          contradictingFactors: ['High fever and lobar consolidation favor primary infection'],
          recommendedWorkup: 'Bedside RV strain echocardiogram; CTA chest if renal clearance permits',
        },
      ],
    },
  },
  cardiovascular: {
    provenance: 'simulated_demo',
    modelId: 'Simulated Demo Baseline',
    bodySystem: 'cardiovascular',
    analyzedAt: 'Baseline Reference',
    result: {
      systemRiskAssessment:
        'Simulated demonstration baseline: Rapidly rising high-sensitivity Troponin-I with anterior ST elevation requires emergent coronary reperfusion.',
      criticalRedFlags: ['Ventricular arrhythmia risk (monitor K+ >= 4.0 mEq/L)', 'Cardiogenic shock progression'],
      differentials: [
        {
          condition: 'Acute Anterior STEMI (LAD Territory)',
          icd10: 'I21.09',
          confidence: 96.4,
          supportingEvidence: ['Troponin-I 14.82 ng/mL', 'Anterior V2–V4 ST elevation'],
          contradictingFactors: ['None — emergent PCI indicated'],
          recommendedWorkup: 'Immediate Cath Lab activation, Heparin infusion, DAPT loading',
        },
      ],
    },
  },
  neurological: {
    provenance: 'simulated_demo',
    modelId: 'Simulated Demo Baseline',
    bodySystem: 'neurological',
    analyzedAt: 'Baseline Reference',
    result: {
      systemRiskAssessment:
        'Simulated demonstration baseline: Focal cortical deficit (NIHSS 11) with paroxysmal AFib strongly suggests cardioembolic left MCA ischemia.',
      criticalRedFlags: ['SBP > 180 mmHg post-thrombolysis increases hemorrhagic transformation risk'],
      differentials: [
        {
          condition: 'Cardioembolic Left MCA Ischemic Stroke',
          icd10: 'I63.412',
          confidence: 94.8,
          supportingEvidence: ['Left temporal-insular FLAIR signal', 'Paroxysmal AFib on telemetry'],
          contradictingFactors: ['None'],
          recommendedWorkup: 'DWI/ADC MRI, TTE with bubble study, strict BP ceiling',
        },
      ],
    },
  },
  musculoskeletal: {
    provenance: 'simulated_demo',
    modelId: 'Simulated Demo Baseline',
    bodySystem: 'musculoskeletal',
    analyzedAt: 'Baseline Reference',
    result: {
      systemRiskAssessment:
        'Simulated demonstration baseline: Acute post-traumatic joint pain without displaced AP cortical fracture warrants multi-view osseous & soft-tissue exclusion.',
      criticalRedFlags: ['Assess for tense hemarthrosis, compartment pressure, or neurovascular compromise'],
      differentials: [
        {
          condition: 'Occult Tibial Plateau / Meniscal-Ligamentous Injury',
          icd10: 'S83.519A',
          confidence: 84.0,
          supportingEvidence: ['Acute trauma + joint effusion + weight-bearing intolerance'],
          contradictingFactors: ['AP radiograph shows intact cortical margins'],
          recommendedWorkup: 'Orthogonal lateral X-ray views + non-contrast Knee MRI',
        },
      ],
    },
  },
  abdominal: {
    provenance: 'simulated_demo',
    modelId: 'Simulated Demo Baseline',
    bodySystem: 'abdominal',
    analyzedAt: 'Baseline Reference',
    result: {
      systemRiskAssessment:
        'Simulated demonstration baseline: Markedly elevated lipase with hyperbilirubinemia and biliary sludge suggests gallstone pancreatitis vs. cholangitis.',
      criticalRedFlags: ['Charcot triad (fever + bilirubin + RUQ pain) warrants urgent biliary decompression evaluation'],
      differentials: [
        {
          condition: 'Acute Gallstone Pancreatitis',
          icd10: 'K85.1',
          confidence: 89.2,
          supportingEvidence: ['Lipase 1,480 U/L', 'Gallbladder sludge + bilirubin 3.1 mg/dL'],
          contradictingFactors: ['CBD stone not yet directly visualized'],
          recommendedWorkup: 'MRCP or formal RUQ Doppler, aggressive LR resuscitation, GI consult',
        },
      ],
    },
  },
};
