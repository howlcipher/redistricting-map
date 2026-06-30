# RedrawUS: Multi-State Redistricting & Map Comparison Dashboard

An interactive geospatial tool to analyze, visualize, and compare actual enacted legislative districts against algorithmically generated alternatives using peer-reviewed redistricting mathematics.

This project is built using:
1. **Python Data Pipeline (Phase 1):** Python 3, `GeoPandas`, and `GerryChain` (MGGG Lab) using the **ReCom (Recombination)** Markov Chain Monte Carlo algorithm.
2. **Frontend Map Viewer (Phase 2):** HTML5, Vanilla JS, Tailwind CSS, and `Leaflet.js` to render interactive choropleths and comparative statistics.

---

## 🧮 Algorithm & Methodology (TL;DR)
This tool evaluates the fairness of district maps using two primary metrics:
1. **The ReCom Algorithm:** An advanced Markov Chain Monte Carlo (MCMC) algorithm that generates thousands of alternate "optimized" maps by cutting spanning trees of precincts to maintain equal populations.
2. **Efficiency Gap (EG):** A formula to measure partisan gerrymandering by calculating the difference in "wasted votes" between two parties: `EG = (Wasted Dem Votes - Wasted Rep Votes) / Total Votes`.

> [!NOTE]
> For a full deep-dive breakdown of the statistical formulas, multi-objective metrics (like Polsby-Popper compactness and Mean-Median difference), and Python GerryChain code snippets, please see the comprehensive **[METHODOLOGY.md](file:///var/home/howlcipher/redistricting-map/METHODOLOGY.md)**.

---

## 🚀 Core Features

### 🗳️ Projected U.S. House Control Dashboard
* **Real-time Seat Share Projections:** Aggregates all 435 voting seats across the 50 states to show if Democrats or Republicans would win control under enacted vs. optimized maps.
* **Progressive Majority Bar:** Visual progress indicator divided by a center line marking the `218` seats needed for a majority.
* **Gerrymander Tax Seat Count:** Displays how many seats are shifted/biased away from a perfectly proportional split (e.g. `R +8 Seat Bias`).
* **Seat-to-Vote Bias Margin:** Computes the overall percentage deviation of congressional representation from the national popular vote.

### 🎨 Progressive Partisan Color Gradient Scale
* **Bi-directional Partisan Gradients:** Replaces flat categorizations with a continuous color gradient representing the partisan efficiency gap (EG).
  * **Democratic Bias:** Light pastel blue (`#bfdbfe`) for minor leans up to strong royal blue (`#3b82f6`) for heavy leans.
  * **Republican Bias:** Light pastel red (`#fecaca`) for minor leans up to strong crimson red (`#ef4444`) for heavy leans.
  * **Neutral/Single District:** Soft slate grey (`#cbd5e1` in light mode, `#1e293b` in dark mode) reserved for single-representative states (e.g., Wyoming, Alaska, Vermont) or non-partisan territories.

### 🗺️ Clickable US Territory Insets
* Includes interactive, clickable cartographic insets on the US National Map for **Puerto Rico, Guam, US Virgin Islands, American Samoa, and Northern Mariana Islands**.
* Hovering over or clicking territory insets triggers the same detailed census profiles and dynamic redistricting math as mainland states.

### 🌓 Synchronized Light/Dark Mode Switcher
* Single-click toggle between Light and Dark mode.
* Seamlessly swaps page background colors, leaflet map base tiles, text contrast borders, card containers, and typography colors to ensure 100% reading contrast.

---

## ## Project Structure

```
redistricting-map/
├── data/                                    # Generated datasets (cached locally)
│   ├── metrics.json                         # Aggregated metrics for all 50 states & territories
│   ├── alabama_enacted_districts.geojson    # State enacted boundaries (A-Z)
│   ├── alabama_optimized_districts_*.geojson# State optimized variants (A-Z)
│   ├── ...                                  # Includes all 50 states
│   └── wyoming_optimized_districts_*.geojson# State optimized variants (A-Z)
├── generate_maps.py                         # Python Object-Oriented pipeline script
├── index.html                               # Dashboard layout & structure
├── index.css                                # Leaflet custom dark theme styling
├── src/                                     # ES6 Module Architecture (Frontend)
│   ├── main.js                              # Main application entry point
│   ├── DataService.js                       # Mathematical algorithms & API state
│   ├── MapController.js                     # Leaflet map rendering & layers
│   └── UIController.js                      # DOM, Sliders, and Dashboard UI
├── README.md                                # General documentation
├── gemini.md                                # AI process log & application manual
└── venv/                                    # Python Virtual Environment
```

---

## 🧪 Testing Framework & CI/CD Validation

To ensure mathematical correctness, data integrity, and UI reliability across this complex pipeline, the project leverages a rigorous 3-tier testing architecture:

1. **Python Backend (`pytest`)**
   - Validates the `RedistrictingSimulator` and `GeoDataProcessor` without hitting live Census APIs by mocking spatial data processing via a synthetic `GeoDataFrame` grid.
   - Ensures mathematical determinism and proper handling of topological errors.
2. **JavaScript Frontend (`vitest` + JSDOM)**
   - Emulates the browser to test `UIController` state transitions, DOM manipulation, and asynchronous animations (loaders/timeouts).
   - Mocks the fetch API to ensure `DataService` properly calculates standard formats (like Efficiency Gap Partisan Colors) even in extreme edge cases.
3. **End-to-End Visual Regression (`playwright`)**
   - Runs headless Chromium to verify full user journeys across the dashboard (Swipe Compare, Detail Panels).
   - Generates and compares pixel-perfect UI snapshots (Visual Regression).
   - Intercepts network routes to mock extreme gerrymandered data, proving the UI scales gracefully to statistical outliers.

For detailed instructions on running these test suites, see the **[Testing README](tests/README.md)**.

---

## 🛠️ Getting Started

### 1. Run the Multi-State Data Pipeline
Activate the virtual environment and execute the pipeline to pull Census boundaries, clip coordinate grids, and run ReCom chains for **all 50 states and territories**:

```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Run the pipeline
python3 generate_maps.py --steps 50
```

*This will download `us-states.json` and populate the `data/` folder with true state-shaped district GeoJSONs for the entire United States.*

### 2. Run the Local Web Server
Because browsers block fetching local files via `file://` (CORS policies), you must serve this project using a local HTTP server:

```bash
# Start a simple local server in the project directory
python3 -m http.server 8000
```

Now open your web browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📦 Data Sourcing & Geometries

All boundary files and election metrics are built using verified open-source government sources and standardized data pipelines. 
**Disclaimer: For performance and demonstrative purposes in the browser, if pre-computed GeoJSON files do not exist for a state, demographic and partisan metrics are procedurally generated algorithmically over authentic geographical boundaries.**

1. **U.S. State Outlines ([`us-states.json`](file:///var/home/howlcipher/redistricting-map/us-states.json)):** Downloaded automatically by the pipeline from the public **[PublicaMundi MappingAPI Repository](https://github.com/PublicaMundi/MappingAPI)**. The raw source file can be viewed on GitHub: **[us-states.json on GitHub](https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json)**.
2. **State-Level Precinct & Census Datasets:**
   * All 50 states use mathematical precinct grids clipped exactly to state boundaries.
   * Partisan baseline margins (D/R vote shares) and efficiency gap ratios are calibrated using actual state election returns compiled from the **[OpenPrecincts Repository](https://openprecincts.org/)** and the **[MGGG Voting and Redistricting Data Portal](https://mggg.org/)**.
3. **U.S. Overseas Territories Boundaries:** Geographic coordinate shapes for Puerto Rico, Guam, US Virgin Islands, American Samoa, and Northern Mariana Islands are custom-mapped using official geospatial boundaries from the **[U.S. Census Bureau TIGER/Line Shapefiles](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)**.
4. **Markov Chain Monte Carlo (MCMC) Redistricting Models:** District geometry variants (optimized for headcount, race VRA compliance, compactness, and splits) are simulated and exported using the **[GerryChain Library](https://gerrychain.readthedocs.io/en/latest/)** in Python.

---

## 📐 Mathematical & Open-Source Legitimacy (TL;DR)

To build trust and eliminate suspicion of "black box" algorithms, this project leverages **GerryChain**, developed by the **Metric Geometry and Gerrymandering Group (MGGG)** at Tufts University and MIT.

**TL;DR on the Math:**
* **ReCom (Recombination):** A Markov Chain Monte Carlo algorithm that merges adjacent districts, builds a spanning tree, and randomly cuts it to create a massive ensemble of valid, compact maps.
* **Efficiency Gap (EG):** Measures partisan bias by calculating the difference in "wasted votes" between parties.
* **Polsby-Popper:** Evaluates district compactness (area vs perimeter).
* **Mean-Median & VRA:** Analyzes the concentration of voting power for partisan and minority groups.

👉 **For a deep dive into the formulas, algorithms, and code snippets, see the full [Methodology & Mathematics Guide](METHODOLOGY.md).**
