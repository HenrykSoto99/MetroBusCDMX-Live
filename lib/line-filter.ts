export const LINE_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
export type LineId = (typeof LINE_IDS)[number];
export type LineIdInput = number | string;

export const SERVICE_FILTERS = [
  "all",
  "articulado",
  "biarticulado",
  "doble-piso",
  "convencional",
] as const;
export type ServiceFilter = (typeof SERVICE_FILTERS)[number];

export interface LineFilterPreferences {
  selectedLines: number[];
  serviceFilter: ServiceFilter;
  trails: boolean;
  showRoutes: boolean;
}

export const DEFAULT_LINE_FILTER_PREFERENCES: Readonly<LineFilterPreferences> = {
  selectedLines: [...LINE_IDS],
  serviceFilter: "all",
  trails: false,
  showRoutes: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeLineId(value: unknown): LineId | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 7 ? value as LineId : null;
  }
  if (typeof value !== "string") return null;

  const match = /^L?([1-7])$/i.exec(value.trim());
  return match ? Number(match[1]) as LineId : null;
}

export function sanitizeLineIds(value: unknown, fallback: readonly LineId[] = LINE_IDS): number[] {
  if (!Array.isArray(value)) return [...fallback];

  const selected = new Set<number>();
  for (const candidate of value) {
    const id = normalizeLineId(candidate);
    if (id !== null) selected.add(id);
  }
  return [...selected];
}

export function sanitizeServiceFilter(value: unknown, fallback: ServiceFilter = "all"): ServiceFilter {
  return typeof value === "string" && (SERVICE_FILTERS as readonly string[]).includes(value)
    ? value as ServiceFilter
    : fallback;
}

export function sanitizeLineFilterPreferences(value: unknown): LineFilterPreferences {
  const root = isRecord(value) ? value : {};
  const persisted = isRecord(root.state) ? root.state : root;

  return {
    selectedLines: sanitizeLineIds(persisted.selectedLines),
    serviceFilter: sanitizeServiceFilter(persisted.serviceFilter),
    trails: typeof persisted.trails === "boolean" ? persisted.trails : DEFAULT_LINE_FILTER_PREFERENCES.trails,
    showRoutes: typeof persisted.showRoutes === "boolean" ? persisted.showRoutes : DEFAULT_LINE_FILTER_PREFERENCES.showRoutes,
  };
}
