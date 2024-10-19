import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import workersReducer from "./workers/workersSlice";
import debuggerReducer from "./debugger/debuggerSlice";

export const store = configureStore({
  reducer: {
    debugger: debuggerReducer,
    workers: workersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
