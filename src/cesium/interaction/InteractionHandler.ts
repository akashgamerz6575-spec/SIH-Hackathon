import * as Cesium from 'cesium';
import type { SelectionState } from '@/types/property';

/**
 * Translates Cesium pick events into application SelectionState.
 * Supports clicking on 3D floor slabs, 3D floor labels, building envelope, and parcel polygon.
 * Synchronizes immediately with React state.
 */
export class InteractionHandler {
  private screenSpaceHandler: Cesium.ScreenSpaceEventHandler;
  private currentSelection: SelectionState = {
    kind: null,
    parcelId: null,
    buildingId: null,
    floorId: null,
  };

  constructor(
    private viewer: Cesium.Viewer,
    private onSelection: (selection: SelectionState) => void,
  ) {
    this.screenSpaceHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas,
    );

    this.screenSpaceHandler.setInputAction(
      this.handleLeftClick.bind(this),
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  }

  private handleLeftClick(movement: { position: Cesium.Cartesian2 }): void {
    const picked = this.viewer.scene.pick(movement.position);
    if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
      const entity = picked.id as Cesium.Entity;
      this.resolveSelection(entity.id);
    } else {
      // Click on empty space clears selection
      this.onSelection({ kind: null, parcelId: null, buildingId: null, floorId: null });
    }
  }

  private resolveSelection(entityId: string): void {
    if (entityId === 'sample-parcel') {
      const sel: SelectionState = {
        kind: 'parcel',
        parcelId: 'KA-BLR-DEMO-001',
        buildingId: null,
        floorId: null,
      };
      this.currentSelection = sel;
      this.onSelection(sel);
      return;
    }

    // Handle 3D floor label clicks
    if (entityId.startsWith('floor-label-')) {
      const floorId = entityId.replace('floor-label-', '');
      const sel: SelectionState = {
        kind: 'floor',
        parcelId: 'KA-BLR-DEMO-001',
        buildingId: 'BLD-A-001',
        floorId,
      };
      this.currentSelection = sel;
      this.onSelection(sel);
      return;
    }

    // Handle 3D floor slab clicks
    if (entityId.startsWith('floor-')) {
      const floorId = entityId.replace('floor-', '');
      const sel: SelectionState = {
        kind: 'floor',
        parcelId: 'KA-BLR-DEMO-001',
        buildingId: 'BLD-A-001',
        floorId,
      };
      this.currentSelection = sel;
      this.onSelection(sel);
      return;
    }

    // Handle building shell clicks
    if (entityId.startsWith('building-')) {
      const buildingId = entityId.replace('building-', '');
      const sel: SelectionState = {
        kind: 'building',
        parcelId: 'KA-BLR-DEMO-001',
        buildingId,
        floorId: null,
      };
      this.currentSelection = sel;
      this.onSelection(sel);
      return;
    }
  }

  dispose(): void {
    if (this.screenSpaceHandler && !this.screenSpaceHandler.isDestroyed()) {
      this.screenSpaceHandler.destroy();
    }
  }
}
