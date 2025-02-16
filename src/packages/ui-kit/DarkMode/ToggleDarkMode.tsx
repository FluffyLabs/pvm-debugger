import { Button } from "@/components/ui/button";
import { isDarkMode, toggleColorMode } from "./utils";

export const ToggleDarkMode = () => {
  const isDark = isDarkMode();

  const onCLick = () => toggleColorMode();

  return <Button onClick={onCLick}>{isDark ? "Use light" : "Use dark"}</Button>;
};
