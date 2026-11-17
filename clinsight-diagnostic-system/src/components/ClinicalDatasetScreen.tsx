import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FlaskConical,
  Play,
  Upload,
} from 'lucide-react';
import { DatasetAnalysisRecord, PatientRecord } from '../types/clinical';
import {
  analyzeClinicalDataset,
  parseCsvText,
  SYNTHETIC_COHORT_CSV,
} from '../utils/datasetMl';

interface ClinicalDatasetScreenProps {
  patients: PatientRecord[];
  datasets: DatasetAnalysisRecord[];
  selectedPatientId: string;
  onSaveDatasetAnalysis: (record: DatasetAnalysisRecord) => Promise<void>;
}

export const ClinicalDatasetScreen: React.FC<ClinicalDatasetScreenProps> = ({
  patients,
  datasets,
  selectedPatientId,
  onSaveDatasetAnalysis,
}) => {
  const [linkedPatientId, setLinkedPatientId] = useState<string>(selectedPatientId || '');
  const [fileName, setFileName] = useState<string>('synthetic_icu_sepsis_cohort.csv');
  const [csvText, setCsvText] = useState<string>(SYNTHETIC_COHORT_CSV);
  const [isSyntheticSample, setIsSyntheticSample] = useState<boolean>(true);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const [modelType, setModelType] = useState<DatasetAnalysisRecord['modelType']>('Logistic Regression');
  const [targetColumn, setTargetColumn] = useState<string>('high_risk_outcome');
  const [running, setRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [activeRecord, setActiveRecord] = useState<DatasetAnalysisRecord | null>(() => {
    if (datasets.length > 0) return datasets[0];
    return null;
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedPreview = useMemo(() => {
    try {
      const parsed = parseCsvText(csvText);
      return { parsed, error: null };
    } catch (err: unknown) {
      return {
        parsed: null,
        error: err instanceof Error ? err.message : 'Invalid CSV format.',
      };
    }
  }, [csvText]);

  const handleCsvFile = (file: File) => {
    setErrorMsg(null);
    setSavedNotice(null);
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMsg(`Unsupported file "${file.name}". Please upload a valid .csv clinical dataset.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        try {
          const parsed = parseCsvText(reader.result);
          setFileName(file.name);
          setCsvText(reader.result);
          setIsSyntheticSample(false);
          const candidateTarget =
            parsed.headers.find((h) => /(outcome|target|risk|label|mortality|diagnosis)/i.test(h)) ??
            parsed.headers[parsed.headers.length - 1] ??
            '';
          setTargetColumn(candidateTarget);
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : 'Unable to parse CSV file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSynthetic = () => {
    setErrorMsg(null);
    setSavedNotice(null);
    setFileName('synthetic_icu_sepsis_cohort.csv');
    setCsvText(SYNTHETIC_COHORT_CSV);
    setIsSyntheticSample(true);
    setTargetColumn('high_risk_outcome');
  };

  const handleRunAnalysis = async () => {
    setRunning(true);
    setErrorMsg(null);
    setSavedNotice(null);
    try {
      const result = analyzeClinicalDataset({
        fileName,
        csvText,
        targetColumn: modelType === 'Descriptive Only' ? undefined : targetColumn || undefined,
        modelType,
        patientId: linkedPatientId || undefined,
      });
      await onSaveDatasetAnalysis(result);
      setActiveRecord(result);
      setSavedNotice(
        linkedPatientId
          ? `Dataset analysis completed and linked to patient profile & priority queue.`
          : `Dataset analysis completed and saved to ClinSight cohort history.`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze dataset.');
    } finally {
      setRunning(false);
    }
  };

  const currentDisplay = activeRecord ?? datasets[0] ?? null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
            Clinical Dataset Integration &amp; ML Analytics
          </h1>
          <p className="text-sm text-[#44474D]">
            Upload structured CSV clinical data for descriptive statistics, Pearson correlations, and Logistic Regression / Random Forest risk modeling
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSynthetic}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35] whitespace-nowrap"
        >
          <FlaskConical className="w-3.5 h-3.5 text-[#D97706]" />
          <span>Load Synthetic Cohort CSV</span>
        </button>
      </div>

      {/* Provenance & Decision Support Banner */}
      <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#071D35]">
          <BarChart3 className="w-4 h-4 text-[#19B6B2] shrink-0" />
          <span>
            <strong>Client-Side Statistical &amp; ML Computation:</strong> Descriptive metrics,
            correlations, and cross-split classification metrics are computed directly from the
            loaded CSV rows without fabricated data.
          </span>
        </div>
        {isSyntheticSample && (
          <span className="px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#B45309] font-semibold">
            Synthetic Demonstration Cohort Active
          </span>
        )}
      </div>

      {/* Upload & Configuration Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-5 clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#19B6B2]" />
              <span>CSV Dataset Upload &amp; Model Config</span>
            </h2>
            {parsedPreview.parsed && (
              <span className="text-[11px] font-mono text-[#64748B] tabular-nums">
                {parsedPreview.parsed.rows.length} rows × {parsedPreview.parsed.headers.length} cols
              </span>
            )}
          </div>

          {/* Drag & Drop CSV Box */}
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
              if (f) handleCsvFile(f);
            }}
            className={`p-5 rounded-lg border-2 border-dashed text-center transition-colors ${
              dragActive
                ? 'border-[#19B6B2] bg-[#19B6B2]/[0.06]'
                : 'border-[#CBD5E1] bg-[#F4F7FB]/60 hover:border-[#19B6B2]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsvFile(f);
              }}
              className="hidden"
            />
            <Upload className="w-7 h-7 text-[#19B6B2] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#071D35]">
              Drag &amp; drop a clinical CSV dataset here
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Current source: <span className="font-mono text-[#071D35]">{fileName}</span>
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-[#E2E8F0] hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
            >
              Browse CSV File
            </button>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">
                Associate with Patient Profile (Optional)
              </span>
              <select
                value={linkedPatientId}
                onChange={(e) => setLinkedPatientId(e.target.value)}
                className="clinical-input w-full px-3 py-2 text-xs font-medium text-[#071D35]"
              >
                <option value="">Cohort-Level Study (Unlinked)</option>
                {patients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.patientCode ?? pt.mrn} — {pt.name} ({pt.unit})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Statistical / ML Model</span>
                <select
                  value={modelType}
                  onChange={(e) =>
                    setModelType(e.target.value as DatasetAnalysisRecord['modelType'])
                  }
                  className="clinical-input w-full px-3 py-2 text-xs font-medium text-[#071D35]"
                >
                  <option value="Logistic Regression">Logistic Regression</option>
                  <option value="Random Forest">Random Forest (15 Trees)</option>
                  <option value="Descriptive Only">Descriptive Statistics Only</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">
                  Target Outcome Column
                </span>
                <select
                  disabled={modelType === 'Descriptive Only' || !parsedPreview.parsed}
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="clinical-input w-full px-3 py-2 text-xs font-medium text-[#071D35] disabled:opacity-50"
                >
                  <option value="">None (Descriptive)</option>
                  {(parsedPreview.parsed?.headers ?? []).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={running || !!parsedPreview.error}
            onClick={handleRunAnalysis}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] disabled:opacity-60 text-[#071D35] text-xs font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{running ? 'Running Statistical & ML Pipeline...' : 'Run Clinical Dataset Analysis'}</span>
          </button>

          {(errorMsg || parsedPreview.error) && (
            <div className="p-3 rounded border border-[#DC2626]/40 bg-[#FEF2F2] text-xs text-[#DC2626] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg || parsedPreview.error}</span>
            </div>
          )}

          {savedNotice && (
            <div className="p-3 rounded border border-[#0D9488]/30 bg-[#0D9488]/[0.06] text-xs text-[#006A67] flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* Saved Dataset History */}
          {datasets.length > 0 && (
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Saved Dataset Runs ({datasets.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {datasets.map((ds) => {
                  const selected = currentDisplay?.id === ds.id;
                  return (
                    <button
                      key={ds.id}
                      type="button"
                      onClick={() => setActiveRecord(ds)}
                      className={`w-full text-left p-2.5 rounded border text-xs transition-colors ${
                        selected
                          ? 'border-[#19B6B2] bg-[#19B6B2]/[0.06]'
                          : 'border-[#E2E8F0] hover:bg-[#F4F7FB]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#071D35] truncate">{ds.fileName}</span>
                        <span className="font-mono text-[11px] text-[#006A67] shrink-0">
                          {ds.modelType}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] font-mono tabular-nums mt-0.5">
                        {ds.recordCount} rows · {ds.featureCount} features
                        {ds.metrics ? ` · Acc ${ds.metrics.accuracy}%` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Statistical & ML Results */}
        <div className="xl:col-span-7 space-y-4">
          {!currentDisplay ? (
            <div className="clinical-card p-10 text-center space-y-2">
              <Database className="w-9 h-9 text-[#19B6B2] mx-auto" />
              <p className="text-sm font-semibold text-[#071D35]">
                No Dataset Analysis Executed Yet
              </p>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Click &ldquo;Run Clinical Dataset Analysis&rdquo; on the loaded synthetic cohort CSV
                or upload your own structured clinical CSV to compute statistics, correlations, and
                risk classification metrics.
              </p>
            </div>
          ) : (
            <>
              {/* Overview KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="clinical-card p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Records
                  </p>
                  <p className="text-xl font-display font-bold text-[#071D35] tabular-nums mt-0.5">
                    {currentDisplay.recordCount}
                  </p>
                </div>
                <div className="clinical-card p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Features
                  </p>
                  <p className="text-xl font-display font-bold text-[#071D35] tabular-nums mt-0.5">
                    {currentDisplay.featureCount}
                  </p>
                </div>
                <div className="clinical-card p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Missing Values
                  </p>
                  <p className="text-xl font-display font-bold text-[#071D35] tabular-nums mt-0.5">
                    {currentDisplay.missingValuesTotal}
                  </p>
                </div>
                <div className="clinical-card p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Duplicates
                  </p>
                  <p className="text-xl font-display font-bold text-[#071D35] tabular-nums mt-0.5">
                    {currentDisplay.duplicateRecords}
                  </p>
                </div>
              </div>

              {/* Model Evaluation Metrics & Confusion Matrix */}
              {currentDisplay.metrics && (
                <div className="clinical-card-active p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#071D35]">
                        {currentDisplay.modelType} Evaluation Metrics
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        Target outcome column:{' '}
                        <span className="font-mono font-semibold text-[#071D35]">
                          {currentDisplay.targetColumn}
                        </span>{' '}
                        (75/25 holdout evaluation)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#19B6B2]/15 text-[#006A67] text-[11px] font-semibold">
                      Statistical ML Model
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0]">
                      <p className="text-[11px] text-[#64748B] font-medium">Accuracy</p>
                      <p className="text-lg font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.accuracy}%
                      </p>
                    </div>
                    <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0]">
                      <p className="text-[11px] text-[#64748B] font-medium">Precision</p>
                      <p className="text-lg font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.precision}%
                      </p>
                    </div>
                    <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0]">
                      <p className="text-[11px] text-[#64748B] font-medium">Recall</p>
                      <p className="text-lg font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.recall}%
                      </p>
                    </div>
                    <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0]">
                      <p className="text-[11px] text-[#64748B] font-medium">F1-Score</p>
                      <p className="text-lg font-mono font-bold text-[#006A67] tabular-nums">
                        {currentDisplay.metrics.f1Score}%
                      </p>
                    </div>
                  </div>

                  {/* Confusion Matrix */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded bg-[#0D9488]/10 border border-[#0D9488]/30">
                      <p className="text-[10px] font-semibold uppercase text-[#0D9488]">
                        True Positive
                      </p>
                      <p className="text-base font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.confusionMatrix.tp}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                      <p className="text-[10px] font-semibold uppercase text-[#B45309]">
                        False Positive
                      </p>
                      <p className="text-base font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.confusionMatrix.fp}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                      <p className="text-[10px] font-semibold uppercase text-[#B45309]">
                        False Negative
                      </p>
                      <p className="text-base font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.confusionMatrix.fn}
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-[#0D9488]/10 border border-[#0D9488]/30">
                      <p className="text-[10px] font-semibold uppercase text-[#0D9488]">
                        True Negative
                      </p>
                      <p className="text-base font-mono font-bold text-[#071D35] tabular-nums">
                        {currentDisplay.metrics.confusionMatrix.tn}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Risk Indicators */}
              <div className="clinical-card p-5 space-y-2.5">
                <h3 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                  <span>Dataset Clinical Risk Indicators</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-[#44474D]">
                  {currentDisplay.clinicalRiskIndicators.map((ind, idx) => (
                    <li
                      key={idx}
                      className="p-2.5 rounded bg-[#F4F7FB] border border-[#E2E8F0] text-[#071D35]"
                    >
                      · {ind}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature Statistical Summary Table */}
              <div className="clinical-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#071D35]">
                    Feature Descriptive Statistics
                  </h3>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {currentDisplay.fileName}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="py-2.5 px-4">Feature</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Missing</th>
                        <th className="py-2.5 px-3">Mean / Top</th>
                        <th className="py-2.5 px-3">Median</th>
                        <th className="py-2.5 px-3">Std Dev</th>
                        <th className="py-2.5 px-4">Range (Min–Max)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {currentDisplay.featureSummaries.map((f) => (
                        <tr key={f.name} className="hover:bg-[#F4F7FB]/60">
                          <td className="py-2.5 px-4 font-mono font-semibold text-[#071D35]">
                            {f.name}
                          </td>
                          <td className="py-2.5 px-3 text-[#64748B]">{f.type}</td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-[#44474D]">
                            {f.missingCount}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-[#071D35]">
                            {f.type === 'numeric' ? f.mean : f.topValue}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-[#44474D]">
                            {f.type === 'numeric' ? f.median : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-[#44474D]">
                            {f.type === 'numeric' ? f.stdDev : '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-[#44474D]">
                            {f.type === 'numeric' ? `${f.min} – ${f.max}` : `${f.uniqueCount} unique`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pairwise Correlations */}
              {currentDisplay.correlations.length > 0 && (
                <div className="clinical-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-[#071D35]">
                    Top Feature Correlations (Pearson r)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentDisplay.correlations.slice(0, 8).map((c, idx) => {
                      const pct = Math.round(Math.abs(c.r) * 100);
                      const positive = c.r >= 0;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded border border-[#E2E8F0] bg-[#F4F7FB]/50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-mono text-[#071D35] truncate">
                              {c.featureA} ↔ {c.featureB}
                            </span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                positive ? 'text-[#006A67]' : 'text-[#D97706]'
                              }`}
                            >
                              r = {c.r}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className={`h-full ${
                                positive ? 'bg-[#19B6B2]' : 'bg-[#F59E0B]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
