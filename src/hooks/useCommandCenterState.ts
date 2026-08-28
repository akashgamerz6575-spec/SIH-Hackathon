import { useCallback, useMemo, useState } from 'react';
import type { MapMode, SelectionState, Parcel } from '@/types/property';
import { sampleParcel } from '@/data/sampleProperty';

/**
 * Central application state for the Command Center.
 * Manages active parcel (Demo Cadastre vs Generated 3D Property), selection state,
 * and Cesium synchronization.
 */
export function useCommandCenterState() {
  const [activeParcel, setActiveParcel] = useState<Parcel>(sampleParcel);
  const [generatedParcel, setGeneratedParcelState] = useState<Parcel | null>(null);

  const [selection, setSelection] = useState<SelectionState>({
    kind: null,
    parcelId: null,
    buildingId: null,
    floorId: null,
  });

  const [mapMode, setMapMode] = useState<MapMode>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [cesiumReady, setCesiumReady] = useState(false);
  const [cesiumError, setCesiumError] = useState<string | null>(null);

  const select = useCallback((next: SelectionState) => {
    setSelection(next);
  }, []);

  const selectFloor = useCallback(
    (buildingId: string, floorId: string) => {
      setSelection({
        kind: 'floor',
        parcelId: activeParcel.id,
        buildingId,
        floorId,
      });
    },
    [activeParcel.id],
  );

  const selectBuilding = useCallback(
    (buildingId: string) => {
      setSelection({
        kind: 'building',
        parcelId: activeParcel.id,
        buildingId,
        floorId: null,
      });
    },
    [activeParcel.id],
  );

  const selectParcel = useCallback(() => {
    setSelection({
      kind: 'parcel',
      parcelId: activeParcel.id,
      buildingId: null,
      floorId: null,
    });
  }, [activeParcel.id]);

  const clearSelection = useCallback(() => {
    setSelection({ kind: null, parcelId: null, buildingId: null, floorId: null });
  }, []);

  const toggleMapMode = useCallback(() => {
    setMapMode((m) => (m === '3d' ? '2d' : '3d'));
  }, []);

  /** Sets a newly generated 3D property and makes it active */
  const setGeneratedParcel = useCallback((newParcel: Parcel) => {
    setGeneratedParcelState(newParcel);
    setActiveParcel(newParcel);

    // Auto-select Ground floor of the generated building
    const bld = newParcel.buildings[0];
    if (bld && bld.floors.length > 0) {
      const targetFloor = bld.floors.find((f) => f.kind === 'ground') || bld.floors[0];
      setSelection({
        kind: 'floor',
        parcelId: newParcel.id,
        buildingId: bld.id,
        floorId: targetFloor.id,
      });
    }
  }, []);

  /** Switch back to the standard Demo Cadastre */
  const switchToSampleParcel = useCallback(() => {
    setActiveParcel(sampleParcel);
    setSelection({
      kind: 'parcel',
      parcelId: sampleParcel.id,
      buildingId: null,
      floorId: null,
    });
  }, []);

  /** Switch to the Generated 3D Property */
  const switchToGeneratedParcel = useCallback(() => {
    if (generatedParcel) {
      setActiveParcel(generatedParcel);
      const bld = generatedParcel.buildings[0];
      const targetFloor = bld?.floors.find((f) => f.kind === 'ground') || bld?.floors[0];
      setSelection({
        kind: 'floor',
        parcelId: generatedParcel.id,
        buildingId: bld?.id || null,
        floorId: targetFloor?.id || null,
      });
    }
  }, [generatedParcel]);

  const isGeneratedActive = activeParcel.id !== sampleParcel.id;

  return useMemo(
    () => ({
      parcel: activeParcel,
      activeParcel,
      generatedParcel,
      isGeneratedActive,
      selection,
      mapMode,
      searchQuery,
      cesiumReady,
      cesiumError,
      select,
      selectFloor,
      selectBuilding,
      selectParcel,
      clearSelection,
      setMapMode,
      toggleMapMode,
      setSearchQuery,
      setCesiumReady,
      setCesiumError,
      setGeneratedParcel,
      switchToSampleParcel,
      switchToGeneratedParcel,
    }),
    [
      activeParcel,
      generatedParcel,
      isGeneratedActive,
      selection,
      mapMode,
      searchQuery,
      cesiumReady,
      cesiumError,
      select,
      selectFloor,
      selectBuilding,
      selectParcel,
      clearSelection,
      toggleMapMode,
      setGeneratedParcel,
      switchToSampleParcel,
      switchToGeneratedParcel,
    ],
  );
}

export type CommandCenterState = ReturnType<typeof useCommandCenterState>;
