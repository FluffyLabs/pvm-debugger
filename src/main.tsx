import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./globals.css";
import { NumeralSystemProvider } from "@/context/NumeralSystemProvider";
import { Provider } from "react-redux";
import { store } from "./store";

// document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);

ReactDOM.createRoot(document.getElementById("root")!).render(
  // TODO: strict mode is disabled because of the App useEffect for init being called twice
  // <React.StrictMode>
  <Provider store={store}>
    <NumeralSystemProvider>
      <App />
    </NumeralSystemProvider>
  </Provider>,
  // </React.StrictMode>,
);
