import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App";

describe("App", () => {
  it("renders the load screen at /load", () => {
    render(
      <MemoryRouter initialEntries={["/load"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("load-screen")).toBeDefined();
  });

  it("redirects / to /load and renders the load screen", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    // After redirect, at least one load screen should be rendered
    const loadScreens = screen.getAllByTestId("load-screen");
    expect(loadScreens.length).toBeGreaterThanOrEqual(1);
  });
});
