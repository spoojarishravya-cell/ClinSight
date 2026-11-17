import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Download,
  FileText,
  HeartPulse,
  Plus,
  Scan,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  AcuityLevel,
  AssessmentReviewStatus,
  ClinicalOrder,
  DatasetAnalysisRecord,
  DocumentCategory,
  GeneratedReportRecord,
  ImagingModalityId,
  MedicalDocumentRecord,
  PatientRecord,
  UnifiedAssessment,
  UploadedImageRecord,
} from '../types/clinical';
import { AcuityTag } from './StatusTag';
import { ReportDraft } from '../utils/pdfReportGenerator';

interface PatientManagementScreenProps {
  patients: PatientRecord[];
  documents: MedicalDocumentRecord[];
  uploadedImages: UploadedImageRecord[];
  datasets: DatasetAnalysisRecord[];
  assessments: UnifiedAssessment[];
  reports: GeneratedReportRecord[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  onRegisterPatient: (payload: {
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
  }) => Promise<PatientRecord>;
  onUpdatePatientReviewStatus: (patientId: string, status: AssessmentReviewStatus) => Promise<void>;
  onAddClinicianNote: (patientId: string, note: string) => void;
  onOpenOrderEntry: (prefillName?: string, prefillType?: ClinicalOrder['type']) => void;
  onOpenWorkbench: (patientId: string) => void;
  onOpenImageStudio: (patientId: string, modality?: ImagingModalityId) => void;
  onUploadPdfForPatient: (
    patientId: string,
    file: File,
    category: DocumentCategory
  ) => Promise<void>;
  onOpenReportModal: (draft: ReportDraft) => void;
}

type ProfileTab = 'overview' | 'orders' | 'images' | 'documents' | 'assessments';

export const PatientManagementScreen: React.FC<PatientManagementScreenProps> = ({
  patients,
  documents,
  uploadedImages,
  datasets,
  assessments,
  reports,
  selectedPatientId,
  onSelectPatient,
  onRegisterPatient,
  onUpdatePatientReviewStatus,
  onAddClinicianNote,
  onOpenOrderEntry,
  onOpenWorkbench,
  onOpenImageStudio,
  onUploadPdfForPatient,
  onOpenReportModal,
}) => {
  const [viewMode, setViewMode] = useState<'directory' | 'profile'>('directory');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AssessmentReviewStatus>('All');
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');

  // Registration modal state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'F' | 'M' | 'Other'>('F');
  const [regContact, setRegContact] = useState('');
  const [regHistory, setRegHistory] = useState('');
  const [regAllergies, setRegAllergies] = useState('');
  const [regConditions, setRegConditions] = useState('');
  const [regUnit, setRegUnit] = useState<PatientRecord['unit']>('Outpatient / General');
  const [regAcuity, setRegAcuity] = useState<AcuityLevel>(AcuityLevel.Guarded);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Profile note & direct PDF upload state
  const [noteText, setNoteText] = useState('');
  const [pdfCategory, setPdfCategory] = useState<DocumentCategory>('Laboratory Report');
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadMsg, setPdfUploadMsg] = useState<string | null>(null);

