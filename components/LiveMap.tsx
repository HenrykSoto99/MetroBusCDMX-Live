"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PickingInfo } from "@deck.gl/core";
import { BASEMAP, fetchMap } from "@deck.gl/carto";
import { TripsLayer } from "@deck.gl/geo-layers";
import { IconLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import type { Coordinate, Station, TransitNetwork, Vehicle } from "@/lib/transit-types";
import { usePreferences, useTranslation } from "@/lib/preferences";
import NetworkFallback from "@/components/network-fallback";

const CARTO_DARK_MATTER_STYLE = BASEMAP.DARK_MATTER;
const HERO_CENTER: Coordinate = [-99.145, 19.426];
const ALL_LINE_IDS = [1, 2, 3, 4, 5, 6, 7];
const INTERPOLATION_MS = 12_000;
const INTERPOLATION_SECONDS = INTERPOLATION_MS / 1000;
const TRAIL_SNAPSHOT_COUNT = 6;
const FRAME_INTERVAL_MS = 1000 / 60;
const MAP_LOAD_TIMEOUT_MS = 10_000;
const DEFAULT_CENTER: Coordinate = [-99.145, 19.426];
const STATION_ICON_MAPPING = { mb: { x: 0, y: 0, width: 128, height: 128, mask: false } };

// CARTO Builder integration belongs in the main integration layer in a future pass:
// fetchMap({cartoMapId: "<published-map-id>"}) requires a published map and scoped credentials.
// Keep this import visible for that handoff; no workspace URL or credential is invented here.
void fetchMap;

type MapStatus = "loading" | "ready" | "fallback";
type OverlayMode = "pending" | "interleaved" | "overlaid" | "none";
type StyleErrorEvent = { error?: { message?: string } | Error };

type StationPoint = {
  station: Station;
  lineId: number;
  lineCode: string;
  lineName: string;
  color: string;
  position: Coordinate;
};

type VehiclePoint = {
  id: string;
  position: Coordinate;
  color: string;
  lineId: number;
  lineCode: string;
  lineName: string;
  direction: string;
  bearing?: number;
  speed?: number;
  nextStop?: string;
};

type TripPoint = {
  path: Coordinate[];
  timestamps: number[];
  color: string;
  id: string;
};

type TripSample = { position: Coordinate; timestamp: number };

type MotionState = {
  vehicle: Vehicle;
  from: Coordinate;
  to: Coordinate;
  current: Coordinate;
  startedAt: number;
  duration: number;
  trip: TripSample[];
};

type RoutePoint = {
  path: Coordinate[];
  color: string;
  lineId: number;
  lineCode: string;
};

type StaticMapData = {
  routes: RoutePoint[];
  stations: StationPoint[];
};

type GeoPickInfo<T> = PickingInfo<T> & { x: number; y: number };

type OverlayLike = MapLibreOverlay & { finalize?: () => void };

export interface LiveMapProps {
  network: TransitNetwork;
  vehicles: Vehicle[];
  selectedLines?: number[];
  serviceFilter?: string;
  showRoutes?: boolean;
  trails?: boolean;
  recording?: boolean;
  selectedId?: string | null;
  following?: boolean;
  focus?: { key: string; lineId?: number; coordinates?: Coordinate; zoom?: number } | null;
  command?: { type: "zoom-in" | "zoom-out" | "reset" | "pitch"; nonce: number } | null;
  variant?: "hero" | "dashboard";
  onVehicleSelect?: (id: string) => void;
  onStationSelect?: (station: Station, lineId: number) => void;
  onMapReady?: () => void;
  retryLabel?: string;
}

function lineIds(selectedLines?: number[]) {
  return selectedLines === undefined ? ALL_LINE_IDS : selectedLines;
}

function serviceMatches(vehicle: Vehicle, serviceFilter?: string) {
  if (!serviceFilter || serviceFilter.toLowerCase() === "all" || serviceFilter.toLowerCase() === "todos") return true;
  return vehicle.service_type === serviceFilter;
}

function coordinateForVehicle(vehicle: Vehicle): Coordinate {
  return [vehicle.longitude, vehicle.latitude];
}

function isValidCoordinate(coordinate: Coordinate) {
  return Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]) && Math.abs(coordinate[0]) <= 180 && Math.abs(coordinate[1]) <= 90;
}

