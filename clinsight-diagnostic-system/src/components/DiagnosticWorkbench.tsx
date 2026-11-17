import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Contrast,
  Cpu,
  Eye,
  FileText,
  FlaskConical,
  Grid3X3,
  HeartPulse,
  Maximize2,
  PanelRightOpen,
  Plus,
  Scan,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  AcuityLevel,
  ClinicalOrder,
  DifferentialStatus,
  ImagingAnalysisEnvelope,
  ImagingModalityId,
  LabResult,
  PatientRecord,
  TimeframeKey,
  WorkbenchTab,
} from '../types/clinical';
import { CLINICIAN_PROFILE } from '../data/clinicalData';
import { AcuityTag, ConfidenceTag, LabFlagTag, ProvenanceBanner } from './StatusTag';
import {
  DualAxisBiomarkerChart,
  EcgTelemetryStrip,
  VitalSparkline,
  VitalsMultiTrendChart,
} from './Charts';

interface DiagnosticWorkbenchProps {
  patients: PatientRecord[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  onConfirmDifferential: (patientId: string, diffId: string) => void;
  onDismissDifferential: (patientId: string, diffId: string) => void;
  onAcknowledgeAlert: (patientId: string, alertId: string) => void;
  onOverrideAlert: (patientId: string, alertId: string, reason: string) => void;
  onAddClinicalNote: (patientId: string, noteText: string) => void;
  onToggleOrderStatus: (patientId: string, orderId: string) => void;
  onRecordVitals: (
    patientId: string,
    vitals: { hr: number; sbp: number; dbp: number; spo2: number; temp: number; rr: number; lactate: number }
  ) => void;
  onOpenOrderEntry: (prefillName?: string, prefillType?: ClinicalOrder['type']) => void;
  onOpenMultimodalStudio?: (modality?: ImagingModalityId) => void;
}

export const DiagnosticWorkbench: React.FC<DiagnosticWorkbenchProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onConfirmDifferential,
  onDismissDifferential,
  onAcknowledgeAlert,
  onOverrideAlert,
  onAddClinicalNote,
  onToggleOrderStatus,
  onRecordVitals,
  onOpenOrderEntry,
  onOpenMultimodalStudio,
}) => {
  const [acuityFilter, setAcuityFilter] = useState<'All' | AcuityLevel>('All');
  const [rosterSearch, setRosterSearch] = useState('');
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('differential');
  const [timeframe, setTimeframe] = useState<TimeframeKey>('6H');
  const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({
    notes: true,
    labs: true,
    imaging: true,
    orders: false,
  });

  // Lab Telemetry sub-state
  const [labCategory, setLabCategory] = useState<'All' | LabResult['category']>('All');
  const [labQuery, setLabQuery] = useState('');
  const [inspectedLabId, setInspectedLabId] = useState<string | null>(null);

  // Imaging PACS sub-state
  const [selectedStudyIdx, setSelectedStudyIdx] = useState(0);
  const [pacsContrast, setPacsContrast] = useState(110);
  const [pacsBrightness, setPacsBrightness] = useState(100);
  const [pacsInvert, setPacsInvert] = useState(false);
  const [pacsGrid, setPacsGrid] = useState(false);
  const [pacsZoom, setPacsZoom] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});
  const [avatarError, setAvatarError] = useState(false);
  const [liveAiReads, setLiveAiReads] = useState<Record<string, ImagingAnalysisEnvelope>>({});
  const [liveAiLoading, setLiveAiLoading] = useState(false);
  const [liveAiError, setLiveAiError] = useState<string | null>(null);

  // Right CDS sidebar mobile/tablet drawer toggle
  const [cdsDrawerOpen, setCdsDrawerOpen] = useState(false);

  // Override alert inline state
  const [overridingAlertId, setOverridingAlertId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Bedside note / CDS input
  const [noteInput, setNoteInput] = useState('');

  // Record Vitals Modal
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [newHr, setNewHr] = useState('108');
  const [newSbp, setNewSbp] = useState('96');
  const [newDbp, setNewDbp] = useState('60');
  const [newSpo2, setNewSpo2] = useState('94');
  const [newTemp, setNewTemp] = useState('38.4');
  const [newRr, setNewRr] = useState('22');
  const [newLactate, setNewLactate] = useState('3.2');

  const patient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId]
  );

  const filteredRoster = useMemo(() => {
    return patients.filter((pt) => {
      const matchAcuity = acuityFilter === 'All' || pt.acuity === acuityFilter;
      const q = rosterSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        pt.name.toLowerCase().includes(q) ||
        pt.mrn.toLowerCase().includes(q) ||
        pt.bed.toLowerCase().includes(q);
      return matchAcuity && matchSearch;
    });
  }, [patients, acuityFilter, rosterSearch]);

  const series = patient.vitals[timeframe] ?? patient.vitals['6H'];
  const latestVitals = series[series.length - 1];
  const mapValue = latestVitals
    ? Math.round((latestVitals.sbp + 2 * latestVitals.dbp) / 3)
    : 0;

  const filteredLabs = useMemo(() => {
    return patient.labs.filter((lab) => {
      const catOk = labCategory === 'All' || lab.category === labCategory;
      const q = labQuery.trim().toLowerCase();
      const searchOk = !q || lab.analyte.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [patient.labs, labCategory, labQuery]);

  const inspectedLab = useMemo(() => {
    if (!filteredLabs.length) return null;
    return filteredLabs.find((l) => l.id === inspectedLabId) ?? filteredLabs[0];
  }, [filteredLabs, inspectedLabId]);

  const activeStudy = patient.imaging[selectedStudyIdx] ?? patient.imaging[0];
  const unackAlerts = patient.alerts.filter((a) => !a.acknowledged && !a.overriddenReason);

  const handleOpenVitalsModal = () => {
    if (latestVitals) {
      setNewHr(String(latestVitals.hr));
      setNewSbp(String(latestVitals.sbp));
      setNewDbp(String(latestVitals.dbp));
      setNewSpo2(String(latestVitals.spo2));
      setNewTemp(String(latestVitals.temp));
      setNewRr(String(latestVitals.rr));
      setNewLactate(String(latestVitals.lactate));
    }
    setVitalsModalOpen(true);
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    onRecordVitals(patient.id, {
      hr: Number(newHr) || 80,
      sbp: Number(newSbp) || 120,
      dbp: Number(newDbp) || 75,
      spo2: Number(newSpo2) || 97,
      temp: Number(newTemp) || 37.0,
      rr: Number(newRr) || 16,
      lactate: Number(newLactate) || 1.2,
    });
    setVitalsModalOpen(false);
  };

  const handleRunCdsNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    onAddClinicalNote(patient.id, trimmed);
    setNoteInput('');
  };

  const renderCdsSidebarContent = () => (
    <div className="space-y-4">
      {/* Predictive Trajectory Card */}
      <div className="clinical-card p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#19B6B2]" aria-hidden="true" />
            <span>Predictive Deterioration</span>
          </h3>
          <span className="text-[11px] font-mono text-[#64748B]">CDS Model</span>
        </div>

        <div className="space-y-3">
          {patient.risks.map((risk) => {
            const barColor =
              risk.probability >= 65
                ? '#DC2626'
                : risk.probability >= 40
                ? '#F59E0B'
                : '#19B6B2';
            return (
              <div key={risk.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[#071D35] truncate">{risk.label}</span>
                  <span className="font-mono font-semibold tabular-nums text-[#071D35] shrink-0">
                    {risk.probability}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#F4F7FB] rounded-full overflow-hidden border border-[#E2E8F0]">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${risk.probability}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="truncate">{risk.driver}</span>
                  <span className="shrink-0 ml-2">{risk.horizon}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Safety Alerts */}
      <div className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
            <span>Clinical Safety Alerts</span>
          </h3>
          <span className="text-xs font-mono tabular-nums text-[#44474D]">
            {unackAlerts.length} active
          </span>
        </div>

        {patient.alerts.length === 0 ? (
          <p className="text-xs text-[#64748B] py-2">
            No active pharmacotherapy or threshold alerts for this patient.
          </p>
        ) : (
          <div className="space-y-2.5">
            {patient.alerts.map((alert) => {
              const resolved = alert.acknowledged || Boolean(alert.overriddenReason);
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded border text-xs space-y-2 ${
                    resolved
                      ? 'bg-[#F4F7FB] border-[#E2E8F0] opacity-75'
                      : alert.severity === 'Critical'
                      ? 'bg-[#FEF2F2]/60 border-[#DC2626]/30'
                      : 'bg-[#FFFBEB]/70 border-[#F59E0B]/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`font-semibold ${
                        alert.severity === 'Critical' ? 'text-[#DC2626]' : 'text-[#B45309]'
                      }`}
                    >
                      {alert.title}
                    </span>
                    <span className="font-mono text-[11px] text-[#64748B] shrink-0">
                      {alert.triggeredAt}
                    </span>
                  </div>
                  <p className="text-[#44474D] leading-relaxed">{alert.detail}</p>

                  {alert.overriddenReason && (
                    <p className="text-[11px] text-[#071D35] font-medium">
                      Overridden: {alert.overriddenReason}
                    </p>
                  )}

                  {alert.acknowledged && !alert.overriddenReason && (
                    <p className="text-[11px] text-[#0D9488] font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Acknowledged by {CLINICIAN_PROFILE.name}
                    </p>
                  )}

                  {!resolved && (
                    <div className="pt-1 space-y-2">
                      {overridingAlertId === alert.id ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Document clinical override rationale..."
                            className="clinical-input w-full px-2.5 py-1.5 text-xs text-[#071D35]"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!overrideReason.trim()) return;
                                onOverrideAlert(patient.id, alert.id, overrideReason.trim());
                                setOverridingAlertId(null);
                                setOverrideReason('');
                              }}
                              className="px-2.5 py-1 rounded bg-[#DC2626] text-white text-[11px] font-semibold hover:bg-[#B91C1C]"
                            >
                              Confirm Override
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOverridingAlertId(null);
                                setOverrideReason('');
                              }}
                              className="px-2 py-1 rounded text-[11px] text-[#44474D] hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAcknowledgeAlert(patient.id, alert.id)}
                            className="px-2.5 py-1 rounded bg-[#071D35] text-white text-[11px] font-semibold hover:bg-[#0B2A4A] transition-colors"
                          >
                            Acknowledge
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverridingAlertId(alert.id)}
                            className="px-2.5 py-1 rounded border border-[#DC2626]/40 text-[#DC2626] text-[11px] font-semibold hover:bg-[#FEF2F2] transition-colors"
                          >
                            Override Alert
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bedside Observation & CDS Recalculation */}
      <div className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#071D35] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#19B6B2]" aria-hidden="true" />
            <span>Bedside CDS Note</span>
          </h3>
        </div>
        <form onSubmit={handleRunCdsNote} className="space-y-2.5">
          <textarea
            rows={3}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add new clinical finding (e.g., pleuritic chest pain, hemoptysis, oliguria) to re-score differentials..."
            className="clinical-input w-full p-2.5 text-xs text-[#071D35] resize-none"
          />
          <button
            type="submit"
            className="w-full py-2 px-3 rounded bg-[#19B6B2] hover:bg-[#55DDE0] text-[#071D35] text-xs font-semibold transition-colors duration-150"
          >
            Run CDS Inference
          </button>
        </form>

        {patient.notes.length > 0 && (
          <div className="pt-2 border-t border-[#E2E8F0] space-y-2 max-h-44 overflow-y-auto">
            {patient.notes.map((n) => (
              <div key={n.id} className="text-xs space-y-0.5">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="font-semibold text-[#071D35]">{n.author}</span>
                  <span className="font-mono">{n.timestamp}</span>
                </div>
                <p className="text-[#44474D] leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-5 pb-20 lg:pb-8">
      {/* 12-Column Responsive Diagnostic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-8 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL (Col 1–3): Patient Roster & Clinical History Tree */}
        <aside className="md:col-span-3 xl:col-span-3 space-y-4">
          {/* Attending Physician Bar */}
          <div className="clinical-card p-3.5 flex items-center gap-3">
            {!avatarError ? (
              <img
                src={CLINICIAN_PROFILE.avatarUrl}
                alt={CLINICIAN_PROFILE.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-10 h-10 rounded object-cover border border-[#E2E8F0] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-[#071D35] text-white flex items-center justify-center text-xs font-bold shrink-0">
                AT
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#071D35] truncate">
                {CLINICIAN_PROFILE.name}
              </p>
              <p className="text-[11px] text-[#64748B] truncate">
                {CLINICIAN_PROFILE.role} · {patients.length} Active
              </p>
            </div>
          </div>

          {/* Patient Roster */}
          <div className="clinical-card overflow-hidden">
            <div className="p-3.5 border-b border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#44474D]">
                  Active Patient Roster
                </h2>
                <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
                  {filteredRoster.length}/{patients.length}
                </span>
              </div>

              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter name, MRN, bed..."
                  className="clinical-input w-full pl-8 pr-2.5 py-1.5 text-xs text-[#071D35]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
                {(['All', AcuityLevel.Critical, AcuityLevel.Guarded, AcuityLevel.Stable] as const).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAcuityFilter(lvl)}
                      className={`py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                        acuityFilter === lvl
                          ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                          : 'text-[#64748B] hover:text-[#071D35]'
                      }`}
                    >
                      {lvl}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] max-h-[340px] overflow-y-auto">
              {filteredRoster.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#64748B]">
                  No patients match current filter.
                </div>
              ) : (
                filteredRoster.map((pt) => {
                  const active = pt.id === patient.id;
                  const ptLatest = pt.vitals['6H'][pt.vitals['6H'].length - 1];
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => {
                        onSelectPatient(pt.id);
                        setSelectedStudyIdx(0);
                        setInspectedLabId(null);
                      }}
                      className={`w-full text-left px-3.5 py-3 transition-colors duration-150 ${
                        active ? 'bg-[#19B6B2]/8' : 'hover:bg-[#F4F7FB]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-semibold truncate ${
                            active ? 'text-[#071D35]' : 'text-[#181C1F]'
                          }`}
                        >
                          {pt.name}
                        </span>
                        <AcuityTag acuity={pt.acuity} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B] font-mono tabular-nums">
                        <span>
                          {pt.bed} · {pt.age}
                          {pt.sex}
                        </span>
                        {ptLatest && (
                          <span>
                            HR {ptLatest.hr} · {ptLatest.sbp}/{ptLatest.dbp}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Patient History Tree */}
          <div className="clinical-card p-3.5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#44474D]">
              Chart History Tree
            </h2>

            {/* Labs Node */}
            <div>
              <button
                type="button"
                onClick={() => setTreeExpanded((p) => ({ ...p, labs: !p.labs }))}
                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-[#071D35] hover:text-[#006A67]"
              >
                <span className="flex items-center gap-1.5">
                  {treeExpanded.labs ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <FlaskConical className="w-3.5 h-3.5 text-[#19B6B2]" />
                  <span>Lab Panels ({patient.labs.length})</span>
                </span>
              </button>
              {treeExpanded.labs && (
                <div className="pl-5 space-y-1 pb-1">
                  {patient.labs.slice(0, 4).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setActiveTab('labs');
                        setInspectedLabId(l.id);
                      }}
                      className="w-full flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-[#F4F7FB] text-left"
                    >
                      <span className="text-[#44474D] truncate">{l.analyte}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#071D35] ml-2">
                        {l.value}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Imaging Node */}
            <div>
              <button
                type="button"
                onClick={() => setTreeExpanded((p) => ({ ...p, imaging: !p.imaging }))}
                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-[#071D35] hover:text-[#006A67]"
              >
                <span className="flex items-center gap-1.5">
                  {treeExpanded.imaging ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <Scan className="w-3.5 h-3.5 text-[#19B6B2]" />
                  <span>Imaging & ECG ({patient.imaging.length})</span>
                </span>
              </button>
              {treeExpanded.imaging && (
                <div className="pl-5 space-y-1 pb-1">
                  {patient.imaging.map((st, idx) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setActiveTab('imaging');
                        setSelectedStudyIdx(idx);
                      }}
                      className="w-full flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-[#F4F7FB] text-left"
                    >
                      <span className="text-[#44474D] truncate">{st.modality}</span>
                      <span className="font-mono text-[#64748B] ml-2 shrink-0">
                        {st.performedAt.replace('Today ', '')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Orders Node */}
            <div>
              <button
                type="button"
                onClick={() => setTreeExpanded((p) => ({ ...p, orders: !p.orders }))}
                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-[#071D35] hover:text-[#006A67]"
              >
                <span className="flex items-center gap-1.5">
                  {treeExpanded.orders ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <ClipboardList className="w-3.5 h-3.5 text-[#19B6B2]" />
                  <span>Active Orders ({patient.orders.length})</span>
                </span>
              </button>
              {treeExpanded.orders && (
                <div className="pl-5 space-y-1 pb-1">
                  {patient.orders.map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="w-full flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-[#F4F7FB] text-left"
                    >
                      <span className="text-[#44474D] truncate">{ord.name}</span>
                      <span className="text-[#0D9488] font-medium ml-2 shrink-0">
                        {ord.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER PANEL (Col 4–9): Primary Diagnostic Workspace */}
        <section className="md:col-span-5 xl:col-span-6 space-y-4 min-w-0">
          {/* Patient Header Banner */}
          <div className="clinical-card p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl lg:text-2xl font-display font-bold text-[#071D35] tracking-tight">
                    {patient.name}
                  </h1>
                  <AcuityTag acuity={patient.acuity} />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#44474D] tabular-nums">
                  <span className="font-mono font-medium text-[#071D35]">{patient.mrn}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {patient.age}y {patient.sex}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{patient.weightKg} kg</span>
                  <span aria-hidden="true">·</span>
                  <span>eGFR {patient.egfr} mL/min</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#071D35]">{patient.bed}</span>
                  <span aria-hidden="true">·</span>
                  <span>Admitted {patient.admittedAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenVitalsModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35] transition-colors whitespace-nowrap"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-[#19B6B2]" aria-hidden="true" />
                  <span>Record Vitals</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCdsDrawerOpen(true)}
                  className="xl:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#19B6B2] text-[#071D35] text-xs font-semibold whitespace-nowrap"
                >
                  <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>CDS ({unackAlerts.length})</span>
                </button>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="text-[#44474D]">
                <span className="font-semibold text-[#071D35]">Chief Complaint:</span>{' '}
                {patient.chiefComplaint}
              </p>
              <p className="text-[#DC2626] font-medium">
                Allergies: {patient.allergies.join(', ')}
              </p>
            </div>
          </div>

          {/* Live Biometrics 6-Metric Strip */}
          {latestVitals && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                {
                  label: 'Heart Rate',
                  val: String(latestVitals.hr),
                  unit: 'bpm',
                  abnormal: latestVitals.hr > 100 || latestVitals.hr < 55,
                  hist: series.map((s) => s.hr),
                  color: '#071D35',
                },
                {
                  label: 'BP (MAP)',
                  val: `${latestVitals.sbp}/${latestVitals.dbp}`,
                  unit: `MAP ${mapValue}`,
                  abnormal: mapValue < 65 || latestVitals.sbp > 180,
                  hist: series.map((s) => s.sbp),
                  color: '#19B6B2',
                },
                {
                  label: 'SpO2',
                  val: `${latestVitals.spo2}`,
                  unit: '%',
                  abnormal: latestVitals.spo2 < 93,
                  hist: series.map((s) => s.spo2),
                  color: '#0D9488',
                },
                {
                  label: 'Temp',
                  val: latestVitals.temp.toFixed(1),
                  unit: '°C',
                  abnormal: latestVitals.temp >= 38.3,
                  hist: series.map((s) => s.temp),
                  color: '#F59E0B',
                },
                {
                  label: 'Resp Rate',
                  val: String(latestVitals.rr),
                  unit: '/min',
                  abnormal: latestVitals.rr >= 22,
                  hist: series.map((s) => s.rr),
                  color: '#4D5F7B',
                },
                {
                  label: 'Lactate',
                  val: latestVitals.lactate.toFixed(1),
                  unit: 'mmol/L',
                  abnormal: latestVitals.lactate >= 2.0,
                  hist: series.map((s) => s.lactate),
                  color: '#DC2626',
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className={`clinical-card p-3 flex flex-col justify-between gap-1.5 ${
                    m.abnormal ? 'border-[#DC2626]/40 bg-[#FEF2F2]/25' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">
                      {m.label}
                    </span>
                    {m.abnormal && (
                      <AlertCircle className="w-3 h-3 text-[#DC2626] shrink-0" aria-label="Abnormal value" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
                        m.abnormal ? 'text-[#DC2626]' : 'text-[#071D35]'
                      }`}
                    >
                      {m.val}
                    </span>
                    <span className="text-[11px] text-[#64748B] truncate">{m.unit}</span>
                  </div>
                  <VitalSparkline values={m.hist} color={m.color} />
                </div>
              ))}
            </div>
          )}

          {/* Primary Workspace Tab Bar */}
          <div className="clinical-card overflow-hidden">
            <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#E2E8F0] overflow-x-auto">
              {(
                [
                  { id: 'differential', label: 'Differential & Matrix' },
                  { id: 'labs', label: 'Lab Telemetry' },
                  { id: 'imaging', label: 'Imaging & ECG' },
                  { id: 'orders', label: 'Orders & Meds' },
                ] as { id: WorkbenchTab; label: string }[]
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      active ? 'text-[#071D35]' : 'text-[#64748B] hover:text-[#071D35]'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#19B6B2]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {/* TAB 1: DIFFERENTIAL & VITALS TREND */}
              {activeTab === 'differential' && (
                <div className="space-y-6">
                  {/* Telemetry Trend Section */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold text-[#071D35]">
                          Hemodynamic & Lactate Trajectory
                        </h2>
                        <p className="text-xs text-[#64748B]">
                          Hover points to inspect exact synchronized bedside readings
                        </p>
                      </div>
                      <div className="flex items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
                        {(['1H', '6H', '24H', '72H'] as TimeframeKey[]).map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setTimeframe(tf)}
                            className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded transition-colors ${
                              timeframe === tf
                                ? 'bg-white text-[#071D35] shadow-xs'
                                : 'text-[#64748B] hover:text-[#071D35]'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>

                    <VitalsMultiTrendChart data={series} />
                  </div>

                  {/* Differential Diagnosis Matrix */}
                  <div className="pt-5 border-t border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-[#071D35]">
                        Diagnostic Differential Matrix
                      </h2>
                      <span className="text-xs text-[#64748B]">
                        {patient.differentials.length} ranked hypotheses
                      </span>
                    </div>

                    <div className="space-y-3">
                      {patient.differentials.map((diff) => {
                        const isConfirmed = diff.status === DifferentialStatus.Confirmed;
                        const isDismissed = diff.status === DifferentialStatus.Dismissed;
                        return (
                          <div
                            key={diff.id}
                            className={`p-4 rounded-lg border transition-all duration-150 space-y-3 ${
                              isConfirmed
                                ? 'clinical-card-active bg-[#19B6B2]/[0.03]'
                                : isDismissed
                                ? 'bg-[#F4F7FB]/70 border-[#E2E8F0] opacity-70'
                                : 'bg-white border-[#E2E8F0]'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-semibold text-[#071D35]">
                                    {diff.condition}
                                  </h3>
                                  <span className="text-[11px] font-mono text-[#64748B]">
                                    ICD-10 {diff.icd10}
                                  </span>
                                </div>
                                <p className="text-xs text-[#44474D]">
                                  Recommended Workup: {diff.recommendedWorkup}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <ConfidenceTag score={diff.confidence} />
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                    isConfirmed
                                      ? 'bg-[#0D9488]/10 text-[#0D9488]'
                                      : isDismissed
                                      ? 'bg-[#E2E8F0] text-[#44474D]'
                                      : 'bg-[#F59E0B]/10 text-[#B45309]'
                                  }`}
                                >
                                  {diff.status}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0D9488]">
                                  Supporting Evidence
                                </p>
                                <ul className="space-y-1 text-[#44474D]">
                                  {diff.supportingEvidence.map((ev, i) => (
                                    <li key={i} className="leading-snug">
                                      · {ev}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                                  Contradicting / Caveats
                                </p>
                                <ul className="space-y-1 text-[#44474D]">
                                  {diff.contradictingFactors.map((cf, i) => (
                                    <li key={i} className="leading-snug">
                                      · {cf}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {!isConfirmed && (
                                  <button
                                    type="button"
                                    onClick={() => onConfirmDifferential(patient.id, diff.id)}
                                    className="px-3 py-1.5 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                                  >
                                    Confirm Diagnosis
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenOrderEntry(diff.recommendedWorkup.split(',')[0], 'Lab Panel')
                                  }
                                  className="px-3 py-1.5 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] text-[#071D35] text-xs font-semibold transition-colors whitespace-nowrap"
                                >
                                  Order Workup
                                </button>
                              </div>
                              {!isDismissed && (
                                <button
                                  type="button"
                                  onClick={() => onDismissDifferential(patient.id, diff.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-[#64748B] hover:text-[#DC2626] transition-colors"
                                >
                                  Dismiss
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LAB TELEMETRY */}
              {activeTab === 'labs' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
                      {(['All', 'BMP', 'CBC', 'Cardiac', 'Hepatic/Sepsis', 'Coag/ABG'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setLabCategory(cat)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                              labCategory === cat
                                ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                                : 'text-[#64748B] hover:text-[#071D35]'
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      )}
                    </div>

                    <div className="relative w-full sm:w-52">
                      <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={labQuery}
                        onChange={(e) => setLabQuery(e.target.value)}
                        placeholder="Search analyte..."
                        className="clinical-input w-full pl-8 pr-2.5 py-1.5 text-xs text-[#071D35]"
                      />
                    </div>
                  </div>

                  {/* High-density Lab Table */}
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#44474D]">
                          <th className="py-2.5 px-3">Analyte</th>
                          <th className="py-2.5 px-3">Flag</th>
                          <th className="py-2.5 px-3 text-right">Result</th>
                          <th className="py-2.5 px-3 text-right">Delta</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3 text-right">Collected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs">
                        {filteredLabs.map((lab, idx) => {
                          const selected = inspectedLab?.id === lab.id;
                          return (
                            <tr
                              key={lab.id}
                              onClick={() => setInspectedLabId(lab.id)}
                              className={`cursor-pointer transition-colors ${
                                selected
                                  ? 'bg-[#19B6B2]/10'
                                  : idx % 2 === 1
                                  ? 'bg-[#F4F7FB]/50 hover:bg-[#F4F7FB]'
                                  : 'bg-white hover:bg-[#F4F7FB]'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-medium text-[#071D35]">
                                {lab.analyte}
                                <span className="block text-[11px] font-normal text-[#64748B]">
                                  {lab.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <LabFlagTag flag={lab.flag} />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#071D35]">
                                {lab.value}{' '}
                                <span className="font-normal text-[#64748B]">{lab.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#44474D]">
                                {lab.delta}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-[#64748B]">
                                {lab.refRange}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#64748B]">
                                {lab.collectedAt}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Selected Analyte Trend Chart */}
                  {inspectedLab && (
                    <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#071D35]">
                          Serial Trend — {inspectedLab.analyte} ({inspectedLab.unit})
                        </h3>
                        <span className="text-xs text-[#64748B]">
                          Ref: {inspectedLab.refRange} {inspectedLab.unit}
                        </span>
                      </div>
                      <DualAxisBiomarkerChart
                        primaryLabel={inspectedLab.analyte}
                        primaryUnit={inspectedLab.unit}
                        primaryPoints={inspectedLab.history}
                        secondaryLabel="Lactate"
                        secondaryUnit="mmol/L"
                        secondaryPoints={series.map((s) => ({ time: s.time, value: s.lactate }))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: IMAGING & ECG */}
              {activeTab === 'imaging' && activeStudy && (
                <div className="space-y-4">
                  {/* Study Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    {patient.imaging.map((st, idx) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStudyIdx(idx)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors whitespace-nowrap ${
                          selectedStudyIdx === idx
                            ? 'bg-[#071D35] text-white border-[#071D35]'
                            : 'bg-white text-[#44474D] border-[#E2E8F0] hover:bg-[#F4F7FB]'
                        }`}
                      >
                        {st.modality} · {st.performedAt.replace('Today ', '')}
                      </button>
                    ))}
                  </div>

                  {/* PACS Viewer or ECG Telemetry */}
                  {activeStudy.ecgPattern ? (
                    <div className="space-y-3">
                      <EcgTelemetryStrip pattern={activeStudy.ecgPattern} />
                    </div>
                  ) : (
                    <div className="bg-[#050C14] rounded-lg overflow-hidden border border-[#1E3A5F]">
                      {/* PACS Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-[#071D35] border-b border-[#1E3A5F] text-[11px] text-[#B4C8E7]">
                        <span className="font-mono font-semibold text-white truncate">
                          {activeStudy.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex items-center gap-1.5">
                            <Contrast className="w-3.5 h-3.5 text-[#55DDE0]" />
                            <span>Win</span>
                            <input
                              type="range"
                              min={70}
                              max={180}
                              value={pacsContrast}
                              onChange={(e) => setPacsContrast(Number(e.target.value))}
                              className="w-16 accent-[#19B6B2]"
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
                              className="w-16 accent-[#19B6B2]"
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
                          <button
                            type="button"
                            onClick={() => setPacsZoom((v) => !v)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${
                              pacsZoom
                                ? 'bg-[#19B6B2] text-[#071D35] border-[#19B6B2] font-semibold'
                                : 'border-[#354862] text-[#B4C8E7]'
                            }`}
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>{pacsZoom ? '1.4x' : '1.0x'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Image Viewport */}
                      <div className="relative aspect-[4/3] max-h-[380px] w-full flex items-center justify-center overflow-hidden bg-black">
                        {activeStudy.imageUrl && !imgErrorMap[activeStudy.id] ? (
                          <img
                            src={activeStudy.imageUrl}
                            alt={activeStudy.title}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setImgErrorMap((prev) => ({ ...prev, [activeStudy.id]: true }))
                            }
                            style={{
                              filter: `contrast(${pacsContrast}%) brightness(${pacsBrightness}%) ${
                                pacsInvert ? 'invert(1)' : ''
                              }`,
                              transform: pacsZoom ? 'scale(1.38)' : 'scale(1)',
                            }}
                            className="w-full h-full object-contain transition-transform duration-200 select-none"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[#7386A3] gap-2 p-6">
                            <Scan className="w-10 h-10 text-[#55DDE0]" />
                            <p className="text-xs font-mono">{activeStudy.title}</p>
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

                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-[#55DDE0]/90 pointer-events-none">
                          <span>
                            {patient.mrn} · {activeStudy.modality}
                          </span>
                          <span>
                            W:{pacsContrast}% L:{pacsBrightness}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Radiology / Cardiology Interpretation with Clear Provenance */}
                  {(() => {
                    const modalityMap: Record<string, ImagingModalityId> = {
                      'Chest CT': 'ct',
                      'Chest X-Ray': 'xray',
                      'Brain MRI': 'mri',
                    };
                    const mappedModality = modalityMap[activeStudy.modality];
                    const liveRead = liveAiReads[activeStudy.id];

                    const handleRunInlineRead = async () => {
                      if (!activeStudy.imageUrl || !mappedModality) return;
                      setLiveAiLoading(true);
                      setLiveAiError(null);
                      try {
                        const bodySystem =
                          mappedModality === 'mri'
                            ? 'neurological'
                            : activeStudy.title.toLowerCase().includes('aorta')
                            ? 'cardiovascular'
                            : 'respiratory';
                        const res = await fetch('/api/analyze-imaging', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            modality: mappedModality,
                            bodySystem,
                            modelId: 'gemini-4-hydrogen',
                            imagePath: activeStudy.imageUrl,
                            clinicalContext: `${patient.name}, ${patient.age}y ${patient.sex}. ${patient.chiefComplaint}`,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || `Server returned HTTP ${res.status}`);
                        }
                        setLiveAiReads((prev) => ({
                          ...prev,
                          [activeStudy.id]: data as ImagingAnalysisEnvelope,
                        }));
                      } catch (err: unknown) {
                        setLiveAiError(
                          err instanceof Error ? err.message : 'Unable to execute live AI imaging read.'
                        );
                      } finally {
                        setLiveAiLoading(false);
                      }
                    };

                    return (
                      <div className="space-y-3">
                        {!activeStudy.ecgPattern && mappedModality && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={liveAiLoading}
                                onClick={handleRunInlineRead}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#19B6B2] hover:bg-[#55DDE0] disabled:opacity-60 text-[#071D35] text-xs font-semibold transition-colors"
                              >
                                <Cpu className="w-3.5 h-3.5" />
                                <span>
                                  {liveAiLoading
                                    ? 'Running gemini-4-hydrogen...'
                                    : 'Run Live AI Read (gemini-4-hydrogen)'}
                                </span>
                              </button>
                              {onOpenMultimodalStudio && (
                                <button
                                  type="button"
                                  onClick={() => onOpenMultimodalStudio(mappedModality)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#071D35]"
                                >
                                  <Scan className="w-3.5 h-3.5 text-[#19B6B2]" />
                                  <span>Open in Image Studio</span>
                                </button>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-[#64748B]">
                              Compatible Model: gemini-4-hydrogen
                            </span>
                          </div>
                        )}

                        {liveAiError && (
                          <div className="p-3 rounded border border-[#DC2626]/40 bg-[#FEF2F2] text-xs text-[#DC2626] flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{liveAiError}</span>
                          </div>
                        )}

                        <div
                          className={`p-4 rounded border space-y-2.5 ${
                            liveRead
                              ? 'border-[#19B6B2] bg-[#19B6B2]/[0.03]'
                              : 'border-[#E2E8F0] bg-[#F4F7FB]/60'
                          }`}
                        >
                          <ProvenanceBanner
                            provenance={liveRead ? 'functional_ai' : 'simulated_demo'}
                            modelId={liveRead ? liveRead.modelId : 'Simulated Chart Baseline'}
                            analyzedAt={liveRead?.analyzedAt}
                            latencyMs={liveRead?.latencyMs}
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                            <span className="font-semibold text-[#071D35] flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#19B6B2]" />
                              <span>
                                {liveRead
                                  ? `AI Radiological Synthesis · ${liveRead.result.primaryPathology}`
                                  : `Baseline Interpretation · ${activeStudy.radiologist}`}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] text-[#0D9488] font-semibold">
                              {liveRead ? `${liveRead.result.confidence.toFixed(1)}% Match` : activeStudy.status}
                            </span>
                          </div>
                          <ul className="space-y-1 text-xs text-[#44474D]">
                            {(liveRead ? liveRead.result.findings : activeStudy.findings).map((f, i) => (
                              <li key={i}>· {f}</li>
                            ))}
                          </ul>
                          <p className="text-xs font-semibold text-[#071D35] pt-1 border-t border-[#E2E8F0]">
                            Impression: {liveRead ? liveRead.result.impression : activeStudy.impression}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 4: ORDERS & MEDS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-[#071D35]">
                        Active Clinical Orders & Infusions
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Weight-calibrated for {patient.weightKg} kg · eGFR {patient.egfr} mL/min
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenOrderEntry()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#071D35] text-white text-xs font-semibold hover:bg-[#0B2A4A]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#55DDE0]" />
                      <span>New Clinical Order</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#44474D]">
                          <th className="py-2.5 px-3">Order</th>
                          <th className="py-2.5 px-3">Dose / Spec</th>
                          <th className="py-2.5 px-3">Schedule</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs">
                        {patient.orders.map((ord, idx) => (
                          <tr
                            key={ord.id}
                            className={idx % 2 === 1 ? 'bg-[#F4F7FB]/50' : 'bg-white'}
                          >
                            <td className="py-2.5 px-3 font-medium text-[#071D35]">
                              {ord.name}
                              <span className="block text-[11px] font-normal text-[#64748B]">
                                {ord.type} · {ord.routeOrPriority}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-[#071D35]">
                              {ord.doseOrSpec}
                            </td>
                            <td className="py-2.5 px-3 text-[#44474D]">{ord.frequency}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  ord.status === 'Active'
                                    ? 'bg-[#0D9488]/10 text-[#0D9488]'
                                    : ord.status === 'Discontinued'
                                    ? 'bg-[#E2E8F0] text-[#64748B]'
                                    : 'bg-[#F59E0B]/10 text-[#B45309]'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onToggleOrderStatus(patient.id, ord.id)}
                                className="text-xs font-semibold text-[#071D35] hover:text-[#DC2626] transition-colors"
                              >
                                {ord.status === 'Discontinued' ? 'Reactivate' : 'Discontinue'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT PANEL (Col 10–12): Desktop CDS Sidebar */}
        <aside className="hidden xl:block xl:col-span-3">{renderCdsSidebarContent()}</aside>
      </div>

      {/* Tablet / Mobile Collapsible CDS Drawer */}
      {cdsDrawerOpen && (
        <div className="fixed inset-0 z-40 xl:hidden flex justify-end bg-[#071D35]/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#F4F7FB] h-full overflow-y-auto p-5 border-l border-[#E2E8F0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-[#071D35]">
                CDS Inference & Safety Sidebar
              </h2>
              <button
                type="button"
                onClick={() => setCdsDrawerOpen(false)}
                className="p-1.5 rounded border border-[#E2E8F0] bg-white text-[#071D35]"
                aria-label="Close CDS sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderCdsSidebarContent()}
          </div>
        </div>
      )}

      {/* Mobile Critical Alert Bottom Strip (Strictly <= 15% mobile viewport) */}
      {patient.acuity === AcuityLevel.Critical && unackAlerts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-[#071D35] text-white px-4 py-2.5 border-t border-[#19B6B2] flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span className="text-xs font-medium truncate">
              {unackAlerts[0].title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCdsDrawerOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#19B6B2] text-[#071D35] text-xs font-semibold shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
        </div>
      )}

      {/* Record Vitals Modal */}
      {vitalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D35]/45 backdrop-blur-sm">
          <form
            onSubmit={handleSaveVitals}
            className="clinical-overlay w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-bold text-[#071D35]">
                  Record Bedside Biometrics
                </h2>
                <p className="text-xs text-[#64748B]">
                  {patient.name} · {patient.bed}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVitalsModalOpen(false)}
                className="p-1.5 rounded border border-[#E2E8F0] text-[#44474D] hover:bg-[#F4F7FB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Heart Rate', unit: 'bpm', val: newHr, set: setNewHr },
                { label: 'Systolic BP', unit: 'mmHg', val: newSbp, set: setNewSbp },
                { label: 'Diastolic BP', unit: 'mmHg', val: newDbp, set: setNewDbp },
                { label: 'SpO2', unit: '%', val: newSpo2, set: setNewSpo2 },
                { label: 'Temperature', unit: '°C', val: newTemp, set: setNewTemp },
                { label: 'Resp Rate', unit: '/min', val: newRr, set: setNewRr },
                { label: 'Lactate', unit: 'mmol/L', val: newLactate, set: setNewLactate },
              ].map((fld) => (
                <label key={fld.label} className="block space-y-1">
                  <span className="text-xs font-medium text-[#44474D]">{fld.label}</span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={fld.val}
                      onChange={(e) => fld.set(e.target.value)}
                      className="clinical-input w-full px-3 py-1.5 pr-14 text-sm font-mono tabular-nums text-[#071D35]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">
                      {fld.unit}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVitalsModalOpen(false)}
                className="px-4 py-2 rounded border border-[#E2E8F0] text-xs font-semibold text-[#071D35] hover:bg-[#F4F7FB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#071D35] text-white text-xs font-semibold hover:bg-[#0B2A4A]"
              >
                Save Vitals
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
