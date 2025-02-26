import { Link } from "react-router";
import Brick from "@/assets/sidebar/brick.svg";
import Chip from "@/assets/sidebar/chip.svg";
import Debugger from "@/assets/sidebar/debugger.svg";
import Computers from "@/assets/sidebar/computers.svg";
import Stack from "@/assets/sidebar/stack.svg";
import Logo from "@/assets/sidebar/logo.svg";

import { Moon } from "lucide-react";

export const AppsSidebar = () => {
  return (
    <div className="flex flex-col gap-5 bg-secondary max-sm:hidden">
      <div className="grow flex flex-col items-center justify-center  px-3">
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <img src={Stack} className="block h-[30px] w-[30px] max-w-none" />
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <img src={Debugger} className="block h-[30px] w-[30px] max-w-none" />
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <img src={Computers} className="block h-[30px] w-[30px] max-w-none" />
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <img src={Brick} className="block h-[30px] w-[30px] max-w-none" />
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <img src={Chip} className="block h-[30px] w-[30px] max-w-none" />
        </Link>
        <Link to="/apps/1" className="p-2 border rounded-full my-3">
          <img src={Logo} className="block h-[30px] w-[30px] max-w-none" />
        </Link>
      </div>

      <div className="py-4 border-t flex justify-center">
        <div className="p-2 border rounded">
          <Moon width="30px" className="text-title-foreground" />
        </div>
      </div>
    </div>
  );
};
