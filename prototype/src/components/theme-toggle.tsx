'use client';

const readTheme = (): 'dark' | 'light' =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

const saveTheme = (theme: 'dark' | 'light') => {
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Χωρίς αποθήκευση (ιδιωτικό παράθυρο) το θέμα ισχύει μόνο για αυτή τη σελίδα.
  }
};

export const toggleTheme = () => {
  const next = readTheme() === 'dark' ? 'light' : 'dark';
  if (next === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  saveTheme(next);
};

export function ThemeToggle() {
  return (
    <button type="button" className="button" onClick={toggleTheme}>
      Σκοτεινό / φωτεινό
    </button>
  );
}
