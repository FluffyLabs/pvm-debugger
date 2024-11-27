import { createContext } from "react";
import { NumeralSystem } from "./NumeralSystem";

export const NumeralSystemContext = createContext({
  numeralSystem: NumeralSystem.DECIMAL,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setNumeralSystem: (_: NumeralSystem) => {},
});
