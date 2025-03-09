import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useIsDarkMode, useToggleColorMode } from "./utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export const ToggleDarkMode = () => {
  const isDark = useIsDarkMode();
  const toggleColorMode = useToggleColorMode();
  const onCLick = (val: string) => {
    if ((isDark && val === "light") || (!isDark && val === "dark")) {
      toggleColorMode();
    }
  };

  return (
    <Select onValueChange={onCLick} defaultValue={isDark ? "dark" : "light"}>
      <SelectTrigger
        onClick={(e) => {
          e.currentTarget.blur();
          document.body.focus();

          e.stopPropagation();
          // document.querySelector('[role="dialog"]')?.removeAttribute("aria-hidden");
        }}
        className="w-[106px]"
      >
        <SelectValue
          onClick={(e) => {
            e.currentTarget.blur();
            document.body.focus();
          }}
        />
      </SelectTrigger>
      <SelectContent
        onClick={(e) => {
          e.currentTarget.blur();
          document.body.focus();
          e.stopPropagation();
        }}
      >
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  );
};

export const ToggleDarkModeIcon = () => {
  const isDark = useIsDarkMode();
  const toggleColorMode = useToggleColorMode();
  const onCLick = toggleColorMode;

  return (
    <Button onClick={onCLick} className="text-title-foreground p-2 border rounded" variant="ghost">
      {isDark ? <Sun width="30px" /> : <Moon width="30px" />}
    </Button>
  );
};
