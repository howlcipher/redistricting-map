# Testing Architecture

This repository uses a comprehensive 3-tier testing framework to validate the Python spatial math engine, the JavaScript interactive UI, and the End-to-End user journeys.

## 1. Python Backend Validation (`pytest`)

The Python pipeline is responsible for heavy spatial computations and GerryChain ReCom tree partitioning. 
Tests are located in `tests/python/`.

### Key Coverage:
- **`GeoDataProcessor` Validation**: Tests mock network calls (`urllib.request.urlretrieve`) to simulate downloading Census shapefiles, ensuring the pipeline can fail gracefully or process geometries without needing live internet access.
- **Synthetic Geographic Modeling**: To test complex spatial adjacency graphs without the overhead of real 100MB shapefiles, we build a synthetic $2 \times 2$ grid using `shapely` polygons and `geopandas.GeoDataFrame`.
- **Simulator Determinism**: Tests verify that `RedistrictingSimulator` assigns valid `district_id` integers and handles topological anomalies smoothly.

### How to Run:
```bash
# Activate your virtual environment first
source venv/bin/activate

# Run the pytest suite
pytest tests/python/
```

## 2. JavaScript UI Validation (`vitest` + JSDOM)

The frontend is built in Vanilla JS and relies heavily on complex DOM interactions. Tests are located in `tests/js/`.

### Key Coverage:
- **JSDOM Emulation**: `Vitest` runs with a virtual DOM (`happy-dom` or `jsdom`), allowing us to assert that `UIController.switchViewMode('state')` correctly swaps CSS classes (e.g., `hidden` vs `bg-indigo-600`) without a real browser.
- **Network Mocking (`vi.fn()`)**: We intercept `fetch()` calls in `DataService` to simulate extreme mathematical datasets (e.g. testing the color gradients for a 99% Efficiency Gap bias).
- **Time-Travel Debugging**: Because our loader UI relies on sequential animations, we use `vi.useFakeTimers()` to instantly step through `setTimeout` cycles.

### How to Run:
```bash
# Run unit tests continuously (watch mode)
npm run test:unit

# Run unit tests once
npx vitest run
```

## 3. End-to-End Browser Journeys (`playwright`)

To guarantee the user experience does not break, Playwright spins up headless Chromium instances to execute real interactions. Tests are located in `tests/e2e/`.

### Key Coverage:
- **Visual Regression Snapshots**: The `toHaveScreenshot` matcher creates baseline images of our complex geospatial Leaflet map (e.g. `national-map-baseline.png`). Future PRs that unintentionally shift CSS layouts or map tiles will fail the test and produce a visual diff image.
- **Extreme Outlier Mocking**: We intercept network requests at the browser level (`page.route('**/data/metrics.json')`) to feed the UI extreme Republican/Democrat gerrymandered payloads, ensuring the DOM updates labels and colors correctly without crashing.

### How to Run:
```bash
# Run E2E tests headless
npm run test:e2e

# If a test fails, you can view the HTML report and visual diffs
npx playwright show-report
```
