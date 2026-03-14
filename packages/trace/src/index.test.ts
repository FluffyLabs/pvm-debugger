import { describe, it, expect } from "vitest";
import { HOST_CALL_NAMES, hostCallName } from "./index.js";

describe("HOST_CALL_NAMES", () => {
  it("maps known host call indices to names", () => {
    expect(HOST_CALL_NAMES.get(0)).toBe("gas");
    expect(HOST_CALL_NAMES.get(1)).toBe("fetch");
    expect(HOST_CALL_NAMES.get(2)).toBe("lookup");
    expect(HOST_CALL_NAMES.get(3)).toBe("read");
    expect(HOST_CALL_NAMES.get(4)).toBe("write");
    expect(HOST_CALL_NAMES.get(100)).toBe("log");
  });

  it("returns undefined for unmapped indices", () => {
    expect(HOST_CALL_NAMES.get(99)).toBeUndefined();
    expect(HOST_CALL_NAMES.get(-1)).toBeUndefined();
  });
});

describe("hostCallName", () => {
  it("resolves known indices", () => {
    expect(hostCallName(0)).toBe("gas");
    expect(hostCallName(100)).toBe("log");
  });

  it("returns 'unknown' for unmapped indices", () => {
    expect(hostCallName(5)).toBe("unknown");
    expect(hostCallName(999)).toBe("unknown");
  });
});
