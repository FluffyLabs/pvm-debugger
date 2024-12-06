import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks";
import { useDispatch } from "react-redux";
import { setStepsToPerform } from "@/store/debugger/debuggerSlice";

export const DebuggerSettings = () => {
  const debuggerState = useAppSelector((state) => state.debugger);
  const dispatch = useDispatch();

  return (
    <Dialog>
      <DialogTrigger>
        <Settings />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="text-xl">Debugger Settings</span>
          </DialogTitle>
          <DialogDescription>
            <div className="my-5 text-black">
              <span className="block text-lg font-bold mb-2">Number of instructions per step</span>
              <span className="mb-3 block">Choose how many instructions you want to run per each debugger step</span>
              <Input
                type="number"
                step={1}
                placeholder="Number of steps"
                onChange={(ev) => {
                  dispatch(setStepsToPerform(parseInt(ev.target.value)));
                }}
                value={debuggerState.stepsToPerform}
              />
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
