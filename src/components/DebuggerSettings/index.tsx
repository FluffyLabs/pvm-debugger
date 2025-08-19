import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { DebuggerSettingsContent } from "./Content";

export const DebuggerSettings = ({
  noTrigger,
  open,
  onOpenChange,
}: {
  noTrigger?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
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
        className="p-0 pb-4  h-full sm:h-[700px] flex flex-col md:min-w-[680px] max-h-lvh"
      >
        <DebuggerSettingsContent />
      </DialogContent>
    </Dialog>
  );
};
