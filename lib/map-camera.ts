import type { Coordinate } from "./transit-types";

export interface CameraSnapshot {
  center: Coordinate;
  zoom: number;
  pitch: number;
  bearing: number;
}

export function perspectiveCamera(view: CameraSnapshot, selectedPosition?: Coordinate): CameraSnapshot {
  return {
    center: selectedPosition ?? view.center,
    zoom: Math.max(14.3, view.zoom),
    pitch: 58,
    bearing: Math.abs(view.bearing) < 1 ? -25 : view.bearing,
  };
}

export function flatCamera(view: CameraSnapshot, followingPosition?: Coordinate): CameraSnapshot {
  return { ...view, center: followingPosition ?? view.center, pitch: 0 };
}

/** The caller cancels obsolete commands; no 2D snapshot is taken mid-animation. */
export function afterCameraSettles(
  map: Pick<import("maplibre-gl").Map, "isMoving" | "once" | "off">,
  action: () => void,
) {
  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    if (map.isMoving()) { map.once("moveend", run); return; }
    action();
  };
  run();
  return () => { cancelled = true; map.off("moveend", run); };
}
