import * as Cesium from 'cesium';
import type { EvacuationRoute } from '@/types/disaster';

export interface EvacuationRouteEntities {
  corridorPolyline: Cesium.Entity;
  destinationMarker: Cesium.Entity;
}

/**
 * Creates a glowing 3D evacuation corridor along the selected route.
 */
export function createEvacuationRouteEntity(
  viewer: Cesium.Viewer,
  route: EvacuationRoute,
): EvacuationRouteEntities {
  const flatPositions: number[] = [];
  for (const [lon, lat] of route.coordinates) {
    flatPositions.push(lon, lat);
  }

  const positions = Cesium.Cartesian3.fromDegreesArray(flatPositions);
  const isPrimary = route.status === 'PRIMARY_CLEAR';

  const corridorPolyline = viewer.entities.add({
    id: `evacuation-corridor-${route.id}`,
    name: route.name,
    polyline: {
      positions,
      width: 6,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.35,
        color: Cesium.Color.fromCssColorString(isPrimary ? '#22c55e' : '#f59e0b'),
      }),
      clampToGround: true,
    },
  });

  const lastCoord = route.coordinates[route.coordinates.length - 1];
  const destPos = Cesium.Cartesian3.fromDegrees(lastCoord[0], lastCoord[1], 10);

  const destinationMarker = viewer.entities.add({
    id: `evacuation-dest-${route.id}`,
    name: route.destinationName,
    position: destPos,
    cylinder: {
      length: 16,
      topRadius: 6,
      bottomRadius: 0.5,
      material: Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.75),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: `🏁 SAFE DESTINATION\n${route.destinationName} (${route.estimatedTimeMinutes} min walk)`,
      font: 'bold 11px monospace',
      fillColor: Cesium.Color.fromCssColorString('#86efac'),
      outlineColor: Cesium.Color.fromCssColorString('#052e16'),
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  return {
    corridorPolyline,
    destinationMarker,
  };
}

export function removeEvacuationRouteEntities(
  viewer: Cesium.Viewer,
  entities: EvacuationRouteEntities | null,
) {
  if (!entities) return;
  viewer.entities.remove(entities.corridorPolyline);
  viewer.entities.remove(entities.destinationMarker);
}