function distanceSquared(a: Coordinate, b: Coordinate) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function positionAt(motion: MotionState, now: number): Coordinate {
  if (motion.duration <= 0) return motion.to;
  const progress = Math.max(0, Math.min(1, (now - motion.startedAt) / motion.duration));
  return [
    motion.from[0] + (motion.to[0] - motion.from[0]) * progress,
    motion.from[1] + (motion.to[1] - motion.from[1]) * progress,
  ];
}

function boundsForNetwork(network: TransitNetwork): [[number, number], [number, number]] {
  const points = network.lines.flatMap((line) => line.coordinates).filter(isValidCoordinate);
  if (!points.length) return [[-99.2, 19.27], [-99.04, 19.54]];
  return [
    [Math.min(...points.map(([lng]) => lng)), Math.min(...points.map(([, lat]) => lat))],
    [Math.max(...points.map(([lng]) => lng)), Math.max(...points.map(([, lat]) => lat))],
  ];
}

function adaptivePadding(container: HTMLElement) {
  const shortestSide = Math.min(container.clientWidth || 640, container.clientHeight || 480);
  return Math.max(32, Math.min(112, Math.round(shortestSide * 0.09)));
}

function fitNetwork(map: MapLibreMap, network: TransitNetwork, container: HTMLElement, duration = 650) {
  map.fitBounds(boundsForNetwork(network), {
    padding: adaptivePadding(container),
    maxZoom: 13,
    duration,
  });
}

function resetView(map: MapLibreMap, network: TransitNetwork, variant: "hero" | "dashboard", container: HTMLElement, reducedMotion: boolean) {
  if (variant === "hero") {
    map.easeTo({
      center: HERO_CENTER,
      zoom: 11.3,
      pitch: 42,
      bearing: -15,
      duration: reducedMotion ? 0 : 700,
    });
    return;
  }
  map.easeTo({ pitch: 0, bearing: 0, duration: reducedMotion ? 0 : 450 });
  fitNetwork(map, network, container, reducedMotion ? 0 : 700);
}

function likelyStyleFailure(event: StyleErrorEvent) {
  const message = String(event.error instanceof Error ? event.error.message : event.error?.message ?? "").toLowerCase();
  if (!message || message.includes("tile")) return false;
  return message.includes("style") || message.includes("sprite") || message.includes("glyph") || message.includes("json parse");
}

function colorToRgba(color: string, alpha = 255): [number, number, number, number] {
  const match = color.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(match)) {
    return [parseInt(`${match[0]}${match[0]}`, 16), parseInt(`${match[1]}${match[1]}`, 16), parseInt(`${match[2]}${match[2]}`, 16), alpha];
  }
  if (/^[0-9a-f]{6}$/i.test(match)) {
    return [parseInt(match.slice(0, 2), 16), parseInt(match.slice(2, 4), 16), parseInt(match.slice(4, 6), 16), alpha];
  }
  return [227, 6, 19, alpha];
}

function trimTrip(trip: TripSample[]) {
  // Six observed samples plus one future interpolation endpoint.
  return trip.slice(-(TRAIL_SNAPSHOT_COUNT + 1));
}

function stationFromPick(network: TransitNetwork, point: StationPoint) {
  const line = network.lines.find((candidate) => candidate.id === point.lineId);
  const station = line?.stations.find((candidate) => candidate.id === point.station.id);
  return station ? { station, lineId: point.lineId } : null;
}

function formatVehicleTooltip(point: VehiclePoint, language: "es" | "en") {
  const bearing = Number.isFinite(point.bearing) ? `${Math.round(point.bearing as number)}°` : "—";
  const speed = Number.isFinite(point.speed) ? `${Math.round(point.speed as number)} km/h` : "—";
  if (language === "en") return `${point.lineCode} · ${point.lineName}\n${point.id}\nToward: ${point.direction || "—"}\nBearing: ${bearing} · Speed: ${speed}\nNext station: ${point.nextStop || "—"}`;
  return `${point.lineCode} · ${point.lineName}\n${point.id}\nSentido: ${point.direction || "—"}\nRumbo: ${bearing} · Velocidad: ${speed}\nPróxima estación: ${point.nextStop || "—"}`;
}

