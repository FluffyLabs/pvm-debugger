import { ExpectedState, InitialState } from "@/types/pvm";
import ContentEditable from "react-contenteditable";

export const Registers = ({ currentState, setCurrentState }: { currentState: ExpectedState; setCurrentState: React.Dispatch<React.SetStateAction<InitialState>> }) => {
  return (
    <div className="border-2 rounded-md h-full">
      <div className="p-3">
        <div>
          <div className="font-mono flex flex-col items-start">
            {currentState.regs?.map((_: unknown, regNo: number) => (
              <div className="flex flex-row items-center w-full">
                <p className="flex-[2]">
                  ω<sub>{regNo}</sub>
                </p>
                <ContentEditable
                  className="flex-[3]"
                  onChange={(e) => {
                    const value = e.target?.value;
                    const regValue = value && !Number.isNaN(parseInt(value)) ? parseInt(value) : "";
                    setCurrentState((prevState: InitialState) => ({
                      ...prevState,
                      regs: prevState.regs?.map((val: number, index: number) => (index === regNo ? regValue : val)) as InitialState["regs"],
                    }));
                  }}
                  html={`${currentState.regs?.[regNo]}`}
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
