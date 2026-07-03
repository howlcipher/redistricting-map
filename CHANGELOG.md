# Changelog

All notable changes to this project will be documented in this file.

## [2026-07-03]

### Added
- **Methodology Documentation:** Explicitly documented the integration of Sequential Monte Carlo (SMC) simulations and credited the ALARM Project (Harvard University) alongside ReCom algorithms in the methodology and README.
- **Community Acknowledgements:** Added a dedicated "Special Thanks & Acknowledgements" section highlighting community members (Sirius, PFletchJ) for their technical and political science contributions.
- **Enhanced Test Documentation:** Clarified the dual-usage of E2E frameworks in the testing documentation to explicitly highlight Puppeteer's role in programmatic DOM interactions alongside Playwright's visual regression snapshots.

### Changed
- **Architectural Reorganization:** Executed a massive repository cleanup to improve maintainability. Python and R scripts were relocated to `pipeline/` and `scripts/`, documentation moved to `docs/`, dummy data to `tests/fixtures/`, and `config.json` was migrated to `public/`.
- **README Aesthetics:** Added new framework shields (R, Leaflet, Chart.js, Puppeteer), stylized the Anthony Rizzo Family Foundation donation badge with official Chicago Cubs colors, and updated the project structure visualization to match the new architecture.

## [2026-07-02]

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

## [2026-07-01]
### Added
- **Historical Analysis Mode:** Interpolated historical baselines for continuous date transitions and dynamically shifted state district colors based on historical variance.
- **Configurable Analytics:** Externalized mathematical thresholds, constants, and simulation parameters into a master `config.json` file.
- **Visual & UI Enhancements:** Added a modern redistricting map favicon. Improved mobile responsiveness by auto-minimizing the sidebar and adding a hamburger menu.
- **Documentation:** Added a potential pitfalls section to the README, included devicon and shields.io badges, and documented the dynamic historical features.

### Changed
- **Seat Counts:** Excluded non-voting territories from House seat count calculations.

## [2026-06-30]
### Added
- **Third Party Integrations:** Added support for third-party colors (Libertarian, Green, Constitution, Reform).
- **Chart & Graphics:** Introduced `Chart.js` for data visualizations, cinematic `flyToBounds` animations, and ARIA labels (Phase 3).
- **Precomputed Maps:** Unlocked precomputed maps for all 50 states and territories to enable physically distinct optimized geometries.
- **CI/CD:** Configured a GitHub Actions workflow to deploy the Vite app automatically to GitHub Pages.

### Changed
- **Architectural Migration:** Migrated the app to Vite, Tailwind 4, and ES6 OOP modules. Moved heavy JSON processing to Web Workers and cached via IndexedDB (Phase 1 & Phase 2).
- **Bug Fixes:** Resolved map rendering grey bugs, dark mode contrast bugs, missing state metrics on build, highly competitive district sticky layer bug, and inverted partisan bias colors.

## [2026-06-29]
### Added
- **Core Functionality:** Implemented interactive range sliders for Partisan Lean, Compactness, and County Splits.
- **House Seat Visualization:** Added dynamic Projected U.S. House Control seat share visualization in the sidebar.
- **U.S. Territories:** Injected Puerto Rico, Guam, American Samoa, Virgin Islands, and Mariana Islands as clickable cartographic insets on the National Map.
- **Responsive Layout:** Sidebar collapses into a corner dashboard restore icon on minimize.
- **Map Enhancements:** Added progressive partisan color scale on the US National Map.

### Changed
- **Initial Release:** Initial commit of the RedrawUS Geospatial Redistricting Map Dashboard.
