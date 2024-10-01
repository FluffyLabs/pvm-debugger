import { Store } from "@/AppProviders";
import { Commands } from "@/packages/web-worker/worker";
import { useContext, useState } from "react";

export type MemoryFeatureState = {
  meta: {
    state: {
      pageSize: number | undefined;
      isPageSizeLoading: boolean;
    };
    setState: React.Dispatch<React.SetStateAction<MemoryFeatureState["meta"]["state"]>>;
  };
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
      data: { start: number; end: number; data: Uint8Array | undefined }[];
      isLoading: boolean;
    };
    setState: React.Dispatch<React.SetStateAction<MemoryFeatureState["range"]["state"]>>;
  };
};

export const initialMemoryState: MemoryFeatureState = {
  meta: {
    state: {
      pageSize: 32,
      isPageSizeLoading: false,
    },
    setState: () => {},
  },
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
      data: [],
      isLoading: false,
    },
    setState: () => {},
  },
};

export const useMemoryFeatureState = () => {
  const [pageState, setPageState] = useState<MemoryFeatureState["page"]["state"]>(initialMemoryState.page.state);
  const [rangeState, setRangeState] = useState<MemoryFeatureState["range"]["state"]>(initialMemoryState.range.state);

  return {
    meta: initialMemoryState.meta,
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
export const useMemoryFeature = () => {
  const { memory, worker } = useContext(Store);
  console.log("memory", memory);
  return {
    // listeners: {
    //   onMessage: useCallback(
    //     (e: MessageEvent<TargetOnMessageParams>) => {
    //       if (e.data.command === Commands.MEMORY_PAGE) {
    //         if (memory.page.state.pageNumber === e.data.payload.pageNumber && memory.page.state.isLoading) {
    //           memory.page.setState({
    //             data: e.data.payload.memoryPage,
    //             pageNumber: e.data.payload.pageNumber,
    //             isLoading: false,
    //           });
    //         } else if (memory.range.state.isLoading) {
    //           const { start, end } = memory.range.state.ranges[0];
    //           memory.range.setState({
    //             data: [...memory.range.state.data, { start, end, data: e.data.payload.memoryPage }],
    //             isLoading: false,
    //             ranges: [{ start, end }],
    //           });
    //         }
    //       } else if (e.data.command === Commands.MEMORY_RANGE) {
    //         console.log("MEMORY_RANGE", e.data.payload);
    //         if (memory.range.state.isLoading) {
    //           const { start, end, memoryRange } = e.data.payload;
    //           memory.range.setState({
    //             ...memory.range.state,
    //             data: [
    //               ...memory.range.state.data.map((el) =>
    //                 el.start === start && el.end === end ? { start, end, data: memoryRange } : el,
    //               ),
    //             ],
    //             isLoading: false,
    //           });
    //         }
    //       }
    //     },
    //     [memory.page, memory.range],
    //   ),
    // },
    actions: {
      initSetPageSize: () => {
        memory.meta.setState({ ...memory.meta.state, isPageSizeLoading: true });
        worker.worker.postMessage({ command: Commands.MEMORY_PAGE, payload: { pageNumber: 0 } });
      },
      setPageSize: (pageSize: number) => {
        console.log("set memory page size", pageSize);
        memory.meta.setState({ ...memory.meta.state, isPageSizeLoading: false, pageSize });
      },
      changePage: (pageNumber: number) => {
        memory.page.setState({ ...memory.page.state, isLoading: true });
        worker.worker.postMessage({ command: Commands.MEMORY_PAGE, payload: { pageNumber } });
      },
      changeRange: (start: number, end: number) => {
        memory.range.setState({
          ...memory.range.state,
          data: [...memory.range.state.data, { start, end, data: undefined as Uint8Array | undefined }],
          isLoading: true,
        });

        worker.worker.postMessage({ command: Commands.MEMORY_RANGE, payload: { start, end } });
      },
      removeRange: (index: number) => {
        memory.range.setState({
          ...memory.range.state,
          data: [...memory.range.state.data.filter((_, i) => i !== index)],
          isLoading: true,
        });
      },
    },
    state: {
      page: memory.page.state,
      range: memory.range.state,
    },
  };
};
