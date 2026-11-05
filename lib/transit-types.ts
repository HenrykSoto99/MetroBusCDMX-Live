export type Coordinate = [number, number];
export type ServiceType = "articulado" | "biarticulado" | "doble-piso" | "convencional";
export interface Station {
  id: string; name: string; coordinates: Coordinate;
  pictogramUrl?: string;
  pictogramSourceUrl?: string;
}
export interface TransitLine {
  id: number; code: string; name: string; color: string; from: string; to: string;
  routeId: string; coordinates: Coordinate[]; stations: Station[];
}
export interface TransitNetwork {
  generatedAt: string;
  feed: { publisher: string; startDate: string; endDate: string };
  lines: TransitLine[];
}
export interface Vehicle {
  id: string; line_id: number; route_id: string; latitude: number; longitude: number;
  bearing: number; speed: number; direction: string; next_stop: string;
  service_type: ServiceType; timestamp: string;
}
export interface FleetSnapshot {
  vehicles: Vehicle[]; timestamp: string; source: "simulation" | "gtfs-rt";
  refresh_seconds: number; external_api_calls: number;
}
export interface TransitProvider {
  getFleet(): Promise<FleetSnapshot>;
  getNetwork(): Promise<TransitNetwork>;
}
export const LINE_COUNTS: Record<number, number> = { 1: 142, 2: 81, 3: 74, 4: 49, 5: 101, 6: 68, 7: 53 };
export const SERVICE_LABELS: Record<ServiceType, string> = {
  articulado: "Articulado", biarticulado: "Biarticulado", "doble-piso": "Doble piso", convencional: "Convencional",
};
