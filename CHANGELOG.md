# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-07-02

### Added
- **Dynamic House Data:** Added `fetch_house_makeup.mjs` to dynamically fetch the actual 118th Congress composition (Democrats, Republicans, Independents, Vacancies) from GovTrack at build time. The "Enacted Reality" map now explicitly displays real-world seat counts instead of simulated estimates.
- **Map Zoom Navigation:** The map now smoothly pans and zooms directly to the bounds of a state when it is selected via the sidebar dropdown.
- **Enhanced Testing:** Expanded the Playwright automated E2E test suite (`test_e2e.mjs`) to aggressively monitor the DOM for UI regressions (preventing "NaN" text bugs) and verify proper Leaflet map zooming execution.

### Changed
- **Rendering Performance Optimization:** Refactored `MapController.js` to significantly improve performance on mobile devices. Heavy mathematical operations (like `interpolateHex` color blending) were hoisted out of rapid-fire rendering loops, and expensive native DOM queries (`document.body.classList.contains('dark')`) were eliminated during map interactions by locally caching the active theme state.
- **Resolved UI Calculation Errors:** Patched all `NaN` occurrences across the sidebar data cards by instituting strict mathematical fallbacks (`|| 0.0`) in `UIController.js` when certain metrics are missing.

### Removed
- **Sandbox Mode Removed:** Completely stripped the "Sandbox Map Playground", its interactive sliders, and the "Tuned" rendering logic to clean up the interface and improve code maintainability.
- **Swipe Compare Removed:** Removed the Leaflet side-by-side swipe comparator functionality, as well as its related dependencies, HTML, and CSS.
- **Optimization Criteria Removed:** Removed the unused optimization criteria toggle buttons from the UI.
