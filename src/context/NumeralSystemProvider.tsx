import { ReactNode, useState } from "react";
import { NumeralSystem } from "./NumeralSystem";
import { NumeralSystemContext } from "./NumeralSystemContext";

export const NumeralSystemProvider = ({ children }: { children: ReactNode }) => {
  const [numeralSystem, setNumeralSystem] = useState(NumeralSystem.HEXADECIMAL);

  return (
    <NumeralSystemContext.Provider value={{ numeralSystem, setNumeralSystem }}>
      {children}
    </NumeralSystemContext.Provider>
  );
};
