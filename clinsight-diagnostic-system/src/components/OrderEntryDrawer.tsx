import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileText, Paperclip, Scan, UserPlus, X } from 'lucide-react';
import {
  AcuityLevel,
  ClinicalOrder,
  DocumentCategory,
  MedicalDocumentRecord,
  PatientRecord,
  UploadedImageRecord,
} from '../types/clinical';

interface OrderEntryDrawerProps {
  open: boolean;
  patients: PatientRecord[];
  documents: MedicalDocumentRecord[];
  uploadedImages: UploadedImageRecord[];
  activePatientId: string;
  prefillName?: string;
  prefillType?: ClinicalOrder['type'];
  onClose: () => void;
  onSubmitOrder: (
    patientId: string,
    order: Omit<ClinicalOrder, 'id' | 'orderedBy' | 'orderedAt' | 'status'>
  ) => Promise<void> | void;
  onQuickRegisterPatient: (payload: {
    name: string;
    age?: number;
    gender: 'F' | 'M' | 'Other';
    allergies: string[];
    medicalHistory: string;
    existingConditions: string[];
    acuity: AcuityLevel;
    unit: PatientRecord['unit'];
  }) => Promise<PatientRecord>;
  onQuickUploadPdf: (
    patientId: string,
    file: File,
    category: DocumentCategory
  ) => Promise<MedicalDocumentRecord>;
}

