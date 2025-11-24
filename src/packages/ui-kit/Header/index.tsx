import Logo from "@/assets/logo.svg";
import Brand from "@/assets/brand.svg";
import ToolName from "@/assets/tool-name.svg";

import { Separator } from "@radix-ui/react-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export const Header = ({ endSlot }: { endSlot?: ReactNode }) => {
  return (
    <div className="bg-[#242424] w-full flex flex-row items-center justify-between py-[18px] text-xs overflow-hidden border-b border-b-secondary-foreground dark:border-b-brand">
      <div className="flex items-center gap-5 sm:w-full">
        <a href="/" className="flex items-center pl-4">
          <img src={Logo} alt="FluffyLabs logo" className="h-[40px] max-w-fit" />
          <img src={Brand} alt="FluffyLabs brand" className="hidden md:inline ml-4 h-[28px]" />
        </a>
        <Separator className="bg-gray-600 w-px h-[40px] sm:h-[50px]" orientation="vertical" />
        <div className="flex max-sm:flex-col-reverse max-sm:hidden items-end md:items-center h-[50px]">
          <img src={ToolName} alt="FluffyLabs brand" className="h-[40px]" />
          <div className="shrink sm:ml-1 sm:mb-4">
            <Environment />
          </div>
        </div>
      </div>
      <div className="flex w-full items-center max-sm:ml-2">
        {endSlot}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outlineBrand"
              className="max-sm:hidden text-brand bg-transparent border-brand focus:bg-[#2D2D2D] hover:bg-[#2D2D2D] hover:text-brand focus-visible:shadow-none  mr-4 px-3 h-[32px]"
            >
              <a
                target="_blank"
                href="https://github.com/fluffylabs/pvm-debugger"
                rel="noreferrer"
                className="flex items-center text-xs"
              >
                Github&nbsp;
                <ChevronDown height={20} />
              </a>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="bg-[#242424] mt-1 p-4 border-none text-white min-w-[315px]">
            <DropdownMenuItem
              onSelect={() => window.open("https://github.com/FluffyLabs/pvm-debugger/issues/new", "_blank")}
              className="pl-3 py-3 flex items-start justify-between hover:bg-[#2D2D2D] focus:bg-[#2D2D2D] focus:text-white"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">Report an issue or suggestion</span>
                <span className="text-xs text-muted-foreground">Go to the issue creation page</span>
              </div>
              <ExternalLink className="text-brand-dark dark:text-brand" size={16} />
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => window.open("https://github.com/FluffyLabs/pvm-debugger", "_blank")}
              className="pl-3 py-3 flex items-start justify-between hover:bg-[#2D2D2D] focus:bg-[#2D2D2D] focus:text-whit"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">Star us on Github to show support</span>
                <span className="text-xs text-muted-foreground">Visit our Github</span>
              </div>
              <ExternalLink className="text-brand-dark dark:text-brand" size={16} />
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => window.open("https://github.com/FluffyLabs/pvm-debugger/fork", "_blank")}
              className="pl-3 py-3 flex items-start justify-between hover:bg-[#2D2D2D] focus:bg-[#2D2D2D] focus:text-whit"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">Fork & contribute</span>
                <span className="text-xs text-muted-foreground pt-1">Opens the fork creation page</span>
              </div>
              <ExternalLink className="text-brand-dark dark:text-brand" size={16} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const Environment = () => {
  const { host } = window.location;
  let env = "PR preview";
  if (host === "pvm.fluffylabs.dev") {
    env = "prod";
  } else if (host === "pvm-debugger.netlify.app") {
    env = "beta";
  }

  env = "beta";

  return (
    <Badge className="px-2 py-[0.5px] sm:py-1 bg-brand text-[10px] max-sm:text-[7px] text-black whitespace-nowrap hover:bg-brand">
      {env}
    </Badge>
  );
};
