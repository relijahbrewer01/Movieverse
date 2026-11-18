export interface Position { x: number; y: number }
export interface Camera extends Position { zoom: number }
export interface Size { width: number; height: number }

export const home: Camera = { x: 0, y: 0, zoom: 1 };
export const midpoint = (a: Position, b: Position): Position => ({
  x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
});
export const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
export const center = ({ width, height }: Size) => ({ x: width / 2, y: height / 2 });

const baseScale = ({ width, height }: Size) => Math.min(width / 2.8, height / 1.75);
export const pixelsPerUnit = (camera: Camera, size: Size) => baseScale(size) * camera.zoom;

export function project(point: Position, camera: Camera, size: Size): Position {
  const scale = pixelsPerUnit(camera, size);
  return {
    x: size.width / 2 + (point.x - camera.x) * scale,
    y: size.height / 2 + (point.y - camera.y) * scale,
  };
}

export function pan(camera: Camera, size: Size, from: Position, to: Position): Camera {
  const scale = pixelsPerUnit(camera, size);
  return { ...camera, x: camera.x + (from.x - to.x) / scale, y: camera.y + (from.y - to.y) / scale };
}

export function zoom(camera: Camera, size: Size, anchor: Position, amount: number): Camera {
  const zoom = Math.max(0.55, Math.min(9, camera.zoom * amount));
  const origin = center(size);
  const offset = (1 / camera.zoom - 1 / zoom) / baseScale(size);
  return { zoom, x: camera.x + (anchor.x - origin.x) * offset, y: camera.y + (anchor.y - origin.y) * offset };
}
