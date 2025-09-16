import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CollapsibleInstructionsTable } from './CollapsibleInstructionsTable';
import { CurrentInstruction, Status } from '@/types/pvm';
import { InstructionMode } from '../types';
import { NumeralSystemContext } from '@/context/NumeralSystemContext';
import { NumeralSystem } from '@/context/NumeralSystem';
import workersReducer from '@/store/workers/workersSlice';
import debuggerReducer from '@/store/debugger/debuggerSlice';

// Mock the virtual scroller
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: () => [
      { index: 0, key: '0', size: 40, start: 0 },
      { index: 1, key: '1', size: 32, start: 40 },
      { index: 2, key: '2', size: 32, start: 72 },
    ],
    getTotalSize: () => 104,
    scrollToIndex: vi.fn(),
    measureElement: vi.fn(),
  })),
}));

// Helper function to create mock instructions
function createMockInstruction(
  address: number,
  blockNumber: number,
  isStart: boolean = false,
  isEnd: boolean = false
): CurrentInstruction {
  return {
    address,
    name: `INST_${address}`,
    gas: 100,
    instructionCode: 1,
    instructionBytes: new Uint8Array([1, 2, 3]),
    args: {
      reg1: 1,
      reg2: 2,
      noOfBytesToSkip: 3,
    } as any,
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
      workers: workersReducer,
      debugger: debuggerReducer,
    },
    preloadedState: {
      workers: {
        workers: [
          {
            id: 'worker-1',
            currentState: { pc: 0 },
            previousState: {},
          },
        ],
      },
      debugger: {
        program: new Uint8Array([1, 2, 3]),
        status: 'idle',
        error: null,
      },
    },
  });
}

describe('CollapsibleInstructionsTable', () => {
  const mockProps = {
    programName: 'Test Program',
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
        <NumeralSystemContext.Provider
          value={{
            numeralSystem: NumeralSystem.HEXADECIMAL,
            setNumeralSystem: vi.fn(),
          }}
        >
          <CollapsibleInstructionsTable {...props} />
        </NumeralSystemContext.Provider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render block headers and controls', () => {
    renderComponent();
    
    // Check for control bar
    expect(screen.getByText(/2 blocks/i)).toBeInTheDocument();
    expect(screen.getByText(/expanded/i)).toBeInTheDocument();
    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });

  it('should display blocks grouped correctly', () => {
    renderComponent();
    
    // The virtualizer mock returns 3 items, which should include headers and instructions
    const tables = screen.getByRole('table');
    expect(tables).toBeInTheDocument();
  });

  it('should handle expand all button click', async () => {
    renderComponent();
    
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);
    
    await waitFor(() => {
      expect(screen.getByText(/2 expanded/i)).toBeInTheDocument();
    });
  });

  it('should handle collapse all button click', async () => {
    renderComponent();
    
    const collapseAllButton = screen.getByText('Collapse All');
    fireEvent.click(collapseAllButton);
    
    await waitFor(() => {
      expect(screen.getByText(/0 expanded/i)).toBeInTheDocument();
    });
  });

  it('should handle keyboard shortcuts for expand all', () => {
    renderComponent();
    
    // Simulate Ctrl+Shift+E
    fireEvent.keyDown(window, {
      key: 'E',
      ctrlKey: true,
      shiftKey: true,
    });
    
    expect(screen.getByText(/2 expanded/i)).toBeInTheDocument();
  });

  it('should handle keyboard shortcuts for collapse all', async () => {
    renderComponent();
    
    // First expand all
    fireEvent.click(screen.getByText('Expand All'));
    
    await waitFor(() => {
      expect(screen.getByText(/2 expanded/i)).toBeInTheDocument();
    });
    
    // Then collapse with keyboard shortcut
    fireEvent.keyDown(window, {
      key: 'C',
      ctrlKey: true,
      shiftKey: true,
    });
    
    await waitFor(() => {
      expect(screen.getByText(/0 expanded/i)).toBeInTheDocument();
    });
  });

  it('should render with empty instructions', () => {
    renderComponent({ ...mockProps, programPreviewResult: undefined });
    
    expect(screen.getByText('No instructions to display')).toBeInTheDocument();
  });

  it('should handle bytecode instruction mode', () => {
    renderComponent({
      ...mockProps,
      instructionMode: InstructionMode.BYTECODE,
    });
    
    // Should still render the control bar
    expect(screen.getByText(/2 blocks/i)).toBeInTheDocument();
  });

  it('should show correct block count in control bar', () => {
    const singleBlockInstructions = [
      createMockInstruction(0, 0, true, false),
      createMockInstruction(1, 0, false, false),
      createMockInstruction(2, 0, false, true),
    ];
    
    renderComponent({
      ...mockProps,
      programPreviewResult: singleBlockInstructions,
    });
    
    expect(screen.getByText(/1 block[^s]/i)).toBeInTheDocument();
  });

  it('should handle Mac keyboard shortcuts', () => {
    renderComponent();
    
    // Simulate Cmd+Shift+E (Mac)
    fireEvent.keyDown(window, {
      key: 'E',
      metaKey: true,
      shiftKey: true,
    });
    
    expect(screen.getByText(/2 expanded/i)).toBeInTheDocument();
  });

  it('should display correct button titles with keyboard shortcuts', () => {
    renderComponent();
    
    const expandButton = screen.getByText('Expand All');
    expect(expandButton).toHaveAttribute('title', 'Expand all blocks (Ctrl+Shift+E)');
    
    const collapseButton = screen.getByText('Collapse All');
    expect(collapseButton).toHaveAttribute('title', 'Collapse all blocks (Ctrl+Shift+C)');
  });
});