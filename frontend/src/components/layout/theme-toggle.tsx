"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className={`p-1.5 inline-flex items-center justify-center rounded-full text-foreground hover:text-accent transition-transform duration-300 ${isDark ? "rotate-180" : ""}`}
    >
      {isDark ? <Sun size={22} strokeWidth={2} /> : <Moon size={22} strokeWidth={2} />}
    </button>
  );
}
