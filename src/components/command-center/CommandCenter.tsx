import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { TopBar } from '@/components/command-center/TopBar';
import { PropertyExplorer } from '@/components/property/PropertyExplorer';
import { PropertyIntelligence } from '@/components/property/PropertyIntelligence';
import { FloorExplorer } from '@/components/floor/FloorExplorer';
import { CesiumMount } from '@/components/ui/CesiumMount';
import { MapControls } from '@/components/ui/MapControls';
import { CreatePropertyModal } from '@/components/floorplan/CreatePropertyModal';
import { useCommandCenterState } from '@/hooks/useCommandCenterState';
import { useCesiumAdapter } from '@/hooks/useCesiumAdapter';
import { resolveSelectedBuilding } from '@/utils/selection';
import type { SearchEntry, SelectionState } from '@/types/property';

export function CommandCenter() {
  const state = useCommandCenterState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Stable selection callback so the adapter effect doesn't re-run
  const selectionCallbackRef = useRef((sel: SelectionState) => {
    state.select(sel);
  });
  selectionCallbackRef.current = state.select;

  const adapterRef = useCesiumAdapter(
    containerRef,
    state.parcel,
    (sel) => selectionCallbackRef.current(sel),
  );

  // Mark ready once the adapter has parcel loaded
  useEffect(() => {
    const t = setTimeout(() => state.setCesiumReady(true), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync React selection → Cesium highlight
  useEffect(() => {
    adapterRef.current?.select(state.selection);
    if (state.selection.kind === 'floor' && state.selection.floorId) {
      adapterRef.current?.flyToFloor(state.selection.floorId);
    }
  }, [state.selection, adapterRef]);

  // Sync map mode
  useEffect(() => {
    adapterRef.current?.setMapMode(state.mapMode);
  }, [state.mapMode, adapterRef]);

  const handleSearchSelect = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === 'parcel') {
        state.selectParcel();
      } else if (entry.kind === 'building') {
        state.selectBuilding(entry.buildingId);
      } else if (entry.kind === 'floor' && entry.floorId) {
        state.selectFloor(entry.buildingId, entry.floorId);
      }
    },
    [state],
  );

  const handleHomeCamera = useCallback(() => {
    adapterRef.current?.resetCamera();
  }, [adapterRef]);

  const handleFocusSelection = useCallback(() => {
    if (state.selection.kind === 'floor' && state.selection.floorId) {
      adapterRef.current?.flyToFloor(state.selection.floorId);
    } else {
      adapterRef.current?.resetCamera();
    }
  }, [state.selection, adapterRef]);

  const handleResetAll = useCallback(() => {
    state.clearSelection();
    adapterRef.current?.resetCamera();
  }, [state, adapterRef]);

  const selectedBuilding = resolveSelectedBuilding(state.parcel, state.selection);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base-950">
      <TopBar
        onSelectSearchResult={handleSearchSelect}
        selection={state.selection}
        onNavigateCommandCenter={handleResetAll}
        onOpenCreateProperty={() => setIsCreateModalOpen(true)}
        isGeneratedActive={state.isGeneratedActive}
        hasGeneratedProperty={!!state.generatedParcel}
        onSwitchToDemo={state.switchToSampleParcel}
        onSwitchToGenerated={state.switchToGeneratedParcel}
        activeParcel={state.parcel}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left panel — Property Explorer + Vertical Floor Explorer */}
        {!sidebarCollapsed ? (
          <aside className="w-[280px] shrink-0 flex flex-col bg-base-900/70 backdrop-blur-md border-r border-white/[0.04] transition-all duration-300 z-10">
            <div className="flex-1 overflow-hidden">
              <PropertyExplorer
                parcel={state.parcel}
                selection={state.selection}
                onSelectParcel={state.selectParcel}
                onSelectBuilding={state.selectBuilding}
                onSelectFloor={state.selectFloor}
                onToggleCollapse={() => setSidebarCollapsed(true)}
              />
            </div>
            {selectedBuilding && (
              <div className="shrink-0 border-t border-white/[0.04]">
                <FloorExplorer
                  building={selectedBuilding}
                  selection={state.selection}
                  onSelectFloor={state.selectFloor}
                />
              </div>
            )}
          </aside>
        ) : (
          /* Floating Expand Button when Sidebar is Collapsed */
          <button
            onClick={() => setSidebarCollapsed(false)}
            title="Expand Property Explorer"
            className="absolute top-3 left-3 z-30 h-8 px-2.5 rounded-lg glass-panel flex items-center gap-1.5 text-xs text-slate-300 hover:text-accent-300 hover:border-accent-500/30 transition-all shadow-panel-lg"
          >
            <PanelLeftOpen className="h-4 w-4 text-accent-400" />
            <span className="text-[11px] font-medium">Explorer</span>
          </button>
        )}

        {/* Center — Cesium 3D Viewer (HERO) */}
        <main className="flex-1 relative overflow-hidden bg-base-950">
          <CesiumMount
            ready={state.cesiumReady}
            error={state.cesiumError}
            containerRef={containerRef}
            selection={state.selection}
            parcel={state.parcel}
          />
          <MapControls
            mapMode={state.mapMode}
            onToggleMapMode={state.toggleMapMode}
            onHome={handleHomeCamera}
            onFocus={handleFocusSelection}
            onReset={handleResetAll}
          />
        </main>

        {/* Right panel divider */}
        <div className="panel-divider" />

        {/* Right panel — Property Intelligence */}
        <aside className="w-[320px] shrink-0 flex flex-col bg-base-900/70 backdrop-blur-md z-10">
          <PropertyIntelligence
            parcel={state.parcel}
            selection={state.selection}
            onSelectParcel={state.selectParcel}
            onSelectBuilding={state.selectBuilding}
            onSelectFloor={state.selectFloor}
          />
        </aside>
      </div>

      {/* CREATE 3D PROPERTY MODAL */}
      <CreatePropertyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGenerateProperty={(generated) => {
          state.setGeneratedParcel(generated);
        }}
      />
    </div>
  );
}
