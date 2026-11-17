import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Contrast,
  Cpu,
  FlaskConical,
  Grid3X3,
  Lock,
  Move,
  RotateCcw,
  Scan,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BodySystemId,
  ClinicalOrder,
  DiseaseAnalysisEnvelope,
  ImagingAnalysisEnvelope,
  ImagingModalityId,
  PatientRecord,
  PriorityLevel,
  UnifiedAssessment,
  UploadedImageRecord,
} from '../types/clinical';
import {
  BODY_SYSTEMS,
  DISEASE_REASONING_MODELS,
  MODALITY_CONFIGS,
  SAMPLE_MODALITY_STUDIES,
  SIMULATED_DISEASE_BASELINE,
} from '../data/modalityRegistry';
import { ConfidenceTag, ProvenanceBanner } from './StatusTag';

interface MultimodalAnalysisScreenProps {
  patients: PatientRecord[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  onOpenOrderEntry: (prefillName?: string, prefillType?: ClinicalOrder['type']) => void;
  onAddNoteToChart: (patientId: string, noteText: string) => void;
  onImageAnalyzed?: (payload: {
    imageRecord: UploadedImageRecord;
    assessment: UnifiedAssessment;
  }) => void;
  onDiseaseAnalyzed?: () => void;
  initialModality?: ImagingModalityId;
}

const OTHER_DEFAULT_REPORT: ImagingAnalysisEnvelope = {
  provenance: 'simulated_demo',
  modelId: 'Simulated Demo Baseline',
  modality: 'other',
  bodySystem: 'cardiovascular',
  analyzedAt: 'Awaiting Upload',
  result: {
    primaryPathology: 'Upload a Specialized Medical Image to Begin Analysis',
    urgency: 'Routine',
    confidence: 0,
    findings: [
      'No specialized image uploaded yet. Drag and drop or browse a PNG, JPG, or WEBP medical image.',
    ],
    impression: 'Awaiting medical image upload for gemini-4-hydrogen analysis.',
    anatomicalObservations: [],
    recommendedNextSteps: ['Upload a specialized capture and click Run Live AI Analysis'],
    limitations: 'No active study loaded.',
  },
};

function mapUrgencyToPriority(urgency: string): PriorityLevel {
  if (urgency === 'Critical') return 'High';
  if (urgency === 'Urgent') return 'Medium';
  return 'Low';
}

export const MultimodalAnalysisScreen: React.FC<MultimodalAnalysisScreenProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onOpenOrderEntry,
  onAddNoteToChart,
  onImageAnalyzed,
  onDiseaseAnalyzed,
  initialModality = 'xray',
}) => {
  const [studioMode, setStudioMode] = useState<'imaging' | 'disease'>('imaging');

  const initialSample =
    SAMPLE_MODALITY_STUDIES.find((s) => s.modality === initialModality) ??
    SAMPLE_MODALITY_STUDIES[0];

  // Modality-specific imaging state
  const [modality, setModality] = useState<ImagingModalityId>(initialModality);
  const [selectedModelByModality, setSelectedModelByModality] = useState<
    Record<ImagingModalityId, string>
  >({
    xray: MODALITY_CONFIGS.xray.compatibleModels[0].id,
    ultrasound: MODALITY_CONFIGS.ultrasound.compatibleModels[0].id,
    ct: MODALITY_CONFIGS.ct.compatibleModels[0].id,
    mri: MODALITY_CONFIGS.mri.compatibleModels[0].id,
    other: MODALITY_CONFIGS.other.compatibleModels[0].id,
  });
  const [imagingBodySystem, setImagingBodySystem] = useState<BodySystemId>(
    initialSample.bodySystem
  );
  const [selectedSampleId, setSelectedSampleId] = useState<string>(initialSample.id);
  const [uploadedImage, setUploadedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    fileName: string;
    fileSizeBytes: number;
    dimensions: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [clinicalContextInput, setClinicalContextInput] = useState<string>(
    initialSample.patientContext
  );
  const [modalityParams, setModalityParams] = useState<Record<string, string>>({
    ...initialSample.parameters,
  });

  // PACS viewer adjustments + Zoom & Pan
  const [pacsContrast, setPacsContrast] = useState(110);
  const [pacsBrightness, setPacsBrightness] = useState(100);
  const [pacsInvert, setPacsInvert] = useState(false);
  const [pacsGrid, setPacsGrid] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgError, setImgError] = useState(false);

  // Imaging analysis execution state
  const [imagingLoading, setImagingLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [imagingError, setImagingError] = useState<string | null>(null);
  const [imagingReport, setImagingReport] = useState<ImagingAnalysisEnvelope>({
    provenance: 'simulated_demo',
    modelId: 'Simulated Demo Baseline',
    modality: initialSample.modality,
    bodySystem: initialSample.bodySystem,
    analyzedAt: 'Baseline Reference',
    result: initialSample.simulatedReport,
  });
  const [chartSyncedNotice, setChartSyncedNotice] = useState<string | null>(null);

  // Multi-system disease analysis state
  const [diseaseSystem, setDiseaseSystem] = useState<BodySystemId>('respiratory');
  const [diseaseModelId, setDiseaseModelId] = useState<string>(DISEASE_REASONING_MODELS[0].id);
  const [diseaseObservation, setDiseaseObservation] = useState<string>(
    BODY_SYSTEMS[0].defaultObservation
  );
  const [diseaseLoading, setDiseaseLoading] = useState(false);
  const [diseaseError, setDiseaseError] = useState<string | null>(null);
  const [diseaseReport, setDiseaseReport] = useState<DiseaseAnalysisEnvelope>(
    SIMULATED_DISEASE_BASELINE.respiratory
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!imagingLoading) {
      setAnalysisProgress(0);
      return;
    }
    setAnalysisProgress(18);
    const timer = window.setInterval(() => {
      setAnalysisProgress((prev) => (prev < 88 ? prev + 11 : prev));
    }, 350);
    return () => window.clearInterval(timer);
  }, [imagingLoading]);

  const patient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId]
  );

  const modalityConfig = MODALITY_CONFIGS[modality];
  const modalitySamples = useMemo(
    () => SAMPLE_MODALITY_STUDIES.filter((s) => s.modality === modality),
    [modality]
  );
  const activeSample = useMemo(
    () => modalitySamples.find((s) => s.id === selectedSampleId) ?? modalitySamples[0],
    [modalitySamples, selectedSampleId]
  );

  const activeImageSrc = uploadedImage ? uploadedImage.dataUrl : activeSample?.imageUrl ?? '';

  const resetViewportTransform = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleSwitchModality = (nextModality: ImagingModalityId) => {
    setModality(nextModality);
    setUploadedImage(null);
    setImgError(false);
    setImagingError(null);
    setChartSyncedNotice(null);
    resetViewportTransform();

    const cfg = MODALITY_CONFIGS[nextModality];
    const firstSample = SAMPLE_MODALITY_STUDIES.find((s) => s.modality === nextModality);
    const defaults: Record<string, string> = {};
    cfg.parameters.forEach((p) => {
      defaults[p.key] = firstSample?.parameters[p.key] ?? p.defaultValue;
    });
    setModalityParams(defaults);

    if (firstSample) {
      setSelectedSampleId(firstSample.id);
      setImagingBodySystem(firstSample.bodySystem);
      setClinicalContextInput(firstSample.patientContext);
      setImagingReport({
        provenance: 'simulated_demo',
        modelId: 'Simulated Demo Baseline',
        modality: nextModality,
        bodySystem: firstSample.bodySystem,
        analyzedAt: 'Baseline Reference',
        result: firstSample.simulatedReport,
      });
    } else {
      setSelectedSampleId('');
      setImagingBodySystem(cfg.defaultBodySystems[0] ?? 'cardiovascular');
      setClinicalContextInput(
        `${patient.name}, ${patient.age}y ${patient.sex} (${patient.patientCode ?? patient.mrn}). Chief complaint: ${patient.chiefComplaint}`
      );
      setImagingReport({
        ...OTHER_DEFAULT_REPORT,
        modality: nextModality,
        bodySystem: cfg.defaultBodySystems[0] ?? 'cardiovascular',
      });
    }
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_MODALITY_STUDIES.find((s) => s.id === sampleId);
    if (!sample) return;
    setSelectedSampleId(sample.id);
    setUploadedImage(null);
    setImgError(false);
    setImagingError(null);
    setChartSyncedNotice(null);
    resetViewportTransform();
    setImagingBodySystem(sample.bodySystem);
    setClinicalContextInput(sample.patientContext);
    setModalityParams({ ...sample.parameters });
    setImagingReport({
      provenance: 'simulated_demo',
      modelId: 'Simulated Demo Baseline',
      modality: sample.modality,
      bodySystem: sample.bodySystem,
      analyzedAt: 'Baseline Reference',
      result: sample.simulatedReport,
    });
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImagingError(`Unsupported file "${file.name}". Upload a PNG, JPG, or WEBP medical image.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const probe = new Image();
        probe.onload = () => {
          setUploadedImage({
            dataUrl,
            mimeType: file.type || 'image/png',
            fileName: file.name,
            fileSizeBytes: file.size,
            dimensions: `${probe.naturalWidth} × ${probe.naturalHeight} px`,
          });
          setImgError(false);
          setImagingError(null);
          resetViewportTransform();
        };
        probe.onerror = () => {
          setUploadedImage({
            dataUrl,
            mimeType: file.type || 'image/png',
            fileName: file.name,
            fileSizeBytes: file.size,
            dimensions: 'Unknown dimensions',
          });
          setImgError(false);
          setImagingError(null);
          resetViewportTransform();
        };
        probe.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  const handleRunLiveImagingAi = async () => {
    if (!uploadedImage && !activeSample) {
      setImagingError('Please upload a medical image before running Live AI Analysis.');
      return;
    }
    setImagingLoading(true);
    setImagingError(null);
    setChartSyncedNotice(null);
    try {
      const modelId = selectedModelByModality[modality];
      const payload = {
        patientId: patient.id,
        modality,
        bodySystem: imagingBodySystem,
        modelId,
        fileName: uploadedImage ? uploadedImage.fileName : `${activeSample?.id}.jpg`,
        fileSizeBytes: uploadedImage ? uploadedImage.fileSizeBytes : undefined,
        mimeType: uploadedImage ? uploadedImage.mimeType : undefined,
        dimensions: uploadedImage ? uploadedImage.dimensions : 'Reference Frame',
        imageBase64: uploadedImage ? uploadedImage.dataUrl : undefined,
        imagePath: uploadedImage ? undefined : activeSample?.imageUrl,
        clinicalContext: clinicalContextInput,
        modalityParameters: modalityParams,
      };

      const res = await fetch('/api/images/upload-and-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }
      setAnalysisProgress(100);
      setImagingReport(data.envelope as ImagingAnalysisEnvelope);
      if (onImageAnalyzed && data.imageRecord && data.assessment) {
        onImageAnalyzed({
          imageRecord: data.imageRecord as UploadedImageRecord,
          assessment: data.assessment as UnifiedAssessment,
        });
      }
      setChartSyncedNotice(
        `Saved to ${patient.name}'s profile & Priority Assessment Queue.`
      );
    } catch (err: unknown) {
      setImagingError(
        err instanceof Error ? err.message : 'Unable to complete live imaging analysis.'
      );
    } finally {
      setImagingLoading(false);
    }
  };

  const handleLoadSimulatedImaging = () => {
    setImagingError(null);
    setChartSyncedNotice(null);
    if (!activeSample) {
      setImagingReport({
        ...OTHER_DEFAULT_REPORT,
        modality,
        bodySystem: imagingBodySystem,
      });
      return;
    }
    setImagingReport({
      provenance: 'simulated_demo',
      modelId: 'Simulated Demo Baseline',
      modality,
      bodySystem: activeSample.bodySystem,
      analyzedAt: 'Baseline Reference',
      result: activeSample.simulatedReport,
    });
  };

  const handleSwitchDiseaseSystem = (sysId: BodySystemId) => {
    setDiseaseSystem(sysId);
    setDiseaseError(null);
    const meta = BODY_SYSTEMS.find((s) => s.id === sysId);
    if (meta) {
      setDiseaseObservation(meta.defaultObservation);
    }
    setDiseaseReport(SIMULATED_DISEASE_BASELINE[sysId]);
  };

  const handleRunLiveDiseaseAi = async () => {
    setDiseaseLoading(true);
    setDiseaseError(null);
    try {
      const latest = patient.vitals['6H'][patient.vitals['6H'].length - 1];
      const vitalSummary = latest
        ? `HR ${latest.hr} bpm, BP ${latest.sbp}/${latest.dbp} mmHg, SpO2 ${latest.spo2}%, Temp ${latest.temp}°C, RR ${latest.rr}/min, Lactate ${latest.lactate} mmol/L`
        : 'Vitals unavailable';
      const labSummary = patient.labs
        .slice(0, 5)
        .map((l) => `${l.analyte}: ${l.value} ${l.unit} (${l.flag})`)
        .join('; ');

      const res = await fetch('/api/analyze-disease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          bodySystem: diseaseSystem,
          modelId: diseaseModelId,
          patientContext: `${patient.name} (${patient.patientCode ?? patient.mrn}), ${patient.age}y ${patient.sex}, ${patient.weightKg} kg, eGFR ${patient.egfr} mL/min, Bed ${patient.bed}. Chief complaint: ${patient.chiefComplaint}`,
          clinicalObservation: diseaseObservation,
          vitalSummary,
          labSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }
      setDiseaseReport(data as DiseaseAnalysisEnvelope);
      onDiseaseAnalyzed?.();
    } catch (err: unknown) {
      setDiseaseError(
        err instanceof Error ? err.message : 'Unable to complete live multi-system disease analysis.'
      );
    } finally {
      setDiseaseLoading(false);
    }
  };

  const activeSystemMeta =
    BODY_SYSTEMS.find((s) => s.id === diseaseSystem) ?? BODY_SYSTEMS[0];
  const computedPriority = mapUrgencyToPriority(imagingReport.result.urgency);

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Screen Header & Top Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
            Multimodal Image &amp; Multi-System Disease Analysis
          </h1>
          <p className="text-sm text-[#44474D]">
            Modality-locked radiological AI pipelines (X-Ray, Ultrasound, CT, MRI, Other Scans) and 5-system differential reasoning
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#44474D]">Target Patient:</span>
            <select
              value={patient.id}
              onChange={(e) => onSelectPatient(e.target.value)}
              className="clinical-input px-3 py-1.5 text-xs font-semibold text-[#071D35]"
            >
              {patients.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.patientCode ?? pt.mrn} — {pt.name} ({pt.bed})
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1 p-1 bg-white rounded border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setStudioMode('imaging')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                studioMode === 'imaging'
                  ? 'bg-[#071D35] text-white'
                  : 'text-[#44474D] hover:bg-[#F4F7FB]'
              }`}
            >
              <Scan className="w-3.5 h-3.5 text-[#55DDE0]" aria-hidden="true" />
              <span>Modality Imaging Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('disease')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                studioMode === 'disease'
                  ? 'bg-[#071D35] text-white'
                  : 'text-[#44474D] hover:bg-[#F4F7FB]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#19B6B2]" aria-hidden="true" />
              <span>Multi-System Disease Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODE 1: MODALITY-SPECIFIC MEDICAL IMAGING INTERFACES
         ============================================================ */}
      {studioMode === 'imaging' && (
        <div className="space-y-5">
          {/* 5 Separate Modality Interface Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(['xray', 'ultrasound', 'ct', 'mri', 'other'] as ImagingModalityId[]).map((mId) => {
              const cfg = MODALITY_CONFIGS[mId];
              const isSelected = modality === mId;
              return (
                <button
                  key={mId}
                  type="button"
                  onClick={() => handleSwitchModality(mId)}
                  className={`text-left p-4 rounded-lg border transition-all duration-150 space-y-1.5 ${
                    isSelected
                      ? 'clinical-card-active bg-white'
                      : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-display font-bold text-[#071D35]">
                      {cfg.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-[#19B6B2]/15 text-[#006A67]'
                          : 'bg-[#F4F7FB] text-[#64748B]'
                      }`}
                    >
                      {cfg.compatibleModels.length} model{cfg.compatibleModels.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] line-clamp-2">{cfg.description}</p>
                </button>
              );
            })}
          </div>

          {/* Modality-Specific Workspace Split */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Left/Center (Col 1–7): Modality-Specific Controls + PACS Viewport */}
            <div className="xl:col-span-7 space-y-4">
              {/* Sample & Drag-and-Drop Custom Upload Bar */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) processImageFile(f);
                }}
                className={`clinical-card p-4 space-y-3 transition-colors ${
                  dragActive ? 'border-[#19B6B2] bg-[#19B6B2]/[0.04]' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[#071D35]">
                      {modalityConfig.label} Study Input
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Drag &amp; drop a PNG/JPG/WEBP scan here, browse from disk, or select a clinical reference frame
                    </p>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#19B6B2]" />
                      <span>Upload {modalityConfig.shortLabel} Image</span>
                    </button>
                  </div>
                </div>

                {/* Sample Study Switcher for Active Modality */}
                <div className="flex flex-wrap items-center gap-2">
                  {modalitySamples.map((s) => {
                    const active = !uploadedImage && activeSample?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSample(s.id)}
                        className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                          active
                            ? 'bg-[#071D35] text-white border-[#071D35]'
                            : 'bg-[#F4F7FB] text-[#44474D] border-[#E2E8F0] hover:bg-white'
                        }`}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                  {uploadedImage && (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded bg-[#19B6B2]/12 border border-[#19B6B2] text-xs text-[#071D35]">
                      <span className="font-semibold">Uploaded: {uploadedImage.fileName}</span>
                      <span className="font-mono text-[11px] text-[#44474D]">
                        ({(uploadedImage.fileSizeBytes / 1024).toFixed(1)} KB · {uploadedImage.mimeType} · {uploadedImage.dimensions})
                      </span>
                    </div>
                  )}
                </div>

                {/* Modality-Specific Acquisition Parameters + Target Body System */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E2E8F0]">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Target Body System
                    </span>
                    <select
                      value={imagingBodySystem}
                      onChange={(e) => setImagingBodySystem(e.target.value as BodySystemId)}
                      className="clinical-input w-full px-2.5 py-1.5 text-xs font-medium text-[#071D35]"
                    >
                      {BODY_SYSTEMS.map((bs) => (
                        <option key={bs.id} value={bs.id}>
                          {bs.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {modalityConfig.parameters.map((param) => (
                    <label key={param.key} className="block space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        {param.label}
                      </span>
                      <select
                        value={modalityParams[param.key] ?? param.defaultValue}
                        onChange={(e) =>
                          setModalityParams((p) => ({ ...p, [param.key]: e.target.value }))
                        }
                        className="clinical-input w-full px-2.5 py-1.5 text-xs font-medium text-[#071D35]"
                      >
                        {param.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              {/* PACS Imaging Viewport with Zoom & Pan */}
              <div className="bg-[#050C14] rounded-lg overflow-hidden border border-[#1E3A5F]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#071D35] border-b border-[#1E3A5F] text-[11px] text-[#B4C8E7]">
                  <span className="font-mono font-semibold text-white truncate">
                    {uploadedImage
                      ? uploadedImage.fileName
                      : activeSample?.title ?? `${modalityConfig.label} — Ready for Upload`}
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex items-center gap-1.5">
                      <Contrast className="w-3.5 h-3.5 text-[#55DDE0]" />
                      <span>Win</span>
                      <input
                        type="range"
                        min={70}
                        max={180}
                        value={pacsContrast}
                        onChange={(e) => setPacsContrast(Number(e.target.value))}
                        className="w-14 accent-[#19B6B2]"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-[#55DDE0]" />
                      <span>Lvl</span>
                      <input
                        type="range"
                        min={60}
                        max={150}
                        value={pacsBrightness}
                        onChange={(e) => setPacsBrightness(Number(e.target.value))}
                        className="w-14 accent-[#19B6B2]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPacsInvert((v) => !v)}
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        pacsInvert
                          ? 'bg-[#19B6B2] text-[#071D35] border-[#19B6B2] font-semibold'
                          : 'border-[#354862] text-[#B4C8E7]'
                      }`}
                    >
                      Invert
                    </button>
                    <button
                      type="button"
                      onClick={() => setPacsGrid((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${
                        pacsGrid
                          ? 'bg-[#19B6B2] text-[#071D35] border-[#19B6B2] font-semibold'
                          : 'border-[#354862] text-[#B4C8E7]'
                      }`}
                    >
                      <Grid3X3 className="w-3 h-3" />
                      <span>Grid</span>
                    </button>
                    <div className="inline-flex items-center gap-1 border border-[#354862] rounded px-1.5 py-0.5">
                      <button
                        type="button"
                        aria-label="Zoom out"
                        onClick={() =>
                          setZoomScale((z) => {
                            const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                            if (next === 1) setPanOffset({ x: 0, y: 0 });
                            return next;
                          })
                        }
                        className="text-[#B4C8E7] hover:text-white"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-[11px] text-white tabular-nums px-1">
                        {zoomScale.toFixed(2)}x
                      </span>
                      <button
                        type="button"
                        aria-label="Zoom in"
                        onClick={() => setZoomScale((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                        className="text-[#B4C8E7] hover:text-white"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        aria-label="Reset zoom and pan"
                        onClick={resetViewportTransform}
                        className="text-[#B4C8E7] hover:text-white ml-0.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  onMouseDown={(e) => {
                    if (zoomScale <= 1) return;
                    setIsDraggingPan(true);
                    panStartRef.current = {
                      x: e.clientX - panOffset.x,
                      y: e.clientY - panOffset.y,
                    };
                  }}
                  onMouseMove={(e) => {
                    if (!isDraggingPan) return;
                    setPanOffset({
                      x: e.clientX - panStartRef.current.x,
                      y: e.clientY - panStartRef.current.y,
                    });
                  }}
                  onMouseUp={() => setIsDraggingPan(false)}
                  onMouseLeave={() => setIsDraggingPan(false)}
                  className={`relative aspect-[4/3] max-h-[420px] w-full flex items-center justify-center overflow-hidden bg-black ${
                    zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  {activeImageSrc && !imgError ? (
                    <img
                      src={activeImageSrc}
                      alt={`${modalityConfig.label} diagnostic view`}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onError={() => setImgError(true)}
                      style={{
                        filter: `contrast(${pacsContrast}%) brightness(${pacsBrightness}%) ${
                          pacsInvert ? 'invert(1)' : ''
                        }`,
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                      }}
                      className="w-full h-full object-contain transition-transform duration-100 select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#7386A3] gap-2 p-6 text-center">
                      <Scan className="w-10 h-10 text-[#55DDE0]" />
                      <p className="text-xs font-mono">
                        {activeImageSrc
                          ? 'Diagnostic Frame Unavailable'
                          : 'Upload a medical image (PNG, JPG, WEBP) to inspect in PACS viewport'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-1 px-3 py-1.5 rounded bg-[#19B6B2] text-[#071D35] text-xs font-semibold"
                      >
                        Select Image File
                      </button>
                    </div>
                  )}

                  {pacsGrid && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage:
                          'linear-gradient(to right, rgba(85,221,224,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(85,221,224,0.16) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                      }}
                    />
                  )}

                  {zoomScale > 1 && (
                    <div className="absolute top-2.5 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#071D35]/85 text-[10px] font-mono text-[#55DDE0] pointer-events-none">
                      <Move className="w-3 h-3" />
                      <span>Drag to pan</span>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-[#55DDE0]/90 pointer-events-none">
                    <span>
                      {modalityConfig.shortLabel.toUpperCase()} · {imagingBodySystem.toUpperCase()}
                    </span>
                    <span>{Object.values(modalityParams).join(' · ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Col 8–12): Compatible AI Model Binding + Analysis Report */}
            <div className="xl:col-span-5 space-y-4">
              {/* Model Compatibility Guard & Execution Box */}
              <div className="clinical-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#19B6B2]" />
                    <span>{modalityConfig.shortLabel} Compatible AI Pipeline</span>
                  </h2>
                  <span className="text-[11px] font-mono text-[#006A67] font-semibold">
                    Modality-Locked
                  </span>
                </div>

                {/* Compatible Models Selection */}
                <div className="space-y-2">
                  {modalityConfig.compatibleModels.map((m) => {
                    const selected = selectedModelByModality[modality] === m.id;
                    return (
                      <label
                        key={m.id}
                        className={`block p-3 rounded border cursor-pointer transition-colors ${
                          selected
                            ? 'border-[#19B6B2] bg-[#19B6B2]/[0.05]'
                            : 'border-[#E2E8F0] hover:bg-[#F4F7FB]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`model-${modality}`}
                              checked={selected}
                              onChange={() =>
                                setSelectedModelByModality((prev) => ({
                                  ...prev,
                                  [modality]: m.id,
                                }))
                              }
                              className="accent-[#19B6B2]"
                            />
                            <span className="text-xs font-mono font-semibold text-[#071D35]">
                              {m.id}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#0D9488]">
                            Compatible
                          </span>
                        </div>
                        <p className="mt-1 pl-6 text-xs text-[#44474D]">{m.capabilitySummary}</p>
                        <p className="pl-6 text-[11px] text-[#64748B]">
                          Best for: {m.recommendedFor}
                        </p>
                      </label>
                    );
                  })}
                </div>

                {/* Blocked Incompatible Models Notice */}
                <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0] space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    <span>Incompatible Models Blocked for {modalityConfig.shortLabel}</span>
                  </p>
                  <div className="space-y-1">
                    {modalityConfig.blockedModels.map((blk) => (
                      <p key={blk.id} className="text-[11px] text-[#44474D]">
                        <span className="font-mono font-medium text-[#071D35]">{blk.id}</span> —{' '}
                        {blk.reason}
                      </p>
                    ))}
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#44474D]">
                    Clinical Context Passed to Model ({patient.patientCode ?? patient.mrn})
                  </span>
                  <textarea
                    rows={2}
                    value={clinicalContextInput}
                    onChange={(e) => setClinicalContextInput(e.target.value)}
                    className="clinical-input w-full p-2.5 text-xs text-[#071D35] resize-none"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={imagingLoading}
                    onClick={handleRunLiveImagingAi}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] disabled:opacity-60 text-[#071D35] text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>
                      {imagingLoading
                        ? `Analyzing via ${selectedModelByModality[modality]}...`
                        : 'Run Live AI Analysis'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSimulatedImaging}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#44474D] whitespace-nowrap"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Simulated Demo</span>
                  </button>
                </div>

                {/* Analysis Progress Indicator */}
                {imagingLoading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#071D35]">
                      <span>Running {selectedModelByModality[modality]} pipeline...</span>
                      <span>{analysisProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full bg-[#19B6B2] transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {imagingError && (
                  <div className="p-3 rounded border border-[#DC2626]/40 bg-[#FEF2F2] text-xs text-[#DC2626] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">Live AI Analysis Unavailable</p>
                      <p>{imagingError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Imaging Analysis Report Card with Strict Provenance Banner */}
              <div
                className={`p-5 space-y-4 ${
                  imagingReport.provenance === 'functional_ai'
                    ? 'clinical-card-active'
                    : 'clinical-card'
                }`}
              >
                <ProvenanceBanner
                  provenance={imagingReport.provenance}
                  modelId={imagingReport.modelId}
                  analyzedAt={imagingReport.analyzedAt}
                  latencyMs={imagingReport.latencyMs}
                />

                {imagingLoading ? (
                  <div className="space-y-3 animate-pulse py-2">
                    <div className="h-5 bg-[#E2E8F0] rounded w-3/4" />
                    <div className="h-3 bg-[#E2E8F0] rounded w-full" />
                    <div className="h-3 bg-[#E2E8F0] rounded w-5/6" />
                    <div className="h-20 bg-[#F4F7FB] rounded w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          Primary Radiological Observation
                        </p>
                        <h3 className="text-base font-display font-bold text-[#071D35]">
                          {imagingReport.result.primaryPathology}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <ConfidenceTag score={imagingReport.result.confidence} />
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            computedPriority === 'High'
                              ? 'bg-[#DC2626]/10 text-[#DC2626]'
                              : computedPriority === 'Medium'
                              ? 'bg-[#F59E0B]/15 text-[#B45309]'
                              : 'bg-[#0D9488]/10 text-[#0D9488]'
                          }`}
                        >
                          {computedPriority} Priority
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#44474D]">
                        Key Observations
                      </p>
                      <ul className="space-y-1 text-xs text-[#44474D]">
                        {imagingReport.result.findings.map((f, i) => (
                          <li key={i} className="leading-relaxed">
                            · {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {imagingReport.result.anatomicalObservations?.length > 0 && (
                      <div className="border border-[#E2E8F0] rounded overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#44474D]">
                              <th className="py-2 px-3">Structure</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Detail</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {imagingReport.result.anatomicalObservations.map((obs, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-medium text-[#071D35]">
                                  {obs.structure}
                                </td>
                                <td className="py-2 px-3 font-semibold text-[#006A67]">
                                  {obs.status}
                                </td>
                                <td className="py-2 px-3 text-[#44474D]">{obs.detail}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0] text-xs space-y-1">
                      <p className="font-semibold text-[#071D35]">
                        Impression: {imagingReport.result.impression}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Limitations: {imagingReport.result.limitations}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const prefix =
                            imagingReport.provenance === 'functional_ai'
                              ? `[AI ${modalityConfig.shortLabel} Read · ${imagingReport.modelId}]`
                              : `[Simulated ${modalityConfig.shortLabel} Demo Baseline]`;
                          onAddNoteToChart(
                            patient.id,
                            `${prefix} ${imagingReport.result.impression}`
                          );
                          setChartSyncedNotice(
                            `Impression appended to ${patient.name}'s chart notes.`
                          );
                        }}
                        className="px-3 py-1.5 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold transition-colors"
                      >
                        Append to {patient.name.split(' ')[0]}&apos;s Chart
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenOrderEntry(
                            imagingReport.result.recommendedNextSteps[0] ?? 'Follow-up Study',
                            'Imaging'
                          )
                        }
                        className="px-3 py-1.5 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
                      >
                        Order Follow-Up
                      </button>
                    </div>

                    {chartSyncedNotice && (
                      <p className="text-xs font-semibold text-[#0D9488]">{chartSyncedNotice}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODE 2: MULTI-SYSTEM DISEASE ANALYSIS ENGINE (5 BODY SYSTEMS)
         ============================================================ */}
      {studioMode === 'disease' && (
        <div className="space-y-5">
          {/* 5 Body System Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BODY_SYSTEMS.map((sys) => {
              const active = diseaseSystem === sys.id;
              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => handleSwitchDiseaseSystem(sys.id)}
                  className={`text-left p-3.5 rounded-lg border transition-all duration-150 space-y-1 ${
                    active
                      ? 'clinical-card-active bg-white'
                      : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <p className="text-sm font-display font-bold text-[#071D35]">{sys.label}</p>
                  <p className="text-[11px] text-[#64748B] line-clamp-2">
                    {sys.focusPathologies.slice(0, 2).join(' · ')}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Left (Col 1–5): System Clinical Context & Compatible Reasoning Model */}
            <div className="xl:col-span-5 clinical-card p-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#19B6B2]" />
                  <span>{activeSystemMeta.label} System Diagnostic Query</span>
                </h2>
                <p className="text-xs text-[#64748B]">
                  Target pathologies: {activeSystemMeta.focusPathologies.join(', ')}
                </p>
              </div>

              <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0] text-xs space-y-1">
                <p className="font-semibold text-[#071D35]">
                  Chart Telemetry Synced: {patient.name} ({patient.age}y {patient.sex},{' '}
                  {patient.bed})
                </p>
                <p className="text-[#44474D]">Chief Complaint: {patient.chiefComplaint}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#071D35]">
                  Compatible Clinical Reasoning Model
                </p>
                {DISEASE_REASONING_MODELS.map((m) => (
                  <label
                    key={m.id}
                    className={`block p-3 rounded border cursor-pointer transition-colors ${
                      diseaseModelId === m.id
                        ? 'border-[#19B6B2] bg-[#19B6B2]/[0.05]'
                        : 'border-[#E2E8F0] hover:bg-[#F4F7FB]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="disease-model"
                        checked={diseaseModelId === m.id}
                        onChange={() => setDiseaseModelId(m.id)}
                        className="accent-[#19B6B2]"
                      />
                      <span className="text-xs font-mono font-semibold text-[#071D35]">
                        {m.label}
                      </span>
                    </div>
                    <p className="mt-1 pl-6 text-[11px] text-[#64748B]">{m.description}</p>
                  </label>
                ))}
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">
                  Focused {activeSystemMeta.label} Presentation &amp; Exam Findings
                </span>
                <textarea
                  rows={4}
                  value={diseaseObservation}
                  onChange={(e) => setDiseaseObservation(e.target.value)}
                  className="clinical-input w-full p-2.5 text-xs text-[#071D35] resize-none"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={diseaseLoading}
                  onClick={handleRunLiveDiseaseAi}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] disabled:opacity-60 text-[#071D35] text-xs font-semibold transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>
                    {diseaseLoading
                      ? `Evaluating ${activeSystemMeta.label} System...`
                      : `Run Live ${activeSystemMeta.label} AI Analysis`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDiseaseError(null);
                    setDiseaseReport(SIMULATED_DISEASE_BASELINE[diseaseSystem]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#44474D]"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Simulated Demo</span>
                </button>
              </div>

              {diseaseError && (
                <div className="p-3 rounded border border-[#DC2626]/40 bg-[#FEF2F2] text-xs text-[#DC2626] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Live Disease Analysis Failed</p>
                    <p>{diseaseError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right (Col 6–12): Ranked Multi-System Differentials & Red Flags */}
            <div className="xl:col-span-7 space-y-4">
              <div
                className={`p-5 space-y-4 ${
                  diseaseReport.provenance === 'functional_ai'
                    ? 'clinical-card-active'
                    : 'clinical-card'
                }`}
              >
                <ProvenanceBanner
                  provenance={diseaseReport.provenance}
                  modelId={diseaseReport.modelId}
                  analyzedAt={diseaseReport.analyzedAt}
                  latencyMs={diseaseReport.latencyMs}
                />

                {diseaseLoading ? (
                  <div className="space-y-3 animate-pulse py-3">
                    <div className="h-5 bg-[#E2E8F0] rounded w-2/3" />
                    <div className="h-24 bg-[#F4F7FB] rounded w-full" />
                    <div className="h-24 bg-[#F4F7FB] rounded w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-[#071D35]">
                        {activeSystemMeta.label} System Assessment
                      </h3>
                      <p className="text-xs text-[#44474D] leading-relaxed">
                        {diseaseReport.result.systemRiskAssessment}
                      </p>
                    </div>

                    {diseaseReport.result.criticalRedFlags.length > 0 && (
                      <div className="p-3 rounded border border-[#DC2626]/30 bg-[#FEF2F2]/60 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#DC2626] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Critical Red Flags</span>
                        </p>
                        <ul className="space-y-1 text-xs text-[#991B1B]">
                          {diseaseReport.result.criticalRedFlags.map((flag, i) => (
                            <li key={i}>· {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      {diseaseReport.result.differentials.map((diff, idx) => (
                        <div
                          key={`${diff.condition}-${idx}`}
                          className="p-4 rounded-lg border border-[#E2E8F0] bg-white space-y-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-[#071D35]">
                                  {diff.condition}
                                </h4>
                                <span className="text-[11px] font-mono text-[#64748B]">
                                  ICD-10 {diff.icd10}
                                </span>
                              </div>
                              <p className="text-xs text-[#44474D] mt-0.5">
                                Workup: {diff.recommendedWorkup}
                              </p>
                            </div>
                            <ConfidenceTag score={diff.confidence} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0D9488] mb-1">
                                Supporting Evidence
                              </p>
                              <ul className="space-y-1 text-[#44474D]">
                                {diff.supportingEvidence.map((ev, i) => (
                                  <li key={i}>· {ev}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                                Caveats / Rule-Outs
                              </p>
                              <ul className="space-y-1 text-[#44474D]">
                                {diff.contradictingFactors.map((cf, i) => (
                                  <li key={i}>· {cf}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenOrderEntry(
                                  diff.recommendedWorkup.split(',')[0],
                                  'Lab Panel'
                                )
                              }
                              className="px-3 py-1.5 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
                            >
                              Stage Workup Order
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
