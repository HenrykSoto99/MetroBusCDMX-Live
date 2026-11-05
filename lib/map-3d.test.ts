import { describe, expect, it, vi } from "vitest";
import { METROBUS_3D_BUILDINGS_ID, sync3DBuildings } from "./map-3d";

type TestLayer = {
  id: string;
  type: string;
  source?: string;
  "source-layer"?: string;
  metadata?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  minzoom?: number;
};

type TestStyle = {
  version: 8;
  sources: Record<string, Record<string, unknown>>;
  layers: TestLayer[];
};

function cartoStyle(sourceLayer: "building" | "buildings" = "buildings"): TestStyle {
  return {
    version: 8,
    sources: { protomaps: { type: "vector", tiles: ["https://tiles.example/{z}/{x}/{y}.mvt"] } },
    layers: [
      {
        id: sourceLayer === "buildings" ? "building" : "building-footprints",
        type: "fill",
        source: "protomaps",
        "source-layer": sourceLayer,
        minzoom: 13,
      },
      { id: "road_label", type: "symbol", source: "protomaps", "source-layer": "roads" },
    ],
  };
}

function mockMap(style: TestStyle, features: unknown[] = []) {
  const getLayer = vi.fn((id: string) => style.layers.find((layer) => layer.id === id));
  const addLayer = vi.fn((layer: TestLayer, beforeId?: string) => {
    if (style.layers.some((candidate) => candidate.id === layer.id)) throw new Error("duplicate layer");
    const index = beforeId ? style.layers.findIndex((candidate) => candidate.id === beforeId) : -1;
    if (index >= 0) style.layers.splice(index, 0, layer);
    else style.layers.push(layer);
  });
  const setLayoutProperty = vi.fn((id: string, name: string, value: unknown) => {
    const layer = style.layers.find((candidate) => candidate.id === id);
    if (layer) layer.layout = { ...layer.layout, [name]: value };
  });
  const setPaintProperty = vi.fn((id: string, name: string, value: unknown) => {
    const layer = style.layers.find((candidate) => candidate.id === id);
    if (layer) layer.paint = { ...layer.paint, [name]: value };
  });
  const map = {
    getStyle: vi.fn(() => style),
    getSource: vi.fn((id: string) => style.sources[id]),
    getLayer,
    addLayer,
    setLayoutProperty,
    setPaintProperty,
    queryRenderedFeatures: vi.fn(() => features),
  } as unknown as import("maplibre-gl").Map;
  return { map, addLayer, setLayoutProperty, setPaintProperty };
}

describe("sync3DBuildings", () => {
  it("detecta CARTO/Protomaps y coloca la extrusión antes de las etiquetas", () => {
    const style = cartoStyle("buildings");
    const { map, addLayer } = mockMap(style, [{ properties: { height: 24, min_height: 3 } }]);

    expect(sync3DBuildings(map, true, "dark")).toBe(true);

    const layer = style.layers.find((candidate) => candidate.id === METROBUS_3D_BUILDINGS_ID);
    expect(layer).toBeDefined();
    expect(layer?.source).toBe("protomaps");
    expect(layer?.["source-layer"]).toBe("buildings");
    expect(layer?.minzoom).toBe(13.5);
    expect(layer?.layout?.visibility).toBe("visible");
    expect(layer?.paint?.["fill-extrusion-height"]).toEqual(["number", ["get", "height"], 0]);
    expect(layer?.paint?.["fill-extrusion-base"]).toEqual(["min", ["number", ["get", "height"], 0], ["number", ["get", "min_height"], 0]]);
    expect(layer?.paint?.["fill-extrusion-color"]).toBe("#59636e");
    expect(addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: METROBUS_3D_BUILDINGS_ID }), "road_label");
  });

  it("usa los campos render_height de la variante OpenMapTiles", () => {
    const style = cartoStyle("building");
    const { map } = mockMap(style, [{ properties: { render_height: 18, render_min_height: 2 } }]);

    expect(sync3DBuildings(map, true, "light")).toBe(true);

    const layer = style.layers.find((candidate) => candidate.id === METROBUS_3D_BUILDINGS_ID);
    expect(layer?.paint?.["fill-extrusion-height"]).toEqual(["number", ["get", "render_height"], 0]);
    expect(layer?.paint?.["fill-extrusion-base"]).toEqual([
      "min",
      ["number", ["get", "render_height"], 0],
      ["number", ["get", "render_min_height"], 0],
    ]);
    expect(layer?.paint?.["fill-extrusion-color"]).toBe("#aeb6bf");
  });

  it("oculta sin destruir la capa cuando se desactiva", () => {
    const style = cartoStyle();
    const { map, addLayer, setLayoutProperty } = mockMap(style, [{ properties: { height: 10, min_height: 0 } }]);

    expect(sync3DBuildings(map, true, "dark")).toBe(true);
    expect(sync3DBuildings(map, false, "dark")).toBe(true);

    expect(addLayer).toHaveBeenCalledTimes(1);
    expect(setLayoutProperty).toHaveBeenLastCalledWith(METROBUS_3D_BUILDINGS_ID, "visibility", "none");
    expect(style.layers.some((layer) => layer.id === METROBUS_3D_BUILDINGS_ID)).toBe(true);
  });

  it("no inventa 30 metros si no hay features renderizadas", () => {
    const style = cartoStyle();
    const { map } = mockMap(style);

    expect(sync3DBuildings(map, true, "dark")).toBe(true);

    const layer = style.layers.find((candidate) => candidate.id === METROBUS_3D_BUILDINGS_ID);
    expect(JSON.stringify(layer?.paint?.["fill-extrusion-height"])).not.toContain("30");
    expect(layer?.paint?.["fill-extrusion-height"]).toEqual(["number", ["get", "height"], 0]);
  });

  it("devuelve false y no lanza para un estilo vectorial dinámico desconocido", () => {
    const style = cartoStyle();
    style.layers[0] = { id: "custom-footprints", type: "fill", source: "protomaps", "source-layer": "footprints" };
    const { map, addLayer } = mockMap(style);

    expect(() => sync3DBuildings(map, true, "dark")).not.toThrow();
    expect(sync3DBuildings(map, true, "dark")).toBe(false);
    expect(addLayer).not.toHaveBeenCalled();
  });

  it("devuelve false si el style está en transición o es ilegible", () => {
    const map = { getStyle: vi.fn(() => { throw new Error("style not ready"); }) } as unknown as import("maplibre-gl").Map;

    expect(sync3DBuildings(map, true, "dark")).toBe(false);
  });
});
