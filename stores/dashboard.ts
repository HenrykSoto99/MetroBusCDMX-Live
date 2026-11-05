"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
interface DashboardState {
  selectedLines: number[]; serviceFilter: string; trails: boolean; showRoutes: boolean;
  selectedId: string | null; following: boolean; recording: boolean;
  toggleLine: (id: number) => void; setLines: (ids: number[]) => void;
  setServiceFilter: (service: string) => void; toggleTrails: () => void;
  toggleRoutes: () => void; selectVehicle: (id: string | null) => void;
  toggleFollow: () => void; toggleRecording: () => void;
}
export const useDashboard = create<DashboardState>()(persist((set) => ({
  selectedLines: [1,2,3,4,5,6,7], serviceFilter: "all", trails: false, showRoutes: true,
  selectedId: null, following: false, recording: false,
  toggleLine: id => set(state => ({ selectedLines: state.selectedLines.includes(id) ? state.selectedLines.filter(value => value !== id) : [...state.selectedLines, id], selectedId: null, following: false })),
  setLines: selectedLines => set({ selectedLines, selectedId: null, following: false }),
  setServiceFilter: serviceFilter => set({ serviceFilter, selectedId: null, following: false }),
  toggleTrails: () => set(state => ({ trails: !state.trails })),
  toggleRoutes: () => set(state => ({ showRoutes: !state.showRoutes })),
  selectVehicle: selectedId => set({ selectedId, following: false }),
  toggleFollow: () => set(state => ({ following: !state.following })),
  toggleRecording: () => set(state => ({ recording: !state.recording })),
}), { name: "metrobus-map-preferences", partialize: state => ({ selectedLines: state.selectedLines, serviceFilter: state.serviceFilter, trails: state.trails, showRoutes: state.showRoutes }) }));
