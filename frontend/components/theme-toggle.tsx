"use client";

import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { useTheme } from "./theme-provider";
import Tooltip from "./ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <IconDeviceDesktop className="h-4 w-4" />;
    }
    return actualTheme === 'dark' ? <IconMoon className="h-4 w-4" /> : <IconSun className="h-4 w-4" />;
  };

  const getTooltip = () => {
    if (theme === 'system') {
      return `System theme (${actualTheme})`;
    }
    return theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };

  return (
    <Tooltip content={getTooltip()}>
      <button
        onClick={toggleTheme}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border-soft bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Toggle theme"
      >
        {getIcon()}
      </button>
    </Tooltip>
  );
}

export default ThemeToggle;
