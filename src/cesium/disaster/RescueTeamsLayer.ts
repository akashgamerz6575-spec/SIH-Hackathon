import * as Cesium from 'cesium';
import type { RescueTeam } from '@/types/disaster';

export interface RescueTeamEntities {
  teamEntities: Map<string, Cesium.Entity>;
}

const TEAM_COLORS: Record<string, string> = {
  NDRF_SPECIAL: '#f97316', // bright orange
  FIRE_RESCUE: '#ef4444',  // red
  MEDICAL: '#06b6d4',      // cyan/medical blue
  SEARCH_RESCUE: '#eab308',// yellow
};

/**
 * Renders 3D interactive Rescue Teams stationed in the vicinity.
 */
export function createRescueTeamEntities(
  viewer: Cesium.Viewer,
  teams: RescueTeam[],
): RescueTeamEntities {
  const teamEntities = new Map<string, Cesium.Entity>();

  for (const team of teams) {
    const colorHex = TEAM_COLORS[team.type] || '#f97316';
    const pos = Cesium.Cartesian3.fromDegrees(team.longitude, team.latitude, 6);

    const entity = viewer.entities.add({
      id: `rescue-team-${team.id}`,
      name: `${team.name} (${team.callSign})`,
      position: pos,
      cylinder: {
        length: 12,
        topRadius: 2.5,
        bottomRadius: 0.5,
        material: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.85),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
        outlineWidth: 2,
      },
      label: {
        text: `[${team.callSign}] ${team.name}\nStatus: ${team.status} • Personnel: ${team.personnelCount}`,
        font: 'bold 10px monospace',
        fillColor: Cesium.Color.fromCssColorString('#f8fafc'),
        outlineColor: Cesium.Color.fromCssColorString('#020617'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    teamEntities.set(team.id, entity);
  }

  return { teamEntities };
}

export function removeRescueTeamEntities(
  viewer: Cesium.Viewer,
  entities: RescueTeamEntities | null,
) {
  if (!entities) return;
  for (const entity of entities.teamEntities.values()) {
    viewer.entities.remove(entity);
  }
  entities.teamEntities.clear();
}
