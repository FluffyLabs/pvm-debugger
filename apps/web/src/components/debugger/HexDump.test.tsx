import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HexDump } from "./HexDump";

describe("HexDump", () => {
  afterEach(cleanup);
  it("renders correct address for base address", () => {
    const data = new Uint8Array(16); // one full row
    render(<HexDump data={data} baseAddress={0x20000} />);
    expect(screen.getByTestId("hex-address").textContent).toBe("00020000");
  });

  it("renders second row address incremented by 16", () => {
    const data = new Uint8Array(32); // two rows
    render(<HexDump data={data} baseAddress={0x100} />);
    const addresses = screen.getAllByTestId("hex-address");
    expect(addresses[0].textContent).toBe("00000100");
    expect(addresses[1].textContent).toBe("00000110");
  });

  it("handles partial last row (fewer than 16 bytes)", () => {
    const data = new Uint8Array([0x41, 0x42, 0x43]); // "ABC"
    render(<HexDump data={data} baseAddress={0} />);
    const hexBytes = screen.getByTestId("hex-bytes");
    expect(hexBytes.textContent).toContain("41");
    expect(hexBytes.textContent).toContain("42");
    expect(hexBytes.textContent).toContain("43");
    // ASCII column should show ABC
    const ascii = screen.getByTestId("hex-ascii");
    expect(ascii.textContent).toBe("ABC");
  });

  it("shows . for non-printable bytes in ASCII column", () => {
    const data = new Uint8Array([0x01, 0x7f, 0x80, 0xff]);
    render(<HexDump data={data} baseAddress={0} />);
    const ascii = screen.getByTestId("hex-ascii");
    expect(ascii.textContent).toBe("....");
  });

  it("shows printable characters in ASCII column", () => {
    // 'Hello' = 0x48 0x65 0x6c 0x6c 0x6f
    const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    render(<HexDump data={data} baseAddress={0} />);
    const ascii = screen.getByTestId("hex-ascii");
    expect(ascii.textContent).toBe("Hello");
  });

  it("renders empty data without errors", () => {
    const data = new Uint8Array(0);
    render(<HexDump data={data} baseAddress={0} />);
    const dump = screen.getByTestId("hex-dump");
    expect(dump.children.length).toBe(0);
  });

  it("dims zero bytes with muted class", () => {
    const data = new Uint8Array([0x00, 0x42]);
    render(<HexDump data={data} baseAddress={0} />);
    const hexBytes = screen.getByTestId("hex-bytes");
    const spans = hexBytes.querySelectorAll("span");
    // First byte (0x00) should be dimmed
    expect(spans[0].className).toContain("text-muted-foreground/40");
    // Second byte (0x42) should not be dimmed
    expect(spans[1].className).toContain("text-foreground");
  });
});
