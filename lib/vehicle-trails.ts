import { simulateFleet } from "./simulation";
import type { Coordinate, TransitNetwork, Vehicle } from "./transit-types";

export const TRAIL_WINDOW_SECONDS = 72;
export const TRAIL_STEP_SECONDS = 12;
export interface TrailSample { position: Coordinate; timestamp: number }

/** A stale or backwards clock is a new observation, not a trip across the city. */
export function hasContinuousVehicleTime(previous: Vehicle | undefined, current: Vehicle): boolean {
  if (!previous) return false;
  const gap = Date.parse(current.timestamp) - Date.parse(previous.timestamp);
  return Number.isFinite(gap) && gap >= 0 && gap <= TRAIL_STEP_SECONDS * 2 * 1000;
}

/** Seed only our reproducible demo. GTFS-RT histories must come from observed positions. */
export function simulationTrailHistory(
  network: TransitNetwork,
  vehicles: Vehicle[],
  relativeTime: number,
): Map<string, TrailSample[]> {
  const history = new Map<string, TrailSample[]>();
  const epoch = Date.parse(vehicles[0]?.timestamp ?? "");
  if (!Number.isFinite(epoch)) return history;
  const counts: Record<number, number> = {};
  const ids = new Set(vehicles.map((vehicle) => vehicle.id));
  for (const vehicle of vehicles) counts[vehicle.line_id] = (counts[vehicle.line_id] ?? 0) + 1;
  for (const line of network.lines) counts[line.id] ??= 0;

  for (let secondsAgo = TRAIL_WINDOW_SECONDS; secondsAgo >= 0; secondsAgo -= TRAIL_STEP_SECONDS) {
    for (const vehicle of simulateFleet(network, epoch - secondsAgo * 1000, counts).vehicles) {
      if (!ids.has(vehicle.id)) continue;
      const samples = history.get(vehicle.id) ?? [];
      samples.push({ position: [vehicle.longitude, vehicle.latitude], timestamp: relativeTime - secondsAgo });
      history.set(vehicle.id, samples);
    }
  }
  return history;
}

/** Keep one predecessor at the fade boundary so the visible tail stays continuous. */
export function updateTrail(
  previous: TrailSample[],
  from: Coordinate,
  target: Coordinate,
  currentTime: number,
  durationSeconds: number,
): TrailSample[] {
  const observed = previous.filter((sample) => sample.timestamp < currentTime);
  const newest: TrailSample[] = durationSeconds > 0
    ? [{ position: from, timestamp: currentTime }, { position: target, timestamp: currentTime + durationSeconds }]
    : [{ position: target, timestamp: currentTime }];
  const samples = [...observed, ...newest];
  const cutoff = currentTime - TRAIL_WINDOW_SECONDS;
  const firstVisible = samples.findIndex((sample) => sample.timestamp >= cutoff);
  return firstVisible > 0 ? samples.slice(firstVisible - 1) : samples;
}

/** Matches the linear time interpolation in TripsLayer's shader. */
export function interpolateVehicle(from: Coordinate, target: Coordinate, progress: number): Coordinate {
  const amount = Math.max(0, Math.min(1, progress));
  return [from[0] + (target[0] - from[0]) * amount, from[1] + (target[1] - from[1]) * amount];
}
