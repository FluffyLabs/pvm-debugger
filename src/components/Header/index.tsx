import { Header as FluffyHeader } from "@/packages/ui-kit/Header";
import { DebuggerSettings } from "../DebuggerSettings";
import { PvmSelect } from "../PvmSelect";
import { NumeralSystemSwitch } from "../NumeralSystemSwitch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { EllipsisVertical } from "lucide-react";
import { DropdownMenuItem, DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";

const EndSlot = () => {
  return (
    <div className="text-white flex w-full justify-end">
      <NumeralSystemSwitch className="hidden md:flex ml-7 mr-4" />

      <div className="w-full md:max-w-[350px] ml-3">
        <PvmSelect />
      </div>

      <div className="mx-7 max-sm:hidden">
        <DebuggerSettings />
      </div>

      <div className="sm:hidden">
        <MobileMenu />
      </div>
    </div>
  );
};

const MobileMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-brand">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-[#242424] border-none text-white">
        <DropdownMenuItem className=" p-3 flex items-center">
          <DebuggerSettings withLabel />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-600" />
        <DropdownMenuLabel className="px-3 pt-3">Github</DropdownMenuLabel>

        <DropdownMenuItem
          onSelect={() => window.open("https://github.com/your-repo/issues/new", "_blank")}
          className="pl-3 pt-3"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Report an issue or suggestion</span>
            <span className="text-xs text-muted-foreground">Go to the issue creation page</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => window.open("https://github.com/your-repo", "_blank")} className="pl-3 pt-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Star us on Github to show support</span>
            <span className="text-xs text-muted-foreground">Visit our Github</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => window.open("https://github.com/your-repo/fork", "_blank")}
          className="pl-3 py-3"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Fork & contribute</span>
            <span className="text-xs text-muted-foreground pt-1">Opens the fork creation page</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export const Header = () => {
  return <FluffyHeader endSlot={<EndSlot />} />;
};
