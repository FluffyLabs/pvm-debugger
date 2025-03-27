import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./globals.css";
import { NumeralSystemProvider } from "@/context/NumeralSystemProvider";
import { Provider } from "react-redux";
import { persistor, store } from "./store";
import { HashRouter } from "react-router";
import { PersistGate } from "redux-persist/integration/react";
import { isDarkMode, setColorMode } from "./packages/ui-kit/DarkMode/utils.ts";
import { TooltipProvider } from "@radix-ui/react-tooltip";

setColorMode(isDarkMode());

ReactDOM.createRoot(document.getElementById("root")!).render(
  // TODO: strict mode is disabled because of the App useEffect for init being called twice
  // <React.StrictMode>
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <NumeralSystemProvider>
        <TooltipProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </TooltipProvider>
      </NumeralSystemProvider>
    </PersistGate>
  </Provider>,
  // </React.StrictMode>,
);
