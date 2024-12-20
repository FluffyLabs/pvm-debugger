import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./globals.css";
import { NumeralSystemProvider } from "@/context/NumeralSystemProvider";
import { Provider } from "react-redux";
import { store } from "./store";
import { HashRouter } from "react-router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // TODO: strict mode is disabled because of the App useEffect for init being called twice
  // <React.StrictMode>
  <Provider store={store}>
    <NumeralSystemProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </NumeralSystemProvider>
  </Provider>,
  // </React.StrictMode>,
);
