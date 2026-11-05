import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { useDashboard } from "../stores/dashboard";
import {
  DEFAULT_LINE_FILTER_PREFERENCES,
  LINE_IDS,
  SERVICE_FILTERS,
  sanitizeLineFilterPreferences,
  sanitizeLineIds,
  sanitizeServiceFilter,
} from "./line-filter";

beforeEach(() => {
  useDashboard.setState({
    selectedLines: [...LINE_IDS],
    serviceFilter: "all",
    trails: false,
    showRoutes: true,
    selectedId: null,
    following: false,
    recording: false,
  });
});

describe("line-filter state", () => {
  it("toggles from all lines to L1 and permits a zero-line selection", () => {
    expect(useDashboard.getState().selectedLines).toEqual([...LINE_IDS]);

    useDashboard.getState().setLines(["L1"]);
    expect(useDashboard.getState().selectedLines).toEqual([1]);

    useDashboard.getState().toggleLine("1");
    expect(useDashboard.getState().selectedLines).toEqual([]);

    useDashboard.getState().toggleLine(2);
    useDashboard.getState().toggleLine(4);
    expect(useDashboard.getState().selectedLines).toEqual([2, 4]);
    useDashboard.getState().toggleLine(2);
    useDashboard.getState().toggleLine("L4");
    expect(useDashboard.getState().selectedLines).toEqual([]);
  });

  it("deduplicates legacy numeric and string line IDs and rejects hidden IDs", () => {
    expect(sanitizeLineIds(["L1", "1", 1, "L1", 2, "2", 8, "L8", null])).toEqual([1, 2]);
    expect(useDashboard.getState().setLines(["L1", "1", 1, "L7", 7, 0]));
    expect(useDashboard.getState().selectedLines).toEqual([1, 7]);
  });

  it("keeps the service filter in the supported set", () => {
    expect(SERVICE_FILTERS).toContain(DEFAULT_LINE_FILTER_PREFERENCES.serviceFilter);
    expect(sanitizeServiceFilter("articulado")).toBe("articulado");
    expect(sanitizeServiceFilter("invalid")).toBe("all");
    useDashboard.getState().setServiceFilter("biarticulado");
    useDashboard.getState().setServiceFilter("invalid");
    expect(useDashboard.getState().serviceFilter).toBe("biarticulado");
  });

  it("makes route visibility consistent whenever line selection changes", () => {
    useDashboard.getState().toggleRoutes();
    expect(useDashboard.getState().showRoutes).toBe(false);
    useDashboard.getState().setLines([1]);
    expect(useDashboard.getState().showRoutes).toBe(true);

    useDashboard.getState().toggleRoutes();
    useDashboard.getState().toggleLine(1);
    expect(useDashboard.getState().selectedLines).toEqual([]);
    expect(useDashboard.getState().showRoutes).toBe(true);
  });
});

describe("line-filter persistence", () => {
  it("migrates duplicate numeric-string legacy IDs without persisting transient state", () => {
    const options = useDashboard.persist.getOptions();
    expect(options.version).toBe(1);

    const migrated = options.migrate?.({
      selectedLines: ["L1", "1", 1, "L7", 7, 99],
      serviceFilter: "convencional",
      trails: true,
      showRoutes: false,
      selectedId: "bus-should-not-persist",
    }, 0);

    expect(migrated).toEqual({ selectedLines: [1, 7], serviceFilter: "convencional", trails: true, showRoutes: false });
    expect(options.partialize?.(useDashboard.getState())).toEqual({
      selectedLines: [1, 2, 3, 4, 5, 6, 7],
      serviceFilter: "all",
      trails: false,
      showRoutes: true,
    });
  });

  it("defensively merges malformed persisted values into the current store shape", () => {
    const current = useDashboard.getState();
    const merged = useDashboard.persist.getOptions().merge?.({
      selectedLines: ["L2", "2", "L2", 0, 8],
      serviceFilter: "not-a-service",
      trails: "yes",
      showRoutes: false,
      selectedId: "not-hydrated",
    }, current);

    expect(merged?.selectedLines).toEqual([2]);
    expect(merged?.serviceFilter).toBe("all");
    expect(merged?.trails).toBe(false);
    expect(merged?.showRoutes).toBe(false);
    expect(merged?.selectedId).toBeNull();
    expect(merged).not.toHaveProperty("selectedId", "not-hydrated");
  });

  it("sanitizes a Zustand storage wrapper as well as its inner state", () => {
    expect(sanitizeLineFilterPreferences({ state: { selectedLines: ["L3", "3"] } })).toEqual({
      selectedLines: [3],
      serviceFilter: "all",
      trails: false,
      showRoutes: true,
    });
  });
});

describe("line-filter boundaries", () => {
  it("does not introduce database access into the client preference store", () => {
    const source = readFileSync(fileURLToPath(new URL("../stores/dashboard.ts", import.meta.url)), "utf8");
    expect(source).not.toMatch(/@\/lib\/db|mysql|prisma/i);
  });
});
