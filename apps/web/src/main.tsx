import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import { setColorMode } from "@fluffylabs/shared-ui";
import App from "./App";
import "./styles/global.css";

// Enable dark mode by default
setColorMode(true);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
