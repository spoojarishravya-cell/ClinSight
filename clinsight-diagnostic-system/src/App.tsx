import { useCallback, useEffect, useMemo, useState } from 'react';
import { CLINICIAN_PROFILE, INITIAL_PATIENTS } from './data/clinicalData';
import {
  AcuityLevel,
  AssessmentReviewStatus,
  ClinicalOrder,
  DatasetAnalysisRecord,
  DifferentialStatus,
  DocumentCategory,
  GeneratedReportRecord,
  ImagingModalityId,
  MedicalDocumentRecord,
  PatientRecord,
  PriorityLevel,
  ScreenId,
  UnifiedAssessment,
  UploadedImageRecord,
} from './types/clinical';
import { ClinicalHeader } from './components/ClinicalHeader';
import { ClinicalSidebar } from './components/ClinicalSidebar';
import { DiagnosticWorkbench } from './components/DiagnosticWorkbench';
import { PatientManagementScreen } from './components/PatientManagementScreen';
import { MultimodalAnalysisScreen } from './components/MultimodalAnalysisScreen';
import { MedicalDocumentsScreen } from './components/MedicalDocumentsScreen';
import { ClinicalDatasetScreen } from './components/ClinicalDatasetScreen';
import { AssessmentPriorityScreen } from './components/AssessmentPriorityScreen';
import { TriageCensusScreen } from './components/TriageCensusScreen';
import { LabTelemetryScreen } from './components/LabTelemetryScreen';
import { ProtocolsDosingScreen } from './components/ProtocolsDosingScreen';
import { OrderEntryDrawer } from './components/OrderEntryDrawer';
import { ReportPreviewModal } from './components/ReportPreviewModal';
import { ReportDraft } from './utils/pdfReportGenerator';

