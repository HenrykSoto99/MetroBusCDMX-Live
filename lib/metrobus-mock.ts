import rawNetwork from "@/public/data/network.json";
import { simulateFleet } from "./simulation";
import type { TransitNetwork } from "./transit-types";
export const metrobusNetwork = rawNetwork as unknown as TransitNetwork;
// Exactly 100 units, within the requested 80–120 range, spread over all 7 corridors.
export const MOCK_LINE_COUNTS: Record<number,number> = { 1:24,2:15,3:14,4:9,5:17,6:12,7:9 };
export function createMetrobusMock(now=Date.now()) { return simulateFleet(metrobusNetwork,now,MOCK_LINE_COUNTS); }
export function updateMetrobusPositions(now=Date.now()) { return createMetrobusMock(Math.floor(now/12000)*12000); }
export const METROBUS_REFRESH_MS = 12_000;