  const patient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId]
  );

  const dashboardKpis = useMemo(() => {
    const total = patients.length;
    const recent = patients.filter(
      (p) =>
        p.registeredAt?.startsWith(new Date().toISOString().slice(0, 10)) ||
        p.admittedAt.includes('Today')
    ).length;
    const awaitingAnalysis = patients.filter(
      (p) => p.reviewStatus === 'Awaiting Analysis'
    ).length;
    const awaitingReview = patients.filter(
      (p) => p.reviewStatus === 'Awaiting Review' || p.reviewStatus === 'In Review'
    ).length;
    return { total, recent, awaitingAnalysis, awaitingReview };
  }, [patients]);

  const filteredDirectory = useMemo(() => {
    return patients.filter((pt) => {
      const statusOk = statusFilter === 'All' || pt.reviewStatus === statusFilter;
      const q = search.trim().toLowerCase();
      const qOk =
        !q ||
        pt.name.toLowerCase().includes(q) ||
        (pt.patientCode ?? '').toLowerCase().includes(q) ||
        pt.mrn.toLowerCase().includes(q) ||
        (pt.existingConditions ?? []).some((c) => c.toLowerCase().includes(q));
      return statusOk && qOk;
    });
  }, [patients, statusFilter, search]);

  const patientDocs = useMemo(
    () => documents.filter((d) => d.patientId === patient.id),
    [documents, patient.id]
  );
  const patientImages = useMemo(
    () => uploadedImages.filter((i) => i.patientId === patient.id),
    [uploadedImages, patient.id]
  );
  const patientDatasets = useMemo(
    () => datasets.filter((d) => d.patientId === patient.id),
    [datasets, patient.id]
  );
  const patientAssessments = useMemo(
    () => assessments.filter((a) => a.patientId === patient.id),
    [assessments, patient.id]
  );
  const patientReports = useMemo(
    () => reports.filter((r) => r.patientId === patient.id),
    [reports, patient.id]
  );

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (!regName.trim()) {
      setRegError('Full name is required.');
      return;
    }
    if (!regAge && !regDob) {
      setRegError('Please provide either patient age or date of birth.');
      return;
    }
    setRegSubmitting(true);
    try {
      const created = await onRegisterPatient({
        name: regName.trim(),
        age: regAge ? Number(regAge) : undefined,
        dob: regDob || undefined,
        gender: regGender,
        contact: regContact.trim() || undefined,
        medicalHistory: regHistory.trim() || 'No prior inpatient history documented.',
        allergies: regAllergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        existingConditions: regConditions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        acuity: regAcuity,
        unit: regUnit,
      });
      onSelectPatient(created.id);
      setRegisterOpen(false);
      setRegName('');
      setRegAge('');
      setRegDob('');
      setRegContact('');
      setRegHistory('');
      setRegAllergies('');
      setRegConditions('');
      setViewMode('profile');
      setProfileTab('overview');
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Failed to register patient.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleDirectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploading(true);
    setPdfUploadMsg(null);
    try {
      await onUploadPdfForPatient(patient.id, file, pdfCategory);
      setPdfUploadMsg(`Uploaded & processed "${file.name}" for ${patient.name}.`);
    } catch (err: unknown) {
      setPdfUploadMsg(err instanceof Error ? err.message : 'Failed to upload PDF.');
    } finally {
      setPdfUploading(false);
      e.target.value = '';
    }
  };

  const handleOpenProfileReport = () => {
    const latestAsm: UnifiedAssessment = patientAssessments[0] ?? {
      id: `asm-prof-${patient.id}`,
      patientId: patient.id,
      analysisType: 'Multi-System AI',
      modalityOrCategory: 'Comprehensive Patient Profile',
      potentialFindings:
        patient.differentials[0]?.condition ?? patient.chiefComplaint,
      confidence: patient.differentials[0]?.confidence ?? 85,
      priority:
        patient.acuity === AcuityLevel.Critical
          ? 'High'
          : patient.acuity === AcuityLevel.Guarded
          ? 'Medium'
          : 'Low',
      analyzedAt: new Date().toISOString(),
      reviewStatus: patient.reviewStatus ?? 'Awaiting Review',
      clinicianNotes: patient.notes[0]?.text ?? '',
      provenance: 'simulated_demo',
    };

    const extractedFacts = [
      ...patient.labs.slice(0, 5).map((l) => `${l.analyte}: ${l.value} ${l.unit} (Ref ${l.refRange}, ${l.flag})`),
      ...patientDocs
        .flatMap((d) => d.extractedFacts?.extractedLabs ?? [])
        .slice(0, 5)
        .map((l) => `${l.testName}: ${l.value} ${l.unit} (Ref ${l.referenceRange})`),
    ];
    const aiObservations = [
      ...patientImages.map((im) => `[${im.modality.toUpperCase()}] ${im.analysisResult.impression}`),
      ...patientDocs
        .filter((d) => d.aiSummary?.summary)
        .map((d) => `[PDF: ${d.fileName}] ${d.aiSummary?.summary}`),
    ];

    onOpenReportModal({
      patient,
      assessment: latestAsm,
      sourceDetails: `${patientDocs.length} PDF document(s), ${patientImages.length} medical image(s), ${patient.orders.length} order(s)`,
      extractedFindings: extractedFacts,
      aiObservations,
      clinicianNotes: patient.notes.map((n) => `[${n.timestamp}] ${n.text}`).join('\n'),
      generatedBy: 'Dr. Aris Thorne, MD, FCCM',
    });
  };

  // ==================================================================
  // DIRECTORY & DASHBOARD VIEW
  // ==================================================================
  if (viewMode === 'directory') {
    return (
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
              Patient Management System
            </h1>
            <p className="text-sm text-[#44474D]">
              Persistent patient registry, longitudinal medical profiles, and diagnostic intake
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] text-[#071D35] text-xs font-bold transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Patient</span>
          </button>
        </div>

        {/* 4 Dashboard KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Registered Patients',
              value: dashboardKpis.total,
              sub: 'Persisted in ClinSight registry',
              tone: 'text-[#071D35]',
            },
            {
              label: 'Recently Registered',
              value: dashboardKpis.recent,
              sub: 'New intake / admitted today',
              tone: 'text-[#006A67]',
            },
            {
              label: 'Awaiting Analysis',
              value: dashboardKpis.awaitingAnalysis,
              sub: 'Pending imaging or PDF intelligence',
              tone: 'text-[#4D5F7B]',
            },
            {
              label: 'Awaiting Clinician Review',
              value: dashboardKpis.awaitingReview,
              sub: 'Requires physician verification',
              tone: 'text-[#B45309]',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="clinical-card p-4 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {kpi.label}
              </p>
              <p className={`text-3xl font-bold font-mono tabular-nums ${kpi.tone}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-[#64748B]">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter Directory Bar */}
        <div className="clinical-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
            {(
              [
                'All',
                'Awaiting Analysis',
                'Awaiting Review',
                'In Review',
                'Reviewed',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                    : 'text-[#64748B] hover:text-[#071D35]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Patient ID, name, MRN, condition..."
              className="clinical-input w-full pl-8 pr-3 py-1.5 text-xs text-[#071D35]"
            />
          </div>
        </div>

        {/* Searchable Patient Directory Table */}
        <div className="clinical-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#44474D]">
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Demographics</th>
                  <th className="py-3 px-4">Conditions & Allergies</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filteredDirectory.map((pt, idx) => {
                  const docCnt = documents.filter((d) => d.patientId === pt.id).length;
                  const imgCnt =
                    pt.imaging.length +
                    uploadedImages.filter((i) => i.patientId === pt.id).length;
                  return (
                    <tr
                      key={pt.id}
                      onClick={() => {
                        onSelectPatient(pt.id);
                        setViewMode('profile');
                        setProfileTab('overview');
                      }}
                      className={`cursor-pointer transition-colors ${
                        idx % 2 === 1
                          ? 'bg-[#F4F7FB]/50 hover:bg-[#19B6B2]/8'
                          : 'bg-white hover:bg-[#19B6B2]/8'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#071D35] whitespace-nowrap">
                        {pt.patientCode ?? pt.mrn}
                        <span className="block text-[11px] font-normal text-[#64748B]">
                          {pt.mrn}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#071D35]">{pt.name}</p>
                        <p className="text-[11px] text-[#64748B]">
                          {pt.unit} · {pt.bed}
                        </p>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-[#44474D]">
                        {pt.age}y · {pt.sex}
                        <span className="block text-[11px] text-[#64748B]">
                          Reg: {(pt.registeredAt ?? pt.admittedAt).slice(0, 10)}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[260px]">
                        <p className="text-[#071D35] font-medium truncate">
                          {(pt.existingConditions ?? [pt.chiefComplaint]).join(', ')}
                        </p>
                        <p className="text-[11px] text-[#DC2626] truncate">
                          Allergies: {pt.allergies.join(', ')}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[#44474D]">
                        {imgCnt} img · {docCnt} PDF · {pt.orders.length} ord
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            pt.reviewStatus === 'Reviewed'
                              ? 'bg-[#0D9488]/10 text-[#0D9488]'
                              : pt.reviewStatus === 'Awaiting Review'
                              ? 'bg-[#F59E0B]/15 text-[#B45309]'
                              : 'bg-[#4D5F7B]/10 text-[#354862]'
                          }`}
                        >
                          {pt.reviewStatus ?? 'Awaiting Review'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(pt.id);
                            setViewMode('profile');
                            setProfileTab('overview');
                          }}
                          className="px-3 py-1.5 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold"
                        >
                          Open Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New Patient Registration Modal */}
        {registerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D35]/45 backdrop-blur-sm">
            <form
              onSubmit={handleRegisterSubmit}
              className="clinical-overlay w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-base font-display font-bold text-[#071D35]">
                    Register New Patient
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Unique Patient ID (CS-2026-XXXX) and timestamp are automatically assigned on save
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="p-1.5 rounded border border-[#E2E8F0] text-[#44474D]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="sm:col-span-2 block space-y-1">
                  <span className="font-semibold text-[#071D35]">
                    Full Name <span className="text-[#DC2626]">*</span>
                  </span>
                  <input
                    required
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g., Maya Patel"
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-[#071D35]">Age (years)</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    placeholder="e.g., 52"
                    className="clinical-input w-full px-3 py-2 text-sm font-mono tabular-nums text-[#071D35]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-[#071D35]">Date of Birth</span>
                  <input
                    type="date"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className="clinical-input w-full px-3 py-2 text-sm font-mono text-[#071D35]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-[#071D35]">Gender</span>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as 'F' | 'M' | 'Other')}
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-[#071D35]">
                    Contact Information (Optional)
                  </span>
                  <input
                    type="text"
                    value={regContact}
                    onChange={(e) => setRegContact(e.target.value)}
                    placeholder="Phone or email (synthetic demo)"
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-[#071D35]">Care Unit</span>
                  <select
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value as PatientRecord['unit'])}
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  >
                    <option value="Outpatient / General">Outpatient / General</option>
                    <option value="MICU">MICU</option>
                    <option value="CCU">CCU</option>
                    <option value="NICU">NICU</option>
                    <option value="ED Trauma">ED Trauma</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-[#071D35]">Initial Acuity</span>
                  <select
                    value={regAcuity}
                    onChange={(e) => setRegAcuity(e.target.value as AcuityLevel)}
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  >
                    <option value={AcuityLevel.Guarded}>Guarded</option>
                    <option value={AcuityLevel.Critical}>Critical</option>
                    <option value={AcuityLevel.Stable}>Stable</option>
                  </select>
                </label>

                <label className="sm:col-span-2 block space-y-1">
                  <span className="font-semibold text-[#071D35]">
                    Known Allergies (comma-separated)
                  </span>
                  <input
                    type="text"
                    value={regAllergies}
                    onChange={(e) => setRegAllergies(e.target.value)}
                    placeholder="e.g., Penicillin (Rash), Sulfa Drugs"
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  />
                </label>

                <label className="sm:col-span-2 block space-y-1">
                  <span className="font-semibold text-[#071D35]">
                    Existing Medical Conditions (comma-separated)
                  </span>
                  <input
                    type="text"
                    value={regConditions}
                    onChange={(e) => setRegConditions(e.target.value)}
                    placeholder="e.g., Hypertension, Type 2 Diabetes, Chronic Kidney Disease"
                    className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                  />
                </label>

                <label className="sm:col-span-2 block space-y-1">
                  <span className="font-semibold text-[#071D35]">Medical History</span>
                  <textarea
                    rows={3}
                    value={regHistory}
                    onChange={(e) => setRegHistory(e.target.value)}
                    placeholder="Relevant surgical, family, and prior diagnostic history..."
                    className="clinical-input w-full p-2.5 text-sm text-[#071D35] resize-none"
                  />
                </label>
              </div>

              {regError && (
                <p className="text-xs font-semibold text-[#DC2626]">{regError}</p>
              )}

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="px-4 py-2 rounded border border-[#E2E8F0] text-xs font-semibold text-[#071D35]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {regSubmitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==================================================================
  // INDIVIDUAL PATIENT PROFILE VIEW
  // ==================================================================
  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setViewMode('directory')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patient Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenWorkbench(patient.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
          >
            <HeartPulse className="w-3.5 h-3.5 text-[#19B6B2]" />
            <span>Open Workbench</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenImageStudio(patient.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
          >
            <Scan className="w-3.5 h-3.5 text-[#19B6B2]" />
            <span>Upload Medical Image</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenOrderEntry()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-[#55DDE0]" />
            <span>New Clinical Order</span>
          </button>
          <button
            type="button"
            onClick={handleOpenProfileReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] text-[#071D35] text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate PDF Report</span>
          </button>
        </div>
      </div>

      {/* Patient Profile Header Card */}
      <div className="clinical-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-display font-bold text-[#071D35]">
                {patient.name}
              </h1>
              <span className="font-mono text-xs font-semibold text-[#006A67]">
                {patient.patientCode ?? patient.mrn}
              </span>
              <AcuityTag acuity={patient.acuity} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#44474D] tabular-nums">
              <span>MRN {patient.mrn}</span>
              <span aria-hidden="true">·</span>
              <span>
                {patient.age}y {patient.sex}
                {patient.dob ? ` (DOB ${patient.dob})` : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {patient.unit} · {patient.bed}
              </span>
              {patient.contact && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Contact: {patient.contact}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>Registered: {(patient.registeredAt ?? patient.admittedAt).slice(0, 10)}</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#44474D]">Review Status:</span>
            <select
              value={patient.reviewStatus ?? 'Awaiting Review'}
              onChange={(e) =>
                onUpdatePatientReviewStatus(
                  patient.id,
                  e.target.value as AssessmentReviewStatus
                )
              }
              className="clinical-input px-3 py-1.5 text-xs font-semibold text-[#071D35]"
            >
              <option value="Awaiting Analysis">Awaiting Analysis</option>
              <option value="Awaiting Review">Awaiting Review</option>
              <option value="In Review">In Review</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Requires Follow-up">Requires Follow-up</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#E2E8F0] text-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Known Allergies
            </p>
            <p className="mt-0.5 font-semibold text-[#DC2626]">
              {patient.allergies.join(', ')}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Existing Conditions
            </p>
            <p className="mt-0.5 font-medium text-[#071D35]">
              {(patient.existingConditions ?? [patient.chiefComplaint]).join(', ')}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Medical History
            </p>
            <p className="mt-0.5 text-[#44474D]">
              {patient.medicalHistory ?? patient.chiefComplaint}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Sub-Tabs */}
      <div className="clinical-card overflow-hidden">
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#E2E8F0] overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Timeline & Clinician Notes' },
              { id: 'orders', label: `Clinical Orders (${patient.orders.length})` },
              { id: 'images', label: `Medical Images (${patientImages.length + patient.imaging.length})` },
              { id: 'documents', label: `PDF Documents (${patientDocs.length})` },
              {
                id: 'assessments',
                label: `Assessments & Datasets (${patientAssessments.length + patientDatasets.length})`,
              },
            ] as { id: ProfileTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProfileTab(t.id)}
              className={`relative px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                profileTab === t.id ? 'text-[#071D35]' : 'text-[#64748B] hover:text-[#071D35]'
              }`}
            >
              {t.label}
              {profileTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#19B6B2]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* PROFILE TAB 1: TIMELINE & NOTES */}
          {profileTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 space-y-3">
                <h2 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#19B6B2]" />
                  <span>Chronological Activity & Assessment Record</span>
                </h2>
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded">
                  {(patient.activityLog ?? []).length === 0 ? (
                    <p className="p-4 text-xs text-[#64748B]">No recorded activities yet.</p>
                  ) : (
                    (patient.activityLog ?? []).map((ev) => (
                      <div key={ev.id} className="p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#071D35]">
                            [{ev.category}] {ev.title}
                          </span>
                          <span className="font-mono text-[11px] text-[#64748B]">
                            {ev.timestamp.slice(0, 16).replace('T', ' ')}
                          </span>
                        </div>
                        <p className="text-[#44474D]">{ev.detail}</p>
                        <p className="text-[11px] text-[#64748B]">Actor: {ev.actor}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-[#071D35]">Clinician Notes</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!noteText.trim()) return;
                      onAddClinicianNote(patient.id, noteText.trim());
                      setNoteText('');
                    }}
                    className="space-y-2"
                  >
                    <textarea
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add clinical observation, verification comment, or plan update..."
                      className="clinical-input w-full p-2.5 text-xs text-[#071D35] resize-none"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded bg-[#071D35] text-white text-xs font-semibold hover:bg-[#0B2A4A]"
                    >
                      Save Clinician Note
                    </button>
                  </form>
                </div>

                <div className="space-y-2">
                  {patient.notes.map((n) => (
                    <div key={n.id} className="p-3 rounded border border-[#E2E8F0] bg-[#F4F7FB]/50 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span className="font-semibold text-[#071D35]">{n.author}</span>
                        <span className="font-mono">{n.timestamp}</span>
                      </div>
                      <p className="text-[#44474D]">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROFILE TAB 2: CLINICAL ORDERS */}
          {profileTab === 'orders' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#071D35]">
                  Clinical Orders Linked to {patient.patientCode ?? patient.mrn}
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenOrderEntry()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#071D35] text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 text-[#55DDE0]" />
                  <span>Place Order</span>
                </button>
              </div>
              {patient.orders.length === 0 ? (
                <p className="text-xs text-[#64748B] py-4">No orders placed for this patient yet.</p>
              ) : (
                <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase text-[#44474D]">
                        <th className="py-2.5 px-3">Order</th>
                        <th className="py-2.5 px-3">Spec / Dose</th>
                        <th className="py-2.5 px-3">Priority / Route</th>
                        <th className="py-2.5 px-3">Attachments</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {patient.orders.map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-2.5 px-3 font-medium text-[#071D35]">
                            {ord.name}
                            <span className="block text-[11px] text-[#64748B]">{ord.type}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{ord.doseOrSpec}</td>
                          <td className="py-2.5 px-3">
                            {ord.routeOrPriority} · {ord.frequency}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#44474D]">
                            {(ord.attachedImageIds?.length ?? 0)} img ·{' '}
                            {(ord.attachedDocumentIds?.length ?? 0)} PDF
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#0D9488]">
                            {ord.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB 3: UPLOADED MEDICAL IMAGES */}
          {profileTab === 'images' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#071D35]">
                  Uploaded & Chart Medical Images
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenImageStudio(patient.id)}
                  className="px-3 py-1.5 rounded bg-[#19B6B2] text-[#071D35] text-xs font-semibold"
                >
                  Upload & Analyze New Image
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientImages.map((img) => (
                  <div key={img.id} className="p-4 rounded border border-[#E2E8F0] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#071D35]">
                        {img.modality.toUpperCase()} · {img.fileName}
                      </span>
                      <span className="font-mono text-[11px] text-[#006A67]">
                        {img.modelUsed} · {img.priority} Priority
                      </span>
                    </div>
                    <img
                      src={img.fileUrl}
                      alt={img.fileName}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-contain bg-black rounded"
                    />
                    <p className="text-xs font-medium text-[#071D35]">
                      {img.analysisResult.impression}
                    </p>
                  </div>
                ))}
                {patient.imaging
                  .filter((st) => st.imageUrl)
                  .map((st) => (
                    <div key={st.id} className="p-4 rounded border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#071D35]">
                          {st.modality} · {st.title}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Baseline Chart Study</span>
                      </div>
                      <img
                        src={st.imageUrl}
                        alt={st.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-44 object-contain bg-black rounded"
                      />
                      <p className="text-xs text-[#44474D]">{st.impression}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* PROFILE TAB 4: UPLOADED PDF DOCUMENTS */}
          {profileTab === 'documents' && (
            <div className="space-y-4">
              <div className="p-4 rounded border border-dashed border-[#19B6B2] bg-[#F4F7FB] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#071D35]">
                    Upload PDF Document Directly to {patient.name}&apos;s Profile
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Supports digital & scanned PDFs (Lab reports, CBC, Discharge summaries, Prescriptions)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pdfCategory}
                    onChange={(e) => setPdfCategory(e.target.value as DocumentCategory)}
                    className="clinical-input px-2.5 py-1.5 text-xs text-[#071D35]"
                  >
                    <option value="Blood Test Report">Blood Test Report</option>
                    <option value="CBC Report">CBC Report</option>
                    <option value="Laboratory Report">Laboratory Report</option>
                    <option value="Medical Examination Report">Medical Examination Report</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Referral Letter">Referral Letter</option>
                    <option value="Previous Medical Record">Previous Medical Record</option>
                    <option value="Other Clinical Document">Other Clinical Document</option>
                  </select>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#071D35] text-white text-xs font-semibold cursor-pointer">
                    <FileText className="w-3.5 h-3.5 text-[#55DDE0]" />
                    <span>{pdfUploading ? 'Processing PDF...' : 'Select PDF'}</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={pdfUploading}
                      onChange={handleDirectPdfUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {pdfUploadMsg && (
                <p className="text-xs font-semibold text-[#006A67]">{pdfUploadMsg}</p>
              )}

              {patientDocs.length === 0 ? (
                <p className="text-xs text-[#64748B] py-4">
                  No PDF medical documents uploaded for this patient yet.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded">
                  {patientDocs.map((doc) => (
                    <div key={doc.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-[#071D35]">{doc.fileName}</p>
                        <p className="text-[11px] text-[#64748B]">
                          {doc.category} · {(doc.fileSizeBytes / 1024).toFixed(1)} KB ·{' '}
                          {doc.pageCount} page(s) ·{' '}
                          {doc.extractionVerified ? 'Verified' : 'Awaiting Verification'}
                        </p>
                      </div>
                      <a
                        href={`${doc.fileUrl}?download=1`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E2E8F0] text-xs font-semibold text-[#071D35] hover:bg-[#F4F7FB]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB 5: ASSESSMENTS, DATASETS & REPORTS */}
          {profileTab === 'assessments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#071D35]">
                    Assessment History ({patientAssessments.length})
                  </h3>
                  {patientAssessments.length === 0 ? (
                    <p className="text-xs text-[#64748B]">No assessments logged yet.</p>
                  ) : (
                    patientAssessments.map((asm) => (
                      <div key={asm.id} className="p-3 rounded border border-[#E2E8F0] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#071D35]">
                            {asm.analysisType} · {asm.modalityOrCategory}
                          </span>
                          <span className="font-mono text-[11px] text-[#006A67]">
                            {asm.priority} Priority · {asm.reviewStatus}
                          </span>
                        </div>
                        <p className="text-[#44474D]">{asm.potentialFindings}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#071D35]">
                    Dataset Analyses ({patientDatasets.length}) & Generated Reports ({patientReports.length})
                  </h3>
                  {patientDatasets.map((ds) => (
                    <div key={ds.id} className="p-3 rounded border border-[#E2E8F0] text-xs space-y-1">
                      <p className="font-semibold text-[#071D35] flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-[#19B6B2]" />
                        <span>{ds.fileName} ({ds.modelType})</span>
                      </p>
                      <p className="text-[#44474D]">
                        {ds.recordCount} records · {ds.featureCount} features
                        {ds.metrics ? ` · Accuracy ${ds.metrics.accuracy}%` : ''}
                      </p>
                    </div>
                  ))}
                  {patientReports.map((rep) => (
                    <div key={rep.id} className="p-3 rounded border border-[#19B6B2]/40 bg-[#19B6B2]/[0.04] text-xs">
                      <p className="font-semibold text-[#071D35]">{rep.fileName}</p>
                      <p className="text-[11px] text-[#64748B]">
                        Generated {rep.generatedAt.slice(0, 16).replace('T', ' ')} · {rep.reviewStatus}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