interface ServerStatePayload {
  patients: PatientRecord[];
  documents: MedicalDocumentRecord[];
  uploadedImages: UploadedImageRecord[];
  datasets: DatasetAnalysisRecord[];
  assessments: UnifiedAssessment[];
  reports: GeneratedReportRecord[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file bytes.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading selected file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [documents, setDocuments] = useState<MedicalDocumentRecord[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImageRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetAnalysisRecord[]>([]);
  const [assessments, setAssessments] = useState<UnifiedAssessment[]>([]);
  const [reports, setReports] = useState<GeneratedReportRecord[]>([]);
  const [hydrating, setHydrating] = useState<boolean>(true);

  const [selectedPatientId, setSelectedPatientId] = useState<string>(INITIAL_PATIENTS[0].id);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('workbench');
  const [studioInitialModality, setStudioInitialModality] = useState<ImagingModalityId>('xray');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Order Entry Drawer state
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [orderPrefillName, setOrderPrefillName] = useState<string | undefined>(undefined);
  const [orderPrefillType, setOrderPrefillType] = useState<ClinicalOrder['type'] | undefined>(
    undefined
  );

  // Report Preview Modal state
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);

  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = (await res.json()) as ServerStatePayload;
      if (Array.isArray(data.patients) && data.patients.length > 0) {
        setPatients(data.patients);
        setSelectedPatientId((prev) =>
          data.patients.some((p) => p.id === prev) ? prev : data.patients[0].id
        );
      }
      setDocuments(data.documents ?? []);
      setUploadedImages(data.uploadedImages ?? []);
      setDatasets(data.datasets ?? []);
      setAssessments(data.assessments ?? []);
      setReports(data.reports ?? []);
    } catch {
      // Retain in-memory baseline if server unreachable
    } finally {
      setHydrating(false);
    }
  }, []);

  useEffect(() => {
    fetchServerState();
  }, [fetchServerState]);

  const persistPatientPatch = async (patientId: string, patch: Partial<PatientRecord>) => {
    try {
      await fetch(`/api/patients/${encodeURIComponent(patientId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      // Non-blocking sync
    }
  };

  const handleOpenOrderEntry = (prefillName?: string, prefillType?: ClinicalOrder['type']) => {
    setOrderPrefillName(prefillName);
    setOrderPrefillType(prefillType);
    setOrderDrawerOpen(true);
  };

  // ------------------------------------------------------------------
  // EXISTING WORKBENCH / TELEMETRY / CENSUS HANDLERS (PERSISTED)
  // ------------------------------------------------------------------
  const handleConfirmDifferential = (patientId: string, diffId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const differentials = pt.differentials.map((d) =>
          d.id === diffId ? { ...d, status: DifferentialStatus.Confirmed } : d
        );
        persistPatientPatch(patientId, { differentials });
        return { ...pt, differentials };
      })
    );
  };

  const handleDismissDifferential = (patientId: string, diffId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const differentials = pt.differentials.map((d) =>
          d.id === diffId ? { ...d, status: DifferentialStatus.Dismissed } : d
        );
        persistPatientPatch(patientId, { differentials });
        return { ...pt, differentials };
      })
    );
  };

  const handleAcknowledgeAlert = (patientId: string, alertId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const alerts = pt.alerts.map((a) =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        );
        persistPatientPatch(patientId, { alerts });
        return { ...pt, alerts };
      })
    );
  };

  const handleOverrideAlert = (patientId: string, alertId: string, reason: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const alerts = pt.alerts.map((a) =>
          a.id === alertId ? { ...a, acknowledged: true, overriddenReason: reason } : a
        );
        persistPatientPatch(patientId, { alerts });
        return { ...pt, alerts };
      })
    );
  };

  const handleAddClinicalNote = (patientId: string, noteText: string) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const lower = noteText.toLowerCase();

        const updatedDiffs = pt.differentials.map((d) => {
          if (
            (lower.includes('pleuritic') ||
              lower.includes('hemoptysis') ||
              lower.includes('calf') ||
              lower.includes('dvt')) &&
            d.condition.toLowerCase().includes('embolism')
          ) {
            return {
              ...d,
              confidence: Math.min(96.4, Number((d.confidence + 28.5).toFixed(1))),
              supportingEvidence: [...d.supportingEvidence, `Bedside observation: ${noteText}`],
            };
          }
          if (
            (lower.includes('fever') ||
              lower.includes('rigors') ||
              lower.includes('lactate') ||
              lower.includes('hypotens')) &&
            d.condition.toLowerCase().includes('septic')
          ) {
            return {
              ...d,
              confidence: Math.min(98.5, Number((d.confidence + 2.4).toFixed(1))),
              supportingEvidence: [...d.supportingEvidence, `Bedside observation: ${noteText}`],
            };
          }
          return d;
        });

        const sortedDiffs = [...updatedDiffs].sort((a, b) => b.confidence - a.confidence);
        const notes = [
          {
            id: `note-${Date.now()}`,
            timestamp,
            author: CLINICIAN_PROFILE.name,
            role: CLINICIAN_PROFILE.role,
            text: noteText,
          },
          ...pt.notes,
        ];
        const activityLog = [
          {
            id: `act-${Date.now()}`,
            timestamp: now.toISOString(),
            category: 'Note' as const,
            title: 'Clinician Note Recorded',
            detail: noteText.slice(0, 140),
            actor: CLINICIAN_PROFILE.name,
          },
          ...(pt.activityLog ?? []),
        ];

        persistPatientPatch(patientId, {
          differentials: sortedDiffs,
          notes,
          activityLog,
        });

        return {
          ...pt,
          differentials: sortedDiffs,
          notes,
          activityLog,
        };
      })
    );
  };

  const handleToggleOrderStatus = (patientId: string, orderId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const orders = pt.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status:
                  o.status === 'Discontinued'
                    ? ('Active' as const)
                    : ('Discontinued' as const),
              }
            : o
        );
        persistPatientPatch(patientId, { orders });
        return { ...pt, orders };
      })
    );
  };

  const handleSubmitOrder = async (
    patientId: string,
    order: Omit<ClinicalOrder, 'id' | 'orderedBy' | 'orderedAt' | 'status'>
  ) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        ...order,
        orderedBy: CLINICIAN_PROFILE.name,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.patient) {
        setPatients((prev) => prev.map((pt) => (pt.id === patientId ? data.patient : pt)));
        return;
      }
    }
    // Local fallback
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setPatients((prev) =>
      prev.map((pt) =>
        pt.id !== patientId
          ? pt
          : {
              ...pt,
              orders: [
                {
                  ...order,
                  id: `ord-${Date.now()}`,
                  orderedBy: CLINICIAN_PROFILE.name,
                  orderedAt: timestamp,
                  status: 'Active',
                },
                ...pt.orders,
              ],
            }
      )
    );
  };

  const handleRecordVitals = (
    patientId: string,
    vitals: {
      hr: number;
      sbp: number;
      dbp: number;
      spo2: number;
      temp: number;
      rr: number;
      lactate: number;
    }
  ) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const point = { time: timestamp, ...vitals };

    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const nextVitals = {
          '1H': [...pt.vitals['1H'], point],
          '6H': [...pt.vitals['6H'], point],
          '24H': [...pt.vitals['24H'], point],
          '72H': [...pt.vitals['72H'], point],
        };
        persistPatientPatch(patientId, { vitals: nextVitals });
        return { ...pt, vitals: nextVitals };
      })
    );
  };

  const handleVerifyLab = (patientId: string, labId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id !== patientId) return pt;
        const labs = pt.labs.map((l) => (l.id === labId ? { ...l, verified: true } : l));
        persistPatientPatch(patientId, { labs });
        return { ...pt, labs };
      })
    );
  };

  // ------------------------------------------------------------------
  // PATIENT MANAGEMENT, DOCUMENTS, IMAGING, DATASETS & ASSESSMENTS
  // ------------------------------------------------------------------
  const handleRegisterPatient = async (payload: {
    name: string;
    age?: number;
    dob?: string;
    gender: 'F' | 'M' | 'Other';
    contact?: string;
    medicalHistory: string;
    allergies: string[];
    existingConditions: string[];
    acuity: AcuityLevel;
    unit: PatientRecord['unit'];
  }): Promise<PatientRecord> => {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register patient.');
    }
    const created = data as PatientRecord;
    setPatients((prev) => [created, ...prev]);
    setSelectedPatientId(created.id);
    return created;
  };

  const handleAdmitPatientFromCensus = async (newPt: {
    name: string;
    age: number;
    sex: 'F' | 'M';
    weightKg: number;
    egfr: number;
    unit: PatientRecord['unit'];
    bed: string;
    chiefComplaint: string;
    acuity: AcuityLevel;
  }) => {
    try {
      const created = await handleRegisterPatient({
        name: newPt.name,
        age: newPt.age,
        gender: newPt.sex,
        medicalHistory: newPt.chiefComplaint,
        allergies: ['None Verified'],
        existingConditions: [newPt.chiefComplaint],
        acuity: newPt.acuity,
        unit: newPt.unit,
      });
      await persistPatientPatch(created.id, {
        weightKg: newPt.weightKg,
        egfr: newPt.egfr,
        bed: newPt.bed,
      });
      setPatients((prev) =>
        prev.map((p) =>
          p.id === created.id
            ? { ...p, weightKg: newPt.weightKg, egfr: newPt.egfr, bed: newPt.bed }
            : p
        )
      );
      setActiveScreen('workbench');
    } catch {
      // Fallback handled
    }
  };

  const handleUpdatePatientReviewStatus = async (
    patientId: string,
    status: AssessmentReviewStatus
  ) => {
    setPatients((prev) =>
      prev.map((pt) => (pt.id === patientId ? { ...pt, reviewStatus: status } : pt))
    );
    await persistPatientPatch(patientId, { reviewStatus: status });
  };

  const handleUploadPdf = async (
    patientId: string,
    file: File,
    category: DocumentCategory
  ): Promise<MedicalDocumentRecord> => {
    const base64Data = await fileToBase64(file);
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        category,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || 'application/pdf',
        base64Data,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'PDF upload failed.');
    }
    const doc = data.document as MedicalDocumentRecord;
    const assessment = data.assessment as UnifiedAssessment | undefined;
    setDocuments((prev) => [doc, ...prev]);
    if (assessment) {
      setAssessments((prev) => [assessment, ...prev]);
    }
    await fetchServerState();
    return doc;
  };

  const handleVerifyDocument = async (docId: string) => {
    const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedBy: CLINICIAN_PROFILE.name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify document.');
    }
    setDocuments((prev) => prev.map((d) => (d.id === docId ? (data as MedicalDocumentRecord) : d)));
  };

  const handleDeleteDocument = async (docId: string) => {
    const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete document.');
    }
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setAssessments((prev) => prev.filter((a) => a.sourceRefId !== docId));
  };

  const handleImageAnalyzed = async (payload: {
    imageRecord: UploadedImageRecord;
    assessment: UnifiedAssessment;
  }) => {
    setUploadedImages((prev) => [payload.imageRecord, ...prev]);
    setAssessments((prev) => [payload.assessment, ...prev]);
    await fetchServerState();
  };

  const handleSaveDatasetAnalysis = async (record: DatasetAnalysisRecord) => {
    const res = await fetch('/api/datasets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save dataset analysis.');
    }
    setDatasets((prev) => [data.dataset as DatasetAnalysisRecord, ...prev]);
    if (data.assessment) {
      setAssessments((prev) => [data.assessment as UnifiedAssessment, ...prev]);
    }
    await fetchServerState();
  };

  const handleUpdateAssessment = async (
    id: string,
    patch: {
      reviewStatus?: AssessmentReviewStatus;
      priority?: PriorityLevel;
      clinicianNotes?: string;
    }
  ) => {
    const res = await fetch(`/api/assessments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update assessment.');
    }
    setAssessments((prev) => prev.map((a) => (a.id === id ? (data as UnifiedAssessment) : a)));
    await fetchServerState();
  };

  const awaitingReviewCount = useMemo(
    () =>
      assessments.filter(
        (a) => a.reviewStatus === 'Awaiting Review' || a.reviewStatus === 'Awaiting Analysis'
      ).length,
    [assessments]
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#181C1F] flex flex-col">
      <ClinicalHeader
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        onOpenOrderEntry={() => handleOpenOrderEntry()}
        onOpenSidebar={() => setSidebarMobileOpen(true)}
      />

      <div className="flex-1 flex min-w-0">
        <ClinicalSidebar
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          awaitingReviewCount={awaitingReviewCount}
          patientCount={patients.length}
          documentCount={documents.length}
          mobileOpen={sidebarMobileOpen}
          onCloseMobile={() => setSidebarMobileOpen(false)}
        />

        <main className="flex-1 min-w-0">
          {hydrating && patients.length === 0 ? (
            <div className="p-8 text-sm text-[#64748B]">Loading ClinSight Clinical Workspace...</div>
          ) : (
            <>
              {activeScreen === 'workbench' && (
                <DiagnosticWorkbench
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  onConfirmDifferential={handleConfirmDifferential}
                  onDismissDifferential={handleDismissDifferential}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onOverrideAlert={handleOverrideAlert}
                  onAddClinicalNote={handleAddClinicalNote}
                  onToggleOrderStatus={handleToggleOrderStatus}
                  onRecordVitals={handleRecordVitals}
                  onOpenOrderEntry={handleOpenOrderEntry}
                  onOpenMultimodalStudio={(mod) => {
                    if (mod) setStudioInitialModality(mod);
                    setActiveScreen('imaging');
                  }}
                />
              )}

              {activeScreen === 'patients' && (
                <PatientManagementScreen
                  patients={patients}
                  documents={documents}
                  uploadedImages={uploadedImages}
                  datasets={datasets}
                  assessments={assessments}
                  reports={reports}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  onRegisterPatient={handleRegisterPatient}
                  onUpdatePatientReviewStatus={handleUpdatePatientReviewStatus}
                  onAddClinicianNote={handleAddClinicalNote}
                  onOpenOrderEntry={handleOpenOrderEntry}
                  onOpenWorkbench={(id) => {
                    setSelectedPatientId(id);
                    setActiveScreen('workbench');
                  }}
                  onOpenImageStudio={(id, mod) => {
                    setSelectedPatientId(id);
                    if (mod) setStudioInitialModality(mod);
                    setActiveScreen('imaging');
                  }}
                  onUploadPdfForPatient={async (pid, file, cat) => {
                    await handleUploadPdf(pid, file, cat);
                  }}
                  onOpenReportModal={(draft) => setReportDraft(draft)}
                />
              )}

              {activeScreen === 'imaging' && (
                <MultimodalAnalysisScreen
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  onOpenOrderEntry={handleOpenOrderEntry}
                  onAddNoteToChart={handleAddClinicalNote}
                  onImageAnalyzed={handleImageAnalyzed}
                  onDiseaseAnalyzed={() => {
                    fetchServerState();
                  }}
                  initialModality={studioInitialModality}
                />
              )}

              {activeScreen === 'documents' && (
                <MedicalDocumentsScreen
                  patients={patients}
                  documents={documents}
                  selectedPatientId={selectedPatientId}
                  onUploadPdf={handleUploadPdf}
                  onVerifyDocument={handleVerifyDocument}
                  onDeleteDocument={handleDeleteDocument}
                />
              )}

              {activeScreen === 'datasets' && (
                <ClinicalDatasetScreen
                  patients={patients}
                  datasets={datasets}
                  selectedPatientId={selectedPatientId}
                  onSaveDatasetAnalysis={handleSaveDatasetAnalysis}
                />
              )}

              {activeScreen === 'assessments' && (
                <AssessmentPriorityScreen
                  patients={patients}
                  assessments={assessments}
                  documents={documents}
                  uploadedImages={uploadedImages}
                  datasets={datasets}
                  onUpdateAssessment={handleUpdateAssessment}
                  onOpenPatientProfile={(id) => {
                    setSelectedPatientId(id);
                    setActiveScreen('patients');
                  }}
                  onOpenReportModal={(draft) => setReportDraft(draft)}
                />
              )}

              {activeScreen === 'census' && (
                <TriageCensusScreen
                  patients={patients}
                  onOpenPatientChart={(id) => {
                    setSelectedPatientId(id);
                    setActiveScreen('workbench');
                  }}
                  onAdmitPatient={handleAdmitPatientFromCensus}
                />
              )}

              {activeScreen === 'telemetry' && (
                <LabTelemetryScreen
                  patients={patients}
                  onVerifyLab={handleVerifyLab}
                  onOpenPatientChart={(id) => {
                    setSelectedPatientId(id);
                    setActiveScreen('workbench');
                  }}
                />
              )}

              {activeScreen === 'protocols' && (
                <ProtocolsDosingScreen
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={setSelectedPatientId}
                  onApplyOrderFromProtocol={handleSubmitOrder}
                />
              )}
            </>
          )}
        </main>
      </div>

      <OrderEntryDrawer
        open={orderDrawerOpen}
        patients={patients}
        documents={documents}
        uploadedImages={uploadedImages}
        activePatientId={selectedPatientId}
        prefillName={orderPrefillName}
        prefillType={orderPrefillType}
        onClose={() => setOrderDrawerOpen(false)}
        onSubmitOrder={handleSubmitOrder}
        onQuickRegisterPatient={handleRegisterPatient}
        onQuickUploadPdf={handleUploadPdf}
      />

      <ReportPreviewModal
        draft={reportDraft}
        onClose={() => setReportDraft(null)}
        onReportPersisted={(rep) => {
          setReports((prev) => [rep, ...prev]);
          fetchServerState();
        }}
      />
    </div>
  );
}
