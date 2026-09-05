import { geoMercator, type GeoProjection } from 'd3-geo';

const VIEW_W = 800;
const VIEW_H = 500;

/** Natural Earth / world-atlas ids that draw as a polar strip in Mercator. */
const ANTARCTICA_IDS = new Set(['010', '260']);

export function filterMapFeatures<T extends { id?: string | number }>(
  features: T[],
  hideAntarctica: boolean,
): T[] {
  if (!hideAntarctica) return features;
  return features.filter((f) => !ANTARCTICA_IDS.has(String(f.id)));
}

/** Frame the inhabited continents. Mercator inflates Greenland / the Arctic
 *  into a bar across the top; this box drops that strip and the empty ocean
 *  south of Australia / Africa. */
const INHABITED_BOX: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
    [-168, -44],
    [180, -44],
    [180, 57],
    [-168, 57],
    [-168, -44],
  ]],
};

export function worldMapProjection(
  _land: { type: 'FeatureCollection'; features: unknown[] },
  options: { scale?: number; hideAntarctica?: boolean } = {},
): GeoProjection {
  const projection = geoMercator();
  if (options.hideAntarctica) {
    projection
      .fitExtent(
        [
          [8, 4],
          [VIEW_W - 8, VIEW_H - 4],
        ],
        INHABITED_BOX,
      )
      .clipExtent([
        [0, 0],
        [VIEW_W, VIEW_H],
      ]);
  } else {
    projection.scale(options.scale ?? 140).translate([VIEW_W / 2, VIEW_H / 2]);
  }
  return projection;
}
