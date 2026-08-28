import { Bell, Box, ShieldCheck, MapPin, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { SearchField } from '@/components/ui/SearchField';
import type { SearchEntry, SelectionState, Parcel } from '@/types/property';

interface TopBarProps {
  onSelectSearchResult: (entry: SearchEntry) => void;
  selection: SelectionState;
  activeView?: 'command' | 'disaster';
  onNavigateCommandCenter?: () => void;
  onNavigateDisaster?: () => void;
  onOpenCreateProperty?: () => void;
  isGeneratedActive?: boolean;
  hasGeneratedProperty?: boolean;
  onSwitchToDemo?: () => void;
  onSwitchToGenerated?: () => void;
  activeParcel?: Parcel;
}

export function TopBar({
  onSelectSearchResult,
  selection,
  activeView = 'command',
  onNavigateCommandCenter,
  onNavigateDisaster,
  onOpenCreateProperty,
  isGeneratedActive,
  hasGeneratedProperty,
  onSwitchToDemo,
  onSwitchToGenerated,
  activeParcel,
}: TopBarProps) {
  const selectionLabel = selection.kind
    ? `${selection.kind.toUpperCase()} SELECTED`
    : 'READY';

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 glass-panel-header z-20">
      {/* Left: logo + navigation + create action */}
      <div className="flex items-center gap-3.5">
        {/* Logo / Wordmark */}
        <button
          onClick={onNavigateCommandCenter}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="h-8 w-8 rounded-lg bg-accent-500/10 border border-accent-500/25 flex items-center justify-center relative group-hover:border-accent-500/50 transition-colors">
            <Box className="h-4 w-4 text-accent-400" />
            <div className="absolute inset-0 rounded-lg animate-pulse-glow" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-slate-100 tracking-tight">
              3D ULPIN
            </span>
            <span className="text-[9px] text-slate-500 tracking-wide uppercase">
              Vertical Property Mapping
            </span>
          </div>
        </button>

        {/* Navigation pills */}
        <div className="hidden md:flex items-center gap-0.5 ml-1 pl-3 border-l border-white/[0.06]">
          <NavPill
            active={activeView === 'command'}
            label="Command Center"
            onClick={onNavigateCommandCenter}
          />
          <NavPill
            active={activeView === 'disaster'}
            label="Disaster View"
            onClick={onNavigateDisaster}
            tooltip="3D Volumetric Disaster & Rescue Command Interface"
          />
        </div>

        {/* CREATE 3D PROPERTY Button */}
        {onOpenCreateProperty && (
          <button
            onClick={onOpenCreateProperty}
            className="ml-2 px-3 py-1.5 rounded-lg bg-accent-500/15 border border-accent-500/30 text-xs font-semibold text-accent-300 hover:bg-accent-500/25 hover:border-accent-500/50 transition-all flex items-center gap-1.5 shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create 3D Property</span>
          </button>
        )}

        {/* Property Switcher Pills if a generated building exists */}
        {hasGeneratedProperty && (
          <div className="hidden xl:flex items-center bg-base-800/60 rounded-lg p-0.5 border border-white/[0.06] text-[10px]">
            <button
              onClick={onSwitchToDemo}
              className={`px-2 py-0.5 rounded transition-all ${
                !isGeneratedActive
                  ? 'bg-accent-500/20 text-accent-300 font-semibold border border-accent-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Cadastre
            </button>
            <button
              onClick={onSwitchToGenerated}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                isGeneratedActive
                  ? 'bg-accent-500/20 text-accent-300 font-semibold border border-accent-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-2.5 w-2.5 text-accent-400" />
              <span>Generated 3D</span>
            </button>
          </div>
        )}
      </div>

      {/* Center: search */}
      <div className="flex items-center gap-3">
        <SearchField onSelect={onSelectSearchResult} />
      </div>

      {/* Right: location + status + notifications + user */}
      <div className="flex items-center gap-3">
        {/* Active Property Badge */}
        {activeParcel && (
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-base-800/40 px-2 py-1 rounded border border-white/[0.04]">
            <span className="text-slate-500">PARCEL:</span>
            <span className="text-slate-200 truncate max-w-[120px]">{activeParcel.id}</span>
          </div>
        )}

        {/* System status */}
        <div className="hidden md:flex items-center gap-1.5 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse-soft" />
          <span className="text-success-400 font-medium tracking-wide uppercase">
            {selectionLabel}
          </span>
        </div>

        {/* Notifications */}
        <button
          title="Notifications (Land Records Feed)"
          className="relative h-8 w-8 rounded-lg bg-base-800/60 border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-warn-500" />
        </button>

        {/* User profile */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-base-800/50 border border-white/[0.06]">
          <div className="h-6 w-6 rounded-full bg-accent-500/15 border border-accent-500/25 flex items-center justify-center">
            <ShieldCheck className="h-3 w-3 text-accent-400" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] text-slate-200 font-medium">Admin</span>
            <span className="text-[9px] text-slate-500">Land Records Dept.</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavPill({
  label,
  active,
  disabled,
  tooltip,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={tooltip}
      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
        active
          ? 'text-accent-300 bg-accent-500/10 border border-accent-500/20'
          : disabled
            ? 'text-slate-600 cursor-not-allowed opacity-50 border border-transparent'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      {label}
    </button>
  );
}
