import { Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import { TriangleAlertIcon } from "lucide-react";
import classNames from "classnames";

export const ErrorWarningTooltip = (props: {
  msg: string;
  classNames?: string;
  side?: "bottom" | "top" | "right" | "left" | undefined;
  variant: "dark" | "light";
}) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <TriangleAlertIcon className={classNames("text-red-500", props.classNames)} />
      </TooltipTrigger>
      <TooltipContent
        side={props.side || "bottom"}
        className={`border-[1px] rounded-md ${props.variant === "dark" ? "bg-[#242424]" : "bg-[#fff]"} p-2 mt-2 text-red-500 z-10`}
      >
        <p>{props.msg}</p>
      </TooltipContent>
    </Tooltip>
  );
};
