"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Coordinate, Station, TransitLine, TransitNetwork, Vehicle } from "@/lib/transit-types";
import { usePreferences, useTranslation } from "@/lib/preferences";
import { simulationTrailHistory, updateTrail, TRAIL_WINDOW_SECONDS, type TrailSample } from "@/lib/vehicle-trails";

export interface NetworkFallbackProps {
  network: TransitNetwork;
  vehicles?: Vehicle[];
  trails?: boolean;
  dataSource?: "simulation" | "gtfs-rt";
  selectedLines?: number[];
  serviceFilter?: string;
  selectedId?: string | null;
  onVehicleSelect?: (id: string) => void;
  onStationSelect?: (station: Station, lineId: number) => void;
  onRetry?: () => void;
  showRetry?: boolean;
  retryLabel?: string;
}

type SvgPoint = { x: number; y: number };

const ALL_LINE_IDS = [1, 2, 3, 4, 5, 6, 7];
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 620;
const PADDING = 30;

function selectedLineIds(selectedLines?: number[]) {
  return selectedLines === undefined ? ALL_LINE_IDS : selectedLines;
}

function isServiceVisible(vehicle: Vehicle, serviceFilter?: string) {
  if (!serviceFilter || serviceFilter.toLowerCase() === "all" || serviceFilter.toLowerCase() === "todos") return true;
  return vehicle.service_type === serviceFilter;
}

