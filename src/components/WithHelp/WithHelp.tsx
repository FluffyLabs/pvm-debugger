import { ReactNode } from "react";
import { Popover, PopoverContent } from "../ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { InfoIcon } from "lucide-react";

export function WithHelp({ help, children }: { help: string; children: ReactNode }) {
  return (
    <>
      {children}{" "}
      <Popover>
        <PopoverTrigger
          className="inline-flex h-5 p-0.5 align-bottom cursor-pointer hover:bg-brand/20 rounded-xl"
          tabIndex={1}
        >
          <InfoIcon className="inline-block text-brand-dark dark:text-brand" height="100%" />
        </PopoverTrigger>
        <PopoverContent className="max-w-[300px]">
          <p className="text-justify text-xs">{help}</p>
        </PopoverContent>
      </Popover>
    </>
  );
}
