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

  it("keeps landing stations compact without shrinking dashboard markers", () => {
    const map = source("../components/LiveMap.tsx");
    expect(map).toContain('currentProps.variant === "hero" ? 10 : Math.max(20, Math.min(36');
    expect(map).toContain('getLineWidth: currentProps.variant === "hero" ? 1 : 2');
    expect(map).toContain('variant={variant}');
    const fallback = source("../components/network-fallback.tsx");
    expect(fallback).toContain('variant === "hero" ? 10 : 18');
  });

  it("provides wheel zoom and restores the exact initial hero view", () => {
    const map = source("../components/LiveMap.tsx");
    expect(map).toContain("cooperativeGestures: false");
    expect(map).toContain("center: HERO_CENTER");
    expect(map).toContain("zoom: 11.3");
    expect(map).toContain("pitch: 42");
    expect(map).toContain("bearing: -15");
    const landing = source("../components/landing.tsx");
    expect(landing).toContain("command={mapCommand}");
    expect(landing).toContain('t("Restablecer vista inicial", "Reset initial view")');
    expect(landing).toContain('if (type === "reset") setSelectedLine(null)');
  });

  it("opens the actual line-filter section with native accessible row controls", () => {
    const sidebar = source("../components/Sidebar.tsx");
    expect(sidebar).toContain("data-line-filter-section");
    expect(sidebar).toContain('role="checkbox" aria-checked={selected}');
    expect(sidebar).toContain("onClick={() => toggleLine(line.id)}");
    const dashboard = source("../components/dashboard.tsx");
    expect(dashboard).toContain("onClick={openLineFilters}");
    expect(dashboard).toContain("useDashboard.persist.rehydrate()");
    expect(source("../stores/dashboard.ts")).toContain("skipHydration: true");
    expect(source("../app/globals.css")).toContain(".filter-line[role='checkbox'] { width: 100%");
  });
});
