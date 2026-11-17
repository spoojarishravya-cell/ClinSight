export enum AcuityLevel {
  Critical = 'Critical',
  Guarded = 'Guarded',
  Stable = 'Stable',
}

export enum LabFlag {
  Critical = 'Critical',
  High = 'High',
  Low = 'Low',
  Normal = 'Normal',
}

export enum DifferentialStatus {
  Confirmed = 'Confirmed',
  Pending = 'Pending Review',
  Dismissed = 'Dismissed',
}

export type ScreenId =
  | 'workbench'
  | 'patients'
  | 'imaging'
  | 'documents'
  | 'datasets'
  | 'assessments'
  | 'census'
  | 'telemetry'
  | 'protocols';

export type WorkbenchTab = 'differential' | 'labs' | 'imaging' | 'orders';
export type TimeframeKey = '1H' | '6H' | '24H' | '72H';

export type ImagingModalityId = 'xray' | 'ultrasound' | 'ct' | 'mri' | 'other';
export type BodySystemId =
  | 'respiratory'
  | 'cardiovascular'
  | 'neurological'
  | 'musculoskeletal'
  | 'abdominal';
export type AnalysisProvenance = 'functional_ai' | 'simulated_demo';

export type DocumentCategory =
  | 'Blood Test Report'
  | 'CBC Report'
  | 'Laboratory Report'
  | 'Medical Examination Report'
  | 'Discharge Summary'
  | 'Prescription'
  | 'Referral Letter'
  | 'Previous Medical Record'
  | 'Other Clinical Document';

export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type AssessmentReviewStatus =
  | 'Awaiting Analysis'
  | 'Awaiting Review'
  | 'In Review'
  | 'Reviewed'
  | 'Requires Follow-up';

export interface ModalityModelSpec {
  id: string;
  label: string;
  capabilitySummary: string;
  recommendedFor: string;
}

export interface ModalityConfig {
  id: ImagingModalityId;
  label: string;
  shortLabel: string;
  description: string;
  compatibleModels: ModalityModelSpec[];
  blockedModels: { id: string; reason: string }[];
  parameters: {
    key: string;
    label: string;
    options: string[];
    defaultValue: string;
  }[];
  defaultBodySystems: BodySystemId[];
}

export interface SampleModalityStudy {
  id: string;
  modality: ImagingModalityId;
  bodySystem: BodySystemId;
  title: string;
  patientContext: string;
  imageUrl: string;
  parameters: Record<string, string>;
  simulatedReport: ImagingAnalysisOutput;
}

export interface ImagingAnalysisOutput {
  primaryPathology: string;
  urgency: 'Critical' | 'Urgent' | 'Routine';
  confidence: number;
  findings: string[];
  impression: string;
  anatomicalObservations: {
    structure: string;
    status: string;
    detail: string;
  }[];
  recommendedNextSteps: string[];
  limitations: string;
}

export interface ImagingAnalysisEnvelope {
  provenance: AnalysisProvenance;
  modelId: string;
  modality: ImagingModalityId;
  bodySystem: BodySystemId;
  analyzedAt: string;
  latencyMs?: number;
  result: ImagingAnalysisOutput;
}

export interface MultiSystemDiseaseOutput {
  systemRiskAssessment: string;
  criticalRedFlags: string[];
  differentials: {
    condition: string;
    icd10: string;
    confidence: number;
    supportingEvidence: string[];
    contradictingFactors: string[];
    recommendedWorkup: string;
  }[];
}

export interface DiseaseAnalysisEnvelope {
  provenance: AnalysisProvenance;
  modelId: string;
  bodySystem: BodySystemId;
  analyzedAt: string;
  latencyMs?: number;
  result: MultiSystemDiseaseOutput;
}

export interface VitalPoint {
  time: string;
  hr: number;
  sbp: number;
  dbp: number;
  spo2: number;
  temp: number;
  rr: number;
  lactate: number;
}

export interface LabResult {
  id: string;
  analyte: string;
  category: 'BMP' | 'CBC' | 'Cardiac' | 'Hepatic/Sepsis' | 'Coag/ABG';
  value: number;
  unit: string;
  refRange: string;
  delta: string;
  flag: LabFlag;
  collectedAt: string;
  verified: boolean;
  history: { time: string; value: number }[];
}

export interface ImagingStudy {
  id: string;
  modality: 'Chest CT' | 'Chest X-Ray' | 'Brain MRI' | '12-Lead ECG';
  title: string;
  performedAt: string;
  radiologist: string;
  imageUrl?: string;
  ecgPattern?: 'sinus_tach' | 'stemi_ant' | 'afib_rvr' | 'normal_sinus';
  findings: string[];
  impression: string;
  status: 'Finalized' | 'Preliminary' | 'Stat Read';
}

export interface DifferentialItem {
  id: string;
  condition: string;
  icd10: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingFactors: string[];
  status: DifferentialStatus;
  recommendedWorkup: string;
}

export interface SafetyAlert {
  id: string;
  severity: 'Critical' | 'Warning';
  title: string;
  detail: string;
  triggeredAt: string;
  acknowledged: boolean;
  overriddenReason?: string;
}

export interface ClinicalOrder {
  id: string;
  patientId?: string;
  type: 'Medication' | 'Infusion' | 'Lab Panel' | 'Imaging';
  name: string;
  doseOrSpec: string;
  routeOrPriority: string;
  frequency: string;
  orderedBy: string;
  orderedAt: string;
  status: 'Active' | 'Pending' | 'Completed' | 'Discontinued';
  attachedDocumentIds?: string[];
  attachedImageIds?: string[];
}

