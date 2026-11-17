import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  AssessmentReviewStatus,
  DatasetAnalysisRecord,
  MedicalDocumentRecord,
  PatientRecord,
  PriorityLevel,
  UnifiedAssessment,
  UploadedImageRecord,
} from '../types/clinical';
import { CLINICIAN_PROFILE } from '../data/clinicalData';
import { ReportDraft } from '../utils/pdfReportGenerator';

interface AssessmentPriorityScreenProps {
  patients: PatientRecord[];
  assessments: UnifiedAssessment[];
  documents: MedicalDocumentRecord[];
  uploadedImages: UploadedImageRecord[];
  datasets: DatasetAnalysisRecord[];
  onUpdateAssessment: (
    id: string,
    patch: {
      reviewStatus?: AssessmentReviewStatus;
      priority?: PriorityLevel;
      clinicianNotes?: string;
    }
  ) => Promise<void>;
  onOpenPatientProfile: (patientId: string) => void;
  onOpenReportModal: (draft: ReportDraft) => void;
}

const REVIEW_STATUS_OPTIONS: AssessmentReviewStatus[] = [
  'Awaiting Analysis',
  'Awaiting Review',
  'In Review',
  'Reviewed',
  'Requires Follow-up',
];

export const AssessmentPriorityScreen: React.FC<AssessmentPriorityScreenProps> = ({
  patients,
  assessments,
  documents,
  uploadedImages,
  datasets,
  onUpdateAssessment,
  onOpenPatientProfile,
  onOpenReportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PriorityLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssessmentReviewStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | UnifiedAssessment['analysisType']>('ALL');

  const [reviewingCase, setReviewingCase] = useState<UnifiedAssessment | null>(null);
  const [editPriority, setEditPriority] = useState<PriorityLevel>('Medium');
  const [editStatus, setEditStatus] = useState<AssessmentReviewStatus>('Awaiting Review');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const patientMap = useMemo(() => {
    const map = new Map<string, PatientRecord>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  const counts = useMemo(() => {
    const high = assessments.filter((a) => a.priority === 'High').length;
    const medium = assessments.filter((a) => a.priority === 'Medium').length;
    const low = assessments.filter((a) => a.priority === 'Low').length;
    const awaiting = assessments.filter(
      (a) => a.reviewStatus === 'Awaiting Review' || a.reviewStatus === 'Awaiting Analysis'
    ).length;
    return { high, medium, low, awaiting };
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const priorityRank: Record<PriorityLevel, number> = { High: 0, Medium: 1, Low: 2 };

    return assessments
      .filter((a) => {
        if (priorityFilter !== 'ALL' && a.priority !== priorityFilter) return false;
        if (statusFilter !== 'ALL' && a.reviewStatus !== statusFilter) return false;
        if (typeFilter !== 'ALL' && a.analysisType !== typeFilter) return false;
        if (q) {
          const pt = patientMap.get(a.patientId);
          const hay = [
            pt?.name ?? '',
            pt?.patientCode ?? '',
            pt?.mrn ?? '',
            a.potentialFindings,
            a.modalityOrCategory,
            a.analysisType,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
        if (pDiff !== 0) return pDiff;
        return b.confidence - a.confidence;
      });
  }, [assessments, priorityFilter, statusFilter, typeFilter, searchQuery, patientMap]);

  const openCaseReview = (asm: UnifiedAssessment) => {
    setReviewingCase(asm);
    setEditPriority(asm.priority);
    setEditStatus(asm.reviewStatus);
    setEditNotes(asm.clinicianNotes ?? '');
    setSaveError(null);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingCase) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdateAssessment(reviewingCase.id, {
        priority: editPriority,
        reviewStatus: editStatus,
        clinicianNotes: editNotes,
      });
      setReviewingCase(null);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save assessment review.');
    } finally {
      setSaving(false);
    }
  };

  const buildReportForAssessment = (asm: UnifiedAssessment) => {
    const pt = patientMap.get(asm.patientId) ?? patients[0];
    if (!pt) return;

    const extractedFindings: string[] = [];
    const aiObservations: string[] = [asm.potentialFindings];
    let sourceDetails = `${asm.modalityOrCategory}${asm.modelUsed ? ` · Model: ${asm.modelUsed}` : ''}`;

    if (asm.sourceRefId) {
      const doc = documents.find((d) => d.id === asm.sourceRefId);
      if (doc) {
        sourceDetails = `Source PDF: ${doc.fileName} (${doc.category}, ${doc.pageCount} pages)`;
        if (doc.extractedFacts) {
          doc.extractedFacts.extractedLabs.forEach((l) => {
            extractedFindings.push(
              `${l.testName}: ${l.value} ${l.unit} (Ref: ${l.referenceRange}) [${l.flag}]`
            );
          });
          doc.extractedFacts.clinicalObservations.forEach((o) => extractedFindings.push(o));
        }
        if (doc.aiSummary) {
          aiObservations.push(doc.aiSummary.summary);
          doc.aiSummary.abnormalHighlights.forEach((h) => aiObservations.push(`Abnormal: ${h}`));
        }
      }

      const img = uploadedImages.find((u) => u.id === asm.sourceRefId);
      if (img) {
        sourceDetails = `${img.modality.toUpperCase()} (${img.fileName}) · Model: ${img.modelUsed}`;
        img.analysisResult.findings.forEach((f) => extractedFindings.push(f));
        aiObservations.push(`Impression: ${img.analysisResult.impression}`);
      }

      const ds = datasets.find((d) => d.id === asm.sourceRefId);
      if (ds) {
        sourceDetails = `Dataset: ${ds.fileName} (${ds.recordCount} rows, ${ds.modelType})`;
        ds.clinicalRiskIndicators.forEach((r) => extractedFindings.push(r));
        if (ds.metrics) {
          aiObservations.push(
            `${ds.modelType} Metrics — Accuracy ${ds.metrics.accuracy}%, F1 ${ds.metrics.f1Score}%`
          );
        }
      }
    }

    onOpenReportModal({
      patient: pt,
      assessment: asm,
      sourceDetails,
      extractedFindings,
      aiObservations,
      clinicianNotes: asm.clinicianNotes,
      generatedBy: CLINICIAN_PROFILE.name,
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
            Unified Patient Assessment &amp; Priority Queue
          </h1>
          <p className="text-sm text-[#44474D]">
            Combined clinical decision-support queue aggregating Medical Imaging, PDF Document Intelligence, Clinical Datasets, and Multi-System AI
          </p>
        </div>
      </div>

      {/* Assistive Disclaimer Banner */}
      <div className="p-3.5 rounded-lg border border-[#F59E0B]/40 bg-[#FFFBEB] flex items-start gap-2.5 text-xs text-[#92400E]">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
        <div>
          <span className="font-bold">Clinical Decision Support Disclaimer:</span>{' '}
          Prioritization tiers (High / Medium / Low) and AI-generated findings are assistive
          recommendations only and must <strong>not</strong> be treated as confirmed medical
          diagnoses. Clinician review and sign-off are required.
        </div>
      </div>

      {/* Priority KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'High' ? 'ALL' : 'High')}
          className={`clinical-card p-4 text-left transition-colors ${
            priorityFilter === 'High' ? 'ring-2 ring-[#DC2626]' : ''
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#DC2626]">
            High Priority (Assistive)
          </p>
          <p className="text-2xl font-display font-bold text-[#071D35] tabular-nums mt-1">
            {counts.high}
          </p>
          <p className="text-[11px] text-[#64748B]">Critical abnormalities / urgent flags</p>
        </button>

        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'Medium' ? 'ALL' : 'Medium')}
          className={`clinical-card p-4 text-left transition-colors ${
            priorityFilter === 'Medium' ? 'ring-2 ring-[#D97706]' : ''
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D97706]">
            Medium Priority (Assistive)
          </p>
          <p className="text-2xl font-display font-bold text-[#071D35] tabular-nums mt-1">
            {counts.medium}
          </p>
          <p className="text-[11px] text-[#64748B]">Moderate anomalies / follow-up needed</p>
        </button>

        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'Low' ? 'ALL' : 'Low')}
          className={`clinical-card p-4 text-left transition-colors ${
            priorityFilter === 'Low' ? 'ring-2 ring-[#0D9488]' : ''
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0D9488]">
            Low Priority (Assistive)
          </p>
          <p className="text-2xl font-display font-bold text-[#071D35] tabular-nums mt-1">
            {counts.low}
          </p>
          <p className="text-[11px] text-[#64748B]">Routine or non-urgent observations</p>
        </button>

        <div className="clinical-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Awaiting Clinician Review
          </p>
          <p className="text-2xl font-display font-bold text-[#071D35] tabular-nums mt-1">
            {counts.awaiting}
          </p>
          <p className="text-[11px] text-[#64748B]">Pending physician verification</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="clinical-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient ID, name, or finding..."
            className="clinical-input w-full pl-9 pr-3 py-2 text-xs text-[#071D35]"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | PriorityLevel)}
          className="clinical-input px-3 py-2 text-xs font-medium text-[#071D35]"
        >
          <option value="ALL">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as 'ALL' | UnifiedAssessment['analysisType'])
          }
          className="clinical-input px-3 py-2 text-xs font-medium text-[#071D35]"
        >
          <option value="ALL">All Analysis Types</option>
          <option value="Medical Imaging">Medical Imaging</option>
          <option value="PDF Document">PDF Document</option>
          <option value="Clinical Dataset">Clinical Dataset</option>
          <option value="Multi-System AI">Multi-System AI</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AssessmentReviewStatus)}
          className="clinical-input px-3 py-2 text-xs font-medium text-[#071D35]"
        >
          <option value="ALL">All Review Statuses</option>
          {REVIEW_STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Unified Prioritization Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-3">Patient ID</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Analysis Type</th>
                <th className="py-3 px-3">Modality / Category</th>
                <th className="py-3 px-3">Potential Findings (Assistive)</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Analysis Date</th>
                <th className="py-3 px-3">Review Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[#64748B]">
                    No assessment records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((asm) => {
                  const pt = patientMap.get(asm.patientId);
                  return (
                    <tr key={asm.id} className="hover:bg-[#F4F7FB]/70">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[11px] ${
                            asm.priority === 'High'
                              ? 'bg-[#DC2626]/10 text-[#DC2626]'
                              : asm.priority === 'Medium'
                              ? 'bg-[#F59E0B]/15 text-[#B45309]'
                              : 'bg-[#0D9488]/10 text-[#0D9488]'
                          }`}
                        >
                          {asm.priority === 'High' ? (
                            <ShieldAlert className="w-3 h-3" />
                          ) : asm.priority === 'Medium' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>{asm.priority}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-[#071D35] whitespace-nowrap">
                        {pt?.patientCode ?? pt?.mrn ?? asm.patientId}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenPatientProfile(asm.patientId)}
                          className="font-semibold text-[#071D35] hover:text-[#19B6B2] underline-offset-2 hover:underline"
                        >
                          {pt?.name ?? 'Unknown Patient'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-[#44474D] whitespace-nowrap">
                        {asm.analysisType}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#44474D] whitespace-nowrap">
                        {asm.modalityOrCategory}
                      </td>
                      <td className="py-3 px-3 text-[#071D35] max-w-[280px]">
                        <p className="line-clamp-2">{asm.potentialFindings}</p>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold tabular-nums text-[#006A67] whitespace-nowrap">
                        {asm.confidence.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                        {asm.analyzedAt.includes('T')
                          ? new Date(asm.analyzedAt).toLocaleString()
                          : asm.analyzedAt}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            asm.reviewStatus === 'Reviewed'
                              ? 'bg-[#0D9488]/10 text-[#0D9488]'
                              : asm.reviewStatus === 'Requires Follow-up'
                              ? 'bg-[#DC2626]/10 text-[#DC2626]'
                              : 'bg-[#F4F7FB] text-[#44474D] border border-[#E2E8F0]'
                          }`}
                        >
                          {asm.reviewStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openCaseReview(asm)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-[11px] font-semibold"
                        >
                          <ClipboardCheck className="w-3 h-3 text-[#55DDE0]" />
                          <span>Review</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => buildReportForAssessment(asm)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-[#071D35] text-[11px] font-semibold"
                        >
                          <FileText className="w-3 h-3 text-[#19B6B2]" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Review Modal */}
      {reviewingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D35]/45 backdrop-blur-sm">
          <form
            onSubmit={handleSaveReview}
            className="clinical-overlay w-full max-w-lg p-6 space-y-4 bg-white"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base font-display font-bold text-[#071D35]">
                  Clinician Assessment Review
                </h2>
                <p className="text-xs text-[#64748B]">
                  {patientMap.get(reviewingCase.patientId)?.name ?? reviewingCase.patientId} ·{' '}
                  {reviewingCase.analysisType} ({reviewingCase.modalityOrCategory})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingCase(null)}
                aria-label="Close review modal"
                className="p-1.5 rounded border border-[#E2E8F0] text-[#44474D] hover:bg-[#F4F7FB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0] text-xs space-y-1">
              <p className="font-semibold text-[#071D35]">Potential Findings (Assistive)</p>
              <p className="text-[#44474D]">{reviewingCase.potentialFindings}</p>
              <p className="text-[11px] font-mono text-[#64748B]">
                Confidence: {reviewingCase.confidence.toFixed(1)}% · Model:{' '}
                {reviewingCase.modelUsed || reviewingCase.provenance}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Priority Classification</span>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                  className="clinical-input w-full px-3 py-2 text-xs font-semibold text-[#071D35]"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Clinician Review Status</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AssessmentReviewStatus)}
                  className="clinical-input w-full px-3 py-2 text-xs font-semibold text-[#071D35]"
                >
                  {REVIEW_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">Clinician Notes</span>
              <textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Document clinical correlation, verification of findings, and next management steps..."
                className="clinical-input w-full p-2.5 text-xs text-[#071D35]"
              />
            </label>

            {saveError && <p className="text-xs font-semibold text-[#DC2626]">{saveError}</p>}

            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const updatedSnapshot: UnifiedAssessment = {
                    ...reviewingCase,
                    priority: editPriority,
                    reviewStatus: editStatus,
                    clinicianNotes: editNotes,
                  };
                  setReviewingCase(null);
                  buildReportForAssessment(updatedSnapshot);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
              >
                <FileText className="w-3.5 h-3.5 text-[#19B6B2]" />
                <span>Generate PDF Report</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingCase(null)}
                  className="px-4 py-2 rounded border border-[#E2E8F0] text-xs font-semibold text-[#44474D] hover:bg-[#F4F7FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