function projectPoint(coordinate: Coordinate, bounds: [number, number, number, number]): SvgPoint {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  const lngSpan = Math.max(maxLng - minLng, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  return {
    x: PADDING + ((coordinate[0] - minLng) / lngSpan) * (VIEWBOX_WIDTH - PADDING * 2),
    y: VIEWBOX_HEIGHT - PADDING - ((coordinate[1] - minLat) / latSpan) * (VIEWBOX_HEIGHT - PADDING * 2),
  };
}

function pathForLine(line: TransitLine, bounds: [number, number, number, number]) {
  return line.coordinates
    .map((coordinate, index) => {
      const point = projectPoint(coordinate, bounds);
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function networkBounds(network: TransitNetwork, lines: TransitLine[]): [number, number, number, number] {
  const coordinates = lines.flatMap((line) => line.coordinates);
  const fallback: Coordinate[] = [[-99.2, 19.27], [-99.04, 19.54]];
  const points = coordinates.length > 1 ? coordinates : fallback;
  return [
    Math.min(...points.map(([lng]) => lng)),
    Math.min(...points.map(([, lat]) => lat)),
    Math.max(...points.map(([lng]) => lng)),
    Math.max(...points.map(([, lat]) => lat)),
  ];
}

export function NetworkFallback({
  network,
  vehicles = [],
  trails = false,
  dataSource = "gtfs-rt",
  selectedLines,
  serviceFilter,
  selectedId,
  onVehicleSelect,
  onStationSelect,
  onRetry,
  showRetry = true,
  retryLabel,
}: NetworkFallbackProps) {
  const { theme } = usePreferences();
  const { t } = useTranslation();
  const background = theme === "light" ? "#f4f5f2" : "#101822";
  const historyRef = useRef(new Map<string, TrailSample[]>());
  const historySourceRef = useRef(dataSource);
  const [history, setHistory] = useState(new Map<string, TrailSample[]>());
  useEffect(() => {
    const epoch = Date.parse(vehicles[0]?.timestamp ?? "") / 1000;
    if (!Number.isFinite(epoch)) return;
    if (historySourceRef.current !== dataSource) historyRef.current.clear();
    historySourceRef.current = dataSource;
    const next = dataSource === "simulation"
      ? simulationTrailHistory(network, vehicles, epoch)
      : new Map<string, TrailSample[]>();
    if (dataSource === "gtfs-rt") {
      for (const vehicle of vehicles) {
        const time = Date.parse(vehicle.timestamp) / 1000;
        if (!Number.isFinite(time) || !Number.isFinite(vehicle.longitude) || !Number.isFinite(vehicle.latitude)) continue;
        const point: Coordinate = [vehicle.longitude, vehicle.latitude];
        next.set(vehicle.id, updateTrail(historyRef.current.get(vehicle.id) ?? [], point, point, time, 0));
      }
    }
    historyRef.current = next;
    setHistory(next);
  }, [network, vehicles, dataSource]);
  const selectedIds = useMemo(() => new Set(selectedLineIds(selectedLines)), [selectedLines]);
  const lines = useMemo(
    () => network.lines.filter((line) => selectedIds.has(line.id)),
    [network.lines, selectedIds],
  );
  const bounds = useMemo(() => networkBounds(network, lines), [network, lines]);
  const lineById = useMemo(() => new Map(network.lines.map((line) => [line.id, line])), [network.lines]);
  const visibleVehicles = useMemo(
    () => vehicles.filter((vehicle) => selectedIds.has(vehicle.line_id) && isServiceVisible(vehicle, serviceFilter)),
    [vehicles, selectedIds, serviceFilter],
  );

  return (
    <div className="map-fallback absolute inset-0 overflow-hidden bg-[#101822] text-white">
      <svg
        aria-label={t("Vista esquemática de la red de Metrobús", "Schematic view of the Metrobús network")}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <filter id="network-fallback-glow" height="180%" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <rect fill={background} height={VIEWBOX_HEIGHT} width={VIEWBOX_WIDTH} />
        <g aria-label={t("Rutas", "Routes")}>
          {lines.map((line) => (
            <g key={`fallback-route-${line.id}`}>
              <path
                d={pathForLine(line, bounds)}
                fill="none"
                opacity={trails ? 0.08 : 0.25}
                stroke={line.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="12"
                filter="url(#network-fallback-glow)"
              />
              <path
                d={pathForLine(line, bounds)}
                fill="none"
                opacity={trails ? 0.4 : 0.95}
                stroke={line.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
            </g>
          ))}
        </g>
        {trails && <g aria-label={t("Estelas de unidades · últimos 72 segundos", "Vehicle trails · last 72 seconds")}>
          {visibleVehicles.flatMap((vehicle) => {
            const samples = history.get(vehicle.id) ?? [];
            const currentTime = samples.at(-1)?.timestamp ?? 0;
            return samples.slice(1).map((sample, index) => {
              const from = projectPoint(samples[index].position, bounds);
              const to = projectPoint(sample.position, bounds);
              const opacity = Math.max(0, Math.min(1, (sample.timestamp - currentTime + TRAIL_WINDOW_SECONDS) / TRAIL_WINDOW_SECONDS));
              return <g key={`trail-${vehicle.id}-${index}`} opacity={opacity}>
                <path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} stroke="#09111c" strokeWidth="8" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
                <path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
              </g>;
            });
          })}
        </g>}
        <g aria-label={t("Estaciones", "Stations")}>
          {lines.flatMap((line) =>
            line.stations.map((station) => {
              const point = projectPoint(station.coordinates, bounds);
              return (
                <g
                  key={`fallback-station-${line.id}-${station.id}`}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`${station.name} · ${line.code}`}
                  data-icon-hint={`${station.name} · ${line.code}`}
                  data-icon-hint-description={`ID: ${station.id}`}
                  tabIndex={0}
                  onClick={() => onStationSelect?.(station, line.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onStationSelect?.(station, line.id);
                    }
                  }}
                >
                  <circle cx={point.x} cy={point.y} r="11" fill={background} stroke={line.color} strokeWidth="2" />
                  <image href="/brand/station-mb.svg" x={point.x - 9} y={point.y - 9} width="18" height="18" />
                  <title>{`${station.name} · ${line.code} · ID: ${station.id}`}</title>
                </g>
              );
            }),
          )}
        </g>
        <g aria-label={t("Vehículos", "Vehicles")}>
          {visibleVehicles.map((vehicle) => {
            const line = lineById.get(vehicle.line_id);
            if (!line || !Number.isFinite(vehicle.longitude) || !Number.isFinite(vehicle.latitude)) return null;
            const point = projectPoint([vehicle.longitude, vehicle.latitude], bounds);
            const selected = vehicle.id === selectedId;
            return (
              <g
                key={`fallback-vehicle-${vehicle.id}`}
                className="cursor-pointer"
                role="button"
                aria-label={`${vehicle.id} · ${line.code}`}
                data-icon-hint={`${vehicle.id} · ${line.code}`}
                data-icon-hint-description={`${Math.round(vehicle.speed)} km/h · ${vehicle.next_stop}`}
                tabIndex={0}
                onClick={() => onVehicleSelect?.(vehicle.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onVehicleSelect?.(vehicle.id);
                }}
              >
                <circle cx={point.x} cy={point.y} fill="#ffffff" opacity="0.35" r={selected ? 13 : 9} filter="url(#network-fallback-glow)" />
                <circle cx={point.x} cy={point.y} fill="#ffffff" r={selected ? 7 : 5.2} stroke="#0e1620" strokeWidth={selected ? 2.5 : 1.7} />
                <title>{`${line.code} · ${vehicle.id} · ${Math.round(vehicle.speed)} km/h · ${t("Próxima", "Next")}: ${vehicle.next_stop}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <div className="map-fallback-note max-w-sm rounded-md border border-white/15 bg-[#101822]/85 px-3 py-2 text-xs text-white/80 shadow-lg backdrop-blur-sm">
          {t("Vista de red · base cartográfica no disponible", "Network view · basemap unavailable")}
          <span className="block mt-1">{t("Vista esquemática 2D. Reintenta para usar cámara y edificios 3D.", "Schematic 2D view. Retry to use the camera and 3D buildings.")}</span>
          {trails && <span className="block mt-1">{t("Estelas del historial disponible · hasta 72 s", "Trails from available history · up to 72 s")}</span>}
        </div>
        <div className="text-right text-[10px] tracking-wide text-white/50">CARTO · OpenStreetMap</div>
      </div>
      {showRetry && onRetry ? (
        <button
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
          type="button"
          onClick={onRetry}
        >
          {retryLabel || t("Reintentar mapa", "Retry map")}
        </button>
      ) : null}
    </div>
  );
}

export default NetworkFallback;
