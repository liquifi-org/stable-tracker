import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { MAP_VIEW_H, MAP_VIEW_W } from '../lib/worldMapProjection';

const VIEW_W = MAP_VIEW_W;
const VIEW_H = MAP_VIEW_H;
const MIN_ZOOM = 1;
const MAX_ZOOM_FINE = 4;
const MAX_ZOOM_COARSE = 8;
const ZOOM_STEP = 0.5;
const DRAG_THRESHOLD = 8;
const STALE_POINTER_MS = 280;

interface Pan {
  x: number;
  y: number;
}

export type MapTapHandler = (clientX: number, clientY: number, target: EventTarget | null) => void;

function clampZoom(z: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(MIN_ZOOM, z));
}

function clampPan(p: Pan, z: number): Pan {
  const viewW = VIEW_W / z;
  const viewH = VIEW_H / z;
  const maxX = (VIEW_W - viewW) / 2;
  const maxY = (VIEW_H - viewH) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, p.x)),
    y: Math.min(maxY, Math.max(-maxY, p.y)),
  };
}

function panKeepingFocus(
  z0: number,
  pan0: Pan,
  z1: number,
  focusClientX: number,
  focusClientY: number,
  rect: DOMRect,
): Pan {
  const viewW0 = VIEW_W / z0;
  const viewH0 = VIEW_H / z0;
  const fx = (VIEW_W - viewW0) / 2 + pan0.x + ((focusClientX - rect.left) / rect.width) * viewW0;
  const fy = (VIEW_H - viewH0) / 2 + pan0.y + ((focusClientY - rect.top) / rect.height) * viewH0;
  const viewW1 = VIEW_W / z1;
  const viewH1 = VIEW_H / z1;
  return {
    x: fx - (VIEW_W - viewW1) / 2 - ((focusClientX - rect.left) / rect.width) * viewW1,
    y: fy - (VIEW_H - viewH1) / 2 - ((focusClientY - rect.top) / rect.height) * viewH1,
  };
}

function viewBoxFor(z: number, p: Pan): string {
  const viewW = VIEW_W / z;
  const viewH = VIEW_H / z;
  return `${(VIEW_W - viewW) / 2 + p.x} ${(VIEW_H - viewH) / 2 + p.y} ${viewW} ${viewH}`;
}