export const OrderEntryDrawer: React.FC<OrderEntryDrawerProps> = ({
  open,
  patients,
  documents,
  uploadedImages,
  activePatientId,
  prefillName,
  prefillType,
  onClose,
  onSubmitOrder,
  onQuickRegisterPatient,
  onQuickUploadPdf,
}) => {
  const [targetPatientId, setTargetPatientId] = useState(activePatientId);
  const [orderType, setOrderType] = useState<ClinicalOrder['type']>(prefillType ?? 'Medication');
  const [orderName, setOrderName] = useState(prefillName ?? '');
  const [doseValue, setDoseValue] = useState('1000');
  const [doseUnit, setDoseUnit] = useState('mg');
  const [route, setRoute] = useState('IVPB');
  const [frequency, setFrequency] = useState('q12h');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);

  // Quick Patient Registration inside Order Entry
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [qName, setQName] = useState('');
  const [qAge, setQAge] = useState('45');
  const [qGender, setQGender] = useState<'F' | 'M' | 'Other'>('F');
  const [qAllergies, setQAllergies] = useState('No Known Drug Allergies');
  const [qHistory, setQHistory] = useState('');
  const [qRegistering, setQRegistering] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  const attachPdfRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setTargetPatientId(activePatientId);
      if (prefillType) setOrderType(prefillType);
      if (prefillName) setOrderName(prefillName);
      setSelectedDocIds([]);
      setSelectedImageIds([]);
      setShowQuickRegister(false);
    }
  }, [open, activePatientId, prefillName, prefillType]);

  const patient = useMemo(
    () => patients.find((p) => p.id === targetPatientId) ?? patients[0],
    [patients, targetPatientId]
  );

  const patientDocs = useMemo(
    () => (patient ? documents.filter((d) => d.patientId === patient.id) : []),
    [documents, patient]
  );
  const patientImages = useMemo(
    () => (patient ? uploadedImages.filter((u) => u.patientId === patient.id) : []),
    [uploadedImages, patient]
  );

  if (!open || !patient) return null;

  const hasPenicillinConflict =
    patient.allergies.some((a) => a.toLowerCase().includes('penicillin')) &&
    /(piperacillin|zosyn|amoxicillin|ampicillin|penicillin|ceftriaxone)/i.test(orderName);

  const hasContrastConflict =
    patient.egfr < 45 && /(cta|contrast|angiogram)/i.test(orderName);

  const handleQuickRegister = async () => {
    if (!qName.trim()) {
      setQError('Patient full name is required.');
      return;
    }
    setQRegistering(true);
    setQError(null);
    try {
      const created = await onQuickRegisterPatient({
        name: qName.trim(),
        age: Number(qAge) || 40,
        gender: qGender,
        allergies: qAllergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        medicalHistory: qHistory.trim() || 'Registered during clinical order entry',
        existingConditions: qHistory.trim() ? [qHistory.trim()] : ['Pending Assessment'],
        acuity: AcuityLevel.Guarded,
        unit: 'Outpatient / General',
      });
      setTargetPatientId(created.id);
      setShowQuickRegister(false);
      setQName('');
      setQHistory('');
    } catch (err: unknown) {
      setQError(err instanceof Error ? err.message : 'Unable to register patient.');
    } finally {
      setQRegistering(false);
    }
  };

  const handleAttachNewPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttach(true);
    try {
      const doc = await onQuickUploadPdf(patient.id, file, 'Laboratory Report');
      setSelectedDocIds((prev) => [...prev, doc.id]);
    } finally {
      setUploadingAttach(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitOrder(patient.id, {
        type: orderType,
        name: orderName.trim(),
        doseOrSpec:
          orderType === 'Medication' || orderType === 'Infusion'
            ? `${doseValue} ${doseUnit}`
            : doseValue || 'STAT Protocol',
        routeOrPriority: route,
        frequency,
        attachedDocumentIds: selectedDocIds,
        attachedImageIds: selectedImageIds,
      });
      setOrderName('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#071D35]/40 backdrop-blur-md">
      <div className="clinical-overlay w-full max-w-md h-full rounded-none sm:rounded-l-xl p-6 flex flex-col justify-between overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-display font-bold text-[#071D35]">
                Clinical Order Entry
              </h2>
              <p className="text-xs text-[#64748B]">
                Real-time allergy, renal safety &amp; patient chart attachment
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Order Entry"
              className="p-1.5 rounded border border-[#E2E8F0] text-[#44474D] hover:bg-[#F4F7FB]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#44474D]">Target Patient</span>
              <button
                type="button"
                onClick={() => setShowQuickRegister((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006A67] hover:text-[#071D35]"
              >
                <UserPlus className="w-3 h-3" />
                <span>{showQuickRegister ? 'Close Quick Register' : '+ Register New Patient'}</span>
              </button>
            </div>
            <select
              value={patient.id}
              onChange={(e) => {
                setTargetPatientId(e.target.value);
                setSelectedDocIds([]);
                setSelectedImageIds([]);
              }}
              className="clinical-input w-full px-3 py-2 text-sm font-medium text-[#071D35]"
            >
              {patients.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.patientCode ?? pt.mrn} — {pt.name} · {pt.bed} ({pt.weightKg} kg, eGFR {pt.egfr})
                </option>
              ))}
            </select>
          </div>

          {/* Inline Quick Patient Registration */}
          {showQuickRegister && (
            <div className="p-3.5 rounded-lg border border-[#19B6B2]/50 bg-[#F4F7FB] space-y-2.5 text-xs">
              <p className="font-semibold text-[#071D35]">Quick Patient Registration</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={qName}
                  onChange={(e) => setQName(e.target.value)}
                  placeholder="Full Name *"
                  className="clinical-input col-span-2 px-2.5 py-1.5 text-xs text-[#071D35] bg-white"
                />
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={qAge}
                  onChange={(e) => setQAge(e.target.value)}
                  placeholder="Age"
                  className="clinical-input px-2.5 py-1.5 text-xs text-[#071D35] bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={qGender}
                  onChange={(e) => setQGender(e.target.value as 'F' | 'M' | 'Other')}
                  className="clinical-input px-2.5 py-1.5 text-xs text-[#071D35] bg-white"
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  value={qAllergies}
                  onChange={(e) => setQAllergies(e.target.value)}
                  placeholder="Allergies (comma sep)"
                  className="clinical-input px-2.5 py-1.5 text-xs text-[#071D35] bg-white"
                />
              </div>
              <input
                type="text"
                value={qHistory}
                onChange={(e) => setQHistory(e.target.value)}
                placeholder="Medical history / condition"
                className="clinical-input w-full px-2.5 py-1.5 text-xs text-[#071D35] bg-white"
              />
              {qError && <p className="text-[11px] font-semibold text-[#DC2626]">{qError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={qRegistering}
                  onClick={handleQuickRegister}
                  className="px-3 py-1.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] text-[#071D35] font-semibold text-xs"
                >
                  {qRegistering ? 'Creating...' : 'Create & Select Patient'}
                </button>
              </div>
            </div>
          )}

          <div className="p-2.5 rounded bg-[#F4F7FB] border border-[#E2E8F0] text-xs space-y-0.5">
            <p className="text-[#071D35] font-medium">
              Allergies: <span className="text-[#DC2626]">{patient.allergies.join(', ')}</span>
            </p>
            <p className="text-[#64748B] font-mono tabular-nums">
              {patient.patientCode ?? patient.mrn} · Weight {patient.weightKg} kg · eGFR{' '}
              {patient.egfr} mL/min
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-[#44474D]">Order Category</span>
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
              {(['Medication', 'Infusion', 'Lab Panel', 'Imaging'] as ClinicalOrder['type'][]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setOrderType(t);
                      if (t === 'Lab Panel') {
                        setDoseValue('STAT Whole Blood');
                        setRoute('STAT');
                        setFrequency('Once');
                      } else if (t === 'Imaging') {
                        setDoseValue('Portable / Bedside');
                        setRoute('STAT');
                        setFrequency('Once');
                      } else if (t === 'Infusion') {
                        setDoseValue('0.10');
                        setDoseUnit('mcg/kg/min');
                        setRoute('IV Central');
                        setFrequency('Titrate MAP >= 65');
                      } else {
                        setDoseValue('1000');
                        setDoseUnit('mg');
                        setRoute('IVPB');
                        setFrequency('q12h');
                      }
                    }}
                    className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
                      orderType === t
                        ? 'bg-white text-[#071D35] shadow-xs'
                        : 'text-[#64748B] hover:text-[#071D35]'
                    }`}
                  >
                    {t === 'Lab Panel' ? 'Lab' : t}
                  </button>
                )
              )}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#44474D]">Order Name / Study</span>
            <input
              required
              type="text"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder={
                orderType === 'Medication'
                  ? 'e.g., Vancomycin Hydrochloride'
                  : orderType === 'Lab Panel'
                  ? 'e.g., Repeat Arterial Lactate & ABG'
                  : 'e.g., Bedside Transthoracic Echocardiogram'
              }
              className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">
                {orderType === 'Medication' || orderType === 'Infusion' ? 'Dose' : 'Specification'}
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={doseValue}
                  onChange={(e) => setDoseValue(e.target.value)}
                  className="clinical-input w-full px-3 py-2 pr-16 text-sm font-mono tabular-nums text-[#071D35]"
                />
                {(orderType === 'Medication' || orderType === 'Infusion') && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">
                    {doseUnit}
                  </span>
                )}
              </div>
            </label>

            {(orderType === 'Medication' || orderType === 'Infusion') ? (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Unit</span>
                <select
                  value={doseUnit}
                  onChange={(e) => setDoseUnit(e.target.value)}
                  className="clinical-input w-full px-3 py-2 text-sm font-mono text-[#071D35]"
                >
                  <option value="mg">mg</option>
                  <option value="mcg/kg/min">mcg/kg/min</option>
                  <option value="units/hr">units/hr</option>
                  <option value="mL/hr">mL/hr</option>
                </select>
              </label>
            ) : (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Priority</span>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
                >
                  <option value="STAT">STAT</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Routine">Routine</option>
                </select>
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">Route / Priority</span>
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">Frequency / Protocol</span>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="clinical-input w-full px-3 py-2 text-sm text-[#071D35]"
              />
            </label>
          </div>

          {/* Supporting Medical Documents & Images Attachment */}
          <div className="p-3 rounded border border-[#E2E8F0] bg-[#F4F7FB]/70 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#071D35] flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#19B6B2]" />
                <span>Attach Supporting Files</span>
              </span>
              <div>
                <input
                  ref={attachPdfRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleAttachNewPdf}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingAttach}
                  onClick={() => attachPdfRef.current?.click()}
                  className="text-[11px] font-semibold text-[#006A67] hover:text-[#071D35]"
                >
                  {uploadingAttach ? 'Uploading PDF...' : '+ Attach New PDF'}
                </button>
              </div>
            </div>

            {patientDocs.length === 0 && patientImages.length === 0 ? (
              <p className="text-[11px] text-[#64748B]">
                No uploaded PDFs or imaging studies for {patient.name.split(' ')[0]} yet.
              </p>
            ) : (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {patientDocs.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-[11px] text-[#071D35]">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(d.id)}
                      onChange={(e) =>
                        setSelectedDocIds((prev) =>
                          e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                        )
                      }
                      className="accent-[#19B6B2]"
                    />
                    <FileText className="w-3 h-3 text-[#19B6B2] shrink-0" />
                    <span className="truncate">{d.fileName}</span>
                  </label>
                ))}
                {patientImages.map((im) => (
                  <label key={im.id} className="flex items-center gap-2 text-[11px] text-[#071D35]">
                    <input
                      type="checkbox"
                      checked={selectedImageIds.includes(im.id)}
                      onChange={(e) =>
                        setSelectedImageIds((prev) =>
                          e.target.checked ? [...prev, im.id] : prev.filter((x) => x !== im.id)
                        )
                      }
                      className="accent-[#19B6B2]"
                    />
                    <Scan className="w-3 h-3 text-[#19B6B2] shrink-0" />
                    <span className="truncate">
                      {im.modality.toUpperCase()} · {im.fileName}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {hasPenicillinConflict && (
            <div className="p-3 rounded border border-[#DC2626]/40 bg-[#FEF2F2] text-xs text-[#DC2626] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Allergy Contraindication:</strong> Patient has documented Penicillin
                anaphylaxis. Consider Aztreonam or Vancomycin alternative.
              </span>
            </div>
          )}

          {hasContrastConflict && (
            <div className="p-3 rounded border border-[#F59E0B]/40 bg-[#FFFBEB] text-xs text-[#92400E] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
              <span>
                <strong>Nephrotoxicity Guard:</strong> eGFR {patient.egfr} mL/min. Evaluate
                non-contrast alternative or pre-hydrate prior to iodinated contrast.
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-[#E2E8F0] text-xs font-semibold text-[#071D35] hover:bg-[#F4F7FB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
            >
              {submitting ? 'Submitting...' : 'Sign & Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
