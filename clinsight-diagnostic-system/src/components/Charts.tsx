import React, { useState } from 'react';
import { VitalPoint } from '../types/clinical';

export const VitalSparkline: React.FC<{
  values: number[];
  color?: string;
  height?: number;
}> = ({ values, color = '#19B6B2', height = 22 }) => {
  if (values.length < 2) {
    return <div style={{ height }} className="w-16 bg-[#F4F7FB] rounded" />;
  }
  const w = 64;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = height - 3 - ((v - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface VitalsMultiTrendChartProps {
  data: VitalPoint[];
}

type SeriesKey = 'hr' | 'sbp' | 'spo2' | 'lactate';

const SERIES_META: Record<
  SeriesKey,
  { label: string; unit: string; color: string; min: number; max: number }
> = {
  hr: { label: 'Heart Rate', unit: 'bpm', color: '#071D35', min: 50, max: 140 },
  sbp: { label: 'Systolic BP', unit: 'mmHg', color: '#19B6B2', min: 70, max: 200 },
  spo2: { label: 'SpO2', unit: '%', color: '#0D9488', min: 85, max: 100 },
  lactate: { label: 'Lactate', unit: 'mmol/L', color: '#DC2626', min: 0, max: 6 },
};

export const VitalsMultiTrendChart: React.FC<VitalsMultiTrendChartProps> = ({ data }) => {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    hr: true,
    sbp: true,
    spo2: true,
    lactate: true,
  });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 680;
  const height = 210;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const activePoint = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  const getCoords = (key: SeriesKey) => {
    const { min, max } = SERIES_META[key];
    return data.map((d, i) => {
      const x = data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW;
      const val = d[key];
      const clamped = Math.max(min, Math.min(max, val));
      const y = padT + plotH - ((clamped - min) / (max - min)) * plotH;
      return { x, y, val };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SERIES_META) as SeriesKey[]).map((key) => {
            const meta = SERIES_META[key];
            const active = visible[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setVisible((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white border-[#CBD5E1] text-[#071D35]'
                    : 'bg-[#F4F7FB] border-transparent text-[#64748B] opacity-65'
                }`}
              >
                <span
                  className="w-2.5 h-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-[#44474D] bg-[#F4F7FB] px-3 py-1 rounded border border-[#E2E8F0]">
            <span className="font-semibold text-[#071D35]">{activePoint.time}</span>
            <span>HR {activePoint.hr}</span>
            <span>BP {activePoint.sbp}/{activePoint.dbp}</span>
            <span>SpO2 {activePoint.spo2}%</span>
            <span className={activePoint.lactate >= 2.0 ? 'text-[#DC2626] font-semibold' : ''}>
              Lac {activePoint.lactate.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal normalized gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + t * plotH;
            return (
              <line
                key={t}
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray={t === 1 ? undefined : '3 3'}
              />
            );
          })}

          {/* Y-axis normalized clinical zone labels */}
          <text x={4} y={padT + 4} fontSize="10" fill="#64748B" fontFamily="JetBrains Mono">
            High
          </text>
          <text x={4} y={padT + plotH / 2 + 4} fontSize="10" fill="#64748B" fontFamily="JetBrains Mono">
            Mid
          </text>
          <text x={4} y={padT + plotH + 3} fontSize="10" fill="#64748B" fontFamily="JetBrains Mono">
            Low
          </text>

          {/* X-axis timestamps */}
          {data.map((pt, i) => {
            const x = data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW;
            return (
              <text
                key={pt.time + i}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
                fontFamily="JetBrains Mono"
              >
                {pt.time}
              </text>
            );
          })}

          {/* Series paths */}
          {(Object.keys(SERIES_META) as SeriesKey[]).map((key) => {
            if (!visible[key]) return null;
            const coords = getCoords(key);
            const pathD = coords
              .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
              .join(' ');
            const color = SERIES_META[key].color;
            return (
              <g key={key}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={key === 'lactate' ? '5 3' : undefined}
                />
                {coords.map((c, idx) => (
                  <circle
                    key={idx}
                    cx={c.x}
                    cy={c.y}
                    r={hoverIdx === idx ? 4.5 : 3}
                    fill="#FFFFFF"
                    stroke={color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {/* Hover crosshair & hit zones */}
          {hoverIdx !== null && data[hoverIdx] && (
            <line
              x1={
                data.length === 1
                  ? padL + plotW / 2
                  : padL + (hoverIdx / (data.length - 1)) * plotW
              }
              x2={
                data.length === 1
                  ? padL + plotW / 2
                  : padL + (hoverIdx / (data.length - 1)) * plotW
              }
              y1={padT}
              y2={padT + plotH}
              stroke="#19B6B2"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {data.map((_, i) => {
            const segW = plotW / Math.max(1, data.length);
            const x = padL + i * segW - segW / 2 + (data.length > 1 ? segW / 2 : 0);
            return (
              <rect
                key={i}
                x={Math.max(padL, x - segW / 2)}
                y={padT}
                width={segW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const DualAxisBiomarkerChart: React.FC<{
  primaryLabel: string;
  primaryUnit: string;
  primaryPoints: { time: string; value: number }[];
  secondaryLabel: string;
  secondaryUnit: string;
  secondaryPoints: { time: string; value: number }[];
}> = ({
  primaryLabel,
  primaryUnit,
  primaryPoints,
  secondaryLabel,
  secondaryUnit,
  secondaryPoints,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const count = Math.max(primaryPoints.length, secondaryPoints.length, 2);
  const w = 640;
  const h = 210;
  const padL = 44;
  const padR = 44;
  const padT = 18;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const pVals = primaryPoints.map((p) => p.value);
  const pMin = Math.min(...pVals, 0);
  const pMax = Math.max(...pVals, 1) * 1.1;

  const sVals = secondaryPoints.map((s) => s.value);
  const sMin = Math.min(...sVals, 0);
  const sMax = Math.max(...sVals, 1) * 1.1;

  const mapPoints = (pts: { time: string; value: number }[], min: number, max: number) =>
    pts.map((p, i) => ({
      x: pts.length <= 1 ? padL + plotW / 2 : padL + (i / (pts.length - 1)) * plotW,
      y: padT + plotH - ((p.value - min) / (max - min || 1)) * plotH,
      ...p,
    }));

  const pCoords = mapPoints(primaryPoints, pMin, pMax);
  const sCoords = mapPoints(secondaryPoints, sMin, sMax);

  const pPath = pCoords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const sPath = sCoords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#071D35]">
            <span className="w-3 h-0.5 bg-[#071D35]" />
            {primaryLabel} ({primaryUnit})
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#0D9488]">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[#19B6B2]" />
            {secondaryLabel} ({secondaryUnit})
          </span>
        </div>
        {hoverIdx !== null && (
          <div className="font-mono tabular-nums text-[11px] bg-[#F4F7FB] border border-[#E2E8F0] px-2.5 py-1 rounded text-[#071D35]">
            {pCoords[hoverIdx] && (
              <span className="mr-3">
                {primaryLabel}: {pCoords[hoverIdx].value} {primaryUnit}
              </span>
            )}
            {sCoords[hoverIdx] && (
              <span className="text-[#006A67]">
                {secondaryLabel}: {sCoords[hoverIdx].value} {secondaryUnit}
              </span>
            )}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto cursor-crosshair select-none"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = padT + r * plotH;
          return (
            <line
              key={r}
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray={r === 1 ? undefined : '3 3'}
            />
          );
        })}

        {/* Left Y Axis */}
        <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="#071D35" fontFamily="JetBrains Mono">
          {pMax.toFixed(1)}
        </text>
        <text x={padL - 6} y={padT + plotH + 3} textAnchor="end" fontSize="10" fill="#071D35" fontFamily="JetBrains Mono">
          {pMin.toFixed(1)}
        </text>

        {/* Right Y Axis */}
        <text x={w - padR + 6} y={padT + 4} textAnchor="start" fontSize="10" fill="#006A67" fontFamily="JetBrains Mono">
          {sMax.toFixed(1)}
        </text>
        <text x={w - padR + 6} y={padT + plotH + 3} textAnchor="start" fontSize="10" fill="#006A67" fontFamily="JetBrains Mono">
          {sMin.toFixed(1)}
        </text>

        {pCoords.map((pt, i) => (
          <text
            key={pt.time + i}
            x={pt.x}
            y={h - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#64748B"
            fontFamily="JetBrains Mono"
          >
            {pt.time}
          </text>
        ))}

        {pPath && (
          <path d={pPath} fill="none" stroke="#071D35" strokeWidth="2.2" strokeLinecap="round" />
        )}
        {sPath && (
          <path
            d={sPath}
            fill="none"
            stroke="#19B6B2"
            strokeWidth="2.2"
            strokeDasharray="6 3"
            strokeLinecap="round"
          />
        )}

        {pCoords.map((c, i) => (
          <circle key={`p-${i}`} cx={c.x} cy={c.y} r={3.5} fill="#FFFFFF" stroke="#071D35" strokeWidth="2" />
        ))}
        {sCoords.map((c, i) => (
          <circle key={`s-${i}`} cx={c.x} cy={c.y} r={3.5} fill="#FFFFFF" stroke="#19B6B2" strokeWidth="2" />
        ))}

        {Array.from({ length: count }).map((_, i) => {
          const segW = plotW / count;
          return (
            <rect
              key={i}
              x={padL + i * segW}
              y={padT}
              width={segW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const EcgTelemetryStrip: React.FC<{
  pattern: 'sinus_tach' | 'stemi_ant' | 'afib_rvr' | 'normal_sinus';
}> = ({ pattern }) => {
  // Construct 6 beats across 720px width
  const width = 720;
  const height = 140;
  const baseline = 82;

  const beatIntervals =
    pattern === 'sinus_tach'
      ? [95, 95, 95, 95, 95, 95]
      : pattern === 'stemi_ant'
      ? [105, 105, 105, 105, 105, 105]
      : pattern === 'afib_rvr'
      ? [78, 114, 84, 130, 88, 108]
      : [135, 135, 135, 135, 135];

  let xCursor = 16;
  let path = `M 0 ${baseline}`;

  beatIntervals.forEach((step) => {
    if (xCursor + 70 > width) return;
    // P-wave (absent/fibrillatory in afib)
    if (pattern !== 'afib_rvr') {
      path += ` L ${xCursor} ${baseline} Q ${xCursor + 6} ${baseline - 8} ${xCursor + 12} ${baseline}`;
    } else {
      path += ` L ${xCursor} ${baseline - 2} L ${xCursor + 6} ${baseline + 2} L ${xCursor + 12} ${baseline - 1}`;
    }
    // PR segment
    path += ` L ${xCursor + 18} ${baseline}`;
    // QRS complex
    path += ` L ${xCursor + 21} ${baseline + 7} L ${xCursor + 26} ${baseline - 46} L ${xCursor + 31} ${baseline + 13}`;
    // ST segment (elevated convex tombstone for anterior STEMI)
    if (pattern === 'stemi_ant') {
      path += ` L ${xCursor + 34} ${baseline - 18} Q ${xCursor + 48} ${baseline - 24} ${xCursor + 62} ${baseline}`;
    } else {
      path += ` L ${xCursor + 34} ${baseline} L ${xCursor + 42} ${baseline} Q ${xCursor + 51} ${baseline - 12} ${xCursor + 60} ${baseline}`;
    }
    xCursor += step;
    path += ` L ${Math.min(xCursor, width)} ${baseline}`;
  });
  path += ` L ${width} ${baseline}`;

  return (
    <div className="bg-[#071D35] rounded border border-[#1E3A5F] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1E3A5F] text-[11px] font-mono text-[#73F7F2]">
        <span>LEAD II · 25 mm/s · 10 mm/mV</span>
        <span>
          {pattern === 'stemi_ant'
            ? 'V2–V4 ST ELEVATION +3.5 mm'
            : pattern === 'afib_rvr'
            ? 'IRREGULAR R-R · NO DISCRETE P-WAVE'
            : pattern === 'sinus_tach'
            ? 'SINUS TACHYCARDIA · 112 BPM'
            : 'NORMAL SINUS RHYTHM · 72 BPM'}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        {/* Calibration grid */}
        <defs>
          <pattern id="ecgSmall" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(85,221,224,0.08)" strokeWidth="0.5" />
          </pattern>
          <pattern id="ecgLarge" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="url(#ecgSmall)" />
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(85,221,224,0.18)" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#ecgLarge)" />
        <path
          d={path}
          fill="none"
          stroke="#55DDE0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
