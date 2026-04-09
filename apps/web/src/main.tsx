import { setColorMode } from "@fluffylabs/shared-ui";
import { TooltipProvider } from "@fluffylabs/shared-ui/ui/tooltip";
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import App from "./App";
import "./styles/global.css";

// React 19 dev mode calls JSON.stringify on props for render logging.
// BigInt (used for registers/gas) is not serializable, so we add toJSON.
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Enable dark mode by default
setColorMode(true);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <HashRouter>
        <App />
      </HashRouter>
    </TooltipProvider>
  </React.StrictMode>,
);
