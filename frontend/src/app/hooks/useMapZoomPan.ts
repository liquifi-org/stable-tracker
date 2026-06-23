import { useRef, useState } from 'react';

const VIEW_W = 800;
const VIEW_H = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

interface Pan {
  x: number;
  y: number;
}

/** Shared zoom + drag-to-pan behavior for the 800x500 viewBox SVG maps. */
export function useMapZoomPan() {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  /** True once a drag has moved past a small threshold; consumers check this to suppress the click that follows a pan. */
  const draggedRef = useRef(false);

  const clampPan = (p: Pan, z: number): Pan => {
    const viewW = VIEW_W / z;
    const viewH = VIEW_H / z;
    const maxX = (VIEW_W - viewW) / 2;
    const maxY = (VIEW_H - viewH) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    };
  };

  const zoomIn = () => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, z + ZOOM_STEP);
      setPan((p) => clampPan(p, next));
      return next;
    });
  };

  const zoomOut = () => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
      setPan((p) => clampPan(p, next));
      return next;
    });
  };

  const viewW = VIEW_W / zoom;
  const viewH = VIEW_H / zoom;
  const viewBox = `${(VIEW_W - viewW) / 2 + pan.x} ${(VIEW_H - viewH) / 2 + pan.y} ${viewW} ${viewH}`;

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoom <= MIN_ZOOM) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    draggedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current || !svgRef.current) return;
    if (Math.abs(e.clientX - dragRef.current.startX) > 3 || Math.abs(e.clientY - dragRef.current.startY) > 3) {
      draggedRef.current = true;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewW / rect.width;
    const scaleY = viewH / rect.height;
    const dx = (e.clientX - dragRef.current.startX) * scaleX;
    const dy = (e.clientY - dragRef.current.startY) * scaleY;
    setPan(clampPan({ x: dragRef.current.panX - dx, y: dragRef.current.panY - dy }, zoom));
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  return {
    svgRef,
    viewBox,
    zoom,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomIn,
    zoomOut,
    resetView,
    isDragging,
    draggedRef,
    handleMouseDown,
    handleMouseMove,
    endDrag,
  };
}
