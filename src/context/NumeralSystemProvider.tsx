import { createContext, ReactNode, useState } from "react";
import { NumeralSystem } from "./NumeralSystem";

export const NumeralSystemContext = createContext({
  numeralSystem: NumeralSystem.DECIMAL,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setNumeralSystem: (_: NumeralSystem) => {},
});

export const NumeralSystemProvider = ({ children }: { children: ReactNode }) => {
  const [numeralSystem, setNumeralSystem] = useState(NumeralSystem.DECIMAL);

  return (
    <NumeralSystemContext.Provider value={{ numeralSystem, setNumeralSystem }}>
      {children}
    </NumeralSystemContext.Provider>
  );
};
