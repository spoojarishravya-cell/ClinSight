import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { DRUG_FORMULARY } from '../data/clinicalData';
import { ClinicalOrder, PatientRecord } from '../types/clinical';

interface ProtocolsDosingScreenProps {
  patients: PatientRecord[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  onApplyOrderFromProtocol: (
    patientId: string,
    order: Omit<ClinicalOrder, 'id' | 'orderedBy' | 'orderedAt' | 'status'>
  ) => void;
}

type ScoreModel = 'qsofa' | 'news2' | 'chadsvasc';

export const ProtocolsDosingScreen: React.FC<ProtocolsDosingScreenProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onApplyOrderFromProtocol,
}) => {
  const patient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? patients[0],
    [patients, selectedPatientId]
  );

  // Dose calculator state
  const [drugId, setDrugId] = useState(DRUG_FORMULARY[0].id);
  const [weightInput, setWeightInput] = useState(String(patient.weightKg));
  const [egfrInput, setEgfrInput] = useState(String(patient.egfr));
  const [targetDose, setTargetDose] = useState(DRUG_FORMULARY[0].defaultDose);
  const [orderPlacedNotice, setOrderPlacedNotice] = useState<string | null>(null);

  // Scoring engine state
  const [scoreModel, setScoreModel] = useState<ScoreModel>('qsofa');
  const [qsofaChecks, setQsofaChecks] = useState({
    rrHigh: true,
    sbpLow: true,
    alteredMental: false,
  });
  const [newsChecks, setNewsChecks] = useState({
    rrExtreme: true,
    spo2Low: true,
    supplementalO2: true,
    sbpLow: true,
    hrHigh: true,
    tempHigh: true,
  });
  const [chadsChecks, setChadsChecks] = useState({
    chf: false,
    htn: true,
    age75: false,
    diabetes: false,
    strokeHistory: true,
    vascular: false,
    age65: true,
    female: true,
  });

  // Sepsis 1-Hour Bundle checklist
  const [bundleSteps, setBundleSteps] = useState<Record<string, boolean>>({
    lactate: true,
    cultures: true,
    antibiotics: true,
    crystalloid: false,
    vasopressor: true,
  });

  const drug = useMemo(
    () => DRUG_FORMULARY.find((d) => d.id === drugId) ?? DRUG_FORMULARY[0],
    [drugId]
  );

  const handlePatientSwitch = (id: string) => {
    onSelectPatient(id);
    const nextPt = patients.find((p) => p.id === id);
    if (nextPt) {
      setWeightInput(String(nextPt.weightKg));
      setEgfr(String(nextPt.egfr));
    }
  };

  function setEgfr(val: string) {
    setEgfrInput(val);
  }

  const weightNum = Math.max(30, Number(weightInput) || patient.weightKg);
  const egfrNum = Math.max(5, Number(egfrInput) || patient.egfr);

  const doseCalc = useMemo(() => {
    if (drug.id === 'drug-norepi') {
      // mcg/kg/min * kg * 60 min / (16 mcg/mL) = mL/hr
      const mcgPerHr = targetDose * weightNum * 60;
      const mlPerHr = mcgPerHr / drug.concentrationValue;
      return {
        primaryResult: `${mlPerHr.toFixed(1)} mL/hr`,
        secondaryDetail: `${(targetDose * weightNum).toFixed(1)} mcg/min (${mcgPerHr.toFixed(0)} mcg/hr)`,
      };
    }
    if (drug.id === 'drug-heparin') {
      const unitsPerHr = targetDose * weightNum;
      const mlPerHr = unitsPerHr / drug.concentrationValue;
      return {
        primaryResult: `${mlPerHr.toFixed(1)} mL/hr`,
        secondaryDetail: `${unitsPerHr.toFixed(0)} units/hr IV continuous`,
      };
    }
    if (drug.id === 'drug-vanc') {
      const rawMg = targetDose * weightNum;
      const roundedMg = Math.min(3000, Math.round(rawMg / 250) * 250);
      const interval = egfrNum < 50 ? 'q24h maintenance' : 'q12h maintenance';
      return {
        primaryResult: `${roundedMg} mg`,
        secondaryDetail: `Rounded to nearest 250 mg · ${interval}`,
      };
    }
    // Amiodarone mg/min
    const mgPerHr = targetDose * 60;
    const mlPerHr = mgPerHr / drug.concentrationValue;
    return {
      primaryResult: `${mlPerHr.toFixed(1)} mL/hr`,
      secondaryDetail: `${mgPerHr.toFixed(0)} mg/hr (${targetDose} mg/min)`,
    };
  }, [drug, targetDose, weightNum, egfrNum]);

  const qsofaScore =
    (qsofaChecks.rrHigh ? 1 : 0) +
    (qsofaChecks.sbpLow ? 1 : 0) +
    (qsofaChecks.alteredMental ? 1 : 0);

  const newsScore =
    (newsChecks.rrExtreme ? 2 : 0) +
    (newsChecks.spo2Low ? 2 : 0) +
    (newsChecks.supplementalO2 ? 2 : 0) +
    (newsChecks.sbpLow ? 2 : 0) +
    (newsChecks.hrHigh ? 1 : 0) +
    (newsChecks.tempHigh ? 1 : 0);

  const chadsScore =
    (chadsChecks.chf ? 1 : 0) +
    (chadsChecks.htn ? 1 : 0) +
    (chadsChecks.age75 ? 2 : 0) +
    (chadsChecks.diabetes ? 1 : 0) +
    (chadsChecks.strokeHistory ? 2 : 0) +
    (chadsChecks.vascular ? 1 : 0) +
    (chadsChecks.age65 && !chadsChecks.age75 ? 1 : 0) +
    (chadsChecks.female ? 1 : 0);

  const completedBundleCount = Object.values(bundleSteps).filter(Boolean).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
            Clinical Protocols & Dose Calculators
          </h1>
          <p className="text-sm text-[#44474D]">
            Weight-calibrated infusion math, renal adjustments, and acute severity scoring
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-[#44474D]">Patient Context:</span>
          <select
            value={patient.id}
            onChange={(e) => handlePatientSwitch(e.target.value)}
            className="clinical-input px-3 py-1.5 text-xs font-semibold text-[#071D35]"
          >
            {patients.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name} ({pt.bed} · {pt.weightKg} kg · eGFR {pt.egfr})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Weight & eGFR Dose Calculator (Col 1–6) */}
        <div className="lg:col-span-6 clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#071D35] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#19B6B2]" />
              <span>Weight & Renal-Calibrated Dose Calculator</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {DRUG_FORMULARY.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDrugId(item.id);
                  setTargetDose(item.defaultDose);
                  setOrderPlacedNotice(null);
                }}
                className={`px-2.5 py-2 rounded border text-xs font-semibold text-left transition-colors ${
                  drug.id === item.id
                    ? 'bg-[#071D35] text-white border-[#071D35]'
                    : 'bg-white text-[#44474D] border-[#E2E8F0] hover:bg-[#F4F7FB]'
                }`}
              >
                <span className="block truncate">{item.name.split(' ')[0]}</span>
                <span
                  className={`block text-[10px] font-normal truncate ${
                    drug.id === item.id ? 'text-[#B4C8E7]' : 'text-[#64748B]'
                  }`}
                >
                  {item.unitLabel}
                </span>
              </button>
            ))}
          </div>

          <div className="p-3 rounded bg-[#F4F7FB] border border-[#E2E8F0] text-xs space-y-0.5">
            <p className="font-semibold text-[#071D35]">{drug.name}</p>
            <p className="text-[#44474D]">
              {drug.category} · {drug.standardConcentration}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">Patient Weight</span>
              <div className="relative">
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="clinical-input w-full px-3 py-2 pr-10 text-sm font-mono tabular-nums text-[#071D35]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748B]">
                  kg
                </span>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">Renal eGFR</span>
              <div className="relative">
                <input
                  type="number"
                  value={egfrInput}
                  onChange={(e) => setEgfrInput(e.target.value)}
                  className="clinical-input w-full px-3 py-2 pr-14 text-sm font-mono tabular-nums text-[#071D35]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">
                  mL/min
                </span>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#44474D]">Target Dose</span>
              <div className="relative">
                <input
                  type="number"
                  step={drug.step}
                  min={drug.minDose}
                  max={drug.maxDose}
                  value={targetDose}
                  onChange={(e) => setTargetDose(Number(e.target.value))}
                  className="clinical-input w-full px-3 py-2 pr-20 text-sm font-mono tabular-nums text-[#071D35]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">
                  {drug.unitLabel}
                </span>
              </div>
            </label>
          </div>

          <input
            type="range"
            min={drug.minDose}
            max={drug.maxDose}
            step={drug.step}
            value={targetDose}
            onChange={(e) => setTargetDose(Number(e.target.value))}
            className="w-full accent-[#19B6B2]"
          />

          {/* Computed Pump / Dose Readout */}
          <div className="p-4 rounded-lg border border-[#19B6B2] bg-[#19B6B2]/[0.05] flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#006A67]">
                Calculated Administration Rate / Dose
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[#071D35] mt-0.5">
                {doseCalc.primaryResult}
              </p>
              <p className="text-xs text-[#44474D] font-mono">{doseCalc.secondaryDetail}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                onApplyOrderFromProtocol(patient.id, {
                  type: drug.id === 'drug-vanc' ? 'Medication' : 'Infusion',
                  name: drug.name,
                  doseOrSpec: `${targetDose} ${drug.unitLabel} (${doseCalc.primaryResult})`,
                  routeOrPriority: 'IV Central / Peripheral',
                  frequency: drug.id === 'drug-vanc' ? 'STAT Load' : 'Continuous Titration',
                });
                setOrderPlacedNotice(`Order staged to ${patient.name} (${patient.bed})`);
              }}
              className="px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Send to {patient.name.split(' ')[0]}&apos;s Orders
            </button>
          </div>

          {egfrNum < drug.renalThresholdEgfr && (
            <div className="p-3 rounded border border-[#F59E0B]/40 bg-[#FFFBEB] flex items-start gap-2 text-xs text-[#92400E]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
              <span>
                <strong>Renal Safety Advisory:</strong> {drug.renalWarning}
              </span>
            </div>
          )}

          {orderPlacedNotice && (
            <div className="p-2.5 rounded border border-[#0D9488]/30 bg-[#0D9488]/8 text-xs font-semibold text-[#0D9488] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{orderPlacedNotice}</span>
            </div>
          )}
        </div>

        {/* Right Column: Clinical Scoring Engine + Care Bundle (Col 7–12) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Interactive Scoring Calculators */}
          <div className="clinical-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#071D35]">
                Acute Clinical Risk Calculators
              </h2>
              <div className="flex items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
                {(
                  [
                    { id: 'qsofa', label: 'qSOFA' },
                    { id: 'news2', label: 'NEWS2' },
                    { id: 'chadsvasc', label: 'CHA2DS2-VASc' },
                  ] as { id: ScoreModel; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setScoreModel(m.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      scoreModel === m.id
                        ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                        : 'text-[#64748B] hover:text-[#071D35]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {scoreModel === 'qsofa' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {[
                    { key: 'rrHigh' as const, label: 'Respiratory Rate >= 22 breaths/min (+1)' },
                    { key: 'sbpLow' as const, label: 'Systolic Blood Pressure <= 100 mmHg (+1)' },
                    { key: 'alteredMental' as const, label: 'Altered Mentation / GCS < 15 (+1)' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] cursor-pointer text-xs"
                    >
                      <span className="font-medium text-[#071D35]">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={qsofaChecks[item.key]}
                        onChange={(e) =>
                          setQsofaChecks((p) => ({ ...p, [item.key]: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#19B6B2]"
                      />
                    </label>
                  ))}
                </div>
                <div className="p-3.5 rounded bg-[#F4F7FB] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#071D35]">
                      qSOFA Score: {qsofaScore} / 3
                    </p>
                    <p className="text-xs text-[#44474D]">
                      {qsofaScore >= 2
                        ? 'High risk of poor sepsis outcome — assess organ dysfunction (SOFA) & lactate.'
                        : 'Low qSOFA threshold — continue serial vitals surveillance.'}
                    </p>
                  </div>
                  <span
                    className={`text-xl font-bold font-mono tabular-nums ${
                      qsofaScore >= 2 ? 'text-[#DC2626]' : 'text-[#0D9488]'
                    }`}
                  >
                    {qsofaScore}
                  </span>
                </div>
              </div>
            )}

            {scoreModel === 'news2' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'rrExtreme' as const, label: 'RR >= 25 /min (+2)' },
                    { key: 'spo2Low' as const, label: 'SpO2 92–93% (+2)' },
                    { key: 'supplementalO2' as const, label: 'On Supplemental O2 (+2)' },
                    { key: 'sbpLow' as const, label: 'SBP 91–100 mmHg (+2)' },
                    { key: 'hrHigh' as const, label: 'HR 111–130 bpm (+1)' },
                    { key: 'tempHigh' as const, label: 'Temp 38.1–39.0 °C (+1)' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] cursor-pointer text-xs"
                    >
                      <span className="font-medium text-[#071D35]">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={newsChecks[item.key]}
                        onChange={(e) =>
                          setNewsChecks((p) => ({ ...p, [item.key]: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#19B6B2]"
                      />
                    </label>
                  ))}
                </div>
                <div className="p-3.5 rounded bg-[#F4F7FB] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#071D35]">
                      NEWS2 Aggregate Score: {newsScore}
                    </p>
                    <p className="text-xs text-[#44474D]">
                      {newsScore >= 7
                        ? 'High Clinical Risk — Continuous monitoring & urgent critical care review.'
                        : newsScore >= 5
                        ? 'Medium Risk — Hourly bedside assessment.'
                        : 'Low Risk — Routine ward monitoring.'}
                    </p>
                  </div>
                  <span
                    className={`text-xl font-bold font-mono tabular-nums ${
                      newsScore >= 7
                        ? 'text-[#DC2626]'
                        : newsScore >= 5
                        ? 'text-[#B45309]'
                        : 'text-[#0D9488]'
                    }`}
                  >
                    {newsScore}
                  </span>
                </div>
              </div>
            )}

            {scoreModel === 'chadsvasc' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'chf' as const, label: 'CHF History (+1)' },
                    { key: 'htn' as const, label: 'Hypertension (+1)' },
                    { key: 'age75' as const, label: 'Age >= 75 yrs (+2)' },
                    { key: 'diabetes' as const, label: 'Diabetes Mellitus (+1)' },
                    { key: 'strokeHistory' as const, label: 'Stroke / TIA / TE (+2)' },
                    { key: 'vascular' as const, label: 'Vascular Disease (+1)' },
                    { key: 'age65' as const, label: 'Age 65–74 yrs (+1)' },
                    { key: 'female' as const, label: 'Female Sex (+1)' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] cursor-pointer text-xs"
                    >
                      <span className="font-medium text-[#071D35]">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={chadsChecks[item.key]}
                        onChange={(e) =>
                          setChadsChecks((p) => ({ ...p, [item.key]: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#19B6B2]"
                      />
                    </label>
                  ))}
                </div>
                <div className="p-3.5 rounded bg-[#F4F7FB] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#071D35]">
                      CHA2DS2-VASc Score: {chadsScore}
                    </p>
                    <p className="text-xs text-[#44474D]">
                      {chadsScore >= 2
                        ? 'Oral anticoagulation indicated once acute stroke hemorrhage window clears.'
                        : 'Low-moderate thromboembolic risk.'}
                    </p>
                  </div>
                  <span className="text-xl font-bold font-mono tabular-nums text-[#071D35]">
                    {chadsScore}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 1-Hour Sepsis Care Bundle */}
          <div className="clinical-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#071D35] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#19B6B2]" />
                <span>Surviving Sepsis 1-Hour Care Bundle</span>
              </h2>
              <span className="text-xs font-mono font-semibold tabular-nums text-[#006A67]">
                {completedBundleCount}/5 complete
              </span>
            </div>

            <div className="space-y-2">
              {[
                { key: 'lactate', text: 'Measure initial arterial lactate & repeat within 2–4h if > 2.0 mmol/L' },
                { key: 'cultures', text: 'Obtain 2 sets of peripheral/central blood cultures prior to antimicrobials' },
                { key: 'antibiotics', text: 'Administer broad-spectrum IV antimicrobials (allergy-checked)' },
                { key: 'crystalloid', text: 'Complete 30 mL/kg balanced crystalloid bolus for hypotension or lactate >= 4' },
                { key: 'vasopressor', text: 'Initiate Norepinephrine if hypotensive during/after fluid resuscitation (MAP >= 65)' },
              ].map((step) => (
                <label
                  key={step.key}
                  className="flex items-start gap-2.5 p-2.5 rounded border border-[#E2E8F0] hover:bg-[#F4F7FB] cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(bundleSteps[step.key])}
                    onChange={(e) =>
                      setBundleSteps((p) => ({ ...p, [step.key]: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 accent-[#19B6B2] shrink-0"
                  />
                  <span
                    className={
                      bundleSteps[step.key]
                        ? 'text-[#071D35] font-medium'
                        : 'text-[#44474D]'
                    }
                  >
                    {step.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
