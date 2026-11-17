import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Search } from 'lucide-react';
import { LabFlag, PatientRecord } from '../types/clinical';
import { LabFlagTag } from './StatusTag';
import { DualAxisBiomarkerChart } from './Charts';

interface LabTelemetryScreenProps {
  patients: PatientRecord[];
  onVerifyLab: (patientId: string, labId: string) => void;
  onOpenPatientChart: (patientId: string) => void;
}

export const LabTelemetryScreen: React.FC<LabTelemetryScreenProps> = ({
  patients,
  onVerifyLab,
  onOpenPatientChart,
}) => {
  const [flagFilter, setFlagFilter] = useState<'Abnormal' | 'Critical' | 'All'>('Abnormal');
  const [query, setQuery] = useState('');
  const [selectedCorrelationKey, setSelectedCorrelationKey] = useState<string>('sepsis');

  const flattenedLabs = useMemo(() => {
    const rows = patients.flatMap((pt) =>
      pt.labs.map((lab) => ({
        patientId: pt.id,
        patientName: pt.name,
        mrn: pt.mrn,
        bed: pt.bed,
        lab,
      }))
    );
    return rows.filter((r) => {
      const flagOk =
        flagFilter === 'All'
          ? true
          : flagFilter === 'Critical'
          ? r.lab.flag === LabFlag.Critical
          : r.lab.flag !== LabFlag.Normal;
      const q = query.trim().toLowerCase();
      const qOk =
        !q ||
        r.patientName.toLowerCase().includes(q) ||
        r.lab.analyte.toLowerCase().includes(q) ||
        r.bed.toLowerCase().includes(q);
      return flagOk && qOk;
    });
  }, [patients, flagFilter, query]);

  const vance = patients.find((p) => p.id === 'pt-vance') ?? patients[0];
  const sterling = patients.find((p) => p.id === 'pt-sterling') ?? patients[0];

  const correlationConfig = useMemo(() => {
    if (selectedCorrelationKey === 'cardiac' && sterling) {
      const trop = sterling.labs.find((l) => l.analyte.includes('Troponin'));
      const bnp = sterling.labs.find((l) => l.analyte.includes('BNP'));
      return {
        title: `${sterling.name} (${sterling.bed}) — Myocardial Injury vs. Wall Stress`,
        pLabel: 'Troponin-I (hs)',
        pUnit: 'ng/mL',
        pPoints: trop?.history ?? [{ time: '20:45', value: 3.4 }, { time: '22:50', value: 14.82 }],
        sLabel: 'NT-proBNP',
        sUnit: 'pg/mL',
        sPoints: bnp?.history ?? [{ time: '20:45', value: 1340 }, { time: '22:50', value: 2460 }],
      };
    }
    const procal = vance.labs.find((l) => l.analyte.includes('Procalcitonin'));
    const lac = vance.labs.find((l) => l.analyte.includes('Lactate'));
    return {
      title: `${vance.name} (${vance.bed}) — Procalcitonin vs. Arterial Lactate Clearance`,
      pLabel: 'Procalcitonin',
      pUnit: 'ng/mL',
      pPoints: procal?.history ?? [{ time: '04:00', value: 0.9 }, { time: '22:45', value: 8.42 }],
      sLabel: 'Arterial Lactate',
      sUnit: 'mmol/L',
      sPoints: lac?.history ?? [{ time: '04:00', value: 1.4 }, { time: '23:05', value: 4.0 }],
    };
  }, [selectedCorrelationKey, vance, sterling]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
            Biomarker & Lab Telemetry Matrix
          </h1>
          <p className="text-sm text-[#44474D]">
            Cross-unit critical lab sign-off queue and dual-axis serial analyte correlation
          </p>
        </div>
      </div>

      {/* Dual-Axis Correlation Stage */}
      <div className="clinical-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#071D35]">{correlationConfig.title}</h2>
            <p className="text-xs text-[#64748B]">
              Solid curve indicates primary biomarker; dashed teal curve indicates secondary paired analyte
            </p>
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setSelectedCorrelationKey('sepsis')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedCorrelationKey === 'sepsis'
                  ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                  : 'text-[#64748B] hover:text-[#071D35]'
              }`}
            >
              Sepsis Kinetic Pair
            </button>
            <button
              type="button"
              onClick={() => setSelectedCorrelationKey('cardiac')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedCorrelationKey === 'cardiac'
                  ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                  : 'text-[#64748B] hover:text-[#071D35]'
              }`}
            >
              Acute Coronary Pair
            </button>
          </div>
        </div>

        <DualAxisBiomarkerChart
          primaryLabel={correlationConfig.pLabel}
          primaryUnit={correlationConfig.pUnit}
          primaryPoints={correlationConfig.pPoints}
          secondaryLabel={correlationConfig.sLabel}
          secondaryUnit={correlationConfig.sUnit}
          secondaryPoints={correlationConfig.sPoints}
        />
      </div>

      {/* Cross-Patient Lab Queue */}
      <div className="clinical-card overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
            {(['Abnormal', 'Critical', 'All'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFlagFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  flagFilter === f
                    ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                    : 'text-[#64748B] hover:text-[#071D35]'
                }`}
              >
                {f} Results
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter patient or analyte..."
              className="clinical-input w-full pl-8 pr-3 py-1.5 text-xs text-[#071D35]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#44474D]">
                <th className="py-3 px-4">Patient · Bed</th>
                <th className="py-3 px-4">Analyte</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">Value</th>
                <th className="py-3 px-4 text-right">Delta</th>
                <th className="py-3 px-4">Ref Range</th>
                <th className="py-3 px-4 text-right">Collected</th>
                <th className="py-3 px-4 text-right">Sign-Off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {flattenedLabs.map((row, idx) => (
                <tr
                  key={`${row.patientId}-${row.lab.id}`}
                  className={idx % 2 === 1 ? 'bg-[#F4F7FB]/50' : 'bg-white'}
                >
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onOpenPatientChart(row.patientId)}
                      className="text-left group"
                    >
                      <span className="font-semibold text-[#071D35] group-hover:text-[#006A67] inline-flex items-center gap-1">
                        {row.patientName}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <span className="block text-[11px] font-mono text-[#64748B]">
                        {row.bed} · {row.mrn}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 px-4 font-medium text-[#071D35]">
                    {row.lab.analyte}
                    <span className="block text-[11px] font-normal text-[#64748B]">
                      {row.lab.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <LabFlagTag flag={row.lab.flag} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#071D35]">
                    {row.lab.value}{' '}
                    <span className="font-normal text-[#64748B]">{row.lab.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#44474D]">
                    {row.lab.delta}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[#64748B]">
                    {row.lab.refRange}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B]">
                    {row.lab.collectedAt}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.lab.verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D9488]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onVerifyLab(row.patientId, row.lab.id)}
                        className="px-2.5 py-1 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-[11px] font-semibold transition-colors"
                      >
                        Verify Result
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
