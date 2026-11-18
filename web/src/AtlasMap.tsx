import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { center, distance, home, midpoint, pan, project, zoom } from './camera';
import type { Camera, Position, Size } from './camera';
import { unmappedGenre } from './catalog';
import type { Film, Point } from './catalog';
import { denseThreshold, screenMarks } from './mapView';
import type { ScreenMark } from './mapView';

export const regions = [
  { name: 'Science fiction', color: '#9fd1dc', marker: 'diamond' },
  { name: 'Drama', color: '#e7ac89', marker: 'circle' },
  { name: 'Documentary', color: '#cfdb89', marker: 'square' },
  { name: 'Animation', color: '#c4b5e6', marker: 'plus' },
  { name: 'Other', color: '#adb4b0', marker: 'ring' },
  { name: unmappedGenre, color: '#adb4b0', marker: 'ring' },
] as const;
export const regionByName = new Map<string, typeof regions[number]>(
  regions.map(region => [region.name, region]),
);
const mono = 'ui-monospace, Consolas, monospace';
const labelLimit = 50;

interface Props {
  points: Point[];
  films: Map<string, Film>;
  selected: string | null;
  focus: { point: Point; request: number } | null;
  onSelect: (id: string, source: HTMLElement, moveCamera: boolean) => void;
}

type Bounds = { left: number; right: number; top: number; bottom: number };