function formatStationTooltip(point: StationPoint) {
  return `${point.station.name}\n${point.lineCode} · ${point.lineName}\nID: ${point.station.id}\n${point.station.coordinates[1].toFixed(5)}, ${point.station.coordinates[0].toFixed(5)}`;
}

export function LiveMap({
  network,
  vehicles,
  selectedLines,
  serviceFilter,
  showRoutes = true,
  trails = false,
  recording = false,
  selectedId = null,
  following = false,
  focus = null,
  command = null,
  variant = "dashboard",
  onVehicleSelect,
  onStationSelect,
  onMapReady,
  retryLabel,
}: LiveMapProps) {
  const { theme } = usePreferences();
  const { language, t } = useTranslation();
  const preferencesRef = useRef({ theme, language });
  preferencesRef.current = { theme, language };
  const styleUrl = theme === "light"
    ? process.env.NEXT_PUBLIC_LIGHT_MAP_STYLE_URL || BASEMAP.POSITRON
    : process.env.NEXT_PUBLIC_MAP_STYLE_URL || CARTO_DARK_MATTER_STYLE;
  const styleRef = useRef(styleUrl);
  styleRef.current = styleUrl;
  const appliedStyleRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<OverlayLike | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef<LiveMapProps>({ network, vehicles });
  const motionsRef = useRef(new Map<string, MotionState>());
  const staticDataRef = useRef<StaticMapData>({ routes: [], stations: [] });
  const tripOriginMsRef = useRef<number | null>(null);
  const renderGPURef = useRef<(now: number) => void>(() => undefined);
  const animationFrameRef = useRef<number | null>(null);
  const lastCommandNonceRef = useRef<number | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("pending");
  const [retryNonce, setRetryNonce] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  propsRef.current = {
    network,
    vehicles,
    selectedLines,
    serviceFilter,
    showRoutes,
    trails,
    recording,
    selectedId,
    following,
    focus,
    command,
    variant,
    onVehicleSelect,
    onStationSelect,
    onMapReady,
    retryLabel,
  };

  const selectedLineKey = selectedLines === undefined ? "all" : selectedLines.join(",");
  const selectedLineSet = useMemo(() => new Set(lineIds(selectedLines)), [selectedLineKey, selectedLines]);
  const visibleVehicles = useMemo(
    () => vehicles.filter((vehicle) => selectedLineSet.has(vehicle.line_id) && serviceMatches(vehicle, serviceFilter) && isValidCoordinate(coordinateForVehicle(vehicle))),
    [vehicles, selectedLineSet, serviceFilter],
  );
  const focusCoordinatesKey = focus?.coordinates ? `${focus.coordinates[0]},${focus.coordinates[1]}` : "";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const selected = new Set(lineIds(propsRef.current.selectedLines));
    const routes: RoutePoint[] = [];
    const stations: StationPoint[] = [];
    for (const line of network.lines) {
      if (!selected.has(line.id)) continue;
      if (line.coordinates.length > 1) routes.push({ path: line.coordinates, color: line.color, lineId: line.id, lineCode: line.code });
      for (const station of line.stations) {
        if (isValidCoordinate(station.coordinates)) {
          stations.push({ station, lineId: line.id, lineCode: line.code, lineName: line.name, color: line.color, position: station.coordinates });
        }
      }
    }
    staticDataRef.current = { routes, stations };
    renderGPURef.current(performance.now());
  }, [network, selectedLineKey]);

  useEffect(() => {
    const now = performance.now();
    if (tripOriginMsRef.current === null) tripOriginMsRef.current = now;
    const snapshotSeconds = (now - tripOriginMsRef.current) / 1000;
    const nextIds = new Set<string>();
    const nextMotions = motionsRef.current;

    for (const vehicle of visibleVehicles) {
      const target = coordinateForVehicle(vehicle);
      const existing = nextMotions.get(vehicle.id);
      const from = existing ? positionAt(existing, now) : target;
      const trip = existing ? trimTrip([...existing.trip.slice(0, -1), { position: from, timestamp: snapshotSeconds }, { position: target, timestamp: snapshotSeconds + INTERPOLATION_SECONDS }]) : [
        { position: from, timestamp: snapshotSeconds },
        { position: target, timestamp: snapshotSeconds + INTERPOLATION_SECONDS },
      ];
      nextMotions.set(vehicle.id, {
        vehicle,
        from,
        to: target,
        current: from,
        startedAt: now,
        duration: reducedMotion ? 0 : INTERPOLATION_MS,
        trip,
      });
      nextIds.add(vehicle.id);
    }
    for (const id of nextMotions.keys()) {
      if (!nextIds.has(id)) nextMotions.delete(id);
    }
    renderGPURef.current(now);
  }, [visibleVehicles, reducedMotion]);

  renderGPURef.current = (now: number) => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;
    const currentProps = propsRef.current;
    const lineById = new Map(currentProps.network.lines.map((line) => [line.id, line]));
    const vehiclePoints: VehiclePoint[] = [];
    const tripData: TripPoint[] = [];

    for (const motion of motionsRef.current.values()) {
      const line = lineById.get(motion.vehicle.line_id);
      if (!line) continue;
      const position = positionAt(motion, now);
      motion.current = position;
      vehiclePoints.push({
        id: motion.vehicle.id,
        position,
        color: line.color,
        lineId: line.id,
        lineCode: line.code,
        lineName: line.name,
        direction: motion.vehicle.direction,
        bearing: motion.vehicle.bearing,
        speed: motion.vehicle.speed,
        nextStop: motion.vehicle.next_stop,
      });
      if (currentProps.trails && motion.trip.length > 1) {
        tripData.push({
          id: motion.vehicle.id,
          path: motion.trip.map((sample) => sample.position),
          timestamps: motion.trip.map((sample) => sample.timestamp),
          color: line.color,
        });
      }
    }

    const selectedVehicle = vehiclePoints.find((point) => point.id === currentProps.selectedId);
    const currentTime = tripOriginMsRef.current === null ? 0 : (now - tripOriginMsRef.current) / 1000;
    const routeData = staticDataRef.current.routes;
    const stationData = staticDataRef.current.stations;
    const stationIconSize = currentProps.variant === "hero" ? 15 : Math.max(20, Math.min(36, 20 + (map.getZoom() - 11) * 4));
    const layers = [
      new PathLayer<RoutePoint>({
        id: "metrobus-route-glow",
        data: routeData,
        visible: currentProps.showRoutes !== false,
        widthUnits: "pixels",
        widthMinPixels: 10,
        getPath: (route) => route.path,
        getColor: (route) => colorToRgba(route.color, 76),
        getWidth: 10,
        jointRounded: true,
        capRounded: true,
        pickable: false,
      }),
      new PathLayer<RoutePoint>({
        id: "metrobus-routes",
        data: routeData,
        visible: currentProps.showRoutes !== false,
        widthUnits: "pixels",
        widthMinPixels: 2,
        getPath: (route) => route.path,
        getColor: (route) => colorToRgba(route.color, 245),
        getWidth: 3.5,
        jointRounded: true,
        capRounded: true,
        pickable: false,
      }),
      new TripsLayer<TripPoint>({
        id: "metrobus-trips",
        data: tripData,
        visible: currentProps.trails === true,
        trailLength: INTERPOLATION_SECONDS * TRAIL_SNAPSHOT_COUNT,
        currentTime,
        fadeTrail: true,
        widthUnits: "pixels",
        widthMinPixels: 2,
        getPath: (trip) => trip.path,
        getTimestamps: (trip) => trip.timestamps,
        getColor: (trip) => colorToRgba(trip.color, 170),
        getWidth: 2.4,
        jointRounded: true,
        capRounded: true,
        pickable: false,
      }),
      new ScatterplotLayer<StationPoint>({
        id: "metrobus-station-halo",
        data: stationData,
        pickable: false,
        radiusUnits: "pixels",
        getPosition: (station) => station.position,
        getRadius: stationIconSize * 0.58,
        getFillColor: theme === "light" ? [255, 255, 255, 230] : [10, 12, 14, 230],
        getLineColor: (station) => colorToRgba(station.color, 255),
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        stroked: true,
        filled: true,
      }),
      new IconLayer<StationPoint>({
        id: "metrobus-stations",
        data: stationData,
        iconAtlas: "/brand/station-mb.png",
        iconMapping: STATION_ICON_MAPPING,
        getIcon: () => "mb",
        getPosition: (station) => station.position,
        getSize: stationIconSize,
        sizeUnits: "pixels",
        billboard: true,
        pickable: true,
        alphaCutoff: 0.12,
        onHover: (info) => handleHover(info as GeoPickInfo<StationPoint>, "station"),
      }),
      new ScatterplotLayer<VehiclePoint>({
        id: "metrobus-vehicle-halo",
        data: vehiclePoints,
        radiusUnits: "pixels",
        radiusMinPixels: 8,
        radiusMaxPixels: 14,
        getPosition: (vehicle) => vehicle.position,
        getRadius: (vehicle) => vehicle.id === currentProps.selectedId ? 14 : 9,
        getFillColor: (vehicle) => colorToRgba(vehicle.color, vehicle.id === currentProps.selectedId ? 105 : 70),
        stroked: false,
        filled: true,
        pickable: false,
      }),
      new ScatterplotLayer<VehiclePoint>({
        id: "metrobus-vehicles",
        data: vehiclePoints,
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 8,
        getPosition: (vehicle) => vehicle.position,
        getRadius: (vehicle) => vehicle.id === currentProps.selectedId ? 6 : 4.2,
        getFillColor: (vehicle) => colorToRgba(vehicle.color, 255),
        getLineColor: theme === "light" ? [40, 42, 44, 255] : [255, 255, 255, 255],
        getLineWidth: (vehicle) => vehicle.id === currentProps.selectedId ? 2.5 : 1.2,
        stroked: true,
        filled: true,
        pickable: true,
        onHover: (info) => handleHover(info as GeoPickInfo<VehiclePoint>, "vehicle"),
      }),
      ...(selectedVehicle ? [new ScatterplotLayer<VehiclePoint>({
        id: "metrobus-selected-vehicle",
        data: [selectedVehicle],
        radiusUnits: "pixels",
        radiusMinPixels: 7,
        radiusMaxPixels: 11,
        getPosition: (vehicle) => vehicle.position,
        getRadius: 8,
        getFillColor: [255, 255, 255, 20],
        getLineColor: [255, 255, 255, 245],
        getLineWidth: 2,
        stroked: true,
        filled: true,
        pickable: false,
      })] : []),
    ];
    overlay.setProps({ layers, ...(currentProps.trails ? { currentTime } : {}) });

    if (currentProps.following && currentProps.selectedId && selectedVehicle && isValidCoordinate(selectedVehicle.position)) {
      map.setCenter(selectedVehicle.position);
    }
  };

  function setTooltip(text: string, x: number, y: number, station?: Station) {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    tooltip.replaceChildren();
    tooltip.dataset.kind = station ? "station" : "vehicle";
    if (station) {
      const symbol = document.createElement("img");
      symbol.src = station.pictogramUrl || "/brand/station-mb.svg";
      symbol.alt = station.pictogramUrl ? `Pictograma de ${station.name}` : "MB — estación de Metrobús";
      symbol.className = "station-tooltip-symbol";
      symbol.onerror = () => { symbol.onerror = null; symbol.src = "/brand/station-mb.svg"; symbol.alt = "MB — estación de Metrobús"; };
      tooltip.append(symbol);
    }
    const content = document.createElement("span");
    content.textContent = text;
    tooltip.append(content);
    tooltip.hidden = false;
    const bounds = tooltip.getBoundingClientRect();
    const width = containerRef.current?.clientWidth ?? 320;
    const height = containerRef.current?.clientHeight ?? 600;
    const left = x + 14 + bounds.width > width - 8 ? x - bounds.width - 14 : x + 14;
    const top = y + 14 + bounds.height > height - 8 ? y - bounds.height - 14 : y + 14;
    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  }

  function handleHover(info: GeoPickInfo<VehiclePoint | StationPoint>, kind: "vehicle" | "station") {
    const tooltip = tooltipRef.current;
    if (!info.object) {
      if (tooltip) tooltip.hidden = true;
      return;
    }
    const text = kind === "vehicle" ? formatVehicleTooltip(info.object as VehiclePoint, preferencesRef.current.language) : formatStationTooltip(info.object as StationPoint);
    setTooltip(text, info.x, info.y, kind === "station" ? (info.object as StationPoint).station : undefined);
  }

  function handleClick(info: GeoPickInfo<VehiclePoint | StationPoint>, kind: "vehicle" | "station") {
    if (!info.object) return;
    if (kind === "vehicle") {
      propsRef.current.onVehicleSelect?.((info.object as VehiclePoint).id);
      return;
    }
    const point = info.object as StationPoint;
    const picked = stationFromPick(propsRef.current.network, point);
    if (picked) propsRef.current.onStationSelect?.(picked.station, picked.lineId);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let loaded = false;
    let map: MapLibreMap | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let handleWebglContextLost: ((event: Event) => void) | null = null;
    let handleMapClick: ((event: MapLayerMouseEvent) => void) | null = null;
    let fallbackTimer: number | undefined;
    let resizeObserver: ResizeObserver | null = null;

    const fail = (force = false) => {
      if (disposed || (!force && loaded)) return;
      disposed = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      const overlay = overlayRef.current;
      overlayRef.current = null;
      try { overlay?.finalize?.(); } catch { /* deck cleanup is best effort */ }
      if (mapRef.current === map) mapRef.current = null;
      map?.remove();
      setOverlayMode("none");
      setMapStatus("fallback");
    };

    const init = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (disposed) return;
        // MapLibre 6 is ESM-only: Next emits this worker as a hashed browser asset.
        maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
        const currentProps = propsRef.current;
        map = new maplibregl.Map({
          container,
          style: styleRef.current,
          center: currentProps.variant === "hero" ? HERO_CENTER : DEFAULT_CENTER,
          zoom: currentProps.variant === "hero" ? 11.3 : 10.9,
          pitch: currentProps.variant === "hero" ? 42 : 0,
          bearing: currentProps.variant === "hero" ? -15 : 0,
          attributionControl: false,
          cooperativeGestures: currentProps.variant === "hero",
        });
        appliedStyleRef.current = styleRef.current;
        mapRef.current = map;
        canvas = map.getCanvas();
        resizeObserver = new ResizeObserver(() => {
          if (!disposed && mapRef.current === map) {
            map?.resize();
            renderGPURef.current(performance.now());
          }
        });
        resizeObserver.observe(container);
        map.once("remove", () => resizeObserver?.disconnect());
        handleWebglContextLost = (event: Event) => {
          event.preventDefault();
          fail(true);
        };
        canvas.addEventListener("webglcontextlost", handleWebglContextLost, { passive: false });

        const handleError = (event: StyleErrorEvent) => {
          if (!loaded && likelyStyleFailure(event)) fail();
        };
        const handleLoad = () => {
          if (disposed || !map) return;
          loaded = true;
          if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
          try {
            const createOverlay = (interleaved: boolean) => new MapLibreOverlay({ interleaved, layers: [], getCursor: ({ isHovering }) => isHovering ? "pointer" : "grab" });
            let overlay: OverlayLike;
            let interleavedOverlay: OverlayLike | null = null;
            try {
              interleavedOverlay = createOverlay(true);
              overlay = interleavedOverlay;
              map.addControl(overlay);
              setOverlayMode("interleaved");
            } catch (interleavedError) {
              try { interleavedOverlay?.finalize?.(); } catch { /* failed interleaved init */ }
              overlay = createOverlay(false);
              map.addControl(overlay);
              setOverlayMode("overlaid");
              // A concrete interleaved initialization failure is intentionally downgraded to overlaid mode.
              console.info("MapLibreOverlay interleaved mode unavailable; using overlaid mode", interleavedError);
            }
            overlayRef.current = overlay;
            // MapLibre may consume pointerdown before Deck's native click recognizer.
            // Its click point is canvas-local and works for mouse and touch in both modes.
            handleMapClick = (event: MapLayerMouseEvent) => {
              const info = overlay.pickObject({
                x: event.point.x,
                y: event.point.y,
                radius: 6,
                layerIds: ["metrobus-vehicles", "metrobus-stations"],
              }) as PickingInfo<VehiclePoint | StationPoint> | null;
              if (info?.object) handleClick(info as GeoPickInfo<VehiclePoint | StationPoint>, "station" in info.object ? "station" : "vehicle");
            };
            map.on("click", handleMapClick);
            renderGPURef.current(performance.now());
            setMapStatus("ready");
            propsRef.current.onMapReady?.();
          } catch {
            loaded = false;
            fail();
          }
        };
        map.on("error", handleError);
        map.once("load", handleLoad);
        fallbackTimer = window.setTimeout(() => {
          if (!loaded) fail();
        }, MAP_LOAD_TIMEOUT_MS);
      } catch {
        fail();
      }
    };
    void init();

    return () => {
      disposed = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      resizeObserver?.disconnect();
      if (tooltipRef.current) tooltipRef.current.hidden = true;
      if (canvas && handleWebglContextLost) canvas.removeEventListener("webglcontextlost", handleWebglContextLost);
      if (map && handleMapClick) map.off("click", handleMapClick);
      const overlay = overlayRef.current;
      overlayRef.current = null;
      try { overlay?.finalize?.(); } catch { /* deck cleanup is best effort */ }
      if (mapRef.current === map) mapRef.current = null;
      map?.remove();
    };
  }, [retryNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (mapStatus !== "ready" || !map || appliedStyleRef.current === styleUrl) return;
    appliedStyleRef.current = styleUrl;
    const redraw = () => renderGPURef.current(performance.now());
    map.once("style.load", redraw);
    map.setStyle(styleUrl);
    if (tooltipRef.current) tooltipRef.current.hidden = true;
    return () => { map.off("style.load", redraw); };
  }, [mapStatus, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (mapStatus !== "ready" || !map) return;
    const redraw = () => renderGPURef.current(performance.now());
    map.on("move", redraw);
    return () => { map.off("move", redraw); };
  }, [mapStatus]);

  useEffect(() => {
    if (mapStatus !== "ready") return;
    let lastFrame = 0;
    const tick = (now: number) => {
      if (reducedMotion || now - lastFrame >= FRAME_INTERVAL_MS) {
        renderGPURef.current(now);
        lastFrame = now;
      }
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };
    if (reducedMotion) {
      renderGPURef.current(performance.now());
      return;
    }
    animationFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [mapStatus, reducedMotion]);

  useEffect(() => {
    if (mapStatus !== "ready" || !following || !selectedId) return;
    renderGPURef.current(performance.now());
  }, [mapStatus, following, selectedId, visibleVehicles]);

  useEffect(() => {
    if (mapStatus !== "ready" || !recording || !mapRef.current || reducedMotion) return;
    const map = mapRef.current;
    map.easeTo({ pitch: 54, duration: 500, essential: true });
    const startedAt = performance.now();
    const initialBearing = map.getBearing();
    let frame = 0;
    let lastFrame = 0;
    const orbit = (now: number) => {
      if (mapRef.current === map && now - lastFrame >= FRAME_INTERVAL_MS) {
        map.setBearing((initialBearing + ((now - startedAt) * 0.012)) % 360);
        lastFrame = now;
      }
      frame = window.requestAnimationFrame(orbit);
    };
    frame = window.requestAnimationFrame(orbit);
    return () => window.cancelAnimationFrame(frame);
  }, [mapStatus, recording, reducedMotion]);

  useEffect(() => {
    if (mapStatus !== "ready" || !focus || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    const currentProps = propsRef.current;
    if (focus.coordinates && isValidCoordinate(focus.coordinates)) {
      map.flyTo({ center: focus.coordinates, zoom: focus.zoom ?? Math.max(map.getZoom(), 14), duration: reducedMotion ? 0 : 700 });
      return;
    }
    const key = focus.key.toLowerCase();
    const candidateLine = currentProps.network.lines.find((line) =>
      (focus.lineId === undefined || line.id === focus.lineId) &&
      (focus.lineId !== undefined || String(line.id) === focus.key || line.code.toLowerCase() === key || line.routeId.toLowerCase() === key),
    );
    const candidateStation = currentProps.network.lines
      .filter((line) => focus.lineId === undefined || line.id === focus.lineId)
      .flatMap((line) => line.stations.map((station) => ({ station, line })))
      .find(({ station }) => station.id.toLowerCase() === key || station.name.toLowerCase() === key);
    if (candidateStation) {
      map.flyTo({ center: candidateStation.station.coordinates, zoom: focus.zoom ?? 14.5, duration: reducedMotion ? 0 : 700 });
    } else if (candidateLine) {
      const linePoints = candidateLine.coordinates.filter(isValidCoordinate);
      if (linePoints.length) {
        map.fitBounds(
          [[Math.min(...linePoints.map(([lng]) => lng)), Math.min(...linePoints.map(([, lat]) => lat))], [Math.max(...linePoints.map(([lng]) => lng)), Math.max(...linePoints.map(([, lat]) => lat))]],
          { padding: adaptivePadding(containerRef.current), maxZoom: focus.zoom ?? 14, duration: reducedMotion ? 0 : 700 },
        );
      }
    }
  }, [mapStatus, focus?.key, focus?.lineId, focus?.zoom, focusCoordinatesKey, reducedMotion]);

  useEffect(() => {
    if (mapStatus !== "ready" || !command || !mapRef.current || !containerRef.current || command.nonce === lastCommandNonceRef.current) return;
    lastCommandNonceRef.current = command.nonce;
    const map = mapRef.current;
    const currentProps = propsRef.current;
    if (command.type === "zoom-in") map.zoomIn({ duration: reducedMotion ? 0 : 300 });
    if (command.type === "zoom-out") map.zoomOut({ duration: reducedMotion ? 0 : 300 });
    if (command.type === "reset") resetView(map, currentProps.network, currentProps.variant ?? "dashboard", containerRef.current, reducedMotion);
    if (command.type === "pitch") map.easeTo({ pitch: map.getPitch() > 0 ? 0 : (currentProps.variant === "hero" ? 42 : 36), duration: reducedMotion ? 0 : 450 });
  }, [mapStatus, command?.nonce, command?.type, reducedMotion]);

  const handleRetry = () => {
    setMapStatus("loading");
    setOverlayMode("pending");
    setRetryNonce((value) => value + 1);
  };

  return (
    <div ref={containerRef} className="transit-map maplibregl-map absolute inset-0 overflow-hidden" data-map-status={mapStatus} data-overlay-mode={overlayMode} data-map-theme={theme}>
      {mapStatus === "fallback" ? (
        <NetworkFallback
          network={network}
          vehicles={vehicles}
          selectedLines={selectedLines}
          serviceFilter={serviceFilter}
          selectedId={selectedId}
          onVehicleSelect={onVehicleSelect}
          onStationSelect={onStationSelect}
          onRetry={handleRetry}
          retryLabel={retryLabel || t("Reintentar mapa", "Retry map")}
        />
      ) : (
        <>
          <div className="absolute inset-0" />
          <div ref={tooltipRef} className="map-tooltip pointer-events-none absolute z-20 max-w-[280px] whitespace-pre-line rounded-md border border-white/15 bg-[#101822]/95 px-3 py-2 text-[11px] leading-5 text-white shadow-xl backdrop-blur-sm" role="tooltip" hidden />
          <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded px-2 py-1 text-[10px] tracking-wide" style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}>© CARTO · © OpenStreetMap</div>
          {mapStatus === "loading" ? <div className="map-loading pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/70">{t("Cargando red…", "Loading network…")}</div> : null}
        </>
      )}
    </div>
  );
}

export default LiveMap;
