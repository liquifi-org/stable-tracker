export const MAP_SLOP_PX = 28;
export const MAP_DISAMBIGUATE_ZOOM = 2;

export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): [number, number] | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(ctm.inverse());
  return [p.x, p.y];
}

export function svgToClient(
  svg: SVGSVGElement,
  x: number,
  y: number,
): [number, number] | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const p = pt.matrixTransform(ctm);
  return [p.x, p.y];
}

export function nearestPlaces(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  places: { id: string; x: number; y: number }[],
  slopPx = MAP_SLOP_PX,
): { id: string; dist: number }[] {
  const hits: { id: string; dist: number }[] = [];
  for (const place of places) {
    const screen = svgToClient(svg, place.x, place.y);
    if (!screen) continue;
    const dist = Math.hypot(screen[0] - clientX, screen[1] - clientY);
    if (dist <= slopPx) hits.push({ id: place.id, dist });
  }
  return hits.sort((a, b) => a.dist - b.dist);
}

export function placeIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const node = target.closest('[data-place]');
  return node?.getAttribute('data-place') ?? null;
}

export function resolveMapActivate(opts: {
  zoom: number;
  pathId: string | null;
  hits: { id: string }[];
  selectable: Set<string>;
}): { type: 'disambiguate'; ids: string[] } | { type: 'pin'; id: string } | { type: 'close' } {
  const uniqueHits = [...new Set(opts.hits.map((h) => h.id))].filter((id) => opts.selectable.has(id));
  const pathOk = opts.pathId && opts.selectable.has(opts.pathId) ? opts.pathId : null;
  if (pathOk) return { type: 'pin', id: pathOk };
  if (opts.zoom < MAP_DISAMBIGUATE_ZOOM && uniqueHits.length > 1) {
    return { type: 'disambiguate', ids: uniqueHits };
  }
  if (uniqueHits.length >= 1) return { type: 'pin', id: uniqueHits[0] };
  return { type: 'close' };
}
