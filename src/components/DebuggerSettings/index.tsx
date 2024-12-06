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
        <div className="opacity-60 mt-2">
          <Settings />
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="text-xl">Debugger Settings</span>
          </DialogTitle>
          <DialogDescription asChild>
            <p className="py-4 ">
              <span className="block text-lg text-black font-bold mb-2">Number of batched steps</span>
              <span className="mb-3 block">
                To speed up execution PVMs can run multiple steps internally after clicking "Run". This may lead to
                inaccurate stops in case the execution diverges between them.
              </span>
              <Input
                type="number"
                step={1}
                min={1}
                max={1000}
                placeholder="Batched steps"
                onChange={(ev) => {
                  dispatch(setStepsToPerform(parseInt(ev.target.value)));
                }}
                value={debuggerState.stepsToPerform}
              />
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