/** Shared zoom + pan for the map SVG viewBox. Pointer, pinch, flyTo. */
export function useMapZoomPan(options: { coarse?: boolean; onTap?: MapTapHandler } = {}) {
  const maxZoom = options.coarse ? MAX_ZOOM_COARSE : MAX_ZOOM_FINE;
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const maxZoomRef = useRef(maxZoom);
  zoomRef.current = zoom;
  panRef.current = pan;
  maxZoomRef.current = maxZoom;

  const onTapRef = useRef(options.onTap);
  onTapRef.current = options.onTap;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    startPan: Pan;
  } | null>(null);
  const dragRef = useRef<{ id: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const draggedRef = useRef(false);
  const pinchActiveRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ zoom: number; pan: Pan } | null>(null);
  const lastInputAt = useRef(0);

  const applyViewBox = useCallback(() => {
    svgRef.current?.setAttribute('viewBox', viewBoxFor(zoomRef.current, panRef.current));
  }, []);

  const setSvgRef = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node;
    if (node) node.setAttribute('viewBox', viewBoxFor(zoomRef.current, panRef.current));
    setSvgEl(node);
  }, []);

  const commit = useCallback((nextZoom: number, nextPan: Pan) => {
    const z = clampZoom(nextZoom, maxZoomRef.current);
    const p = clampPan(nextPan, z);
    zoomRef.current = z;
    panRef.current = p;
    applyViewBox();
    setZoom(z);
    setPan(p);
  }, [applyViewBox]);

  const schedule = useCallback((nextZoom: number, nextPan: Pan) => {
    const z = clampZoom(nextZoom, maxZoomRef.current);
    pendingRef.current = { zoom: z, pan: clampPan(nextPan, z) };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      zoomRef.current = pending.zoom;
      panRef.current = pending.pan;
      applyViewBox();
    });
  }, [applyViewBox]);

  const flushGesture = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      zoomRef.current = pending.zoom;
      panRef.current = pending.pan;
    }
    applyViewBox();
    setZoom(zoomRef.current);
    setPan(panRef.current);
    setIsDragging(false);
  }, [applyViewBox]);

  const zoomIn = () => {
    const next = Math.min(maxZoomRef.current, zoomRef.current + ZOOM_STEP);
    commit(next, panRef.current);
  };

  const zoomOut = () => {
    const next = Math.max(MIN_ZOOM, zoomRef.current - ZOOM_STEP);
    commit(next, panRef.current);
  };

  const resetView = () => {
    commit(MIN_ZOOM, { x: 0, y: 0 });
  };

  const flyTo = useCallback((viewX: number, viewY: number, nextZoom: number) => {
    commit(nextZoom, { x: viewX - VIEW_W / 2, y: viewY - VIEW_H / 2 });
  }, [commit]);

  useLayoutEffect(() => {
    if (zoomRef.current > maxZoom) commit(maxZoom, panRef.current);
  }, [maxZoom, commit]);

  useLayoutEffect(() => {
    applyViewBox();
  }, [zoom, pan, applyViewBox]);

  useLayoutEffect(() => {
    const svg = svgEl;
    if (!svg) return;

    const clearStale = (now: number) => {
      if (pointers.current.size === 0) return;
      if (now - lastInputAt.current <= STALE_POINTER_MS) return;
      pointers.current.clear();
      pinchRef.current = null;
      dragRef.current = null;
      pinchActiveRef.current = false;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const now = performance.now();
      clearStale(now);
      lastInputAt.current = now;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        draggedRef.current = false;
        pinchActiveRef.current = false;
      }

      if (pointers.current.size >= 2) {
        const pts = [...pointers.current.values()];
        const a = pts[0];
        const b = pts[1];
        pinchRef.current = {
          startDist: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
          startZoom: zoomRef.current,
          startPan: { ...panRef.current },
        };
        pinchActiveRef.current = true;
        dragRef.current = null;
        setIsDragging(true);
        return;
      }

      dragRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      lastInputAt.current = performance.now();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const node = svgRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();

      if (pinchRef.current && pointers.current.size >= 2) {
        const pts = [...pointers.current.values()];
        const a = pts[0];
        const b = pts[1];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const nextZ = pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
        draggedRef.current = true;
        schedule(nextZ, panKeepingFocus(
          pinchRef.current.startZoom,
          pinchRef.current.startPan,
          clampZoom(nextZ, maxZoomRef.current),
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          rect,
        ));
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        if (!draggedRef.current) setIsDragging(true);
        draggedRef.current = true;
      }
      if (zoomRef.current <= MIN_ZOOM) return;
      const z = zoomRef.current;
      const viewW = VIEW_W / z;
      const viewH = VIEW_H / z;
      schedule(z, {
        x: drag.panX - dx * (viewW / rect.width),
        y: drag.panY - dy * (viewH / rect.height),
      });
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      lastInputAt.current = performance.now();
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinchRef.current = null;
      if (dragRef.current?.id === e.pointerId) dragRef.current = null;

      if (pointers.current.size === 1) {
        const [id, p] = [...pointers.current.entries()][0];
        dragRef.current = {
          id,
          startX: p.x,
          startY: p.y,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
        return;
      }

      if (pointers.current.size === 0) {
        const pinched = pinchActiveRef.current;
        const dragged = draggedRef.current;
        pinchActiveRef.current = false;
        flushGesture();
        if (!pinched && !dragged && (e.pointerType !== 'mouse' || e.button === 0)) {
          onTapRef.current?.(e.clientX, e.clientY, e.target);
        }
      }
    };

    const onLose = () => {
      if (pointers.current.size === 0) return;
      pointers.current.clear();
      pinchRef.current = null;
      dragRef.current = null;
      pinchActiveRef.current = false;
      draggedRef.current = false;
      flushGesture();
    };

    svg.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onLose);
    const onHide = () => {
      if (document.visibilityState === 'hidden') onLose();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      svg.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onLose);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [svgEl, schedule, flushGesture]);

  return {
    svgRef,
    setSvgRef,
    viewBox: viewBoxFor(zoom, pan),
    zoom,
    minZoom: MIN_ZOOM,
    maxZoom,
    zoomIn,
    zoomOut,
    resetView,
    flyTo,
    isDragging,
    draggedRef,
    pinchActiveRef,
  };
}
