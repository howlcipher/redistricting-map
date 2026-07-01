# RedrawUS: Multi-State Redistricting & Map Comparison Dashboard

An interactive geospatial tool to analyze, visualize, and compare actual enacted legislative districts against algorithmically generated alternatives using peer-reviewed redistricting mathematics.

## 🛠️ Built With

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)

1. **Python Data Pipeline:** Python 3, `GeoPandas`, and `GerryChain` (MGGG Lab) using the **ReCom (Recombination)** Markov Chain Monte Carlo algorithm.
2. **Frontend Map Viewer:** HTML5, Vanilla JS, **Vite** bundler, **Tailwind CSS v4**, `Leaflet.js`, and `Chart.js`.
3. **Performance Infrastructure:** **IndexedDB** (`localForage`) for persistent GeoJSON caching, and **Web Workers** for non-blocking geographic data parsing.

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

### 📅 Dynamic Historical Date Picker & Interpolation
* **Time-Series Analysis:** A fully interactive date picker that allows you to traverse through historical census and election cycles.
* **Continuous Mathematical Interpolation:** As you select dates that fall between recorded historical blocks (e.g. between 2010 and 2024), the application performs smooth linear interpolation on all state partisan baselines.
* **Synchronized Dashboard:** The progressive projected House seats, Efficiency Gaps, and UI metrics instantly update in real-time as you glide across history.

### 🎨 Progressive Partisan Color Gradient Scale
* **Continuous Linear Color Gradients:** Replaces flat categorizations with a mathematically continuous color interpolation gradient. Even a fractional fractional shift in the partisan baseline instantly produces a perceptible, continuous shift in the map's shading.
* **Bi-directional Partisan Gradients:**
  * **Democratic Bias:** Light pastel blue (`#eff6ff`) for minor leans up to strong royal blue (`#2563eb`) for heavy leans.
  * **Republican Bias:** Light pastel red (`#fef2f2`) for minor leans up to strong crimson red (`#dc2626`) for heavy leans.
  * **Neutral/Highly Competitive/Single District:** Soft slate grey (`#cbd5e1` in light mode, `#1e293b` in dark mode) reserved for single-representative states (e.g., Wyoming, Alaska, Vermont), non-partisan territories, or highly competitive districts where no party secures more than 50% of the vote.

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
├── .github/workflows/                       # GitHub Actions CI/CD pipelines
│   └── deploy.yml                           # Automated Vite build & Pages deployment
├── public/data/                             # Generated datasets (cached locally)
│   ├── metrics.json                         # Aggregated metrics for all 50 states & territories
│   ├── alabama_enacted_districts.geojson    # State enacted boundaries (A-Z)
│   └── ...                                  # Includes all optimized permutations
├── src/                                     # ES6 Module Architecture (Frontend)
│   ├── main.js                              # Main application entry point (Vite)
│   ├── index.css                            # Tailwind v4 CSS directives & custom styles
│   ├── DataService.js                       # Map caching & API state (IndexedDB)
│   ├── worker.js                            # Web Worker for off-thread GeoJSON loading
│   ├── MapController.js                     # Leaflet map rendering & layers
│   └── UIController.js                      # DOM, Sliders, Charts, and Dashboard UI
├── tests/                                   # 3-Tier Testing Architecture
│   ├── e2e/                                 # Playwright browser snapshots
│   ├── js/                                  # Vitest frontend unit tests
│   └── python/                              # Pytest backend validation
├── generate_maps.py                         # Python Object-Oriented pipeline script
├── config.json                              # Global thresholds, constants, and parameters
├── index.html                               # Dashboard layout & structure
├── vite.config.js                           # Vite bundler configuration
├── package.json                             # Node.js dependencies & scripts
├── README.md                                # General documentation
├── METHODOLOGY.md                           # Algorithmic and mathematical deep dive
└── IMPROVEMENT_SUGGESTIONS.md               # Roadmap tracking and UX goals
```

---

## 🧪 Testing Framework & CI/CD Validation

![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)
![Pytest](https://img.shields.io/badge/pytest-%23ffffff.svg?style=for-the-badge&logo=pytest&logoColor=2f9fe3)
![Vitest](https://img.shields.io/badge/-Vitest-252529?style=for-the-badge&logo=vitest&logoColor=FCC72B)
![Playwright](https://img.shields.io/badge/-playwright-%232EAD33?style=for-the-badge&logo=playwright&logoColor=white)

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
# Generate all 56 states (default)
python generate_maps.py --states=all

# Generate only specific states (e.g. for showcase testing)
python generate_maps.py --states=colorado,wisconsin,texas,north_carolina,maryland
```

#### Configuration & CLI Overrides
All analytical thresholds (e.g., competitive bounds, minority influence minimums), default grid resolutions, file paths, and external download URLs are decoupled from the code and managed inside **`config.json`**. 

You can seamlessly adjust logic by editing the JSON, or you can dynamically override mathematical thresholds at runtime for rapid testing without altering the config:

```bash
# Override partisan competition boundaries and grid size at runtime
python generate_maps.py --states=colorado --comp-min=0.4 --comp-max=0.6 --grid-size=30
```

### 2. Third-Party Data Integration
The `RedrawUS` interactive map dynamically scans for standard election metric properties in any imported GeoJSON data. If you import custom redistricting maps or historical census data into the `public/data/` directory, simply ensure the district properties have these exact keys to flawlessly integrate:
1. **`[party]_votes_sum`**: Total district vote headcount for the party (e.g. `dem_votes_sum`, `rep_votes_sum`, `lib_votes_sum`, `grn_votes_sum`, `con_votes_sum`, `ref_votes_sum`).
2. **`[party]_pct`**: Decimal percentage of the district's total vote (e.g. `lib_pct`, `grn_pct`).
*Note: The frontend map layers naturally scale partisan efficiency gradients (EG) utilizing these properties for Democrats, Republicans, Libertarians, Greens, Conservatives, and Reform.*

### 3. Run the Development Server
This project uses **Vite** for optimized frontend bundling and lightning-fast Hot Module Replacement (HMR).

```bash
# Install Node dependencies (Vite, Chart.js, Tailwind, etc.)
npm install

# Start the Vite development server
npm run dev
```

Now open your web browser and navigate to the local server URL provided by Vite (typically `http://localhost:5173`).

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
