import * as Cesium from 'cesium';
import type { ICesiumAdapter } from './types';
import type { Parcel, SelectionState } from '@/types/property';
import { createParcelEntity, setParcelHighlight } from './ParcelLayer';
import {
  createBuildingEntity,
  setBuildingHighlight,
  BUILDING_CONSTANTS,
} from './BuildingLayer';
import { createFloorEntities, setFloorHighlight, floorCenterHeight } from './FloorLayer';
import { CameraController } from './CameraController';
import { InteractionHandler } from './interaction/InteractionHandler';

/**
 * CesiumSceneAdapter is the single bridge between React and CesiumJS.
 * Handles dynamic property replacement, floor strata rendering, and camera focus.
 */
export class CesiumSceneAdapter implements ICesiumAdapter {
  private viewer: Cesium.Viewer | null = null;
  private camera: CameraController | null = null;
  private interaction: InteractionHandler | null = null;

  private parcel: Parcel | null = null;
  private parcelEntity: Cesium.Entity | undefined;
  private buildingEntities = new Map<string, Cesium.Entity>();
  private floorRecords = new Map<string, { entity: Cesium.Entity; floor: import('@/types/property').Floor; labelEntity?: Cesium.Entity }>();

  private currentSelection: SelectionState = {
    kind: null,
    parcelId: null,
    buildingId: null,
    floorId: null,
  };

  constructor(private onSelection: (selection: SelectionState) => void) {}

  async init(container: HTMLElement): Promise<void> {
    // CESIUM_BASE_URL is defined in vite.config.ts and points to /cesium
    (Cesium as unknown as { Ion: { defaultAccessToken: string } }).Ion.defaultAccessToken =
      (import.meta.env.VITE_CESIUM_TOKEN as string) || '';

    this.viewer = new Cesium.Viewer(container, {
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Cesium.TileMapServiceImageryProvider.fromUrl(
          `${CESIUM_BASE_URL}/Assets/Textures/NaturalEarthII`,
        ),
      ),
      terrainProvider: undefined,
      animation: false,
      timeline: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      fullscreenButton: false,
      navigationHelpButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: false,
      shouldAnimate: true,
    });

    // ── Dark atmosphere for the command-center aesthetic ──
    const scene = this.viewer.scene;
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#060a10');
    scene.backgroundColor = Cesium.Color.fromCssColorString('#060a10');

    // Disable sky elements for a clean dark look
    if (scene.skyBox) scene.skyBox.show = false;
    if (scene.sun) scene.sun.show = false;
    if (scene.moon) scene.moon.show = false;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = false;
    scene.fog.enabled = false;

    // Enable anti-aliasing for cleaner edges
    scene.postProcessStages.fxaa.enabled = true;

    // Globe rendering tweaks for dark aesthetic and subterranean visibility
    scene.globe.showGroundAtmosphere = false;
    scene.globe.enableLighting = false;
    scene.globe.depthTestAgainstTerrain = false;

    this.camera = new CameraController(this.viewer);
    this.interaction = new InteractionHandler(this.viewer, this.onSelection);

    // Ensure viewer fills container
    this.viewer.resize();
    window.addEventListener('resize', () => {
      this.viewer?.resize();
    });
  }

  setParcel(parcel: Parcel): void {
    if (!this.viewer) return;
    this.parcel = parcel;

    // Clean up previous entities
    if (this.parcelEntity) {
      this.viewer.entities.remove(this.parcelEntity);
      this.parcelEntity = undefined;
    }
    for (const entity of this.buildingEntities.values()) {
      this.viewer.entities.remove(entity);
    }
    this.buildingEntities.clear();

    for (const record of this.floorRecords.values()) {
      this.viewer.entities.remove(record.entity);
      if (record.labelEntity) {
        this.viewer.entities.remove(record.labelEntity);
      }
    }
    this.floorRecords.clear();

    // Create new entities
    this.parcelEntity = createParcelEntity(this.viewer, parcel);

    for (const building of parcel.buildings) {
      const bEntity = createBuildingEntity(
        this.viewer,
        building,
        parcel.longitude,
        parcel.latitude,
      );
      this.buildingEntities.set(building.id, bEntity);

      const floorMap = createFloorEntities(
        this.viewer,
        building,
        parcel.longitude,
        parcel.latitude,
      );
      for (const [floorId, record] of floorMap) {
        this.floorRecords.set(floorId, record);
      }
    }

    // Frame the scene
    const firstBuilding = parcel.buildings[0];
    const aboveFloors = firstBuilding
      ? firstBuilding.floors.filter((f) => f.kind !== 'basement')
      : [];
    const topIndex = Math.max(...aboveFloors.map((f) => f.levelIndex), 0);
    const maxHeight = (topIndex + 1) * BUILDING_CONSTANTS.FLOOR_HEIGHT_M;
    this.camera?.frameParcel(parcel.longitude, parcel.latitude, maxHeight);
  }

  select(selection: SelectionState): void {
    if (!this.viewer) return;
    this.currentSelection = selection;

    // Reset all highlights
    setParcelHighlight(this.parcelEntity, false);
    for (const entity of this.buildingEntities.values()) {
      setBuildingHighlight(entity, false);
    }
    for (const record of this.floorRecords.values()) {
      setFloorHighlight(record, false);
    }

    // Apply new highlight
    if (selection.kind === 'parcel') {
      setParcelHighlight(this.parcelEntity, true);
    } else if (selection.kind === 'building' && selection.buildingId) {
      setBuildingHighlight(this.buildingEntities.get(selection.buildingId), true);
    } else if (selection.kind === 'floor' && selection.floorId) {
      setFloorHighlight(this.floorRecords.get(selection.floorId), true);
    }
  }

  setMapMode(mode: '3d' | '2d'): void {
    if (!this.parcel || !this.camera) return;
    this.camera.setMapMode(mode, this.parcel.longitude, this.parcel.latitude);
  }

  resetCamera(): void {
    if (!this.parcel || !this.camera) return;
    const firstBuilding = this.parcel.buildings[0];
    const aboveFloors = firstBuilding
      ? firstBuilding.floors.filter((f) => f.kind !== 'basement')
      : [];
    const topIndex = Math.max(...aboveFloors.map((f) => f.levelIndex), 0);
    const maxHeight = (topIndex + 1) * BUILDING_CONSTANTS.FLOOR_HEIGHT_M;
    this.camera.resetCamera(this.parcel.longitude, this.parcel.latitude, maxHeight);
  }

  flyToFloor(floorId: string): void {
    if (!this.parcel || !this.camera) return;
    const record = this.floorRecords.get(floorId);
    if (!record) return;
    const z = floorCenterHeight(record.floor);
    this.camera.flyToFloor(this.parcel.longitude, this.parcel.latitude, z);
  }

  dispose(): void {
    this.interaction?.dispose();
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
    this.viewer = null;
    this.camera = null;
    this.interaction = null;
    this.buildingEntities.clear();
    this.floorRecords.clear();
  }
}
