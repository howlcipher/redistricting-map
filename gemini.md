# Gemini Process Log & Application Manual

This document details the development history, architectural hurdles, AI pair-programming solutions, and detailed instructions for the **RedrawUS Analyzer** application.

---

## 1. AI Pair-Programming History & Hurdles

Building a geospatial analytics tool inside a sandboxed Linux environment (Bazzite, an atomic Fedora variant with a read-only root system) presented several complex engineering challenges that we solved collaboratively:

### Hurdle A: C-Library Compilation Dependencies (GDAL & Fiona)
* **The Problem:** The Python virtual environment failed to install `geopandas` and `fiona` because they require the GDAL C-library to compile bindings. Since Bazzite has a read-only root partition, standard package managers (`dnf`) were unavailable.
* **The Solution:** We resolved this by leveraging Homebrew (installed in user space at `/home/linuxbrew/.linuxbrew/bin/brew`). We installed the GDAL system binaries via Homebrew and then pointed Python to compile Fiona against it:
  ```bash
  brew install gdal
  export GDAL_CONFIG=/home/linuxbrew/.linuxbrew/bin/gdal-config
  pip3 install fiona --no-binary fiona
  pip3 install geopandas gerrychain
  ```

### Hurdle B: Graph Disconnection due to Float Precision ($10^{-16}$)
* **The Problem:** When clipping a rectangular grid of precincts to a state's border (like Wisconsin or Texas), we found that the resulting dual adjacency graph was highly fragmented (e.g. 11 separate components for 290 nodes).
* **The Cause:** Building a coordinate grid using addition loops (`bx = minx + i * dx`) introduced floating-point rounding errors on the order of $10^{-16}$. Because adjacent columns did not share the exact same binary float values at boundaries, GerryChain did not detect touching edges.
* **The Solution:** We rewrote the grid generation to use `np.linspace` to compute coordinate bounds. Because boundaries are read from the exact same array indices, adjacent columns share identical binary values, yielding a **100% connected graph**.

### Hurdle C: Bounding Box Coordinate Shifting vs Real Geographic Shapes
* **The Problem:** Shifting a square synthetic grid to re-center over states like Wisconsin or Texas resulted in a rectangular patch drawn in the center of the map, which looked unconvincing.
* **The Solution:** We overhauled the Python script `generate_maps.py` to pull actual state borders from a CDN. We then generated grid shapes covering the state's bounding box and clipped the polygons exactly to the state boundary, filtering for the mainland connected component. This creates true state-shaped district maps.

---

## 2. Multi-Objective Redistricting Formulations

To compare maps fairly, we implemented standard U.S. redistricting criteria in our data pipeline:

1. **Efficiency Gap (EG):** Measures partisan asymmetry in seat share by counting wasted votes.
   $$W_{\text{party}} = \text{votes cast for losing candidate} + (\text{votes for winning candidate} - 50\% \text{ threshold})$$
   $$EG = \frac{W_{\text{Dem}} - W_{\text{Rep}}}{\text{Total Votes}}$$
2. **Mean-Median Difference:** Compares the statewide average district vote share to the median district vote share. A median lower than the mean indicates that voters are packed/cracked to dilute their influence.
3. **Polsby-Popper Compactness:** Measures district roundness. Planar projections (`EPSG:3857`) are used to ensure area and perimeter calculations are in metric meters, avoiding geographic distortion.
   $$\text{Compactness} = 4\pi \frac{\text{Area}}{\text{Perimeter}^2}$$
4. **County Splits:** Penalizes partitions that split county lines. In `generate_maps.py`, splits are counted by grouping district assignments by county:
   ```python
   grouped = assignment_series.groupby(gdf['county']).nunique()
   splits = sum(num_districts - 1 for num_districts in grouped if num_districts > 1)
   ```

---

## 3. Detailed Run Instructions

### Developer Setup
1. **Initialize the Virtual Environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Re-compute All State District Maps:**
   ```bash
   python3 generate_maps.py --steps 100
   ```
   This will run ReCom chains for Colorado, Wisconsin, Texas, North Carolina, and Maryland, updating `data/metrics.json` and generating the 30 GeoJSON files.
3. **Serve Locally:**
   ```bash
   python3 -m http.server 8000
   ```
   Open `http://localhost:8000` to interact.

### User Interface Manual
* **USA National Map Mode:**
  * Displays the United States map colored by enacted partisan bias.
  * Toggling Enacted vs. Optimized or changing Criteria (e.g. VAP, VRA, County Splits) dynamically recolors the national map using GerryChain metrics.
  * Hover over states to read their bias and splits. Click **Analyze** on the leaderboard or state to deep-dive.
* **State View Mode:**
  * Displays the state-shaped districts (Wisconsin shape, Texas shape, etc.).
  * Toggling to **Optimized** reveals green/red comparative **Delta Badges (Δ)** next to metrics showing exact differences from reality.
  * The **Partisan Seats Distribution Histogram** updates in real-time as you switch optimization presets.
