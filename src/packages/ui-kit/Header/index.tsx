import Logo from "@/assets/logo.svg";
import { Separator } from "@radix-ui/react-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Header = ({ endSlot }: { endSlot?: JSX.Element }) => {
  return (
    <div className="bg-[#242424] w-full flex flex-row items-center justify-between p-4 h- overflow-hidden">
      <div className="flex items-center gap-5">
        <img src={Logo} alt="FluffyLabs logo" className="h-[59px]" />
        <Separator className="bg-gray-600 w-[1px] h-[50px]" orientation="vertical" />
        <pre className="text-brand font-bold text-xl">PVM debugger</pre>
        <Environment />
      </div>
      <div className="flex">
        {endSlot}
        <Button variant="outline" className="text-brand bg-transparent border-brand">
          <a target="_blank" href="https://github.com/fluffylabs/pvm-debugger" rel="noreferrer">
            Gtihub
          </a>
        </Button>
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

  return <Badge className="bg-brand text-black">{env}</Badge>;
};
