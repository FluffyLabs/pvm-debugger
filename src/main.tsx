import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./globals.css";
import { NumeralSystemProvider } from "@/context/NumeralSystemProvider";
import { Provider } from "react-redux";
import { store } from "./store";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <NumeralSystemProvider>
        <App />
      </NumeralSystemProvider>
    </Provider>
  </React.StrictMode>,
);
