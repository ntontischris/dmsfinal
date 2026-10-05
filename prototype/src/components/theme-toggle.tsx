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

export function ThemeToggle() {
  const handleClick = () => {
    const next = readTheme() === 'dark' ? 'light' : 'dark';
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    saveTheme(next);
  };

  return (
    <button type="button" className="button" onClick={handleClick}>
      Σκοτεινό / φωτεινό
    </button>
  );
}
