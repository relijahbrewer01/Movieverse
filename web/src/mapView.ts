import { pixelsPerUnit, project } from './camera.ts';
import type { Camera, Position, Size } from './camera.ts';
import type { Point } from './catalog.ts';

export const denseThreshold = 1000;
const markerSpacing = 7;
const markerMargin = 20;

export type ScreenMark = Position & Pick<Point, 'id' | 'region'>;

/** Shared by drawing and picking, so an omitted point cannot steal a click. */
export function screenMarks(points: Point[], size: Size, camera: Camera, selected: string | null) {
  const scale = pixelsPerUnit(camera, size);
  const origin = project({ x: 0, y: 0 }, camera, size);
  const groups = new Map<string, { marks: ScreenMark[]; cells?: Set<number> }>();
  const columns = Math.ceil((size.width + 2 * markerMargin) / markerSpacing) + 1;
  let active: ScreenMark | undefined;
  for (const point of points) {
    const x = origin.x + point.x * scale;
    const y = origin.y + point.y * scale;
    if (x < -markerMargin || x > size.width + markerMargin ||
        y < -markerMargin || y > size.height + markerMargin) continue;
    if (point.id === selected) {
      active = { id: point.id, region: point.region, x, y };
      continue;
    }
    let group = groups.get(point.region);
    if (!group) {
      group = { marks: [], cells: points.length > denseThreshold ? new Set() : undefined };
      groups.set(point.region, group);
    }
    if (group.cells) {
      const cell = Math.floor((x + markerMargin) / markerSpacing) +
        columns * Math.floor((y + markerMargin) / markerSpacing);
      if (group.cells.has(cell)) continue;
      group.cells.add(cell);
    }
    group.marks.push({ id: point.id, region: point.region, x, y });
  }
  return { groups, active };
}
