import { describe, it, expect } from "vitest";
import { TypedEventEmitter } from "./index.js";

interface TestEvents {
  message: (text: string) => void;
  count: (n: number) => void;
}

class TestEmitter extends TypedEventEmitter<TestEvents> {
  // Expose emit for testing
  public testEmit<K extends keyof TestEvents>(
    event: K,
    ...args: Parameters<TestEvents[K]>
  ): void {
    this.emit(event, ...args);
  }
}

describe("TypedEventEmitter", () => {
  it("calls registered listeners on emit", () => {
    const emitter = new TestEmitter();
    const received: string[] = [];
    emitter.on("message", (text) => received.push(text));
    emitter.testEmit("message", "hello");
    emitter.testEmit("message", "world");
    expect(received).toEqual(["hello", "world"]);
  });

  it("supports multiple listeners per event", () => {
    const emitter = new TestEmitter();
    const a: number[] = [];
    const b: number[] = [];
    emitter.on("count", (n) => a.push(n));
    emitter.on("count", (n) => b.push(n * 2));
    emitter.testEmit("count", 5);
    expect(a).toEqual([5]);
    expect(b).toEqual([10]);
  });

  it("removes listeners with off()", () => {
    const emitter = new TestEmitter();
    const received: string[] = [];
    const listener = (text: string) => received.push(text);
    emitter.on("message", listener);
    emitter.testEmit("message", "before");
    emitter.off("message", listener);
    emitter.testEmit("message", "after");
    expect(received).toEqual(["before"]);
  });

  it("removeAllListeners clears everything", () => {
    const emitter = new TestEmitter();
    const received: string[] = [];
    emitter.on("message", (text) => received.push(text));
    emitter.removeAllListeners();
    emitter.testEmit("message", "gone");
    expect(received).toEqual([]);
  });
});
