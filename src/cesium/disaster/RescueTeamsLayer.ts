import * as Cesium from 'cesium';
import type { RescueTeam } from '@/types/disaster';

export interface RescueTeamEntities {
  teamEntities: Map<string, Cesium.Entity>;
}

const TEAM_META: Record<string, { icon: string; color: string; bgColor: string }> = {
  NDRF_SPECIAL: { icon: '🛡️', color: '#fed7aa', bgColor: '#431407' }, // orange
  FIRE_RESCUE: { icon: '🚒', color: '#fca5a5', bgColor: '#450a0a' },  // red
  MEDICAL: { icon: '🚑', color: '#a5f3fc', bgColor: '#083344' },      // cyan
  SEARCH_RESCUE: { icon: '🔍', color: '#fef08a', bgColor: '#422006' },// yellow
};

/**
 * Renders 3D interactive Rescue Teams stationed in the vicinity with
 * clear typography, distinct backgrounds, and legible callsigns.
 */
export function createRescueTeamEntities(
  viewer: Cesium.Viewer,
  teams: RescueTeam[],
): RescueTeamEntities {
  const teamEntities = new Map<string, Cesium.Entity>();

  for (const team of teams) {
    const meta = TEAM_META[team.type] || TEAM_META.NDRF_SPECIAL;
    const pos = Cesium.Cartesian3.fromDegrees(team.longitude, team.latitude, 6);

    const entity = viewer.entities.add({
      id: `rescue-team-${team.id}`,
      name: `${team.name} (${team.callSign})`,
      position: pos,
      cylinder: {
        length: 12,
        topRadius: 2.2,
        bottomRadius: 0.4,
        material: Cesium.Color.fromCssColorString(meta.color).withAlpha(0.85),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.95),
        outlineWidth: 2,
      },
      label: {
        text: `${meta.icon} [${team.callSign}] ${team.name.toUpperCase()} • ${team.status}`,
        font: 'bold 11px Inter, system-ui, sans-serif',
        fillColor: Cesium.Color.fromCssColorString(meta.color),
        outlineColor: Cesium.Color.fromCssColorString('#020617'),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString(meta.bgColor).withAlpha(0.94),
        backgroundPadding: new Cesium.Cartesian2(9, 5),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -20),
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
