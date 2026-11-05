import type { ExpressionSpecification, FillExtrusionLayerSpecification } from "maplibre-gl";

export const METROBUS_3D_BUILDINGS_ID = "metrobus-3d-buildings";

const BUILDING_MIN_ZOOM = 13.5;
const DARK_BUILDING_COLOR = "#59636e";
const LIGHT_BUILDING_COLOR = "#aeb6bf";

type RecordLike = Record<string, unknown>;

type StyleLayerLike = RecordLike & {
  id?: unknown;
  type?: unknown;
  source?: unknown;
  "source-layer"?: unknown;
  metadata?: unknown;
};

type StyleLike = RecordLike & {
  sources?: unknown;
  layers?: unknown;
};

type MapBridge = {
  getStyle?: () => unknown;
  getSource?: (sourceId: string) => unknown;
  getLayer?: (layerId: string) => unknown;
  addLayer?: (layer: FillExtrusionLayerSpecification, beforeId?: string) => void;
  setLayoutProperty?: (layerId: string, name: string, value: unknown) => void;
  setPaintProperty?: (layerId: string, name: string, value: unknown) => void;
  queryRenderedFeatures?: (...args: unknown[]) => unknown;
};

type BuildingLayer = {
  id: string;
  source: string;
  sourceLayer: "building" | "buildings";
  styleLayer: StyleLayerLike;
};

type HeightFields = {
  height: "height" | "render_height";
  minHeight: "min_height" | "render_min_height";
};

type HeightPair = HeightFields & {
  sourceLayer: "building" | "buildings";
};

const HEIGHT_PAIRS: HeightPair[] = [
  { sourceLayer: "buildings", height: "height", minHeight: "min_height" },
  { sourceLayer: "building", height: "render_height", minHeight: "render_min_height" },
];

