import * as Cesium from 'cesium';
import type { Parcel } from '@/types/property';

// Parcel boundary: ~52m x 52m (centered around the 24m x 24m building)
const PARCEL_HALF_SIZE_M = 26;

/**
 * Builds the cadastral parcel boundary polygon and glowing perimeter polyline.
 * Coordinates are calculated from metric offsets to guarantee accurate ground dimensions.
 */
export function createParcelEntity(
  viewer: Cesium.Viewer,
  parcel: Parcel,
): Cesium.Entity {
  const lon = parcel.longitude;
  const lat = parcel.latitude;

  const dLon = metersToDegreesLon(PARCEL_HALF_SIZE_M, lat);
  const dLat = metersToDegreesLat(PARCEL_HALF_SIZE_M);

  const positions = Cesium.Cartesian3.fromDegreesArray([
    lon - dLon, lat - dLat,
    lon + dLon, lat - dLat,
    lon + dLon, lat + dLat,
    lon - dLon, lat + dLat,
  ]);

  return viewer.entities.add({
    id: 'sample-parcel',
    name: parcel.label,
    polygon: {
      hierarchy: positions,
      height: 0,
      material: Cesium.Color.fromCssColorString('#0369a1').withAlpha(0.08),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.8),
      outlineWidth: 2,
    },
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        lon - dLon, lat - dLat,
        lon + dLon, lat - dLat,
        lon + dLon, lat + dLat,
        lon - dLon, lat + dLat,
        lon - dLon, lat - dLat,
      ]),
      width: 3,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: Cesium.Color.fromCssColorString('#22d3ee'),
      }),
      clampToGround: true,
    },
  });
}

export function setParcelHighlight(entity: Cesium.Entity | undefined, selected: boolean) {
  if (!entity || !entity.polygon) return;
  const base = Cesium.Color.fromCssColorString('#0369a1').withAlpha(0.08);
  const highlight = Cesium.Color.fromCssColorString('#0284c7').withAlpha(0.22);
  (entity.polygon.material as Cesium.ColorMaterialProperty).color = selected
    ? new Cesium.ConstantProperty(highlight)
    : new Cesium.ConstantProperty(base);
}

function metersToDegreesLon(meters: number, latDeg: number): number {
  const latRad = Cesium.Math.toRadians(latDeg);
  return meters / (111320 * Math.cos(latRad));
}

function metersToDegreesLat(meters: number): number {
  return meters / 110574;
}
