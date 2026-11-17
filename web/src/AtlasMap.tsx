import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { center, distance, home, midpoint, pan, project, zoom } from './camera';
import type { Camera, Position, Size } from './camera';
import type { Film, Point } from './catalog';

export const regionColors: Record<string, string> = {
  'Science fiction': '#80d8f2',
  Drama: '#ffc08d',
  Documentary: '#b9df95',
  Animation: '#dbacff',
};
const regions = [
  { name: 'Science fiction', x: -0.89, y: -0.72 },
  { name: 'Drama', x: 0.58, y: -0.77 },
  { name: 'Documentary', x: -0.58, y: 0.84 },
  { name: 'Animation', x: 0.89, y: 0.81 },
];

interface Props {
  points: Point[];
  films: Map<string, Film>;
  visible: Set<string>;
  selected: string | null;
  focus: { point: Point; request: number } | null;
  onSelect: (id: string, source: HTMLElement, moveCamera: boolean) => void;
}

function paint(canvas: HTMLCanvasElement, size: Size, camera: Camera, props: Props) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(canvas.width / size.width, 0, 0, canvas.height / size.height, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);

  if (camera.zoom <= 2.3) {
    ctx.font = '600 11px system-ui';
    ctx.textAlign = 'center';
    for (const region of regions) {
      const at = project(region, camera, size);
      ctx.fillStyle = regionColors[region.name];
      ctx.fillText(region.name.toUpperCase(), at.x, at.y);
    }
  }

  for (const point of props.points) {
    if (!props.visible.has(point.id)) continue;
    const at = project(point, camera, size);
    if (at.x < -20 || at.x > size.width + 20 || at.y < -20 || at.y > size.height + 20) continue;
    const active = point.id === props.selected;
    const color = regionColors[point.region] ?? '#e1eafa';
    ctx.beginPath();
    ctx.arc(at.x, at.y, active ? 15 : 10, 0, Math.PI * 2);
    ctx.fillStyle = color + '22';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(at.x, at.y, active ? 5.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#ffffff' : color;
    ctx.fill();
    if (active) {
      ctx.beginPath();
      ctx.arc(at.x, at.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  const occupied: { x: number; y: number; width: number }[] = [];
  const candidates = props.points.filter(point => props.visible.has(point.id) &&
    (point.id === props.selected || camera.zoom >= 2.6));
  candidates.sort((a, b) => Number(b.id === props.selected) - Number(a.id === props.selected));
  for (const point of candidates) {
    const at = project(point, camera, size);
    const label = props.films.get(point.id)?.title;
    if (!label || at.x < 0 || at.y < 14 || at.y > size.height - 8) continue;
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'left';
    const width = ctx.measureText(label).width;
    const x = Math.min(at.x + 13, size.width - width - 6);
    if (x < 0 || at.x > size.width || occupied.some(box =>
      Math.abs(box.y - at.y) < 17 && box.x < x + width + 5 && x < box.x + box.width + 5)) continue;
    occupied.push({ x, y: at.y, width });
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0b101a';
    ctx.strokeText(label, x, at.y + 4);
    ctx.fillStyle = '#f2f5ff';
    ctx.fillText(label, x, at.y + 4);
  }
}

export function AtlasMap(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef(props);
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
      if (canvasRef.current) paint(canvasRef.current, size.current, camera.current, current.current);
    });
  }

  function setCamera(next: Camera) {
    cancelAnimationFrame(animation.current);
    camera.current = next;
    render();
  }

  useEffect(() => {
    current.current = props;
    render();
  }, [props]);

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
    for (const point of current.current.points) {
      if (!current.current.visible.has(point.id)) continue;
      const gap = distance(at, project(point, camera.current, size.current));
      if (gap < best) {
        best = gap;
        nearest = point.id;
      }
    }
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
    <section className="atlas-map" aria-label="Movie map">
      <canvas ref={canvasRef} tabIndex={0} aria-label="Interactive map" aria-describedby="map-help"
        onKeyDown={handleKey} onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={event => pointerEnd(event, true)} onPointerCancel={event => pointerEnd(event, false)}
        onLostPointerCapture={event => pointerEnd(event, false)} />
      <p className="map-help" id="map-help">
        <span className="touch-help">Drag or pinch to explore.</span>
        <span className="desktop-help">Drag or use arrow keys to pan. Scroll or press +/− to zoom.</span>
        <span className="sr-only"> Use the film list to select a movie with a keyboard.</span>
      </p>
      <div className="map-controls" role="group" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.8)}>−</button>
        <button type="button" aria-label="Reset map view" onClick={() => setCamera(home)}>⌂</button>
      </div>
    </section>
  );
}
