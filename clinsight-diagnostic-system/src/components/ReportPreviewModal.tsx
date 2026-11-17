import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, X } from 'lucide-react';
import { GeneratedReportRecord } from '../types/clinical';
import { buildAssessmentPdfBlob, ReportDraft } from '../utils/pdfReportGenerator';

interface ReportPreviewModalProps {
  draft: ReportDraft | null;
  onClose: () => void;
  onReportPersisted: (report: GeneratedReportRecord) => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  draft,
  onClose,
  onReportPersisted,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generatedPreview = useMemo(() => {
    if (!draft) return null;
    return buildAssessmentPdfBlob(draft);
  }, [draft]);

  if (!draft || !generatedPreview) return null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedPreview.record),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save generated report metadata.');
      }
      onReportPersisted(data as GeneratedReportRecord);

      const url = URL.createObjectURL(generatedPreview.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generatedPreview.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSavedNotice(`Report saved and downloaded as ${generatedPreview.fileName}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D35]/45 backdrop-blur-sm">
      <div className="clinical-overlay w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#071D35] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#55DDE0]" />
            <div>
              <h2 className="text-base font-display font-bold">
                Assessment PDF Report Preview
              </h2>
              <p className="text-xs text-[#B4C8E7]">
                Stored separately from uploaded source PDFs · ClinSight Decision Support
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report preview"
            className="p-1.5 rounded border border-white/20 text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report Preview Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs bg-white">
          <div className="p-4 rounded bg-[#F4F7FB] border border-[#E2E8F0] space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#071D35]">
                {draft.patient.name} ({draft.patient.patientCode ?? draft.patient.mrn})
              </span>
              <span className="font-mono text-[11px] text-[#64748B]">
                MRN: {draft.patient.mrn} · {draft.patient.age}y {draft.patient.sex}
              </span>
            </div>
            <p className="text-[#44474D]">
              Allergies: <span className="text-[#DC2626] font-medium">{draft.patient.allergies.join(', ')}</span>
            </p>
            <p className="text-[#44474D]">
              Existing Conditions: {(draft.patient.existingConditions ?? [draft.patient.chiefComplaint]).join(', ')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded border border-[#E2E8F0]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Analysis Type & Source
              </p>
              <p className="font-semibold text-[#071D35] mt-0.5">
                {draft.assessment.analysisType} · {draft.assessment.modalityOrCategory}
              </p>
              <p className="text-[#44474D] mt-0.5">{draft.sourceDetails}</p>
            </div>
            <div className="p-3 rounded border border-[#E2E8F0]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Priority & Review Status
              </p>
              <p className="font-semibold text-[#071D35] mt-0.5">
                {draft.assessment.priority} Priority (Assistive) · Confidence{' '}
                {draft.assessment.confidence.toFixed(1)}%
              </p>
              <p className="text-[#006A67] font-semibold mt-0.5">
                Status: {draft.assessment.reviewStatus}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#071D35]">
              Extracted Clinical Findings
            </h3>
            <ul className="space-y-1 text-[#44474D] p-3 rounded border border-[#E2E8F0]">
              {(draft.extractedFindings.length > 0
                ? draft.extractedFindings
                : ['No structured extracted facts attached.']).map((f, i) => (
                <li key={i}>· {f}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006A67]">
              AI-Generated Observations (Decision Support)
            </h3>
            <ul className="space-y-1 text-[#071D35] p-3 rounded border border-[#19B6B2]/40 bg-[#19B6B2]/[0.04]">
              {(draft.aiObservations.length > 0
                ? draft.aiObservations
                : [draft.assessment.potentialFindings]).map((obs, i) => (
                <li key={i}>· {obs}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#071D35]">
              Clinician Notes
            </h3>
            <p className="p-3 rounded border border-[#E2E8F0] text-[#44474D]">
              {draft.clinicianNotes.trim() || 'No clinician notes documented.'}
            </p>
          </div>

          <div className="p-3 rounded border border-[#F59E0B]/40 bg-[#FFFBEB] flex items-start gap-2 text-[#92400E]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
            <div>
              <p className="font-semibold">Medical Decision-Support Disclaimer</p>
              <p className="text-[11px]">
                ClinSight is a clinical decision-support prototype and not an autonomous diagnostic
                system. All AI observations and extracted values require verification by a qualified
                healthcare professional.
              </p>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-[#DC2626]">{errorMsg}</p>
          )}
          {savedNotice && (
            <p className="text-xs font-semibold text-[#0D9488] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedNotice}</span>
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F4F7FB] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-[#E2E8F0] bg-white text-xs font-semibold text-[#071D35] hover:bg-[#F4F7FB]"
          >
            Close
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] disabled:opacity-60 text-white text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-[#55DDE0]" />
            <span>{downloading ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
