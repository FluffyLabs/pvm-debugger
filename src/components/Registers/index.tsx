import { InitialState } from "@/types/pvm";
import ContentEditable from "react-contenteditable";

export const Registers = ({ initialState, setInitialState }: { initialState: InitialState; setInitialState: React.Dispatch<React.SetStateAction<InitialState>> }) => {
  return (
    <div className="border-2 rounded-md">
      <div className="p-3">
        <div>
          <div className="font-mono flex flex-col items-start">
            {initialState.regs?.map((_, regNo) => (
              <div className="flex flex-row items-center w-full">
                <p className="flex-[2]">
                  ω<sub>{regNo}</sub>
                </p>
                <ContentEditable
                  className="flex-[3]"
                  onChange={(e) => {
                    const value = e.target?.value;
                    const regValue = value && !Number.isNaN(parseInt(value)) ? parseInt(value) : "";
                    setInitialState((prevState: InitialState) => ({
                      ...prevState,
                      regs: prevState.regs?.map((val: number, index: number) => (index === regNo ? regValue : val)) as InitialState["regs"],
                    }));
                  }}
                  html={`${initialState.regs?.[regNo]}`}
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
                  setInitialState({ ...initialState, pc: pcValue as number });
                }}
                html={`${initialState.pc}`}
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
                  setInitialState({ ...initialState, gas: pcValue as number });
                }}
                html={`${initialState.gas}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
