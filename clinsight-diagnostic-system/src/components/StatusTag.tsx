import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Cpu,
  FlaskConical,
} from 'lucide-react';
import { AcuityLevel, AnalysisProvenance, LabFlag } from '../types/clinical';

export const AcuityTag: React.FC<{ acuity: AcuityLevel }> = ({ acuity }) => {
  if (acuity === AcuityLevel.Critical) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-[#DC2626]/8 text-[#DC2626] border border-[#DC2626]/25 whitespace-nowrap shrink-0">
        <AlertCircle className="w-3 h-3" aria-hidden="true" />
        <span>Critical</span>
      </span>
    );
  }
  if (acuity === AcuityLevel.Guarded) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/30 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
        <span>Guarded</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/25 whitespace-nowrap shrink-0">
      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
      <span>Stable</span>
    </span>
  );
};

export const LabFlagTag: React.FC<{ flag: LabFlag }> = ({ flag }) => {
  if (flag === LabFlag.Critical) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 whitespace-nowrap">
        <AlertCircle className="w-3 h-3" aria-hidden="true" />
        <span>Critical</span>
      </span>
    );
  }
  if (flag === LabFlag.High) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/30 whitespace-nowrap">
        <ArrowUp className="w-3 h-3" aria-hidden="true" />
        <span>High</span>
      </span>
    );
  }
  if (flag === LabFlag.Low) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#4D5F7B]/10 text-[#354862] border border-[#4D5F7B]/25 whitespace-nowrap">
        <ArrowDown className="w-3 h-3" aria-hidden="true" />
        <span>Low</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#0D9488]/8 text-[#0D9488] whitespace-nowrap">
      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
      <span>Normal</span>
    </span>
  );
};

export const ConfidenceTag: React.FC<{ score: number }> = ({ score }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums bg-[#19B6B2]/12 border border-[#19B6B2]/45 text-[#071D35] whitespace-nowrap shrink-0">
    {score.toFixed(1)}% Match
  </span>
);

export const ProvenanceBanner: React.FC<{
  provenance: AnalysisProvenance;
  modelId: string;
  analyzedAt?: string;
  latencyMs?: number;
}> = ({ provenance, modelId, analyzedAt, latencyMs }) => {
  if (provenance === 'functional_ai') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded border border-[#19B6B2] bg-[#19B6B2]/10 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[#071D35]">
          <Cpu className="w-4 h-4 text-[#006A67] shrink-0" aria-hidden="true" />
          <span>Functional AI Analysis · Live Gemini Inference</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#006A67] tabular-nums">
          <span>Model: {modelId}</span>
          {latencyMs !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>{latencyMs} ms</span>
            </>
          )}
          {analyzedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>{new Date(analyzedAt).toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded border border-[#F59E0B]/40 bg-[#FFFBEB] text-xs">
      <div className="flex items-center gap-2 font-semibold text-[#92400E]">
        <FlaskConical className="w-4 h-4 text-[#D97706] shrink-0" aria-hidden="true" />
        <span>Simulated Demonstration Result · Static Baseline</span>
      </div>
      <span className="text-[11px] text-[#92400E]">
        Pre-authored demo dataset (no live AI model invoked)
      </span>
    </div>
  );
};
