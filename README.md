# Periodic Table Project

Interactive periodic table built with HTML, CSS, and JavaScript.

## Live Features

- Full 118-element periodic table with categories, filters, and search
- Detail drawer with chemistry data and electron configuration
- Favorites with local persistence
- Compare up to 3 elements side-by-side
- Advanced quiz system:
  - Modes: Easy, Normal, Hard, Survival
  - Question length: 10, 20, 30
  - Timer, streak, auto-advance, stop/restart
  - Wrong/time-up reveals correct answer before moving on
- Quiz analytics dashboard:
  - Accuracy
  - Average response time
  - Most missed category
  - Best score per mode + length
- Data portability:
  - Export/import favorites as JSON
  - Export quiz history as CSV
- Accessibility improvements:
  - Keyboard-friendly controls
  - Focus-visible styling
  - Live status feedback for quiz results

## Project Structure

- periodicTable.html: main UI structure
- periodicTable.css: styling and responsive layout
- periodicTable.js: app orchestration and UI wiring
- chemistryCatalog.js: periodic categorization and chemistry lookup tables
- chemistryUtils.js: chemistry helper logic and derived values
- elementsFallback.js: inline fallback dataset used when fetch is unavailable
- quizUtils.js: reusable quiz utility functions
- storageUtils.js: shared local storage and file export helpers
- elementsLoader.js: external dataset loading with fallback behavior
- pwa.js: service worker registration helper
- elements.json: standalone element dataset
- service-worker.js: offline cache strategy
- manifest.webmanifest: installable app manifest
- tests/quizUtils.test.js: utility unit tests
- .github/workflows/ci.yml: automated test workflow

## Run Locally

1. Open `periodicTable.html` directly in browser, or
2. Serve folder with a local static server for best module/data loading behavior.

Python example:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500/periodicTable.html`.

## Testing

This project uses Node's built-in test runner for utility tests.

```bash
npm test
```

## Versioning

Current release: `v1.0.0`

See [CHANGELOG.md](CHANGELOG.md) for details.

## Roadmap

- Continue splitting large app logic into feature modules (`quiz`, `filters`, `drawer`, `storage`)
- Add chart visualizations for user quiz trends
- Add custom app icons for PWA manifest
