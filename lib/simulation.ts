import { LINE_COUNTS, type Coordinate, type FleetSnapshot, type ServiceType, type TransitNetwork } from "./transit-types";

function distance(a: Coordinate, b: Coordinate) {
  const dx = (b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180);
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}
export function pointOnRoute(coordinates: Coordinate[], progress: number): { coordinates: Coordinate; bearing: number } {
  const lengths = coordinates.slice(1).map((point, index) => distance(coordinates[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let target = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? target / lengths[i] : 0;
      const a = coordinates[i], b = coordinates[i + 1];
      return { coordinates: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], bearing: (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360 };
    }
    target -= lengths[i];
  }
  return { coordinates: coordinates[0], bearing: 0 };
}

export function simulateFleet(network: TransitNetwork, now = Date.now(), lineCounts: Record<number,number> = LINE_COUNTS): FleetSnapshot {
  const timestamp = new Date(now).toISOString();
  // Time is anchored to a shared epoch. All visitors receive the same simulation phase.
  const seconds = (now % 10_000_000) / 1000;
  const vehicles = network.lines.flatMap(line => {
    const count = lineCounts[line.id] ?? 50;
    return Array.from({ length: count }, (_, index) => {
      const phase = ((index / count * 2 + seconds / (line.id === 4 ? 1700 : 4800)) % 2);
      const forward = phase < 1;
      const progress = forward ? phase : 2 - phase;
      const position = pointOnRoute(line.coordinates, progress);
      const stationIndex = Math.min(line.stations.length - 1, Math.max(0, Math.floor(progress * (line.stations.length - 1)) + (forward ? 1 : -1)));
      const service: ServiceType = line.id === 7 ? "doble-piso" : line.id === 4 ? "convencional" : line.id === 1 && index % 3 === 0 ? "biarticulado" : "articulado";
      return {
        id: `MB-${line.id}${String(index + 1).padStart(3, "0")}`, line_id: line.id, route_id: line.routeId,
        latitude: position.coordinates[1], longitude: position.coordinates[0],
        bearing: (position.bearing + (forward ? 0 : 180)) % 360,
        speed: 14 + ((index * 7 + line.id * 3) % 24), direction: forward ? line.to : line.from,
        next_stop: line.stations[stationIndex]?.name ?? line.to, service_type: service, timestamp,
      };
    });
  });
  return { vehicles, timestamp, source: "simulation", refresh_seconds: 12, external_api_calls: 0 };
}
