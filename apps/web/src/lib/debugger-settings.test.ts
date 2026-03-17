// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type DebuggerSettings,
} from "./debugger-settings";

describe("debugger-settings persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when localStorage is empty", () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when localStorage has corrupt JSON", () => {
    localStorage.setItem("pvmdbg.settings", "not json {{{");
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips save and load", () => {
    const custom: DebuggerSettings = {
      selectedPvmIds: ["typeberry", "ananas"],
      steppingMode: "block",
      nInstructionsCount: 42,
      autoContinuePolicy: "never",
    };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
  });

  it("mirrors per-setting keys on save", () => {
    const custom: DebuggerSettings = {
      selectedPvmIds: ["ananas"],
      steppingMode: "n_instructions",
      nInstructionsCount: 7,
      autoContinuePolicy: "always_continue",
    };
    saveSettings(custom);
    expect(localStorage.getItem("pvmdbg.settings.selectedPvmIds")).toBe('["ananas"]');
    expect(localStorage.getItem("pvmdbg.settings.steppingMode")).toBe("n_instructions");
    expect(localStorage.getItem("pvmdbg.settings.nInstructionsCount")).toBe("7");
    expect(localStorage.getItem("pvmdbg.settings.autoContinuePolicy")).toBe("always_continue");
  });

  it("falls back to defaults for missing fields in stored blob", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ steppingMode: "block" }));
    const settings = loadSettings();
    expect(settings.steppingMode).toBe("block");
    expect(settings.selectedPvmIds).toEqual(DEFAULT_SETTINGS.selectedPvmIds);
    expect(settings.nInstructionsCount).toBe(DEFAULT_SETTINGS.nInstructionsCount);
    expect(settings.autoContinuePolicy).toBe(DEFAULT_SETTINGS.autoContinuePolicy);
  });
});

describe("debugger-settings validators", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects unknown PVM IDs and falls back to default", () => {
    localStorage.setItem(
      "pvmdbg.settings",
      JSON.stringify({ selectedPvmIds: ["unknown_pvm"] }),
    );
    expect(loadSettings().selectedPvmIds).toEqual(DEFAULT_SETTINGS.selectedPvmIds);
  });

  it("filters out unknown PVM IDs but keeps valid ones", () => {
    localStorage.setItem(
      "pvmdbg.settings",
      JSON.stringify({ selectedPvmIds: ["typeberry", "fake", "ananas"] }),
    );
    expect(loadSettings().selectedPvmIds).toEqual(["typeberry", "ananas"]);
  });

  it("rejects empty PVM array and falls back to default", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ selectedPvmIds: [] }));
    expect(loadSettings().selectedPvmIds).toEqual(DEFAULT_SETTINGS.selectedPvmIds);
  });

  it("rejects invalid stepping mode and falls back to default", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ steppingMode: "turbo" }));
    expect(loadSettings().steppingMode).toBe(DEFAULT_SETTINGS.steppingMode);
  });

  it("rejects zero N-instructions count", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ nInstructionsCount: 0 }));
    expect(loadSettings().nInstructionsCount).toBe(DEFAULT_SETTINGS.nInstructionsCount);
  });

  it("rejects negative N-instructions count", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ nInstructionsCount: -5 }));
    expect(loadSettings().nInstructionsCount).toBe(DEFAULT_SETTINGS.nInstructionsCount);
  });

  it("floors fractional N-instructions count", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ nInstructionsCount: 10.7 }));
    expect(loadSettings().nInstructionsCount).toBe(10);
  });

  it("rejects NaN and Infinity counts", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ nInstructionsCount: "NaN" }));
    expect(loadSettings().nInstructionsCount).toBe(DEFAULT_SETTINGS.nInstructionsCount);
  });

  it("rejects invalid auto-continue policy", () => {
    localStorage.setItem("pvmdbg.settings", JSON.stringify({ autoContinuePolicy: "yolo" }));
    expect(loadSettings().autoContinuePolicy).toBe(DEFAULT_SETTINGS.autoContinuePolicy);
  });
});
