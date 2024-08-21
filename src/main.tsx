import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./globals.css";
import { NumeralSystemProvider } from "@/context/NumeralSystemProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NumeralSystemProvider>
      <App />
    </NumeralSystemProvider>
  </React.StrictMode>,
);
