import { createContext, ReactNode, useState } from "react";
import { NumeralSystem } from "./NumeralSystem";

export const NumeralSystemContext = createContext({
  numeralSystem: NumeralSystem.DECIMAL,
  setNumeralSystem: (numeralSystem: NumeralSystem) => {
    console.log(numeralSystem);
  },
});

export const NumeralSystemProvider = ({ children }: { children: ReactNode }) => {
  const [numeralSystem, setNumeralSystem] = useState(NumeralSystem.DECIMAL);

  return (
    <NumeralSystemContext.Provider value={{ numeralSystem, setNumeralSystem }}>
      {children}
    </NumeralSystemContext.Provider>
  );
};
