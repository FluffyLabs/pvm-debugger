import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the load page at /load", () => {
    render(
      <MemoryRouter initialEntries={["/load"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("load-page")).toBeDefined();
  });

  it("redirects / to /load via DebuggerPage redirect", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    // DebuggerPage redirects to /load, which renders LoadPage
    const loadPages = screen.getAllByTestId("load-page");
    expect(loadPages.length).toBeGreaterThanOrEqual(1);
  });

  it("redirects unknown routes to /load", () => {
    render(
      <MemoryRouter initialEntries={["/unknown-route"]}>
        <App />
      </MemoryRouter>,
    );
    const loadPages = screen.getAllByTestId("load-page");
    expect(loadPages.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the app shell with header", () => {
    render(
      <MemoryRouter initialEntries={["/load"]}>
        <App />
      </MemoryRouter>,
    );
    const shells = screen.getAllByTestId("app-shell");
    expect(shells.length).toBeGreaterThanOrEqual(1);
  });
});
