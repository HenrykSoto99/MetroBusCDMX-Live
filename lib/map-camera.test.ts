import { describe, expect, it, vi } from "vitest";
import { afterCameraSettles, flatCamera, perspectiveCamera, type CameraSnapshot } from "./map-camera";

describe("reversible 3D camera", () => {
  const overview: CameraSnapshot = { center: [-99.145, 19.426], zoom: 10.9, pitch: 0, bearing: 0 };

  it("shows perceptible perspective at a useful building zoom", () => {
    const camera = perspectiveCamera(overview);
    expect(camera.pitch).toBe(58);
    expect(camera.zoom).toBe(14.3);
    expect(camera.bearing).toBe(-25);
    expect(camera.center).toEqual(overview.center);
  });

  it("restores the saved flat view without fighting concurrent camera animations", () => {
    expect(flatCamera(overview)).toEqual(overview);
    expect(flatCamera(overview, [-99.16, 19.43]).center).toEqual([-99.16, 19.43]);
    expect(flatCamera(overview).pitch).toBe(0);
  });

  it("keeps a close-up and the user's heading while focusing a selected unit", () => {
    const camera = perspectiveCamera({ ...overview, zoom: 16, bearing: 40 }, [-99.17, 19.44]);
    expect(camera.zoom).toBe(16);
    expect(camera.bearing).toBe(40);
    expect(camera.center).toEqual([-99.17, 19.44]);
  });

  it("waits for a stable moveend before taking a camera snapshot", () => {
    let moving = true;
    let callback: (() => void) | undefined;
    const map = { isMoving: () => moving, once: vi.fn((_event, handler) => { callback = handler; }), off: vi.fn() } as unknown as Parameters<typeof afterCameraSettles>[0];
    const action = vi.fn();
    const cancel = afterCameraSettles(map, action);
    expect(action).not.toHaveBeenCalled();
    moving = false;
    callback?.();
    expect(action).toHaveBeenCalledOnce();
    cancel();
    expect(map.off).toHaveBeenCalled();
  });

  it("does not execute an obsolete queued command after cancellation", () => {
    let callback: (() => void) | undefined;
    const map = { isMoving: () => true, once: vi.fn((_event, handler) => { callback = handler; }), off: vi.fn() } as unknown as Parameters<typeof afterCameraSettles>[0];
    const action = vi.fn();
    const cancel = afterCameraSettles(map, action);
    cancel();
    callback?.();
    expect(action).not.toHaveBeenCalled();
  });
});