function asRecord(value: unknown): RecordLike | null {
  return value !== null && typeof value === "object" ? value as RecordLike : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function styleFrom(map: MapBridge): StyleLike | null {
  try {
    return asRecord(map.getStyle?.()) as StyleLike | null;
  } catch {
    return null;
  }
}

function styleLayers(style: StyleLike | null): StyleLayerLike[] {
  return asArray(style?.layers)
    .map(asRecord)
    .filter((layer): layer is StyleLayerLike => layer !== null);
}

function sourceFromStyle(style: StyleLike | null, sourceId: string): RecordLike | null {
  const sources = asRecord(style?.sources);
  return asRecord(sources?.[sourceId]);
}

function sourceFromMap(map: MapBridge, sourceId: string): RecordLike | null {
  try {
    return asRecord(map.getSource?.(sourceId));
  } catch {
    return null;
  }
}

function isVectorSource(map: MapBridge, style: StyleLike | null, sourceId: string): boolean {
  const source = sourceFromStyle(style, sourceId) ?? sourceFromMap(map, sourceId);
  return source?.type === "vector";
}

function normalizedSourceLayer(value: unknown): "building" | "buildings" | null {
  const sourceLayer = asString(value)?.toLowerCase();
  return sourceLayer === "building" || sourceLayer === "buildings" ? sourceLayer : null;
}

function buildingCandidateScore(layer: StyleLayerLike, sourceLayer: "building" | "buildings"): number {
  const id = asString(layer.id)?.toLowerCase() ?? "";
  const type = asString(layer.type)?.toLowerCase() ?? "";
  let score = sourceLayer === "buildings" ? 10 : 5;
  if (type === "fill") score += 20;
  if (type === "fill-extrusion") score += 15;
  if (id === "building") score += 30;
  if (id === "building-top") score += 25;
  return score;
}

function findBuildingLayer(map: MapBridge, style: StyleLike | null): BuildingLayer | null {
  const candidates = styleLayers(style)
    .map((styleLayer) => {
      const id = asString(styleLayer.id);
      const source = asString(styleLayer.source);
      const sourceLayer = normalizedSourceLayer(styleLayer["source-layer"]);
      if (!id || !source || !sourceLayer || !isVectorSource(map, style, source)) return null;
      return { id, source, sourceLayer, styleLayer } satisfies BuildingLayer;
    })
    .filter((candidate): candidate is BuildingLayer => candidate !== null)
    .sort((left, right) => buildingCandidateScore(right.styleLayer, right.sourceLayer) - buildingCandidateScore(left.styleLayer, left.sourceLayer));

  return candidates[0] ?? null;
}

function existing3DLayer(map: MapBridge, style: StyleLike | null): StyleLayerLike | null {
  try {
    const layer = asRecord(map.getLayer?.(METROBUS_3D_BUILDINGS_ID));
    if (layer) return layer;
  } catch {
    // A style can be between loads; the style snapshot below is still safe to inspect.
  }
  return styleLayers(style).find((layer) => layer.id === METROBUS_3D_BUILDINGS_ID) ?? null;
}

function hasNumericProperty(features: unknown[], property: string): boolean {
  return features.some((feature) => {
    const properties = asRecord(asRecord(feature)?.properties);
    const value = properties?.[property];
    return typeof value === "number" && Number.isFinite(value);
  });
}

function renderedFeatures(map: MapBridge, layerId: string): unknown[] {
  if (typeof map.queryRenderedFeatures !== "function") return [];
  try {
    const result = map.queryRenderedFeatures(undefined, { layers: [layerId] });
    return asArray(result);
  } catch {
    return [];
  }
}

function fieldTypesFromVectorMetadata(source: RecordLike | null, sourceLayer: string): RecordLike | null {
  const vectorLayers = asArray(source?.vector_layers);
  const descriptor = vectorLayers
    .map(asRecord)
    .find((item) => asString(item?.id) === sourceLayer);
  return asRecord(descriptor?.fields);
}

function metadataHasField(fields: RecordLike | null, field: string): boolean {
  if (!fields || !(field in fields)) return false;
  const descriptor = fields[field];
  if (descriptor === "number" || descriptor === "integer") return true;
  const descriptorRecord = asRecord(descriptor);
  const type = asString(descriptorRecord?.type);
  return type === null || type === "number" || type === "integer";
}

function heightFields(map: MapBridge, style: StyleLike | null, building: BuildingLayer): HeightFields | null {
  const source = sourceFromStyle(style, building.source) ?? sourceFromMap(map, building.source);
  const declaredFields = fieldTypesFromVectorMetadata(source, building.sourceLayer);
  const features = renderedFeatures(map, building.id);

  const possiblePairs = HEIGHT_PAIRS.filter((pair) => pair.sourceLayer === building.sourceLayer);
  const probedPair = possiblePairs.find((pair) => hasNumericProperty(features, pair.height));
  if (probedPair) return probedPair;

  const declaredPair = possiblePairs.find(
    (pair) => metadataHasField(declaredFields, pair.height) && metadataHasField(declaredFields, pair.minHeight),
  );
  if (declaredPair) return declaredPair;

  // These are the documented numeric fields for the two supported public schemas:
  // Protomaps/CARTO uses height + min_height; OpenMapTiles uses render_height +
  // render_min_height. Missing feature values are handled by numericProperty as 0.
  return possiblePairs[0] ?? null;
}

function numericProperty(field: string): ExpressionSpecification {
  // `number` accepts a fallback and therefore does not invent a height when a
  // feature omits the field or contains an unusable value.
  return ["number", ["get", field], 0] as ExpressionSpecification;
}

function findLabelInsertionPoint(style: StyleLike | null): string | undefined {
  for (const layer of styleLayers(style)) {
    const id = asString(layer.id);
    const type = asString(layer.type)?.toLowerCase();
    if (!id || type !== "symbol") continue;
    const metadata = asRecord(layer.metadata);
    const group = asString(metadata?.["carto:group"])?.toLowerCase() ?? "";
    const idLooksLikeLabel = /(^|[-_])(label|labels|housenumber)([-_]|$)/.test(id.toLowerCase());
    if (group.includes("label") || idLooksLikeLabel || id.toLowerCase() === "housenumber") return id;
  }
  return undefined;
}

function setExistingLayer(map: MapBridge, theme: "light" | "dark", enabled: boolean, fields: HeightFields): boolean {
  try {
    map.setLayoutProperty?.(METROBUS_3D_BUILDINGS_ID, "visibility", enabled ? "visible" : "none");
    if (!enabled) return true;

    const height = numericProperty(fields.height);
    const minHeight = numericProperty(fields.minHeight);
    const base = ["min", height, minHeight] as ExpressionSpecification;
    map.setPaintProperty?.(METROBUS_3D_BUILDINGS_ID, "fill-extrusion-height", height);
    map.setPaintProperty?.(METROBUS_3D_BUILDINGS_ID, "fill-extrusion-base", base);
    map.setPaintProperty?.(METROBUS_3D_BUILDINGS_ID, "fill-extrusion-color", theme === "dark" ? DARK_BUILDING_COLOR : LIGHT_BUILDING_COLOR);
    map.setPaintProperty?.(METROBUS_3D_BUILDINGS_ID, "fill-extrusion-opacity", theme === "dark" ? 0.58 : 0.64);
    map.setPaintProperty?.(METROBUS_3D_BUILDINGS_ID, "fill-extrusion-vertical-gradient", true);
    return true;
  } catch {
    return false;
  }
}

function createExtrusionLayer(building: BuildingLayer, fields: HeightFields, theme: "light" | "dark", enabled: boolean): FillExtrusionLayerSpecification {
  const height = numericProperty(fields.height);
  const minHeight = numericProperty(fields.minHeight);
  return {
    id: METROBUS_3D_BUILDINGS_ID,
    type: "fill-extrusion",
    source: building.source,
    "source-layer": building.sourceLayer,
    minzoom: BUILDING_MIN_ZOOM,
    layout: { visibility: enabled ? "visible" : "none" },
    paint: {
      "fill-extrusion-height": height,
      "fill-extrusion-base": ["min", height, minHeight] as ExpressionSpecification,
      "fill-extrusion-color": theme === "dark" ? DARK_BUILDING_COLOR : LIGHT_BUILDING_COLOR,
      "fill-extrusion-opacity": theme === "dark" ? 0.58 : 0.64,
      "fill-extrusion-vertical-gradient": true,
    },
    metadata: {
      "metrobus:3d": true,
      "metrobus:3d:height-field": fields.height,
      "metrobus:3d:min-height-field": fields.minHeight,
      "metrobus:3d:no-fabricated-height": true,
    },
  };
}

/**
 * Synchronizes a data-backed 3D building layer with the current MapLibre style.
 *
 * The function is intentionally synchronous so callers can invoke it after the
 * initial `style.load` and after every light/dark style replacement. It only
 * accepts known vector building source-layer names and never supplies a
 * synthetic building height.
 */
export function sync3DBuildings(
  map: import("maplibre-gl").Map,
  enabled: boolean,
  theme: "light" | "dark",
): boolean {
  try {
    const bridge = map as unknown as MapBridge;
    const style = styleFrom(bridge);
    const existing = existing3DLayer(bridge, style);
    const building = findBuildingLayer(bridge, style);

    if (!building) {
      if (existing && existing.type === "fill-extrusion" && !enabled) {
        try {
          bridge.setLayoutProperty?.(METROBUS_3D_BUILDINGS_ID, "visibility", "none");
          return true;
        } catch {
          return false;
        }
      }
      return existing?.type === "fill-extrusion";
    }

    const fields = heightFields(bridge, style, building);
    if (!fields) return false;

    if (existing) {
      if (existing.type !== "fill-extrusion") return false;
      return setExistingLayer(bridge, theme, enabled, fields);
    }

    const extrusion = createExtrusionLayer(building, fields, theme, enabled);
    const beforeId = findLabelInsertionPoint(style);
    if (typeof bridge.addLayer !== "function") return false;

    try {
      if (beforeId) bridge.addLayer(extrusion, beforeId);
      else bridge.addLayer(extrusion);
      return true;
    } catch {
      // Styles without symbols, or styles whose label id changed while loading,
      // can still accept the layer at the end of the stack.
      if (!beforeId) return false;
      try {
        bridge.addLayer(extrusion);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}
