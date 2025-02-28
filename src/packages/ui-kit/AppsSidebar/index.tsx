import { Link } from "react-router";
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
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Stack />
          </div>
        </Link>
        <Link
          to="/apps/1"
          className="p-2 border border-brand-dark dark:border-brand rounded-full my-3 bg-brand-light dark:bg-sidebar"
        >
          <div className="block h-[30px] w-[30px] max-w-none text-brand-dark dark:text-brand">
            <Debugger />
          </div>
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Computers />
          </div>
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Brick />
          </div>
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Chip />
          </div>
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <div className="block h-[30px] w-[30px] max-w-none text-sidebar-foreground">
            <Logo />
          </div>
        </Link>
      </div>

      <div className="py-4 border-t flex justify-center">
        <ToggleDarkModeIcon />
      </div>
    </div>
  );
};
