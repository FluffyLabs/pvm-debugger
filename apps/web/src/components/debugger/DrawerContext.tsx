import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export type DrawerTab = "settings" | "ecalli_trace" | "host_call" | "logs";

interface DrawerState {
  activeTab: DrawerTab | null;
  height: number;
  setActiveTab: (tab: DrawerTab | null) => void;
  setHeight: (height: number) => void;
  openToTab: (tab: DrawerTab) => void;
}

const DEFAULT_HEIGHT = 200;

const DrawerContext = createContext<DrawerState | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabRaw] = useState<DrawerTab | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  const setActiveTab = useCallback((tab: DrawerTab | null) => {
    setActiveTabRaw(tab);
  }, []);

  const openToTab = useCallback((tab: DrawerTab) => {
    setActiveTabRaw(tab);
    setHeight((h) => (h < DEFAULT_HEIGHT ? DEFAULT_HEIGHT : h));
  }, []);

  return (
    <DrawerContext.Provider
      value={{ activeTab, height, setActiveTab, setHeight, openToTab }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerState {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("useDrawer must be used inside <DrawerProvider>");
  }
  return ctx;
}
