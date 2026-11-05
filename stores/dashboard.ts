"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_LINE_FILTER_PREFERENCES,
  LINE_IDS,
  normalizeLineId,
  sanitizeLineFilterPreferences,
  sanitizeLineIds,
  sanitizeServiceFilter,
  type LineIdInput,
  type LineFilterPreferences,
  type ServiceFilter,
} from "@/lib/line-filter";

export interface DashboardState {
  selectedLines: number[]; serviceFilter: ServiceFilter; trails: boolean; showRoutes: boolean;
  selectedId: string | null; following: boolean; recording: boolean;
  toggleLine: (id: LineIdInput) => void; setLines: (ids: readonly LineIdInput[]) => void;
  setServiceFilter: (service: string) => void; toggleTrails: () => void;
  toggleRoutes: () => void; selectVehicle: (id: string | null) => void;
  toggleFollow: () => void; toggleRecording: () => void;
}

type PersistedDashboardState = LineFilterPreferences;

const dashboardStorage = {
  getItem: (name: string) => {
    try { return typeof window !== "undefined" ? window.localStorage.getItem(name) : null; }
    catch { return null; }
  },
  setItem: (name: string, value: string) => {
    try { if (typeof window !== "undefined") window.localStorage.setItem(name, value); }
    catch { /* Preferences remain usable in memory when storage is blocked. */ }
  },
  removeItem: (name: string) => {
    try { if (typeof window !== "undefined") window.localStorage.removeItem(name); }
    catch { /* No account data is stored here. */ }
  },
};

export const useDashboard = create<DashboardState>()(persist((set) => ({
  selectedLines: [...LINE_IDS], serviceFilter: DEFAULT_LINE_FILTER_PREFERENCES.serviceFilter, trails: DEFAULT_LINE_FILTER_PREFERENCES.trails, showRoutes: DEFAULT_LINE_FILTER_PREFERENCES.showRoutes,
  selectedId: null, following: false, recording: false,
  toggleLine: id => set(state => {
    const normalizedId = normalizeLineId(id);
    if (normalizedId === null) return {};
    return {
      selectedLines: state.selectedLines.includes(normalizedId) ? state.selectedLines.filter(value => value !== normalizedId) : [...state.selectedLines, normalizedId],
      showRoutes: true,
      selectedId: null,
      following: false,
    };
  }),
  setLines: ids => set({ selectedLines: sanitizeLineIds(ids, []), showRoutes: true, selectedId: null, following: false }),
  setServiceFilter: service => set(state => ({ serviceFilter: sanitizeServiceFilter(service, state.serviceFilter), selectedId: null, following: false })),
  toggleTrails: () => set(state => ({ trails: !state.trails })),
  toggleRoutes: () => set(state => ({ showRoutes: !state.showRoutes })),
  selectVehicle: selectedId => set({ selectedId, following: false }),
  toggleFollow: () => set(state => ({ following: !state.following })),
  toggleRecording: () => set(state => ({ recording: !state.recording })),
}), {
  name: "metrobus-map-preferences",
  version: 1,
  skipHydration: true,
  storage: createJSONStorage<PersistedDashboardState>(() => dashboardStorage),
  partialize: state => ({ selectedLines: state.selectedLines, serviceFilter: state.serviceFilter, trails: state.trails, showRoutes: state.showRoutes }),
  migrate: persistedState => sanitizeLineFilterPreferences(persistedState),
  merge: (persistedState, currentState) => ({ ...currentState, ...sanitizeLineFilterPreferences(persistedState) }),
}));
