import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      aria-label="Toggle Dark Mode"
      type="button"
      className="h-10 w-10 p-2 rounded-full flex items-center justify-center text-primary-antoniano dark:text-primary hover:bg-celeste-complementario dark:hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-antoniano"
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}