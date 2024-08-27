import Logo from "@/assets/logo.png";
import GithubLogo from "@/assets/github-mark-white.svg";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";

export const Header = () => {
  return (
    <div className="bg-[#55B3F3] w-full flex flex-row items-center justify-between p-1 h-16 overflow-hidden">
      <img src={Logo} alt="FluffyLabs logo" className="w-[70px] ml-3" />
      <div className="mr-3 text-white flex flex-row items-center justify-center gap-5">
        <pre>PVM debugger</pre>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <a target="_blank" href="https://github.com/fluffylabs/typeberry-toolkit" rel="noreferrer">
                <img src={GithubLogo} alt="GitHub logo" width={32} />
              </a>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Report an issue or fork on Github</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
