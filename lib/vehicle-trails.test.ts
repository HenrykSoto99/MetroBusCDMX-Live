import { describe, expect, it } from "vitest";
import { createMetrobusMock, metrobusNetwork } from "./metrobus-mock";
import { hasContinuousVehicleTime, interpolateVehicle, simulationTrailHistory, updateTrail, TRAIL_WINDOW_SECONDS } from "./vehicle-trails";

describe("vehicle trails", () => {
  const epoch = Date.UTC(2026, 10, 5, 3, 30, 0);

  it("never animates stale, backwards or missing snapshots across the city", () => {
    const previous = createMetrobusMock(epoch).vehicles[0];
    const current = (offset: number) => ({ ...previous, timestamp: new Date(epoch + offset).toISOString() });
    expect(hasContinuousVehicleTime(previous, current(12_000))).toBe(true);
    expect(hasContinuousVehicleTime(previous, current(24_000))).toBe(true);
    expect(hasContinuousVehicleTime(previous, current(4 * 3600_000))).toBe(false);
    expect(hasContinuousVehicleTime(previous, current(60_000))).toBe(false);
    expect(hasContinuousVehicleTime(previous, current(-12_000))).toBe(false);
    expect(hasContinuousVehicleTime(undefined, current(0))).toBe(false);
    expect(hasContinuousVehicleTime(previous, { ...previous, timestamp: "invalid" })).toBe(false);
  });

  it("preloads the same simulated unit's history, not invented live API positions", () => {
    const fleet = createMetrobusMock(epoch);
    const history = simulationTrailHistory(metrobusNetwork, fleet.vehicles, 0);
    expect(history.size).toBe(100);
    const samples = history.get(fleet.vehicles[0].id)!;
    expect(samples).toHaveLength(7);
    expect(samples[0].timestamp).toBe(-TRAIL_WINDOW_SECONDS);
    expect(samples.at(-1)?.position).toEqual([fleet.vehicles[0].longitude, fleet.vehicles[0].latitude]);
    expect(samples[0].position).not.toEqual(samples.at(-1)?.position);
    expect(history.get("a-real-feed-id")).toBeUndefined();
  });

  it("replaces the previous prediction, keeps monotonic time and retains a fading tail", () => {
    const result = updateTrail([
      { position: [0, 0], timestamp: -80 },
      { position: [1, 1], timestamp: -60 },
      { position: [2, 2], timestamp: 0 },
      { position: [4, 4], timestamp: 12 },
    ], [3, 3], [5, 5], 6, 12);
    expect(result.map((sample) => sample.timestamp)).toEqual([-80, -60, 0, 6, 18]);
    expect(result.some((sample) => sample.timestamp === 12)).toBe(false);
    expect(interpolateVehicle([3, 3], [5, 5], 0.5)).toEqual([4, 4]);
    expect(result.at(-1)?.position).toEqual([5, 5]);
  });

  it("reduced motion puts the head at the reported point immediately", () => {
    const result = updateTrail([], [1, 1], [2, 2], 4, 0);
    expect(result).toEqual([{ position: [2, 2], timestamp: 4 }]);
    expect(interpolateVehicle([1, 1], [2, 2], 5)).toEqual([2, 2]);
  });
});
