import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { InitialState } from "@/types/pvm";

export const InitialParams = ({ initialState, setInitialState }: { initialState: InitialState; setInitialState: React.Dispatch<React.SetStateAction<InitialState>> }) => {
  return (
    <div className="border-2 border-dashed border-sky-500 rounded-md">
      <div className="p-3 grid grid-cols-2">
        <div>
          <Label htmlFor="registers">Initial registers:</Label>

          <div className="flex flex-col items-start">
            {initialState.regs?.map((_, regNo) => (
              <div className="flex items-center">
                <Label className="inline-flex w-20" htmlFor={`reg-${regNo}`}>
                  <p>
                    ω<sub>{regNo}</sub>:
                  </p>
                </Label>
                <Input
                  className="inline-flex w-14"
                  id={`reg-${regNo}`}
                  type="number"
                  value={initialState.regs?.[regNo]}
                  onChange={(e) => {
                    setInitialState((prevState: InitialState) => ({
                      ...prevState,
                      regs: prevState.regs?.map((val: number, index: number) => (index === regNo ? parseInt(e.target.value) : val)) as InitialState["regs"],
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-1.5 flex flex-col items-start">
          <div className="flex flex-col items-start">
            <Label className="mb-2" htmlFor="initial-pc">
              Initial PC:
            </Label>
            <Input className="mb-5 w-32" id="initial-pc" type="number" value={initialState.pc} onChange={(e) => setInitialState({ ...initialState, pc: parseInt(e.target.value) })} />
          </div>
          <div className="flex flex-col items-start">
            <Label className="mb-2" htmlFor="initial-gas">
              Initial GAS:
            </Label>
            <Input className="w-32" id="initial-gas" type="number" value={initialState.gas} onChange={(e) => setInitialState({ ...initialState, gas: parseInt(e.target.value) })} />
          </div>
        </div>
      </div>

      {/*<div className="grid grid-cols-3 gap-1.5">*/}
      {/*  <div className="p-3 col-span-3 rounded-md">*/}
      {/*    */}
      {/*  </div>*/}
      {/*</div>*/}
    </div>
  );
};
