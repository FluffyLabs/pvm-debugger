import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useIsDarkMode, useToggleColorMode } from "./utils";

export const ToggleDarkMode = () => {
  const isDark = useIsDarkMode();
  const toggleColorMode = useToggleColorMode();
  const onCLick = toggleColorMode;

  return <Button onClick={onCLick}>{isDark ? "Use light" : "Use dark"}</Button>;
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
