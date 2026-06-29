# RedrawUS: Multi-State Redistricting & Map Comparison Dashboard

An interactive geospatial tool to analyze, visualize, and compare actual enacted legislative districts against algorithmically generated alternatives using peer-reviewed redistricting mathematics.

This project is built using:
1. **Python Data Pipeline (Phase 1):** Python 3, `GeoPandas`, and `GerryChain` (MGGG Lab) using the **ReCom (Recombination)** Markov Chain Monte Carlo algorithm.
2. **Frontend Map Viewer (Phase 2):** HTML5, Tailwind CSS, and `Leaflet.js` to render interactive choropleths and comparative statistics.

---

## Project Structure

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
├── generate_maps.py                         # Python data pipeline script
├── index.html                               # Dashboard layout & structure
├── index.css                                # Leaflet custom dark theme styling
├── index.js                                 # Map interactions, animations & data toggles
├── README.md                                # General documentation
├── gemini.md                                # AI process log & application manual
└── venv/                                    # Python Virtual Environment
```

---

## Getting Started

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

## Mathematical & Open-Source Legitimacy (GerryChain & ReCom)

To build trust and eliminate suspicion of "black box" algorithms, this project leverages **GerryChain**, developed by the **Metric Geometry and Gerrymandering Group (MGGG)** at Tufts University and MIT.

* **How ReCom Works:** ReCom (Recombination) starts with a contiguous district map. In each step, it merges two adjacent districts, creates a spanning tree of all census blocks within them, and cuts a random edge that divides the population into two equal pieces within a 1% tolerance.
* **Why it's Defensible:** By running this process 10,000+ times, researchers create a neutral "ensemble" (statistical baseline) of valid districtings. If the enacted map is a statistical outlier compared to this ensemble (e.g., having a much higher Efficiency Gap), it is evidence of intentional gerrymandering. This method has been accepted as expert testimony in US Supreme Court and state supreme court cases.
