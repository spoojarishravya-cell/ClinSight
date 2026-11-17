import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  FileText,
  FlaskConical,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DocumentCategory,
  MedicalDocumentRecord,
  PatientRecord,
} from '../types/clinical';

interface MedicalDocumentsScreenProps {
  patients: PatientRecord[];
  documents: MedicalDocumentRecord[];
  selectedPatientId: string;
  onUploadPdf: (
    patientId: string,
    file: File,
    category: DocumentCategory
  ) => Promise<MedicalDocumentRecord>;
  onVerifyDocument: (docId: string) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
}

const DOC_CATEGORIES: DocumentCategory[] = [
  'Blood Test Report',
  'CBC Report',
  'Laboratory Report',
  'Medical Examination Report',
  'Discharge Summary',
  'Prescription',
  'Referral Letter',
  'Previous Medical Record',
  'Other Clinical Document',
];

export const MedicalDocumentsScreen: React.FC<MedicalDocumentsScreenProps> = ({
  patients,
  documents,
  selectedPatientId,
  onUploadPdf,
  onVerifyDocument,
  onDeleteDocument,
}) => {
  const [uploadPatientId, setUploadPatientId] = useState(selectedPatientId);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Blood Test Report');
  const [dragActive, setDragActive] = useState(false);
  const [uploadingQueue, setUploadingQueue] = useState<{ name: string; progress: number }[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPatientId, setFilterPatientId] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Selected document inspector
  const [activeDocId, setActiveDocId] = useState<string | null>(documents[0]?.id ?? null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const ptOk = filterPatientId === 'All' || doc.patientId === filterPatientId;
      const catOk = filterCategory === 'All' || doc.category === filterCategory;
      const q = searchQuery.trim().toLowerCase();
      const qOk =
        !q ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        (doc.patientName ?? '').toLowerCase().includes(q);
      return ptOk && catOk && qOk;
    });
  }, [documents, filterPatientId, filterCategory, searchQuery]);

  const activeDoc = useMemo(() => {
    if (filteredDocs.length === 0) return null;
    return filteredDocs.find((d) => d.id === activeDocId) ?? filteredDocs[0];
  }, [filteredDocs, activeDocId]);

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    setUploadError(null);
    setUploadNotice(null);

    const invalid = files.filter(
      (f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')
    );
    if (invalid.length > 0) {
      setUploadError(
        `Invalid file type: ${invalid.map((f) => f.name).join(', ')}. Only PDF (.pdf) documents are supported here.`
      );
      return;
    }

    for (const file of files) {
      setUploadingQueue((q) => [...q, { name: file.name, progress: 35 }]);
      try {
        setUploadingQueue((q) =>
          q.map((item) => (item.name === file.name ? { ...item, progress: 70 } : item))
        );
        const created = await onUploadPdf(uploadPatientId, file, uploadCategory);
        setActiveDocId(created.id);
        setUploadNotice(`Uploaded and processed "${file.name}".`);
      } catch (err: unknown) {
        setUploadError(
          err instanceof Error ? err.message : `Failed to process ${file.name}.`
        );
      } finally {
        setUploadingQueue((q) => q.filter((item) => item.name !== file.name));
      }
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
          Medical Documents & PDF Intelligence
        </h1>
        <p className="text-sm text-[#44474D]">
          Upload digital or scanned clinical PDFs, extract structured laboratory facts, and review AI-assisted summaries
        </p>
      </div>

      {/* PDF Drag & Drop Upload Interface */}
      <div className="clinical-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-[#071D35]">Associate with Patient</span>
            <select
              value={uploadPatientId}
              onChange={(e) => setUploadPatientId(e.target.value)}
              className="clinical-input w-full px-3 py-2 text-xs font-semibold text-[#071D35]"
            >
              {patients.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.patientCode ?? pt.mrn} · {pt.name} ({pt.bed})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-[#071D35]">Document Category</span>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
              className="clinical-input w-full px-3 py-2 text-xs font-semibold text-[#071D35]"
            >
              {DOC_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.length) {
              processFiles(e.dataTransfer.files);
            }
          }}
          className={`p-6 rounded-lg border-2 border-dashed transition-colors flex flex-col sm:flex-row items-center justify-between gap-4 ${
            dragActive
              ? 'border-[#19B6B2] bg-[#19B6B2]/8'
              : 'border-[#CBD5E1] bg-[#F4F7FB]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#071D35] text-[#55DDE0] flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#071D35]">
                Drag & drop one or multiple PDF medical documents
              </p>
              <p className="text-xs text-[#64748B]">
                Supports digital PDFs (text extraction) and scanned PDFs (OCR). Max 25 MB per payload.
              </p>
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              onChange={(e) => {
                if (e.target.files?.length) processFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold whitespace-nowrap"
            >
              Browse PDF Files
            </button>
          </div>
        </div>

        {uploadingQueue.length > 0 && (
          <div className="space-y-2">
            {uploadingQueue.map((item) => (
              <div key={item.name} className="p-2.5 rounded border border-[#19B6B2]/40 bg-[#19B6B2]/5 text-xs space-y-1">
                <div className="flex justify-between font-medium text-[#071D35]">
                  <span>Uploading & extracting: {item.name}</span>
                  <span className="font-mono">{item.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#19B6B2] transition-all duration-200"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {uploadNotice && (
          <div className="p-2.5 rounded border border-[#0D9488]/30 bg-[#0D9488]/8 text-xs font-semibold text-[#0D9488] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{uploadNotice}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-2.5 rounded border border-[#DC2626]/35 bg-[#FEF2F2] text-xs text-[#DC2626] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Document Directory + Intelligence Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left List (Col 1–4) */}
        <div className="xl:col-span-4 clinical-card overflow-hidden">
          <div className="p-3.5 border-b border-[#E2E8F0] space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search document name or patient..."
                className="clinical-input w-full pl-8 pr-3 py-1.5 text-xs text-[#071D35]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterPatientId}
                onChange={(e) => setFilterPatientId(e.target.value)}
                className="clinical-input px-2 py-1.5 text-xs text-[#071D35]"
              >
                <option value="All">All Patients</option>
                {patients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.patientCode ?? pt.mrn} · {pt.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="clinical-input px-2 py-1.5 text-xs text-[#071D35]"
              >
                <option value="All">All Categories</option>
                {DOC_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0] max-h-[540px] overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">
                No PDF documents uploaded yet. Upload a lab report, discharge summary, or referral above.
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const selected = activeDoc?.id === doc.id;
                const pt = patients.find((p) => p.id === doc.patientId);
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocId(doc.id)}
                    className={`p-3.5 cursor-pointer transition-colors space-y-1 ${
                      selected ? 'bg-[#19B6B2]/10' : 'hover:bg-[#F4F7FB]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-[#071D35] truncate flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#19B6B2] shrink-0" />
                        <span className="truncate">{doc.fileName}</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#64748B] shrink-0">
                        {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <p className="text-[11px] text-[#44474D]">
                      {pt?.patientCode ?? pt?.mrn} · {pt?.name ?? doc.patientName} · {doc.category}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>{doc.uploadedAt.slice(0, 16).replace('T', ' ')}</span>
                      <span
                        className={
                          doc.extractionVerified
                            ? 'text-[#0D9488] font-semibold'
                            : 'text-[#B45309] font-semibold'
                        }
                      >
                        {doc.extractionVerified ? 'Verified' : 'Verify Required'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Document Intelligence & PDF Preview (Col 5–12) */}
        <div className="xl:col-span-8">
          {!activeDoc ? (
            <div className="clinical-card p-10 text-center space-y-2">
              <FileText className="w-10 h-10 text-[#94A3B8] mx-auto" />
              <p className="text-sm font-semibold text-[#071D35]">
                Select or Upload a Medical PDF Document
              </p>
              <p className="text-xs text-[#64748B]">
                ClinSight extracts verbatim laboratory values, reference ranges, abnormal flags, and AI-assisted summaries with source page references.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Document Header & Actions */}
              <div className="clinical-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-display font-bold text-[#071D35]">
                    {activeDoc.fileName}
                  </h2>
                  <p className="text-xs text-[#44474D]">
                    {activeDoc.category} · {activeDoc.pageCount} page(s) ·{' '}
                    {activeDoc.extractionMethod === 'scanned_ocr_gemini'
                      ? 'Scanned PDF (OCR)'
                      : 'Digital PDF Text Extraction'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!activeDoc.extractionVerified && (
                    <button
                      type="button"
                      onClick={() => onVerifyDocument(activeDoc.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] text-[#071D35] text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Extracted Info</span>
                    </button>
                  )}

                  <a
                    href={`${activeDoc.fileUrl}?download=1`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  {confirmDeleteId === activeDoc.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteDocument(activeDoc.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 rounded bg-[#DC2626] text-white text-xs font-semibold"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 text-xs text-[#44474D]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeDoc.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#DC2626]/35 text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {activeDoc.extractionError && (
                <div className="p-3 rounded border border-[#F59E0B]/40 bg-[#FFFBEB] text-xs text-[#92400E] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                  <div>
                    <p className="font-semibold">AI Summarization Error (Raw Text Preserved)</p>
                    <p>{activeDoc.extractionError}</p>
                  </div>
                </div>
              )}

              {/* Split: Verbatim Extracted Facts vs AI-Assisted Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Verbatim Extracted Facts */}
                <div className="clinical-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-semibold text-[#071D35] flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-[#071D35]" />
                      <span>Verbatim Extracted Clinical Facts</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B]">Source Document</span>
                  </div>

                  {activeDoc.extractedFacts ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-2.5 rounded bg-[#F4F7FB] space-y-1">
                        <p>
                          <span className="font-semibold text-[#071D35]">Document Patient Info:</span>{' '}
                          {activeDoc.extractedFacts.patientDetailsInDoc || 'Not stated'}
                        </p>
                        <p>
                          <span className="font-semibold text-[#071D35]">Examination Date:</span>{' '}
                          {activeDoc.extractedFacts.examinationDate || 'Not stated'}
                        </p>
                      </div>

                      {activeDoc.extractedFacts.extractedLabs?.length > 0 && (
                        <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] font-semibold text-[#44474D]">
                                <th className="py-1.5 px-2">Test</th>
                                <th className="py-1.5 px-2 text-right">Value</th>
                                <th className="py-1.5 px-2">Ref Range</th>
                                <th className="py-1.5 px-2 text-right">Pg</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                              {activeDoc.extractedFacts.extractedLabs.map((lab, i) => (
                                <tr
                                  key={i}
                                  className={lab.outsideReference ? 'bg-[#FEF2F2]/75' : 'bg-white'}
                                >
                                  <td className="py-1.5 px-2 font-medium text-[#071D35]">
                                    {lab.testName}
                                  </td>
                                  <td
                                    className={`py-1.5 px-2 text-right font-mono tabular-nums font-bold ${
                                      lab.outsideReference ? 'text-[#DC2626]' : 'text-[#071D35]'
                                    }`}
                                  >
                                    {lab.value} {lab.unit}
                                  </td>
                                  <td className="py-1.5 px-2 font-mono text-[#64748B]">
                                    {lab.referenceRange || 'Not provided'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono text-[#64748B]">
                                    {lab.pageNumber ?? '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {activeDoc.extractedFacts.clinicalObservations?.length > 0 && (
                        <div>
                          <p className="font-semibold text-[#071D35] mb-1">
                            Extracted Observations
                          </p>
                          <ul className="space-y-1 text-[#44474D]">
                            {activeDoc.extractedFacts.clinicalObservations.map((o, i) => (
                              <li key={i}>· {o}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      Structured extraction unavailable. Inspect raw extracted PDF text below.
                    </p>
                  )}
                </div>

                {/* AI-Assisted Document Summary */}
                <div className="clinical-card-active p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-semibold text-[#006A67] flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" />
                      <span>AI-Assisted Summary (Interpretive)</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#006A67]">
                      {activeDoc.modelUsed ?? 'Unavailable'}
                    </span>
                  </div>

                  {activeDoc.aiSummary ? (
                    <div className="space-y-3 text-xs">
                      <p className="text-[#071D35] leading-relaxed">{activeDoc.aiSummary.summary}</p>

                      {activeDoc.aiSummary.abnormalHighlights?.length > 0 && (
                        <div className="p-2.5 rounded border border-[#DC2626]/30 bg-[#FEF2F2]/60 space-y-1">
                          <p className="text-[11px] font-semibold uppercase text-[#DC2626]">
                            Highlighted Out-of-Range Values
                          </p>
                          <ul className="space-y-0.5 text-[#991B1B]">
                            {activeDoc.aiSummary.abnormalHighlights.map((h, i) => (
                              <li key={i}>· {h}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeDoc.aiSummary.importantObservations?.length > 0 && (
                        <div>
                          <p className="font-semibold text-[#071D35] mb-1">
                            Important Clinical Observations
                          </p>
                          <ul className="space-y-1 text-[#44474D]">
                            {activeDoc.aiSummary.importantObservations.map((o, i) => (
                              <li key={i}>· {o}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeDoc.aiSummary.missingOrUnreadableInfo?.length > 0 && (
                        <div className="p-2.5 rounded bg-[#FFFBEB] border border-[#F59E0B]/30 space-y-1">
                          <p className="text-[11px] font-semibold uppercase text-[#92400E]">
                            Missing / Unreadable Information
                          </p>
                          <ul className="space-y-0.5 text-[#92400E]">
                            {activeDoc.aiSummary.missingOrUnreadableInfo.map((m, i) => (
                              <li key={i}>· {m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeDoc.aiSummary.pageReferences?.length > 0 && (
                        <p className="text-[11px] font-mono text-[#64748B]">
                          Sources: {activeDoc.aiSummary.pageReferences.join(' · ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      AI summary unavailable without valid model output.
                    </p>
                  )}
                </div>
              </div>

              {/* PDF Preview & Raw Text Toggle */}
              <div className="clinical-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F4F7FB] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#071D35]">
                    Source PDF Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRawText((v) => !v)}
                    className="text-xs font-semibold text-[#006A67] hover:underline"
                  >
                    {showRawText ? 'Show PDF Viewer' : 'Inspect Raw Extracted Page Text'}
                  </button>
                </div>

                {showRawText ? (
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-white text-xs font-mono">
                    {activeDoc.rawTextByPage.map((p) => (
                      <div key={p.page} className="space-y-1">
                        <p className="font-semibold text-[#006A67]">--- Page {p.page} ---</p>
                        <pre className="whitespace-pre-wrap text-[#44474D]">
                          {p.text || '[No embedded digital text detected on this page — OCR pipeline used]'}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <iframe
                    src={activeDoc.fileUrl}
                    title={activeDoc.fileName}
                    className="w-full h-[460px] border-0 bg-[#E2E8F0]"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
