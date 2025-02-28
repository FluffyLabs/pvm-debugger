import { useEffect, useState } from "react";

const themeChangeEvent = new Event("themeChange");

export const isDarkMode = () =>
  localStorage.theme === "dark" ||
  (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);

export const useIsDarkMode = () => {
  const [theme, setTheme] = useState(() => isDarkMode());

  useEffect(() => {
    const handleThemeChange = () => setTheme(isDarkMode());

    window.addEventListener("themeChange", handleThemeChange);
    return () => window.removeEventListener("themeChange", handleThemeChange);
  }, []);
  return theme;
};

// TODO force only dark mode manually. Change wehn dark mode is stable

export const setColorMode = (isDark: boolean) => {
  document.documentElement.classList.toggle("dark", isDark);
};

export const useToggleColorMode = () => {
  const isDark = useIsDarkMode();

  return () => {
    localStorage.theme = isDark ? "light" : "dark";
    setColorMode(!isDark);
    window.dispatchEvent(themeChangeEvent);
  };
};
