import { beforeEach, describe, expect, it } from "vitest";
import { usePreferences } from "./preferences";

describe("language and appearance preferences", () => {
  beforeEach(() => usePreferences.setState({ language: "es", theme: "dark" }));

  it("starts in Spanish and dark mode and keeps both selections independent", () => {
    expect(usePreferences.getState().language).toBe("es");
    expect(usePreferences.getState().theme).toBe("dark");
    usePreferences.getState().setLanguage("en");
    usePreferences.getState().setTheme("light");
    expect(usePreferences.getState().language).toBe("en");
    expect(usePreferences.getState().theme).toBe("light");
    usePreferences.getState().setLanguage("es");
    expect(usePreferences.getState().theme).toBe("light");
  });

  it("does not persist fleet or account data and discards invalid saved preferences", () => {
    const options = usePreferences.persist.getOptions();
    expect(options.partialize?.(usePreferences.getState())).toEqual({ language: "es", theme: "dark" });
    const merged = options.merge?.({ language: "bad", theme: "bad", email: "not-persisted@example.invalid" }, usePreferences.getState());
    expect(merged?.language).toBe("es");
    expect(merged?.theme).toBe("dark");
    expect(merged).not.toHaveProperty("email");
  });
});
