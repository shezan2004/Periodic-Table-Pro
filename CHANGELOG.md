# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-04-17

### Added

- Quiz question length selector (10/20/30)
- Quiz modes: Easy, Normal, Hard, Survival
- Auto-advance behavior after wrong answers and timeout
- Correct-answer reveal for wrong/timeout outcomes
- Stop Quiz and Restart Quiz controls
- Quiz analytics panel (accuracy, average time, most missed, best score)
- Quiz history tracking and CSV export
- Favorites JSON export/import
- Reusable quiz utility module (`quizUtils.js`)
- New utility modules: `storageUtils.js`, `elementsLoader.js`, `pwa.js`
- Additional feature modules: `chemistryCatalog.js`, `chemistryUtils.js`, `themeManager.js`, `elementsFallback.js`
- External `elements.json` dataset with runtime loading fallback
- Progressive Web App files: `manifest.webmanifest`, `service-worker.js`
- GitHub Actions CI workflow: `.github/workflows/ci.yml`
- Accessibility improvements: status live region and clear keyboard focus styles
- Test scaffolding with `tests/quizUtils.test.js`
- Project documentation (`README.md`, `DEPLOYMENT.md`)
