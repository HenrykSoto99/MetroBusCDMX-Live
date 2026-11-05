import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("map control integration", () => {
  it("uses white circles for every vehicle independently from the line or unit type", () => {
    const code = source("../components/LiveMap.tsx");
    const vehicleLayer = code.slice(code.indexOf('id: "metrobus-vehicles"'), code.indexOf('id: "metrobus-selected-vehicle"'));
    expect(vehicleLayer).toContain("getFillColor: [255, 255, 255, 255]");
    expect(vehicleLayer).toContain("billboard: true");
    expect(vehicleLayer).not.toContain("colorToRgba(vehicle.color");
    const fallback = source("../components/network-fallback.tsx");
    expect(fallback).not.toContain("fill={line.color}");
    expect(fallback).toContain('fill="#ffffff"');
  });

  it("connects real camera mode, demo-only history and neutral visible fading trails", () => {
    const map = source("../components/LiveMap.tsx");
    expect(map).toContain('dataSource === "simulation"');
    expect(map).toContain("widthMinPixels: 5");
    expect(map).toContain("getColor: [255, 255, 255, 245]");
    expect(map).toContain("sync3DBuildings(map, is3D");
    expect(map).toContain("!map.isMoving()");
    expect(map).toContain("onViewModeChange?.(is3D)");
    const dashboard = source("../components/dashboard.tsx");
    expect(dashboard).toContain("dataSource={fleet.source}");
    expect(dashboard).toContain("onViewModeChange={setIs3D}");
    expect(dashboard).toContain("aria-pressed={is3D}");
  });

  it("labels map and tracking actions without blocking one-click navigation", () => {
    const popup = source("../components/BusPopup.tsx");
    expect(popup).toContain('t("Seguimiento", "Tracking")');
    expect(popup).toContain('data-icon-hint={trackingHint}');
    const dashboard = source("../components/dashboard.tsx");
    expect(dashboard).toContain('t("Vista 3D", "3D view")');
    expect(source("../components/preferences-provider.tsx")).toContain("<IconHints />");
    expect(dashboard).not.toContain("<IconHints />");
    const tooltip = source("../components/icon-hints.tsx");
    expect(tooltip).toContain('role="tooltip"');
    expect(tooltip).toContain('document.addEventListener("click", onClick, true)');
    expect(tooltip).toContain("pinnedUntil > Date.now()");
    expect(tooltip).not.toContain("event.preventDefault()");
    expect(tooltip).not.toContain("event.stopPropagation()");
  });
});
