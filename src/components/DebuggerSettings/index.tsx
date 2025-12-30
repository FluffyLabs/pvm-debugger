import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { DebuggerSettingsContent } from "./Content";
import { useAppSelector } from "@/store/hooks";

export const DebuggerSettings = ({
  noTrigger,
  open,
  onOpenChange,
}: {
  noTrigger?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const spiProgram = useAppSelector((state) => state.debugger.spiProgram);
  const hasSpiProgram = spiProgram !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {noTrigger ? null : (
        <DialogTrigger className="cursor-pointer relative" data-testid="settings-button">
          <Settings height="34px" width="20px" className="text-[#858585]" />
          {hasSpiProgram && (
            <span data-testid="spi-indicator" className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
          )}
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
