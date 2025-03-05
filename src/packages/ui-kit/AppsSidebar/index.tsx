import { ToggleDarkModeIcon } from "../DarkMode/ToggleDarkMode";
import { Brick } from "./icons/Brick";
import { Stack } from "./icons/Stack";
import { Debugger } from "./icons/Debugger";
import { Computers } from "./icons/Computers";
import { Chip } from "./icons/Chip";
import { Logo } from "./icons/Logo";

export const AppsSidebar = () => {
  return (
    <div className="flex flex-col gap-5 bg-sidebar max-sm:hidden">
      <div className="grow flex flex-col items-center justify-center  px-3">
        <a href="https://graypaper.fluffylabs.dev" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Stack />
          </div>
        </a>
        <a
          href="#"
          className="p-2 border border-[#639894] dark:border-brand rounded-full my-3 bg-[#F2FFFE] dark:bg-sidebar"
        >
          <div className="block h-[30px] w-[30px] max-w-none text-[#639894] dark:text-brand">
            <Debugger />
          </div>
        </a>
        <a href="https://trie.fluffylabs.dev" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Computers />
          </div>
        </a>
        <a href="#" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Brick />
          </div>
        </a>
        <a href="https://papi.fluffylabs.dev" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Chip />
          </div>
        </a>
        <a href="https://fluffylabs.dev" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Logo />
          </div>
        </a>
      </div>

      <div className="py-4 border-t flex justify-center">
        <ToggleDarkModeIcon />
      </div>
    </div>
  );
};
