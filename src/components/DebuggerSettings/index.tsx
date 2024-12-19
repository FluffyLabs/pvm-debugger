import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks";
import { useDispatch } from "react-redux";
import { setHasHostCallOpen, setStepsToPerform } from "@/store/debugger/debuggerSlice";
import { Button } from "../ui/button";

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
            <div className="py-4">
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
              <div className="py-4">
                <span className="block text-lg text-black font-bold mb-2">Storage Value</span>

                <span className="mb-3 block">
                  Set storage for read & write host calls. Confirm empty, if you want to process. Storage can be
                  modified by running program.
                </span>

                <div className="flex">
                  <Button onClick={() => dispatch(setHasHostCallOpen(true))}>Set storage</Button>

                  {debuggerState.storage !== null && (
                    <span className="flex items-center ml-3">
                      <CheckCircle color="green" className="mr-2" /> Storage provided
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