function drawGrid(ctx: CanvasRenderingContext2D, size: Size, camera: Camera) {
  const origin = project({ x: 0, y: 0 }, camera, size);
  const unit = project({ x: 1, y: 0 }, camera, size).x - origin.x;
  const step = unit * 2 ** Math.ceil(Math.log2(33 / unit));
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#232920';
  ctx.beginPath();
  for (let x = origin.x % step; x < size.width; x += step) {
    const column = Math.floor(x) + 0.5;
    ctx.moveTo(column, 0);
    ctx.lineTo(column, size.height);
  }
  for (let y = origin.y % step; y < size.height; y += step) {
    const row = Math.floor(y) + 0.5;
    ctx.moveTo(0, row);
    ctx.lineTo(size.width, row);
  }
  ctx.stroke();
  ctx.strokeStyle = '#3c4434';
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, size.height);
  ctx.moveTo(0, origin.y);
  ctx.lineTo(size.width, origin.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function addMarker(
  path: Path2D, { x, y }: Position,
  marker: typeof regions[number]['marker'], radius: number,
) {
  switch (marker) {
    case 'circle':
    case 'ring':
      path.moveTo(x + radius, y);
      path.arc(x, y, radius, 0, Math.PI * 2);
      break;
    case 'diamond':
      path.moveTo(x, y - radius - 1);
      path.lineTo(x + radius + 1, y);
      path.lineTo(x, y + radius + 1);
      path.lineTo(x - radius - 1, y);
      path.closePath();
      break;
    case 'square':
      path.rect(x - radius, y - radius, radius * 2, radius * 2);
      break;
    case 'plus':
      path.rect(x - radius - 1, y - 1, radius * 2 + 2, 2);
      path.rect(x - 1, y - radius - 1, 2, radius * 2 + 2);
      break;
  }
}

function regionBounds(points: Point[]) {
  const bounds = new Map<string, Bounds>();
  for (const point of points) {
    const { x, y } = point;
    const region = bounds.get(point.region);
    if (region) {
      region.left = Math.min(region.left, x);
      region.right = Math.max(region.right, x);
      region.top = Math.min(region.top, y);
      region.bottom = Math.max(region.bottom, y);
    } else {
      bounds.set(point.region, { left: x, right: x, top: y, bottom: y });
    }
  }
  return bounds;
}

function drawRegionLabels(ctx: CanvasRenderingContext2D, size: Size, camera: Camera, bounds: Map<string, Bounds>) {
  ctx.font = '600 11px ' + mono;
  ctx.textAlign = 'center';
  for (const region of regions) {
    const box = bounds.get(region.name);
    if (!box) continue;
    const top = project({ x: (box.left + box.right) / 2, y: box.top }, camera, size);
    const bottom = project({ x: 0, y: box.bottom }, camera, size);
    const x = top.x;
    const y = top.y >= 26 ? top.y - 12 : bottom.y + 21;
    if (y < 14 || y > size.height - 8) continue;
    const label = region.name.toUpperCase();
    const width = ctx.measureText(label).width;
    ctx.fillStyle = '#121610';
    ctx.fillRect(x - width / 2 - 7, y - 13, width + 14, 19);
    ctx.fillStyle = region.color;
    ctx.fillText(label, x, y);
  }
}

function paint(canvas: HTMLCanvasElement, size: Size, camera: Camera, props: Props, bounds: Map<string, Bounds>) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(canvas.width / size.width, 0, 0, canvas.height / size.height, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  drawGrid(ctx, size, camera);

  if (camera.zoom <= 2.3) drawRegionLabels(ctx, size, camera, bounds);

  const { groups, active } = screenMarks(props.points, size, camera, props.selected);
  for (const [name, { marks }] of groups) {
    const region = regionByName.get(name);
    const marker = region?.marker ?? 'circle';
    const shape = new Path2D();
    for (const mark of marks) addMarker(shape, mark, marker, 3);
    if (marker === 'ring') {
      ctx.strokeStyle = region?.color ?? '#e9ede4';
      ctx.stroke(shape);
    } else {
      ctx.fillStyle = region?.color ?? '#e9ede4';
      ctx.fill(shape);
    }
  }
  if (active) {
    const region = regionByName.get(active.region);
    const marker = region?.marker ?? 'circle';
    const shape = new Path2D();
    addMarker(shape, active, marker, 4.5);
    if (marker === 'ring') {
      ctx.strokeStyle = '#ffffff';
      ctx.stroke(shape);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fill(shape);
    }
    ctx.strokeStyle = region?.color ?? '#e9ede4';
    ctx.strokeRect(active.x - 9, active.y - 9, 18, 18);
  }

  const occupied: { x: number; y: number; width: number }[] = [];
  ctx.font = '600 11px ' + mono;
  ctx.textAlign = 'left';
  function drawLabel(at: ScreenMark) {
    if (!ctx || at.x < 0 || at.x > size.width || at.y < 14 || at.y > size.height - 8) return;
    const label = props.films.get(at.id)?.title;
    if (!label) return;
    const width = ctx.measureText(label).width;
    const x = Math.min(at.x + 13, size.width - width - 6);
    if (x < 0 || occupied.some(box =>
      Math.abs(box.y - at.y) < 17 && box.x < x + width + 5 && x < box.x + box.width + 5)) return;
    occupied.push({ x, y: at.y, width });
    ctx.fillStyle = '#121610';
    ctx.fillRect(x - 3, at.y - 8, width + 6, 16);
    ctx.fillStyle = '#e9ede4';
    ctx.fillText(label, x, at.y + 4);
  }
  if (active) drawLabel(active);
  if (camera.zoom < 2.6) return;
  for (const { marks } of groups.values()) {
    for (const mark of marks) {
      if (occupied.length >= labelLimit) return;
      drawLabel(mark);
    }
  }
}

export function AtlasMap(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef<HTMLSpanElement>(null);
  const bounds = useMemo(() => regionBounds(props.points), [props.points]);
  const current = useRef({ ...props, bounds });
  const size = useRef<Size>({ width: 1, height: 1 });
  const camera = useRef<Camera>(home);
  const frame = useRef(0);
  const animation = useRef(0);
  const pointers = useRef(new Map<number, Position>());
  const press = useRef<Position | null>(null);

  function render() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (canvasRef.current) paint(canvasRef.current, size.current, camera.current, current.current, current.current.bounds);
      const scale = Math.round(camera.current.zoom * 100) + '%';
      if (scaleRef.current && scaleRef.current.textContent !== scale) {
        scaleRef.current.textContent = scale;
      }
    });
  }

  function setCamera(next: Camera) {
    cancelAnimationFrame(animation.current);
    camera.current = next;
    render();
  }

  useEffect(() => {
    current.current = { ...props, bounds };
    render();
  }, [props, bounds]);

  const focus = props.focus;
  useEffect(() => {
    if (!focus) return;
    const target = { x: focus.point.x, y: focus.point.y, zoom: Math.max(2.2, camera.current.zoom) };
    const start = camera.current;
    const started = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function step(now: number) {
      const progress = reduced ? 1 : Math.min(1, (now - started) / 320);
      const t = 1 - (1 - progress) ** 3;
      camera.current = {
        x: start.x + (target.x - start.x) * t,
        y: start.y + (target.y - start.y) * t,
        zoom: start.zoom + (target.zoom - start.zoom) * t,
      };
      render();
      if (progress < 1) animation.current = requestAnimationFrame(step);
    }
    animation.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animation.current);
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      size.current = { width, height };
      const dpi = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpi);
      canvas.height = Math.round(height * dpi);
      render();
    }
    function wheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.current.height : 1;
      setCamera(zoom(camera.current, size.current, anchor, Math.exp(-event.deltaY * units * 0.0015)));
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', wheel);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      cancelAnimationFrame(animation.current);
    };
  }, []);

  function location(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || pointers.current.size >= 2) return;
    cancelAnimationFrame(animation.current);
    const at = location(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, at);
    press.current = pointers.current.size === 1 ? at : null;
  }

  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const before = [...pointers.current.values()];
    const at = location(event);
    pointers.current.set(event.pointerId, at);
    const after = [...pointers.current.values()];
    if (after.length === 2) {
      const start = midpoint(before[0], before[1]);
      const end = midpoint(after[0], after[1]);
      const ratio = distance(after[0], after[1]) / Math.max(1, distance(before[0], before[1]));
      const shifted = pan(camera.current, size.current, start, end);
      setCamera(zoom(shifted, size.current, end, ratio));
    } else if (press.current && distance(press.current, at) > 5) {
      setCamera(pan(camera.current, size.current, press.current, at));
      press.current = null;
    } else if (!press.current) {
      setCamera(pan(camera.current, size.current, before[0], at));
    }
  }

  function pointerEnd(event: PointerEvent<HTMLCanvasElement>, allowSelect: boolean) {
    if (!pointers.current.delete(event.pointerId)) return;
    const origin = press.current;
    press.current = null;
    if (!allowSelect || !origin || distance(origin, location(event)) > 5) return;
    const at = location(event);
    let nearest: string | null = null;
    let best = event.pointerType === 'touch' ? 23 : 15;
    const { groups, active } = screenMarks(current.current.points, size.current, camera.current, current.current.selected);
    function consider(point: ScreenMark) {
      const gap = distance(at, point);
      if (gap < best) {
        best = gap;
        nearest = point.id;
      }
    }
    if (active) consider(active);
    for (const { marks } of groups.values()) for (const mark of marks) consider(mark);
    if (nearest) current.current.onSelect(nearest, event.currentTarget, false);
  }

  function zoomBy(amount: number) {
    setCamera(zoom(camera.current, size.current, center(size.current), amount));
  }

  function handleKey(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = 48;
    const offsets: Record<string, Position> = {
      ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
    };
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key in offsets) setCamera(pan(camera.current, size.current, { x: 0, y: 0 }, offsets[event.key]));
    else if (event.key === '+' || event.key === '=') zoomBy(1.25);
    else if (event.key === '-') zoomBy(0.8);
    else if (event.key === 'Home') setCamera(home);
    else return;
    event.preventDefault();
  }

  return (
    <section className="atlas-map" aria-labelledby="map-title">
      <div className="map-bar">
        <h2 id="map-title">Genre map</h2>
        <div className="map-controls" role="group" aria-label="Map controls">
          <span className="map-scale"><span className="sr-only">Zoom: </span><span ref={scaleRef}>100%</span></span>
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.8)}>−</button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>+</button>
          <button type="button" className="map-reset" aria-label="Reset map view" onClick={() => setCamera(home)}>Reset</button>
        </div>
      </div>
      <div className="map-field">
        <canvas ref={canvasRef} tabIndex={0} aria-label="Interactive map" aria-describedby="map-help"
          onKeyDown={handleKey} onPointerDown={pointerDown} onPointerMove={pointerMove}
          onPointerUp={event => pointerEnd(event, true)} onPointerCancel={event => pointerEnd(event, false)}
          onLostPointerCapture={event => pointerEnd(event, false)} />
      </div>
      <p className="map-help" id="map-help">
        <span className="touch-help">Drag to pan · Pinch to zoom</span>
        <span className="desktop-help">Drag or use arrow keys to pan · Scroll or press +/− to zoom</span>
        {props.points.length > denseThreshold && <span> · Close films can share a marker. Zoom in or use the results.</span>}
        <span className="sr-only"> Use the film list to select a movie with a keyboard.</span>
      </p>
    </section>
  );
}
