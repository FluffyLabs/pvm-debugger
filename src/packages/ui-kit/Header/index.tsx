import Logo from "@/assets/logo.svg";
import Brand from "@/assets/brand.svg";
import { Separator } from "@radix-ui/react-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink } from "lucide-react";

export const Header = ({ endSlot }: { endSlot?: JSX.Element }) => {
  return (
    <div className="bg-[#242424] w-full flex flex-row items-center justify-between py-4 h- overflow-hidden border-b-[#242424] dark:border-b-brand border-b">
      <div className="flex items-center gap-5 w-full">
        <div className="flex items-center pl-4">
          <img src={Logo} alt="FluffyLabs logo" className="w-[35px] h-full max-w-fit" />
          <img src={Brand} alt="FluffyLabs brand" className="hidden md:inline ml-4 h-[28px]" />
        </div>
        <Separator className="bg-gray-600 w-[1px] h-[50px]" orientation="vertical" />
        <div className="flex max-sm:flex-col-reverse items-end md:items-center">
          <pre className="text-brand font-bold text-sm md:text-xl">PVM debugger</pre>
          <div className="shrink ml-3">
            <Environment />
          </div>
        </div>
      </div>
      <div className="flex w-full">
        {endSlot}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-brand bg-transparent border-brand max-sm:hidden mr-4">
              <a target="_blank" href="https://github.com/fluffylabs/pvm-debugger" rel="noreferrer">
                Github
              </a>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="bg-[#242424] mt-1 p-2 border-none text-white">
            <DropdownMenuItem
              onSelect={() => window.open("https://github.com/your-repo/issues/new", "_blank")}
              className="pl-3 py-3 flex items-start justify-between"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">Report an issue or suggestion</span>
                <span className="text-xs text-muted-foreground">Go to the issue creation page</span>
              </div>
              <ExternalLink className="text-brand-dark dark:text-brand" size={16} />
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => window.open("https://github.com/your-repo", "_blank")}
              className="pl-3 py-3 flex items-start justify-between"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium mb-1">Star us on Github to show support</span>
                <span className="text-xs text-muted-foreground">Visit our Github</span>
              </div>
              <ExternalLink className="text-brand-dark dark:text-brand" size={16} />
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => window.open("https://github.com/your-repo/fork", "_blank")}
              className="pl-3 py-3 flex items-start justify-between"
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

  return <Badge className="bg-brand max-sm:text-[9px] text-black whitespace-nowrap">{env}</Badge>;
};
