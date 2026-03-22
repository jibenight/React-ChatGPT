type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

let _theme = $state<Theme>(getInitialTheme());

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem('theme', _theme);
    } catch {}
    const root = document.documentElement;
    if (_theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  });
});

export const themeStore = {
  get theme() { return _theme; },

  toggleTheme() {
    _theme = _theme === 'dark' ? 'light' : 'dark';
  },
};
