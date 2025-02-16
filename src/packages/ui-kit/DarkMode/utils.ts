// export const isDarkMode = () =>
//   localStorage.theme === "dark" ||
//   (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);

// TODO force only dark mode manually. Change wehn dark mode is stable
export const isDarkMode = () => localStorage.theme === "dark";

export const setColorMode = (isDark: boolean) => {
  document.documentElement.classList.toggle("dark", isDark);
};
export const toggleColorMode = () => {
  const isDark = isDarkMode();
  localStorage.theme = isDark ? "light" : "dark";
  setColorMode(!isDark);
};
