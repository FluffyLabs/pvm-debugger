import { Store } from "@/AppProviders";
import { Commands, TargetOnMessageParams } from "@/packages/web-worker/worker";
import { useCallback, useContext, useState } from "react";

export type MemoryFeatureState = {
  page: {
    state: {
      data?: Uint8Array;
      isLoading: boolean;
      pageNumber: number;
    };
    setState: React.Dispatch<React.SetStateAction<MemoryFeatureState["page"]["state"]>>;
  };
  range: {
    state: {
      data: { start: number; end: number; data: Uint8Array | [] }[];
      isLoading: boolean;
      ranges: { start: number; end: number }[];
    };
    setState: React.Dispatch<React.SetStateAction<MemoryFeatureState["range"]["state"]>>;
  };
};

export const initialMemoryState: MemoryFeatureState = {
  page: {
    state: {
      data: undefined,
      isLoading: false,
      pageNumber: 0,
    },
    setState: () => {},
  },
  range: {
    state: {
      data: [{ start: 0, end: 0, data: [] }],
      isLoading: false,
      ranges: [{ start: 0, end: 0 }],
    },
    setState: () => {},
  },
};

export const useMemoryFeatureState = () => {
  const [pageState, setPageState] = useState<MemoryFeatureState["page"]["state"]>(initialMemoryState.page.state);
  const [rangeState, setRangeState] = useState<MemoryFeatureState["range"]["state"]>(initialMemoryState.range.state);

  return {
    page: {
      state: pageState,
      setState: setPageState,
    },
    range: {
      state: rangeState,
      setState: setRangeState,
    },
  };
};
export const useMemoryFeature = ({ worker }: { worker: Worker }) => {
  const state = useContext(Store).memory;

  return {
    listeners: {
      onMessage: useCallback(
        (e: MessageEvent<TargetOnMessageParams>) => {
          if (e.data.command === Commands.MEMORY_PAGE) {
            if (state.page.state.pageNumber === e.data.payload.pageNumber && state.page.state.isLoading) {
              state.page.setState({
                data: e.data.payload.memoryPage,
                pageNumber: e.data.payload.pageNumber,
                isLoading: false,
              });
            } else if (state.range.state.isLoading) {
              const { start, end } = state.range.state.ranges[0];
              state.range.setState({
                data: [...state.range.state.data, { start, end, data: e.data.payload.memoryPage }],
                isLoading: false,
                ranges: [{ start, end }],
              });
            }
          }
        },
        [state.page, state.range],
      ),
    },
    actions: {
      changePage: (pageNumber: 0) => {
        state.page.setState({ ...state.page.state, isLoading: true });
        worker.postMessage({ command: Commands.MEMORY_PAGE, payload: { pageNumber } });
      },
      changeRange: (pageNumber: 0) => {
        state.range.setState({ ...state.range.state, isLoading: true });
        worker.postMessage({ command: Commands.MEMORY_PAGE, payload: { pageNumber } });
      },
    },
    state: {
      page: state.page.state,
      range: state.range.state,
    },
  };
};
