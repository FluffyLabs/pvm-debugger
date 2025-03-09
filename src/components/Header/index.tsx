import { Header as FluffyHeader } from "@/packages/ui-kit/Header";
import { DebuggerSettings } from "../DebuggerSettings";
import { PvmSelect } from "../PvmSelect";
import { NumeralSystemSwitch } from "../NumeralSystemSwitch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { EllipsisVertical } from "lucide-react";
import { DropdownMenuItem, DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { useState } from "react";

const EndSlot = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="text-white flex w-full justify-end">
      <NumeralSystemSwitch className="hidden md:flex ml-7 mr-4" />

      <div className="w-full md:max-w-[350px] flex items-center ml-3">
        <PvmSelect />
      </div>

      <div className="mx-7 max-sm:hidden">
        <DebuggerSettings open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>

      <div className="sm:hidden">
        <MobileMenu open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </div>
  );
};

const MobileMenu = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Function to handle opening the dialog and closing the dropdown
  const handleOpenDialog = () => {
    setDropdownOpen(false); // Close the dropdown first
    setTimeout(() => {
      onOpenChange(true); // Then open the dialog after a small delay
    }, 10);
  };
  return (
    <>
      <DebuggerSettings noTrigger open={open} onOpenChange={onOpenChange}></DebuggerSettings>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-brand">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[315px] bg-[#242424] border-none text-white">
          <DropdownMenuItem
            className=" p-3 flex items-center"
            onSelect={(e) => {
              e.preventDefault(); // Prevent the dropdown from closing automatically
              handleOpenDialog(); // Handle opening the dialog
            }}
          >
            <div className="mt-2">
              <span className="mr-2 text-white">Settings</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-600" />
          <DropdownMenuLabel className="px-3 pt-3">Github</DropdownMenuLabel>

          <DropdownMenuItem
            onSelect={() => window.open("https://github.com/your-repo/issues/new", "_blank")}
            className="pl-3 pt-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none pb-1 pt-2">Report an issue or suggestion</span>
              <span className="text-xs text-muted-foreground">Go to the issue creation page</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => window.open("https://github.com/your-repo", "_blank")}
            className="pl-3 pt-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none pb-1 pt-3">Star us on Github to show support</span>
              <span className="text-xs text-muted-foreground">Visit our Github</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => window.open("https://github.com/your-repo/fork", "_blank")}
            className="pl-3 py-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none pb-1 pt-3">Fork & contribute</span>
              <span className="text-xs text-muted-foreground pt-1">Opens the fork creation page</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
export const Header = () => {
  return <FluffyHeader endSlot={<EndSlot />} />;
};
