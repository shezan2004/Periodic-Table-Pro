import { readStoredJson, writeStoredJson } from './storageUtils.js';

export function setTheme(theme, themeToggle) {
  document.body.dataset.theme = theme;
  writeStoredJson('periodic-table-theme', theme);
  if (themeToggle) {
    themeToggle.textContent = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  }
}

export function initTheme(themeToggle) {
  const savedTheme = readStoredJson('periodic-table-theme', null);
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  setTheme(savedTheme || (prefersLight ? 'light' : 'dark'), themeToggle);
}
