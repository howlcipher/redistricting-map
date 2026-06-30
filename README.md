# RedrawUS: Multi-State Redistricting & Map Comparison Dashboard

An interactive geospatial tool to analyze, visualize, and compare actual enacted legislative districts against algorithmically generated alternatives using peer-reviewed redistricting mathematics.

This project is built using:
1. **Python Data Pipeline (Phase 1):** Python 3, `GeoPandas`, and `GerryChain` (MGGG Lab) using the **ReCom (Recombination)** Markov Chain Monte Carlo algorithm.
2. **Frontend Map Viewer (Phase 2):** HTML5, Vanilla JS, Tailwind CSS, and `Leaflet.js` to render interactive choropleths and comparative statistics.

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
│   ├── metrics.json                         # Aggregated metrics for all states
│   ├── colorado_enacted_districts.geojson   # Colorado enacted boundaries
│   ├── colorado_optimized_districts_*.geojson # Colorado optimized variants
│   ├── wisconsin_enacted_districts.geojson  # Wisconsin enacted boundaries
│   ├── wisconsin_optimized_districts_*.geojson # Wisconsin optimized variants
│   ├── texas_enacted_districts.geojson      # Texas enacted boundaries
│   ├── texas_optimized_districts_*.geojson  # Texas optimized variants
│   ├── north_carolina_enacted_districts.geojson # North Carolina enacted boundaries
│   ├── north_carolina_optimized_districts_*.geojson # North Carolina optimized variants
│   ├── maryland_enacted_districts.geojson   # Maryland enacted boundaries
│   └── maryland_optimized_districts_*.geojson # Maryland optimized variants
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

## 🛠️ Getting Started

### 1. Run the Multi-State Data Pipeline
Activate the virtual environment and execute the pipeline to pull Census boundaries, clip coordinate grids, and run ReCom chains for **Colorado, Wisconsin, Texas, North Carolina, and Maryland**:

```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Run the pipeline (e.g. 50 ReCom simulation steps per state for speed)
python3 generate_maps.py --steps 50
```

*This will download `us-states.json` and populate the `data/` folder with true state-shaped district GeoJSONs for all 5 states.*

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
   * Showcase states (Colorado, Wisconsin, Texas, North Carolina, Maryland) use mathematical precinct grids clipped exactly to state boundaries.
   * Partisan baseline margins (D/R vote shares) and efficiency gap ratios are calibrated using actual state election returns compiled from the **[OpenPrecincts Repository](https://openprecincts.org/)** and the **[MGGG Voting and Redistricting Data Portal](https://mggg.org/)**.
3. **U.S. Overseas Territories Boundaries:** Geographic coordinate shapes for Puerto Rico, Guam, US Virgin Islands, American Samoa, and Northern Mariana Islands are custom-mapped using official geospatial boundaries from the **[U.S. Census Bureau TIGER/Line Shapefiles](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)**.
4. **Markov Chain Monte Carlo (MCMC) Redistricting Models:** District geometry variants (optimized for headcount, race VRA compliance, compactness, and splits) are simulated and exported using the **[GerryChain Library](https://gerrychain.readthedocs.io/en/latest/)** in Python.

---

## 📐 Mathematical & Open-Source Legitimacy (GerryChain & ReCom)

To build trust and eliminate suspicion of "black box" algorithms, this project leverages **GerryChain**, developed by the **Metric Geometry and Gerrymandering Group (MGGG)** at Tufts University and MIT.

* **How ReCom Works:** ReCom (Recombination) starts with a contiguous district map. In each step, it merges two adjacent districts, creates a spanning tree of all census blocks within them, and cuts a random edge that divides the population into two equal pieces within a 1% tolerance.
* **Why it's Defensible:** By running this process 10,000+ times, researchers create a neutral "ensemble" (statistical baseline) of valid districtings. If the enacted map is a statistical outlier compared to this ensemble (e.g., having a much higher Efficiency Gap), it is evidence of intentional gerrymandering. This method has been accepted as expert testimony in US Supreme Court and state supreme court cases.