export interface ClinicalNote {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  text: string;
}

export interface PredictiveRisk {
  label: string;
  horizon: string;
  probability: number;
  driver: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  category: 'Registration' | 'Order' | 'Image' | 'Document' | 'Dataset' | 'Assessment' | 'Note' | 'Vitals';
  title: string;
  detail: string;
  actor: string;
}

export interface PatientRecord {
  id: string;
  patientCode?: string;
  mrn: string;
  name: string;
  age: number;
  dob?: string;
  sex: 'F' | 'M' | 'Other';
  contact?: string;
  weightKg: number;
  heightCm: number;
  egfr: number;
  unit: 'MICU' | 'CCU' | 'NICU' | 'ED Trauma' | 'Outpatient / General';
  bed: string;
  attending: string;
  admittedAt: string;
  registeredAt?: string;
  chiefComplaint: string;
  medicalHistory?: string;
  existingConditions?: string[];
  allergies: string[];
  acuity: AcuityLevel;
  reviewStatus?: AssessmentReviewStatus;
  vitals: Record<TimeframeKey, VitalPoint[]>;
  labs: LabResult[];
  imaging: ImagingStudy[];
  differentials: DifferentialItem[];
  alerts: SafetyAlert[];
  orders: ClinicalOrder[];
  notes: ClinicalNote[];
  risks: PredictiveRisk[];
  activityLog?: ActivityEvent[];
}

export interface ExtractedLabItem {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'High' | 'Low' | 'Critical' | 'Normal' | 'Unknown';
  outsideReference: boolean;
  pageNumber?: number;
}

export interface ExtractedDocumentFacts {
  patientDetailsInDoc: string;
  examinationDate: string;
  extractedLabs: ExtractedLabItem[];
  clinicalObservations: string[];
  relevantMedicalHistory: string[];
  medicationsMentioned: string[];
}

export interface AiDocumentSummary {
  summary: string;
  importantObservations: string[];
  abnormalHighlights: string[];
  extractedMedicalInsights: string[];
  missingOrUnreadableInfo: string[];
  pageReferences: string[];
}

export interface MedicalDocumentRecord {
  id: string;
  patientId: string;
  patientName?: string;
  category: DocumentCategory;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  fileUrl: string;
  extractionMethod: 'digital_pdf' | 'scanned_ocr_gemini' | 'raw_text_only';
  pageCount: number;
  rawTextByPage: { page: number; text: string }[];
  extractedFacts: ExtractedDocumentFacts | null;
  aiSummary: AiDocumentSummary | null;
  provenance: AnalysisProvenance | 'raw_extraction_only';
  modelUsed?: string;
  extractionVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  extractionError?: string;
}

export interface UploadedImageRecord {
  id: string;
  patientId: string;
  modality: ImagingModalityId;
  bodySystem: BodySystemId;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  dimensions?: string;
  uploadedAt: string;
  fileUrl: string;
  parameters?: Record<string, string>;
  clinicalContext?: string;
  modelUsed: string;
  provenance: AnalysisProvenance;
  latencyMs?: number;
  analysisResult: ImagingAnalysisOutput;
  priority: PriorityLevel;
  reviewStatus: AssessmentReviewStatus;
}

export interface DatasetFeatureSummary {
  name: string;
  type: 'numeric' | 'categorical';
  missingCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  topValue?: string;
}

export interface DatasetAnalysisRecord {
  id: string;
  patientId?: string;
  fileName: string;
  analyzedAt: string;
  recordCount: number;
  featureCount: number;
  missingValuesTotal: number;
  duplicateRecords: number;
  targetColumn?: string;
  modelType: 'Logistic Regression' | 'Random Forest' | 'Descriptive Only';
  metrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: { tp: number; fp: number; tn: number; fn: number };
  };
  featureSummaries: DatasetFeatureSummary[];
  correlations: { featureA: string; featureB: string; r: number }[];
  clinicalRiskIndicators: string[];
}

export interface UnifiedAssessment {
  id: string;
  patientId: string;
  analysisType: 'Medical Imaging' | 'PDF Document' | 'Clinical Dataset' | 'Multi-System AI';
  modalityOrCategory: string;
  potentialFindings: string;
  confidence: number;
  priority: PriorityLevel;
  analyzedAt: string;
  reviewStatus: AssessmentReviewStatus;
  clinicianNotes: string;
  sourceRefId?: string;
  provenance: AnalysisProvenance | 'statistical_ml';
  modelUsed?: string;
}

export interface GeneratedReportRecord {
  id: string;
  patientId: string;
  assessmentId?: string;
  title: string;
  analysisType: string;
  generatedAt: string;
  generatedBy: string;
  priority: PriorityLevel;
  reviewStatus: AssessmentReviewStatus;
  fileName: string;
}

export interface DrugFormularyItem {
  id: string;
  name: string;
  category: string;
  standardConcentration: string;
  concentrationValue: number; // e.g., mcg/mL or units/mL or mg/dose
  unitLabel: string;
  rateUnit: string;
  minDose: number;
  maxDose: number;
  defaultDose: number;
  step: number;
  renalThresholdEgfr: number;
  renalWarning: string;
  isWeightBased: boolean;
}
