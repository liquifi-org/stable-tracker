import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { MAP_VIEW_H, MAP_VIEW_W } from '../lib/worldMapProjection';

const VIEW_W = MAP_VIEW_W;
const VIEW_H = MAP_VIEW_H;
const MIN_ZOOM = 1;
const MAX_ZOOM_FINE = 4;
const MAX_ZOOM_COARSE = 8;
const ZOOM_STEP = 0.5;
const DRAG_THRESHOLD = 8;

interface Pan {
  x: number;
  y: number;
}

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

/** Shared zoom + pan for the map SVG viewBox. Pointer, pinch, flyTo. */
export function useMapZoomPan(options: { coarse?: boolean } = {}) {
  const maxZoom = options.coarse ? MAX_ZOOM_COARSE : MAX_ZOOM_FINE;
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const maxZoomRef = useRef(maxZoom);
  zoomRef.current = zoom;
  panRef.current = pan;
  maxZoomRef.current = maxZoom;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    startPan: Pan;
    midX: number;
    midY: number;
  } | null>(null);
  const dragRef = useRef<{ id: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const draggedRef = useRef(false);
  const pinchActiveRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ zoom: number; pan: Pan } | null>(null);

  const setSvgRef = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node;
  }, []);

  const commit = useCallback((nextZoom: number, nextPan: Pan) => {
    const z = clampZoom(nextZoom, maxZoomRef.current);
    const p = clampPan(nextPan, z);
    zoomRef.current = z;
    panRef.current = p;
    setZoom(z);
    setPan(p);
  }, []);

  const schedule = useCallback((nextZoom: number, nextPan: Pan) => {
    const z = clampZoom(nextZoom, maxZoomRef.current);
    pendingRef.current = { zoom: z, pan: clampPan(nextPan, z) };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      commit(pending.zoom, pending.pan);
    });
  }, [commit]);

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

  /** Center a point in SVG user space (viewBox coords) at `nextZoom`. */
  const flyTo = useCallback((viewX: number, viewY: number, nextZoom: number) => {
    commit(nextZoom, { x: viewX - VIEW_W / 2, y: viewY - VIEW_H / 2 });
  }, [commit]);

  const releaseCapture = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* Safari can throw if the node is already gone */
    }
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) draggedRef.current = false;

    if (pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const a = pts[0];
      const b = pts[1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchRef.current = {
        startDist: Math.max(dist, 1),
        startZoom: zoomRef.current,
        startPan: { ...panRef.current },
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
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

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    if (pinchRef.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const a = pts[0];
      const b = pts[1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const nextZ = pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
      draggedRef.current = true;
      schedule(nextZ, panKeepingFocus(
        pinchRef.current.startZoom,
        pinchRef.current.startPan,
        clampZoom(nextZ, maxZoomRef.current),
        midX,
        midY,
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

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    releaseCapture(e);
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
      setIsDragging(false);
      if (pinchActiveRef.current) {
        queueMicrotask(() => {
          pinchActiveRef.current = false;
        });
      }
    }
  };

  useLayoutEffect(() => {
    if (zoomRef.current > maxZoom) commit(maxZoom, panRef.current);
  }, [maxZoom, commit]);

  const viewW = VIEW_W / zoom;
  const viewH = VIEW_H / zoom;
  const viewBox = `${(VIEW_W - viewW) / 2 + pan.x} ${(VIEW_H - viewH) / 2 + pan.y} ${viewW} ${viewH}`;

  return {
    svgRef,
    setSvgRef,
    viewBox,
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
    svgListeners: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
    },
  };
}
