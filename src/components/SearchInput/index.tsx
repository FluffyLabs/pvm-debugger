import { SearchIcon } from "lucide-react";
import React from "react";
import { INPUT_STYLES, InputProps } from "../ui/input";
import { cn } from "@/lib/utils";

export type SearchProps = React.InputHTMLAttributes<HTMLInputElement & { inputClassName?: string }>;

const Search = React.forwardRef<HTMLInputElement, InputProps & { inputClassName?: string }>(
  ({ className, inputClassName, ...props }, ref) => {
    return (
      <div
        className={cn(
          INPUT_STYLES.replace("focus-visible:ring-ring", "").replace("rounded-md", ""),
          "flex items-center",
          className,
        )}
      >
        <SearchIcon className="h-[16px] w-[16px]" />
        <input
          className={cn(
            "w-full p-2 placeholder:text-muted-foreground bg-transparent focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-5 font-poppins text-xs",
            inputClassName,
          )}
          {...props}
          ref={ref}
        />
      </div>
    );
  },
);

Search.displayName = "Search";

export { Search };
