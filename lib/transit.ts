import rawNetwork from "@/public/data/network.json";
import { updateMetrobusPositions } from "./metrobus-mock";
import type { FleetSnapshot, TransitNetwork, TransitProvider } from "./transit-types";
export const network = rawNetwork as unknown as TransitNetwork;

export class SimulationProvider implements TransitProvider {
  private cached: FleetSnapshot | null = null;
  async getNetwork() { return network; }
  async getFleet() {
    const bucket = Math.floor(Date.now() / 12000) * 12000;
    if (!this.cached || new Date(this.cached.timestamp).getTime() !== bucket) this.cached = updateMetrobusPositions(bucket);
    return this.cached;
  }
}
// Replace this binding with a validated GTFS Realtime or Apimetro provider.
// Never put provider credentials in browser code. Map normalized route IDs against the static GTFS.
export const transitProvider: TransitProvider = new SimulationProvider();
