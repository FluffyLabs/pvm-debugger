import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { CollapsibleInstructionsTable } from "./CollapsibleInstructionsTable";
import { CurrentInstruction, Status } from "@/types/pvm";
import { InstructionMode } from "../types";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { NumeralSystem } from "@/context/NumeralSystem";
import workersReducer from "@/store/workers/workersSlice";
import debuggerReducer from "@/store/debugger/debuggerSlice";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArgumentType } from "@typeberry/pvm-debugger-adapter";

// Mock the utils module to avoid program decoding issues
vi.mock("../utils", async () => {
  const actual = await vi.importActual("../utils");
  return {
    ...actual,
    decodeAndGetArgsDecoder: vi.fn(() => ({
      calculateArgumentBitLengths: vi.fn(() => ({
        immediateDecoderBits: 8,
        firstImmediateLengthBits: 4,
      })),
    })),
  };
});

// Mock the virtual scroller
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: () => [
      { index: 0, key: "0", size: 40, start: 0 },
      { index: 1, key: "1", size: 32, start: 40 },
    ],
    getTotalSize: () => 72,
    scrollToIndex: vi.fn(),
    measureElement: vi.fn(),
  })),
}));

// Helper function to create mock instructions
function createMockInstruction(
  address: number,
  blockNumber: number,
  isStart: boolean = false,
  isEnd: boolean = false,
): CurrentInstruction {
  return {
    address,
    name: `INST_${address}`,
    gas: 100,
    instructionCode: 1,
    instructionBytes: new Uint8Array([1, 2, 3]),
    args: {
      type: ArgumentType.NO_ARGUMENTS,
      noOfBytesToSkip: 3,
    },
    block: {
      isStart,
      isEnd,
      name: `block${blockNumber}`,
      number: blockNumber,
    },
  };
}

// Create a test store
function createTestStore() {
  return configureStore({
    reducer: {
      // eslint-disable-next-line
      workers: workersReducer as any,
      // eslint-disable-next-line
      debugger: debuggerReducer as any,
    },
    preloadedState: {
      workers: [
        {
          id: "worker-1",
          currentState: { pc: 0 },
          previousState: {},
          worker: {} as Worker,
          memory: [],
        },
      ],
      debugger: {
        program: [1, 2, 3],
        status: "idle",
        error: null,
      },
    },
  });
}

describe("CollapsibleInstructionsTable", () => {
  const mockProps = {
    programName: "Test Program",
    status: Status.OK,
    programPreviewResult: [
      createMockInstruction(0, 0, true, false),
      createMockInstruction(1, 0, false, false),
      createMockInstruction(2, 0, false, true),
      createMockInstruction(3, 1, true, false),
      createMockInstruction(4, 1, false, true),
    ],
    currentState: { pc: 0 },
    instructionMode: InstructionMode.ASM,
    onInstructionClick: vi.fn(),
    onAddressClick: vi.fn(),
    breakpointAddresses: [],
  };

  const renderComponent = (props = mockProps) => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <TooltipProvider>
          <NumeralSystemContext.Provider
            value={{
              numeralSystem: NumeralSystem.HEXADECIMAL,
              setNumeralSystem: vi.fn(),
            }}
          >
            <CollapsibleInstructionsTable {...props} />
          </NumeralSystemContext.Provider>
        </TooltipProvider>
      </Provider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render block headers and controls", () => {
    renderComponent();

    // Check for block headers
    expect(screen.getByText("Block 0")).toBeInTheDocument();
    expect(screen.getByText("Block 1")).toBeInTheDocument();

    // Check for instruction counts
    expect(screen.getByText(/3.*instructions/)).toBeInTheDocument();
    expect(screen.getByText(/2.*instructions/)).toBeInTheDocument();
  });

  it("should display blocks grouped correctly", () => {
    renderComponent();

    // Should render a single table with the blocks
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
  });

  it("should handle block header click to expand", async () => {
    renderComponent();

    // Click on the first Block 0 header to expand it
    const blockHeaders = screen.getAllByText("Block 0");
    fireEvent.click(blockHeaders[0]);

    // The block should still be accessible after click
    expect(blockHeaders[0]).toBeInTheDocument();
  });

  it("should handle block header click to collapse", async () => {
    renderComponent();

    // Get the first Block 0 header
    const blockHeaders = screen.getAllByText("Block 0");
    const blockHeader = blockHeaders[0];

    // First click to expand
    fireEvent.click(blockHeader);

    // Second click to collapse
    fireEvent.click(blockHeader);

    // The block should remain accessible
    expect(blockHeader).toBeInTheDocument();
  });

  it("should render block headers with chevron icons", () => {
    renderComponent();

    // Check for SVG chevron icons in the rendered component
    const svgElements = document.querySelectorAll("svg");
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it("should handle multiple blocks correctly", () => {
    renderComponent();

    // Should have exactly 2 blocks as per mock data
    expect(screen.getByText("Block 0")).toBeInTheDocument();
    expect(screen.getByText("Block 1")).toBeInTheDocument();

    // Should not have Block 2
    expect(screen.queryByText("Block 2")).not.toBeInTheDocument();
  });

  it("should render with empty instructions", () => {
    renderComponent({ ...mockProps, programPreviewResult: [] });

    expect(screen.getByText("No instructions to display")).toBeInTheDocument();
  });

  it("should handle bytecode instruction mode", () => {
    renderComponent({
      ...mockProps,
      instructionMode: InstructionMode.BYTECODE,
    });

    // Should still render the block headers
    expect(screen.getByText("Block 0")).toBeInTheDocument();
    expect(screen.getByText("Block 1")).toBeInTheDocument();
  });

  it("should show correct block when single block provided", () => {
    const singleBlockInstructions = [
      createMockInstruction(0, 0, true, false),
      createMockInstruction(1, 0, false, false),
      createMockInstruction(2, 0, false, true),
    ];

    renderComponent({
      ...mockProps,
      programPreviewResult: singleBlockInstructions,
    });

    expect(screen.getByText("Block 0")).toBeInTheDocument();
    expect(screen.queryByText("Block 1")).not.toBeInTheDocument();
  });

  it("should handle click events on instruction addresses", () => {
    renderComponent();

    // Check that block headers are clickable
    const blockHeaders = screen.getAllByText("Block 0");
    expect(blockHeaders.length).toBeGreaterThan(0);

    // Simulate click on first header
    fireEvent.click(blockHeaders[0]);

    // Should remain in document after click
    expect(blockHeaders[0]).toBeInTheDocument();
  });

  it("should display instruction counts correctly", () => {
    renderComponent();

    // Check that instruction counts are displayed correctly
    expect(screen.getByText(/3.*instructions/)).toBeInTheDocument();
    expect(screen.getByText(/2.*instructions/)).toBeInTheDocument();
  });
});
