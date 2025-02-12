import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";
import workersReducer from "./workers/workersSlice";
import debuggerReducer, { debuggerSliceListenerMiddleware, DebuggerState } from "./debugger/debuggerSlice";

const persistConfig = {
  key: "debugger",
  storage,
  whitelist: ["pvmOptions"],
};

export const store = configureStore({
  reducer: {
    debugger: persistReducer<DebuggerState>(persistConfig, debuggerReducer),
    workers: workersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).prepend(debuggerSliceListenerMiddleware.middleware),
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
