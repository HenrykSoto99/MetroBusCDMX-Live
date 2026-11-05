import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

describe("interface integration contracts", () => {
  it("waits for real logout before returning to the landing on desktop and mobile", () => {
    for (const path of ["../components/dashboard.tsx", "../components/Sidebar.tsx"]) {
      const code = source(path);
      expect(code).toMatch(/signOut\(\{\s*redirect:\s*false\s*\}\)\.then\(\(\)\s*=>\s*window\.location\.assign\("\/"\)\)/);
      expect(code).not.toContain('window.location.assign("/login")');
    }
  });

  it("renders station icons with the same GPU picking id used by click and tap", () => {
    const code = source("../components/LiveMap.tsx");
    expect(code).toContain('new IconLayer<StationPoint>');
    expect(code).toContain('id: "metrobus-stations"');
    expect(code).toContain('layerIds: ["metrobus-vehicles", "metrobus-stations"]');
    expect(code).toContain('iconAtlas: "/brand/station-mb.png"');
    const png = readFileSync(fileURLToPath(new URL("../public/brand/station-mb.png", import.meta.url)));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(128);
    expect(png.readUInt32BE(20)).toBe(128);
  });
});
