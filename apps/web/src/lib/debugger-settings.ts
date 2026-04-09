/** Debugger settings — types, defaults, and localStorage persistence. */

export type SteppingMode = "instruction" | "block" | "n_instructions";
export type AutoContinuePolicy =
  | "always_continue"
  | "continue_when_trace_matches"
  | "never";

export interface DebuggerSettings {
  selectedPvmIds: string[];
  steppingMode: SteppingMode;
  nInstructionsCount: number;
  autoContinuePolicy: AutoContinuePolicy;
}

export const AVAILABLE_PVMS: { id: string; label: string; hint: string }[] = [
  {
    id: "typeberry",
    label: "typeberry",
    hint: "Reference PVM interpreter from @typeberry/lib",
  },
  { id: "ananas", label: "ananas", hint: "Alternative PVM interpreter" },
];

export const STEPPING_MODES: {
  id: SteppingMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "instruction",
    label: "Instruction",
    hint: "Single instruction per step, breakpoints enabled",
  },
  { id: "block", label: "Block", hint: "Step to next basic block boundary" },
  {
    id: "n_instructions",
    label: "N-Instructions",
    hint: "Step a custom number of instructions per step",
  },
];

export const AUTO_CONTINUE_OPTIONS: {
  id: AutoContinuePolicy;
  label: string;
  hint: string;
}[] = [
  {
    id: "always_continue",
    label: "Always",
    hint: "Automatically continue past all host calls using trace data",
  },
  {
    id: "continue_when_trace_matches",
    label: "When Trace Matches",
    hint: "Auto-continue only when the host call matches the reference trace",
  },
  {
    id: "never",
    label: "Never (Manual)",
    hint: "Always pause on host calls for manual review",
  },
];

export const DEFAULT_SETTINGS: DebuggerSettings = {
  selectedPvmIds: ["typeberry"],
  steppingMode: "instruction",
  nInstructionsCount: 10,
  autoContinuePolicy: "continue_when_trace_matches",
};

/** Human-readable tooltip for the current stepping mode. */
export function stepTooltip(mode: SteppingMode, n: number): string {
  switch (mode) {
    case "instruction":
      return "Step 1 instruction";
    case "block":
      return "Step to block boundary";
    case "n_instructions":
      return `Step ${n} instructions`;
  }
}

const STORAGE_KEY = "pvmdbg.settings";
const PER_KEY_PREFIX = "pvmdbg.settings.";

/** Load settings from localStorage, falling back to defaults. */
export function loadSettings(): DebuggerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DebuggerSettings>;
      return {
        selectedPvmIds:
          validPvmIds(parsed.selectedPvmIds) ?? DEFAULT_SETTINGS.selectedPvmIds,
        steppingMode:
          validSteppingMode(parsed.steppingMode) ??
          DEFAULT_SETTINGS.steppingMode,
        nInstructionsCount:
          validCount(parsed.nInstructionsCount) ??
          DEFAULT_SETTINGS.nInstructionsCount,
        autoContinuePolicy:
          validAutoContinue(parsed.autoContinuePolicy) ??
          DEFAULT_SETTINGS.autoContinuePolicy,
      };
    }
  } catch {
    // Corrupt data — use defaults
  }
  return { ...DEFAULT_SETTINGS };
}

/** Save settings to both the aggregate blob and per-setting keys. */
export function saveSettings(settings: DebuggerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Mirror per-setting keys for future reuse
    localStorage.setItem(
      `${PER_KEY_PREFIX}selectedPvmIds`,
      JSON.stringify(settings.selectedPvmIds),
    );
    localStorage.setItem(
      `${PER_KEY_PREFIX}steppingMode`,
      settings.steppingMode,
    );
    localStorage.setItem(
      `${PER_KEY_PREFIX}nInstructionsCount`,
      String(settings.nInstructionsCount),
    );
    localStorage.setItem(
      `${PER_KEY_PREFIX}autoContinuePolicy`,
      settings.autoContinuePolicy,
    );
  } catch {
    // localStorage may be full or unavailable
  }
}

// --- Validators ---

function validPvmIds(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const known = new Set(AVAILABLE_PVMS.map((p) => p.id));
  const filtered = v.filter((id) => typeof id === "string" && known.has(id));
  return filtered.length > 0 ? filtered : null;
}

function validSteppingMode(v: unknown): SteppingMode | null {
  const valid: SteppingMode[] = ["instruction", "block", "n_instructions"];
  return typeof v === "string" && valid.includes(v as SteppingMode)
    ? (v as SteppingMode)
    : null;
}

function validCount(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 1) return null;
  return Math.floor(v);
}

function validAutoContinue(v: unknown): AutoContinuePolicy | null {
  const valid: AutoContinuePolicy[] = [
    "always_continue",
    "continue_when_trace_matches",
    "never",
  ];
  return typeof v === "string" && valid.includes(v as AutoContinuePolicy)
    ? (v as AutoContinuePolicy)
    : null;
}
