import {useEffect, useState} from 'react';

export type Theme = 'light' | 'dark' | 'system';
const key = 'smartsched-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch { return 'system'; }
}

function apply(theme: Theme) {
  const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#101820' : '#f5f7f9');
}

apply(readTheme());

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    apply(theme);
    try { localStorage.setItem(key, theme); } catch { /* Theme still works without storage. */ }
    window.dispatchEvent(new CustomEvent<Theme>('smartsched-theme-change',{detail:theme}));
    const update = () => apply(theme);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setTheme(readTheme()); };
    const syncLocal = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    window.addEventListener('storage', sync);
    window.addEventListener('smartsched-theme-change', syncLocal);
    return () => {window.removeEventListener('storage', sync);window.removeEventListener('smartsched-theme-change', syncLocal);};
  }, []);
  return [theme, setTheme] as const;
}
