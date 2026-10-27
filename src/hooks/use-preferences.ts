import { useCallback, useEffect, useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0a09' : '#ffffff');
    try { localStorage.setItem('nagendra-theme', dark ? 'dark' : 'light'); } catch { /* Storage may be unavailable. */ }
  }, [dark]);
  const toggleTheme = useCallback(() => {
    setDark(previous => !previous);
  }, []);
  return { dark, toggleTheme };
}
