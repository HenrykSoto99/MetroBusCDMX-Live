import { describe, expect, it } from "vitest";
import rawNetwork from "@/public/data/network.json";
import { pointOnRoute, simulateFleet } from "./simulation";
import type { TransitNetwork } from "./transit-types";
const network = rawNetwork as unknown as TransitNetwork;
describe("real GTFS network and simulated fleet", () => {
  it("contains all seven lines with valid geometry and stations", () => {
    expect(network.lines.map(line=>line.id)).toEqual([1,2,3,4,5,6,7]);
    for (const line of network.lines) { expect(line.coordinates.length).toBeGreaterThan(2); expect(line.stations.length).toBeGreaterThan(10); for(const [lng,lat] of line.coordinates) { expect(lng).toBeGreaterThan(-100);expect(lng).toBeLessThan(-98);expect(lat).toBeGreaterThan(18);expect(lat).toBeLessThan(20); } }
  });
  it("produces stable shared snapshots with 568 identified simulated vehicles", () => {
    const fleet = simulateFleet(network, 1793840000000);
    expect(fleet.vehicles).toHaveLength(568);expect(new Set(fleet.vehicles.map(v=>v.id)).size).toBe(568);
    expect(fleet.source).toBe("simulation");expect(fleet.external_api_calls).toBe(0);expect(fleet.refresh_seconds).toBe(12);
    expect(simulateFleet(network,1793840000000)).toEqual(fleet);
    expect(simulateFleet(network,1793840012000).vehicles[0].latitude).not.toBe(fleet.vehicles[0].latitude);
  });
  it("does not teleport the fleet across the former wall-clock modulo boundary", () => {
    const boundary = Math.ceil(Date.UTC(2026, 10, 5) / 10_000_000) * 10_000_000;
    const before = simulateFleet(network, boundary - 1000).vehicles;
    const after = simulateFleet(network, boundary + 1000).vehicles;
    for (let i = 0; i < before.length; i++) {
      const dx = (after[i].longitude - before[i].longitude) * Math.cos(before[i].latitude * Math.PI / 180);
      const dy = after[i].latitude - before[i].latitude;
      expect(Math.hypot(dx, dy) * 111_320).toBeLessThan(50);
    }
  });
  it("interpolates positions by route length rather than vertex density", () => {
    expect(pointOnRoute([[0,0],[0,1],[0,2]],0.25).coordinates).toEqual([0,0.5]);
    expect(pointOnRoute([[0,0],[0,1]],0).coordinates).toEqual([0,0]);
    expect(pointOnRoute([[0,0],[0,1]],1).coordinates).toEqual([0,1]);
  });
});
