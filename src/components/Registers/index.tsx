import { ExpectedState, InitialState } from "@/types/pvm";
import ContentEditable from "react-contenteditable";
import { useContext } from "react";
import { NumeralSystem, NumeralSystemContext } from "@/context/NumeralSystem.tsx";
import { valueToNumeralSystem } from "@/components/Instructions/utils.tsx";

export const Registers = ({
  currentState,
  setCurrentState,
}: {
  currentState: ExpectedState;
  setCurrentState: React.Dispatch<React.SetStateAction<InitialState>>;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className="border-2 rounded-md h-full">
      <div className="p-3">
        <div>
          <div className="font-mono flex flex-col items-start">
            {currentState.regs?.map((_: unknown, regNo: number) => (
              <div key={regNo} className="flex flex-row items-center w-full">
                <p className="flex-[2]">
                  ω<sub>{regNo}</sub>
                </p>
                <ContentEditable
                  className="flex-[3]"
                  onChange={(e) => {
                    const value = e.target?.value;
                    const valueInDecimal =
                      numeralSystem === NumeralSystem.HEXADECIMAL ? `${parseInt(value, 16)}` : value;
                    const regValue =
                      valueInDecimal && !Number.isNaN(parseInt(valueInDecimal)) ? parseInt(valueInDecimal) : "";
                    setCurrentState((prevState: InitialState) => ({
                      ...prevState,
                      regs: prevState.regs?.map((val: number, index: number) =>
                        index === regNo ? regValue : val,
                      ) as InitialState["regs"],
                    }));
                  }}
                  html={valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}
                />
              </div>
            ))}

            <hr className="w-full h-px mx-auto bg-gray-100 my-2" />

            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">PC</p>
              <ContentEditable
                className="flex-[3]"
                onChange={(e) => {
                  const value = e.target?.value;
                  const pcValue = value && !Number.isNaN(parseInt(value)) ? parseInt(value) : "";
                  setCurrentState({ ...currentState, pc: pcValue as number });
                }}
                html={`${currentState.pc}`}
              />
            </div>

            <hr className="w-full h-px mx-auto bg-gray-100 my-2" />

            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">Gas</p>
              <ContentEditable
                className="flex-[3]"
                onChange={(e) => {
                  const value = e.target?.value;
                  const pcValue = value && !Number.isNaN(parseInt(value)) ? parseInt(value) : "";
                  setCurrentState({ ...currentState, gas: pcValue as number });
                }}
                html={`${currentState.gas}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
