import { Entrypoint, RefineParams, AccumulateParams, IsAuthorizedParams } from "./EntrypointSelector";

export type SpiConfig = {
  entrypoint: Entrypoint;
  refineParams: RefineParams;
  accumulateParams: AccumulateParams;
  isAuthorizedParams: IsAuthorizedParams;
  isManualMode: boolean;
  manualPc: string;
  encodedArgs: string;
};

const SPI_CONFIG_KEY = "spi-config";

// Default values for SPI configuration
export const DEFAULT_SPI_CONFIG: SpiConfig = {
  entrypoint: "accumulate",
  refineParams: {
    core: "0",
    index: "0",
    id: "0",
    payload: "",
    package: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  accumulateParams: {
    slot: "42",
    id: "0",
    results: "0",
  },
  isAuthorizedParams: {
    core: "0",
  },
  isManualMode: false,
  manualPc: "0",
  encodedArgs: "",
};

// Load SPI config from localStorage
export const loadSpiConfig = (): SpiConfig => {
  try {
    const item = localStorage.getItem(SPI_CONFIG_KEY);
    if (!item) return DEFAULT_SPI_CONFIG;

    const saved = JSON.parse(item);
    // Merge with defaults to handle missing fields from older versions
    return { ...DEFAULT_SPI_CONFIG, ...saved };
  } catch {
    return DEFAULT_SPI_CONFIG;
  }
};

// Save SPI config to localStorage
export const saveSpiConfig = (config: SpiConfig): void => {
  try {
    localStorage.setItem(SPI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};
