import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & { variant?: string }
>(({ className, variant, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      variant === "secondary"
        ? "bg-[#DFDFDF] dark:bg-[#4F4F4F] border-[#DFDFDF] dark:border-[#4F4F4F] text-secondary-foreground"
        : "bg-[#2D2D2D] ",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-3 w-3 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[13px] data-[state=unchecked]:translate-x-[1px]",
        variant === "secondary" ? "bg-foreground dark:bg-[#242424]" : "bg-white",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
