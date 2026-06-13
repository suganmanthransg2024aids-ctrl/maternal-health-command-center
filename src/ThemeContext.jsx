import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ccmc_theme') || 'dark'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'bright' : 'dark';
    setTheme(next);
    localStorage.setItem('ccmc_theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
