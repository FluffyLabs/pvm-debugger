import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useState } from "react";
import { DebuggerSettingsContent } from "./Content";
import { HostCallsContent } from "../HostCalls/HostCallsContent";

export const DebuggerSettings = ({
  noTrigger,
  open,
  onOpenChange,
}: {
  noTrigger?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [isStorageSettings, setIsStorageSettings] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {noTrigger ? null : (
        <DialogTrigger>
          <Settings height="34px" width="20px" className="text-[#858585]" />
        </DialogTrigger>
      )}

      <DialogContent
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking inside the dialog
          if (e.target instanceof HTMLElement && e.target.closest('[role="dialog"]')) {
            e.preventDefault();
          }
        }}
        className="p-0 pb-4  h-full sm:h-[700px] flex flex-col md:min-w-[680px]"
      >
        {isStorageSettings ? (
          <HostCallsContent onSetStorage={() => setIsStorageSettings(false)} />
        ) : (
          <DebuggerSettingsContent openStorage={() => setIsStorageSettings(true)} />
        )}
      </DialogContent>
    </Dialog>
  );
};
