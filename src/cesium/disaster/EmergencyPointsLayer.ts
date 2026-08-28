import * as Cesium from 'cesium';
import type { EmergencyPoint } from '@/types/disaster';

export interface EmergencyPointEntities {
  pointEntities: Map<string, Cesium.Entity>;
}

const POINT_ICONS: Record<string, { symbol: string; color: string }> = {
  HOSPITAL: { symbol: '🏥', color: '#06b6d4' },
  FIRE_STATION: { symbol: '🚒', color: '#ef4444' },
  ASSEMBLY_POINT: { symbol: '📍', color: '#22c55e' },
  HAZARD_POINT: { symbol: '⚠️', color: '#f59e0b' },
  BLOCKED_ROAD: { symbol: '🚧', color: '#dc2626' },
  SAFE_SHELTER: { symbol: '🛟', color: '#10b981' },
};

/**
 * Creates 3D emergency infrastructure & hazard points in Cesium.
 */
export function createEmergencyPointEntities(
  viewer: Cesium.Viewer,
  points: EmergencyPoint[],
): EmergencyPointEntities {
  const pointEntities = new Map<string, Cesium.Entity>();

  for (const pt of points) {
    const meta = POINT_ICONS[pt.kind] || { symbol: '📍', color: '#38bdf8' };
    const pos = Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude, 5);

    const entity = viewer.entities.add({
      id: `emergency-point-${pt.id}`,
      name: pt.name,
      position: pos,
      ellipsoid: {
        radii: new Cesium.Cartesian3(4, 4, 4),
        material: Cesium.Color.fromCssColorString(meta.color).withAlpha(0.8),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: `${meta.symbol} ${pt.name} (${pt.distanceMeters}m)`,
        font: 'bold 10px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#f1f5f9'),
        outlineColor: Cesium.Color.fromCssColorString('#020617'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    pointEntities.set(pt.id, entity);
  }

  return { pointEntities };
}

export function removeEmergencyPointEntities(
  viewer: Cesium.Viewer,
  entities: EmergencyPointEntities | null,
) {
  if (!entities) return;
  for (const entity of entities.pointEntities.values()) {
    viewer.entities.remove(entity);
  }
  entities.pointEntities.clear();
}
