import React, { useMemo, useState } from 'react';
import { ArrowRight, Plus, Search, X } from 'lucide-react';
import { AcuityLevel, PatientRecord } from '../types/clinical';
import { AcuityTag } from './StatusTag';

interface TriageCensusScreenProps {
  patients: PatientRecord[];
  onOpenPatientChart: (patientId: string) => void;
  onAdmitPatient: (newPatient: {
    name: string;
    age: number;
    sex: 'F' | 'M';
    weightKg: number;
    egfr: number;
    unit: PatientRecord['unit'];
    bed: string;
    chiefComplaint: string;
    acuity: AcuityLevel;
  }) => void;
}

export const TriageCensusScreen: React.FC<TriageCensusScreenProps> = ({
  patients,
  onOpenPatientChart,
  onAdmitPatient,
}) => {
  const [unitFilter, setUnitFilter] = useState<'All' | PatientRecord['unit']>('All');
  const [acuityFilter, setAcuityFilter] = useState<'All' | AcuityLevel>('All');
  const [search, setSearch] = useState('');
  const [admitOpen, setAdmitOpen] = useState(false);

  // Admit modal state
  const [name, setName] = useState('');
  const [age, setAge] = useState('64');
  const [sex, setSex] = useState<'F' | 'M'>('F');
  const [weightKg, setWeightKg] = useState('74');
  const [egfr, setEgfr] = useState('68');
  const [unit, setUnit] = useState<PatientRecord['unit']>('MICU');
  const [bed, setBed] = useState('MICU-11');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [acuity, setAcuity] = useState<AcuityLevel>(AcuityLevel.Guarded);

  const counts = useMemo(() => {
    const critical = patients.filter((p) => p.acuity === AcuityLevel.Critical).length;
    const guarded = patients.filter((p) => p.acuity === AcuityLevel.Guarded).length;
    const stable = patients.filter((p) => p.acuity === AcuityLevel.Stable).length;
    const unverifiedLabs = patients.reduce(
      (acc, p) => acc + p.labs.filter((l) => !l.verified).length,
      0
    );
    return { total: patients.length, critical, guarded, stable, unverifiedLabs };
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter((pt) => {
      const unitOk = unitFilter === 'All' || pt.unit === unitFilter;
      const acOk = acuityFilter === 'All' || pt.acuity === acuityFilter;
      const q = search.trim().toLowerCase();
      const qOk =
        !q ||
        pt.name.toLowerCase().includes(q) ||
        pt.mrn.toLowerCase().includes(q) ||
        pt.chiefComplaint.toLowerCase().includes(q);
      return unitOk && acOk && qOk;
    });
  }, [patients, unitFilter, acuityFilter, search]);

  const handleAdmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !chiefComplaint.trim()) return;
    onAdmitPatient({
      name: name.trim(),
      age: Number(age) || 55,
      sex,
      weightKg: Number(weightKg) || 70,
      egfr: Number(egfr) || 75,
      unit,
      bed: bed.trim() || `${unit}-10`,
      chiefComplaint: chiefComplaint.trim(),
      acuity,
    });
    setName('');
    setChiefComplaint('');
    setAdmitOpen(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* Screen Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#071D35] tracking-tight">
            Acute Care Triage Census
          </h1>
          <p className="text-sm text-[#44474D]">
            Multi-unit acuity surveillance across MICU, CCU, NICU, and Emergency Trauma Bay
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAdmitOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#071D35] hover:bg-[#0B2A4A] text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 text-[#55DDE0]" aria-hidden="true" />
          <span>Admit Patient</span>
        </button>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Census', value: counts.total, sub: 'Monitored acute beds', tone: 'text-[#071D35]' },
          { label: 'Critical Acuity', value: counts.critical, sub: 'Immediate escalation tier', tone: 'text-[#DC2626]' },
          { label: 'Guarded Watch', value: counts.guarded, sub: 'Close serial reassessment', tone: 'text-[#B45309]' },
          { label: 'Pending Lab Verification', value: counts.unverifiedLabs, sub: 'Critical analytes awaiting sign-off', tone: 'text-[#006A67]' },
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

      {/* Filter Bar */}
      <div className="clinical-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
            {(['All', 'MICU', 'CCU', 'NICU', 'ED Trauma'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitFilter(u)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  unitFilter === u
                    ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                    : 'text-[#64748B] hover:text-[#071D35]'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-[#F4F7FB] rounded border border-[#E2E8F0]">
            {(['All', AcuityLevel.Critical, AcuityLevel.Guarded, AcuityLevel.Stable] as const).map(
              (a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAcuityFilter(a)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    acuityFilter === a
                      ? 'bg-white text-[#071D35] font-semibold shadow-xs'
                      : 'text-[#64748B] hover:text-[#071D35]'
                  }`}
                >
                  {a}
                </button>
              )
            )}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, MRN, presentation..."
            className="clinical-input w-full pl-8 pr-3 py-1.5 text-xs text-[#071D35]"
          />
        </div>
      </div>

      {/* High-Density Census Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#44474D]">
                <th className="py-3 px-4">Patient / MRN</th>
                <th className="py-3 px-4">Unit · Bed</th>
                <th className="py-3 px-4">Acuity</th>
                <th className="py-3 px-4">Leading Differential</th>
                <th className="py-3 px-4 text-right">HR</th>
                <th className="py-3 px-4 text-right">BP</th>
                <th className="py-3 px-4 text-right">SpO2</th>
                <th className="py-3 px-4 text-right">Lactate</th>
                <th className="py-3 px-4 text-right">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-[#64748B]">
                    No patients match the selected unit or acuity filters.
                  </td>
                </tr>
              ) : (
                filtered.map((pt, idx) => {
                  const v = pt.vitals['6H'][pt.vitals['6H'].length - 1];
                  const topDiff = pt.differentials[0];
                  return (
                    <tr
                      key={pt.id}
                      onClick={() => onOpenPatientChart(pt.id)}
                      className={`cursor-pointer transition-colors ${
                        idx % 2 === 1 ? 'bg-[#F4F7FB]/50 hover:bg-[#19B6B2]/8' : 'bg-white hover:bg-[#19B6B2]/8'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#071D35]">{pt.name}</p>
                        <p className="text-[11px] font-mono text-[#64748B]">
                          {pt.mrn} · {pt.age}y {pt.sex}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#071D35] whitespace-nowrap">
                        {pt.bed}
                      </td>
                      <td className="py-3 px-4">
                        <AcuityTag acuity={pt.acuity} />
                      </td>
                      <td className="py-3 px-4 max-w-[260px]">
                        <p className="font-medium text-[#071D35] truncate">
                          {topDiff ? topDiff.condition : pt.chiefComplaint}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate">
                          {pt.attending} · Admitted {pt.admittedAt}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#071D35]">
                        {v ? v.hr : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#071D35]">
                        {v ? `${v.sbp}/${v.dbp}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#071D35]">
                        {v ? `${v.spo2}%` : '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          v && v.lactate >= 2.0 ? 'text-[#DC2626]' : 'text-[#071D35]'
                        }`}
                      >
                        {v ? v.lactate.toFixed(1) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPatientChart(pt.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E2E8F0] bg-white hover:border-[#19B6B2] text-xs font-semibold text-[#071D35]"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3 text-[#19B6B2]" />
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

      {/* Admit Patient Modal */}
      {admitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D35]/45 backdrop-blur-sm">
          <form onSubmit={handleAdmit} className="clinical-overlay w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-[#071D35]">
                Admit Acute Care Patient
              </h2>
              <button
                type="button"
                onClick={() => setAdmitOpen(false)}
                className="p-1.5 rounded border border-[#E2E8F0] text-[#44474D] hover:bg-[#F4F7FB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2 block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Patient Full Name</span>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Jordan Takahashi"
                  className="clinical-input w-full px-3 py-1.5 text-sm text-[#071D35]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Age</span>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="clinical-input w-full px-3 py-1.5 text-sm font-mono tabular-nums text-[#071D35]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Sex</span>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'F' | 'M')}
                  className="clinical-input w-full px-3 py-1.5 text-sm text-[#071D35]"
                >
                  <option value="F">Female (F)</option>
                  <option value="M">Male (M)</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Weight</span>
                <div className="relative">
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="clinical-input w-full px-3 py-1.5 pr-10 text-sm font-mono tabular-nums text-[#071D35]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748B]">
                    kg
                  </span>
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Baseline eGFR</span>
                <div className="relative">
                  <input
                    type="number"
                    value={egfr}
                    onChange={(e) => setEgfr(e.target.value)}
                    className="clinical-input w-full px-3 py-1.5 pr-16 text-sm font-mono tabular-nums text-[#071D35]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#64748B]">
                    mL/min
                  </span>
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Unit</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as PatientRecord['unit'])}
                  className="clinical-input w-full px-3 py-1.5 text-sm text-[#071D35]"
                >
                  <option value="MICU">MICU</option>
                  <option value="CCU">CCU</option>
                  <option value="NICU">NICU</option>
                  <option value="ED Trauma">ED Trauma</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Bed Assignment</span>
                <input
                  type="text"
                  value={bed}
                  onChange={(e) => setBed(e.target.value)}
                  className="clinical-input w-full px-3 py-1.5 text-sm font-mono text-[#071D35]"
                />
              </label>

              <label className="sm:col-span-2 block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Initial Acuity</span>
                <div className="grid grid-cols-3 gap-2">
                  {[AcuityLevel.Critical, AcuityLevel.Guarded, AcuityLevel.Stable].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAcuity(lvl)}
                      className={`py-1.5 rounded border text-xs font-semibold ${
                        acuity === lvl
                          ? 'bg-[#071D35] text-white border-[#071D35]'
                          : 'bg-white text-[#44474D] border-[#E2E8F0]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </label>

              <label className="sm:col-span-2 block space-y-1">
                <span className="text-xs font-medium text-[#44474D]">Chief Complaint</span>
                <input
                  required
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g., Acute dyspnea, fever, suspected sepsis"
                  className="clinical-input w-full px-3 py-1.5 text-sm text-[#071D35]"
                />
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdmitOpen(false)}
                className="px-4 py-2 rounded border border-[#E2E8F0] text-xs font-semibold text-[#071D35]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#071D35] text-white text-xs font-semibold hover:bg-[#0B2A4A]"
              >
                Admit & Open Chart
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
