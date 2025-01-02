import Logo from "@/assets/logo.png";
import GithubLogo from "@/assets/github-mark-white.svg";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";

export const Header = () => {
  return (
    <div className="bg-black w-full flex flex-row items-center justify-between p-1 h-16 overflow-hidden">
      <div className="flex items-center gap-5">
        <img src={Logo} alt="FluffyLabs logo" className="w-[90px] ml-3" />
        <pre className="text-brand">PVM debugger</pre>
        <Environment />
      </div>
      <div className="mr-3 text-white flex flex-row items-center justify-center gap-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <a target="_blank" href="https://github.com/fluffylabs/pvm-debugger" rel="noreferrer">
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

const Environment = () => {
  const { host } = window.location;
  let env = "PR preview";
  if (host === "pvm.fluffylabs.dev") {
    env = "prod";
  } else if (host === "pvm-debugger.netlify.app") {
    env = "beta";
  }

  return <pre className="text-white text-xs">{env}</pre>;
};
