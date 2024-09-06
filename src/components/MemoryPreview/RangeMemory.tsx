import { useContext, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Store } from "@/AppProviders";
import { X } from "lucide-react";
import { MemoryTable } from "./PageMemory";

export const RangeMemory = (props: { onRangeChange: (start: number, end: number) => void }) => {
  const memory = useContext(Store).memory;

  const [start, setStart] = useState<number>();
  const [end, setEnd] = useState<number>();

  const onSubmit = () => {
    if (start === undefined || end === undefined) {
      return;
    }
    props.onRangeChange(start, end);
  };

  console.log("memory", memory.range.state);
  return (
    <div>
      <div className="mb-3">
        {memory.range.state.data.map((range, i) => (
          <div className="my-7">
            <div className="flex justify-between items-center">
              <span>Range&nbsp;#${i + 1}</span>
              <Input className="rounded-xl w-[90px] h-[24px]" value={range.start} />
              <Input className="rounded-xl w-[90px] h-[24px]" value={range.end} />
              <X />
            </div>
            <div>
              <MemoryTable data={range.data} addressStart={range.start} />
            </div>
          </div>
        ))}
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Add</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add new range</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start" className="text-right">
                Start
              </Label>
              <Input
                id="start"
                type="number"
                className="col-span-3"
                value={start}
                onChange={(e) => setStart(+e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end" className="text-right">
                End
              </Label>
              <Input
                id="end"
                type="number"
                className="col-span-3"
                value={end}
                onChange={(e) => setEnd(+e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit" onClick={onSubmit}>
                Save changes
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
