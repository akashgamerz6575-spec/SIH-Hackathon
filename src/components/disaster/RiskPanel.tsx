import { ShieldAlert, Flame, DoorOpen, Footprints, AlertTriangle } from 'lucide-react';
import type { FloorEmergencyData } from '@/types/disaster';

interface RiskPanelProps {
  floorData?: FloorEmergencyData;
}

const PRIORITY_BADGES = {
  P1: { label: 'P1 — IMMEDIATE RESCUE', bg: 'bg-danger-500/20 text-danger-300 border-danger-500/40' },
  P2: { label: 'P2 — HIGH PRIORITY', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  P3: { label: 'P3 — MODERATE PRIORITY', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  P4: { label: 'P4 — ROUTINE / SAFE', bg: 'bg-success-500/20 text-success-300 border-success-500/40' },
};

export function RiskPanel({ floorData }: RiskPanelProps) {
  if (!floorData) {
    return (
      <div className="p-4 bg-base-900/60 border border-white/[0.06] rounded-xl text-center text-xs text-slate-500">
        Select a floor strata slab to view volumetric risk assessment
      </div>
    );
  }

  const priorityMeta = PRIORITY_BADGES[floorData.priority] || PRIORITY_BADGES.P4;

  return (
    <div className="p-3.5 bg-base-900/80 border border-white/[0.08] rounded-xl space-y-3 shadow-panel-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-accent-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-tight">
            Strata Risk Analysis: {floorData.floorLabel}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${priorityMeta.bg}`}>
          {priorityMeta.label}
        </span>
      </div>

      {/* Priority Reason Alert */}
      <div className="p-2.5 rounded-lg bg-base-800/80 border border-white/[0.06] text-[11px] text-slate-300 space-y-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-400" /> Dispatch Rationale
        </div>
        <p className="leading-relaxed font-mono text-[10.5px] text-amber-200/90">
          {floorData.priorityReason}
        </p>
      </div>

      {/* 4-Corner Risk Matrix */}
      <div className="grid grid-cols-2 gap-2">
        {/* Structural Risk */}
        <div className="p-2 bg-base-800/50 rounded-lg border border-white/[0.04] space-y-1">
          <span className="text-[9px] text-slate-500 flex items-center gap-1 uppercase font-mono">
            <ShieldAlert className="h-3 w-3 text-slate-400" /> Structural Stress
          </span>
          <span className={`text-xs font-bold font-mono ${
            floorData.structuralRisk === 'CRITICAL' ? 'text-danger-400' :
            floorData.structuralRisk === 'HIGH' ? 'text-orange-400' :
            floorData.structuralRisk === 'MEDIUM' ? 'text-amber-400' : 'text-success-400'
          }`}>
            {floorData.structuralRisk}
          </span>
        </div>

        {/* Fire / Thermal Risk */}
        <div className="p-2 bg-base-800/50 rounded-lg border border-white/[0.04] space-y-1">
          <span className="text-[9px] text-slate-500 flex items-center gap-1 uppercase font-mono">
            <Flame className="h-3 w-3 text-slate-400" /> Fire & Smoke
          </span>
          <span className={`text-xs font-bold font-mono ${
            floorData.fireRisk === 'CRITICAL' ? 'text-danger-400' :
            floorData.fireRisk === 'HIGH' ? 'text-orange-400' :
            floorData.fireRisk === 'MEDIUM' ? 'text-amber-400' : 'text-success-400'
          }`}>
            {floorData.fireRisk}
          </span>
        </div>

        {/* Egress Access */}
        <div className="p-2 bg-base-800/50 rounded-lg border border-white/[0.04] space-y-1">
          <span className="text-[9px] text-slate-500 flex items-center gap-1 uppercase font-mono">
            <DoorOpen className="h-3 w-3 text-slate-400" /> Stairwell Access
          </span>
          <span className={`text-xs font-bold font-mono ${
            floorData.accessStatus === 'BLOCKED' ? 'text-danger-400' :
            floorData.accessStatus === 'LIMITED' ? 'text-amber-400' : 'text-success-400'
          }`}>
            {floorData.accessStatus}
          </span>
        </div>

        {/* Evacuation Route Status */}
        <div className="p-2 bg-base-800/50 rounded-lg border border-white/[0.04] space-y-1">
          <span className="text-[9px] text-slate-500 flex items-center gap-1 uppercase font-mono">
            <Footprints className="h-3 w-3 text-slate-400" /> Evac Status
          </span>
          <span className={`text-xs font-bold font-mono ${
            floorData.evacuationStatus === 'BLOCKED' ? 'text-danger-400' :
            floorData.evacuationStatus === 'IN_PROGRESS' ? 'text-amber-400' :
            floorData.evacuationStatus === 'COMPLETED' ? 'text-success-400' : 'text-accent-400'
          }`}>
            {floorData.evacuationStatus.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}
