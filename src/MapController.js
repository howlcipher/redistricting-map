// src/MapController.js

/**
 * MapController handles the rendering and state of the Leaflet map instance.
 * It manages the geo-spatial layers, switching between national and state views,
 * applying visual styles, and setting up the Side-by-Side swipe comparison tool.
 */
export class MapController {
    constructor(app) {
        this.app = app; // Reference to the main App instance
        this.map = null;
        this.layers = {};
        this.layerFeatures = {};
        this.nationalLayer = null;
    }

    initMap() {
        this.US_BOUNDS = [
            [5.0, -180.0],
            [72.0, -60.0]
        ];
        
        // @ts-ignore
        this.map = L.map('map', {
            zoomSnap: 0.1,
            zoomDelta: 0.5,
            minZoom: 3,
            maxZoom: 10,
            maxBounds: this.US_BOUNDS,
            maxBoundsViscosity: 1.0
        }).setView([39.8, -98.5], 4);
    }

    getPartisanFillColor(eg, isDark) {
        if (eg < 0) {
            const absEg = Math.abs(eg);
            if (absEg < 0.03) return isDark ? '#1e3a8a' : '#bfdbfe'; // blue-900 : blue-200
            if (absEg < 0.07) return isDark ? '#1d4ed8' : '#60a5fa'; // blue-700 : blue-400
            return isDark ? '#3b82f6' : '#2563eb';                   // blue-500 : blue-600
        } else if (eg > 0) {
            if (eg < 0.03) return isDark ? '#7f1d1d' : '#fecaca';    // red-900 : red-200
            if (eg < 0.07) return isDark ? '#b91c1c' : '#f87171';    // red-700 : red-400
            return isDark ? '#ef4444' : '#dc2626';                   // red-500 : red-600
        } else {
            return isDark ? '#1e293b' : '#cbd5e1';                   // slate-800 : slate-300
        }
    }

    getNationalStyle(feature) {
        try {
            if (!feature || !feature.properties || !feature.properties.name) {
                return { fillColor: '#cbd5e1', weight: 1.0, opacity: 0.5, color: '#94a3b8' };
            }
            
            const name = feature.properties.name.toLowerCase().replace(/ /g, '_');
            const stateData = this.app.dataService.stateLeaderboardData[name];
            const isDark = document.body.classList.contains('dark');
            
            let fill = isDark ? '#1e293b' : '#cbd5e1';
            const baseEg = this.app.dataService.statePartisanBaselines[name] !== undefined ? this.app.dataService.statePartisanBaselines[name] : 0.0;
            
            if (stateData || (this.app.dataService.metricsDatabase && this.app.dataService.metricsDatabase[name])) {
                let eg = 0.0;
                if (this.app.uiController.activeMode === 'enacted') {
                    eg = baseEg;
                } else {
                    const stateMetrics = this.app.dataService.metricsDatabase ? this.app.dataService.metricsDatabase[name] : null;
                    if (stateMetrics) {
                        let key;
                        if (this.app.uiController.activeMode === 'tuned') key = 'tuned';
                        else key = `optimized_${this.app.uiController.activeCriteria}`;
                        
                        if (stateMetrics[key]) {
                            eg = stateMetrics[key].efficiency_gap;
                        } else if (this.app.uiController.activeMode === 'tuned' && stateData) {
                            eg = stateData.tuned_eg;
                        }
                    } else if (stateData) {
                        if (this.app.uiController.activeMode === 'tuned') eg = stateData.tuned_eg;
                        else eg = stateData.optimized_eg;
                    }
                }
                
                fill = this.getPartisanFillColor(eg, isDark);
            }
            
            return {
                fillColor: fill,
                weight: 1.5,
                opacity: 0.95,
                color: isDark ? '#475569' : '#64748b',
                fillOpacity: 0.80
            };
        } catch (err) {
            return { fillColor: '#cbd5e1', weight: 1.0, opacity: 0.5, color: '#cbd5e1' };
        }
    }

    getDistrictColor(pcts, isDark) {
        let winner = 'dem';
        let maxPct = pcts.dem;
        for (const [party, pct] of Object.entries(pcts)) {
            if (pct > maxPct) {
                maxPct = pct;
                winner = party;
            }
        }

        if (winner === 'dem') {
            if (maxPct >= 0.65) return isDark ? '#3b82f6' : '#2563eb'; // blue-500 : blue-600
            if (maxPct >= 0.60) return isDark ? '#1d4ed8' : '#60a5fa'; // blue-700 : blue-400
            if (maxPct >= 0.55) return isDark ? '#1e3a8a' : '#bfdbfe'; // blue-900 : blue-200
        } else if (winner === 'rep') {
            if (maxPct >= 0.65) return isDark ? '#ef4444' : '#dc2626'; // red-500 : red-600
            if (maxPct >= 0.60) return isDark ? '#b91c1c' : '#f87171'; // red-700 : red-400
            if (maxPct >= 0.55) return isDark ? '#7f1d1d' : '#fecaca'; // red-900 : red-200
        } else if (winner === 'lib') {
            if (maxPct >= 0.65) return isDark ? '#eab308' : '#ca8a04'; // yellow-500 : yellow-600
            if (maxPct >= 0.60) return isDark ? '#a16207' : '#facc15'; // yellow-700 : yellow-400
            if (maxPct >= 0.55) return isDark ? '#713f12' : '#fef08a'; // yellow-900 : yellow-200
        } else if (winner === 'grn') {
            if (maxPct >= 0.65) return isDark ? '#22c55e' : '#16a34a'; // green-500 : green-600
            if (maxPct >= 0.60) return isDark ? '#15803d' : '#4ade80'; // green-700 : green-400
            if (maxPct >= 0.55) return isDark ? '#14532d' : '#bbf7d0'; // green-900 : green-200
        } else if (winner === 'con') {
            if (maxPct >= 0.65) return isDark ? '#d946ef' : '#c026d3'; // fuchsia-500 : fuchsia-600
            if (maxPct >= 0.60) return isDark ? '#a21caf' : '#e879f9'; // fuchsia-700 : fuchsia-400
            if (maxPct >= 0.55) return isDark ? '#701a75' : '#f5d0fe'; // fuchsia-900 : fuchsia-200
        } else if (winner === 'ref') {
            if (maxPct >= 0.65) return isDark ? '#8b5cf6' : '#7c3aed'; // violet-500 : violet-600
            if (maxPct >= 0.60) return isDark ? '#6d28d9' : '#a78bfa'; // violet-700 : violet-400
            if (maxPct >= 0.55) return isDark ? '#4c1d95' : '#ddd6fe'; // violet-900 : violet-200
        }
        return isDark ? '#1e293b' : '#cbd5e1'; // slate-800 : slate-300
    }

    getStyle(feature) {
        let pcts = {
            dem: feature.properties.dem_pct || 0,
            rep: feature.properties.rep_pct || 0,
            lib: feature.properties.lib_pct || 0,
            grn: feature.properties.grn_pct || 0,
            con: feature.properties.con_pct || 0,
            ref: feature.properties.ref_pct || 0
        };

        if (pcts.dem === 0 && pcts.rep === 0 && feature.properties.dem_pct !== undefined) {
             pcts.dem = feature.properties.dem_pct;
             pcts.rep = 1 - pcts.dem;
        }

        if (this.app.uiController.activeMode === 'tuned') {
            const stateData = this.app.dataService.stateLeaderboardData[this.app.uiController.activeState];
            const swing = stateData ? (stateData.tuned_eg - stateData.optimized_eg) : 0.0;
            pcts.dem = Math.max(0.02, Math.min(0.98, pcts.dem - swing));
            pcts.rep = Math.max(0.02, Math.min(0.98, pcts.rep + swing));
        }
        const isDark = document.body.classList.contains('dark');
        return {
            fillColor: this.getDistrictColor(pcts, isDark),
            weight: 1.5,
            opacity: 0.95,
            color: isDark ? '#475569' : '#64748b',
            fillOpacity: 0.80
        };
    }

    onEachNationalFeature(feature, layer) {
        layer.on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 3.0, color: '#818cf8', fillOpacity: 0.85 });
                l.bringToFront();
                
                const name = feature.properties.name;
                const key = name.toLowerCase().replace(/ /g, '_');
                
                const data = this.app.dataService.getOrGenerateStateData(key, name);
                const stateMetrics = this.app.dataService.metricsDatabase[key];
                
                const card = document.getElementById('district-hover-card');
                const instructions = document.getElementById('district-instructions-card');
                instructions.classList.add('hidden');
                card.classList.remove('hidden');
                
                document.getElementById('hover-district-title').innerText = name;
                document.getElementById('hover-pop').innerText = `${this.app.dataService.districtCounts[key] || 1} Congressional Districts`;
                document.getElementById('hover-vap').innerText = 'Detailed metrics enabled';
                
                let eg = this.app.uiController.activeMode === 'enacted' ? data.enacted_eg : data.optimized_eg;
                let compactness = this.app.uiController.activeMode === 'enacted' ? data.enacted_compac : data.optimized_compac;
                let splits = this.app.uiController.activeMode === 'enacted' ? data.enacted_splits : data.optimized_splits;
                
                if (stateMetrics) {
                    const k = this.app.uiController.activeMode === 'enacted' ? 'enacted' : `optimized_${this.app.uiController.activeCriteria}`;
                    if (stateMetrics[k]) {
                        eg = stateMetrics[k].efficiency_gap;
                        compactness = stateMetrics[k].avg_compactness;
                        splits = stateMetrics[k].county_splits;
                    }
                }
                
                document.getElementById('hover-partisan-lean').innerText = eg === 0.0 ? 'Bias (EG): 0.0% Fair/Neutral' : `Bias (EG): ${Math.abs(eg * 100).toFixed(1)}% ${eg > 0 ? 'Rep Lean' : 'Dem Lean'}`;
                
                const demPct = Math.max(0.1, Math.min(0.9, 0.5 - eg));
                const repPct = 1.0 - demPct;
                
                document.getElementById('hover-dem-pct').innerText = `D: ${(demPct * 100).toFixed(1)}%`;
                document.getElementById('hover-rep-pct').innerText = `R: ${(repPct * 100).toFixed(1)}%`;
                document.getElementById('hover-dem-bar').style.width = `${demPct * 100}%`;
                document.getElementById('hover-rep-bar').style.width = `${repPct * 100}%`;
                document.getElementById('hover-minority-pct').innerText = `${splits} county splits`;
                document.getElementById('hover-compactness').innerText = compactness.toFixed(3);
            },
            mouseout: (e) => {
                this.nationalLayer.resetStyle(e.target);
                this.app.uiController.updateHoverCard(null);
            },
            click: (e) => {
                const name = feature.properties.name;
                const key = name.toLowerCase().replace(/ /g, '_');
                this.app.uiController.selectState(key);
            }
        });
    }

    onEachFeature(feature, layer) {
        layer.on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 3.5, color: '#818cf8', fillOpacity: 0.85 });
                l.bringToFront();
                this.app.uiController.updateHoverCard(feature.properties);
            },
            mouseout: (e) => {
                const l = e.target;
                const activeLayer = this.layers[this.app.uiController.getActiveLayerKey()];
                if (activeLayer) activeLayer.resetStyle(l);
                this.app.uiController.updateHoverCard(null);
            },
            click: (e) => {
                this.map.flyToBounds(e.target.getBounds(), {
                    duration: 1.5,
                    easeLinearity: 0.1
                });
            }
        });
    }

    async loadStateGeometries(stateKey) {
        const data = this.app.dataService.getOrGenerateStateData(stateKey, this.app.dataService.formatStateName(stateKey));
        
        this.layers = {};
        this.layerFeatures = {};
        
        const isPrecomputed = !!this.app.dataService.metricsDatabase[stateKey];
        const configs = ['enacted', 'optimized_headcount', 'optimized_age', 'optimized_race', 'optimized_county', 'optimized_all'];
        
        if (isPrecomputed) {
            this.app.dataService.globalMetrics = this.app.dataService.metricsDatabase[stateKey];
            
            const fetchPromises = configs.map(config => {
                let filename = config.includes('optimized') ? config : 'enacted_districts';
                if (config.includes('optimized')) {
                    filename = `optimized_districts_${config.replace('optimized_', '')}`;
                }
                const fullFilename = `${stateKey}_${filename}`;
                return fetch(`./data/${fullFilename}.geojson`).then(res => res.json());
            });
            
            const datasets = await Promise.all(fetchPromises);
            configs.forEach((config, idx) => {
                const geojson = datasets[idx];
                this.layerFeatures[config] = geojson.features;
                const myRenderer = L.canvas();
                // @ts-ignore
                this.layers[config] = L.geoJSON(geojson, {
                    renderer: myRenderer,
                    style: (f) => this.getStyle(f),
                    onEachFeature: (f, l) => this.onEachFeature(f, l)
                });
                // Monkey patch to allow leaflet-side-by-side to access the underlying canvas DOM element
                // @ts-ignore
                this.layers[config].getContainer = function() { return myRenderer._container; };
            });
        } else {
            const feature = this.app.dataService.usStatesDataCache ? this.app.dataService.usStatesDataCache.features.find(f => f.properties.name.toLowerCase().replace(/ /g, '_') === stateKey) : null;
            
            // Offload dynamic generation to Web Worker
            const workerData = await this.app.dataService.generateWithWorker(feature, stateKey);
            const enactedCollection = workerData.enactedCollection;
            const optimizedCollection = workerData.optimizedCollection;
            const stateMetrics = workerData.metrics;
            
            stateMetrics.enacted.efficiency_gap = data.enacted_eg;
            stateMetrics.optimized_all.efficiency_gap = data.optimized_eg;
            stateMetrics.enacted.mean_median_diff = data.enacted_mmd;
            stateMetrics.optimized_all.mean_median_diff = data.optimized_mmd;
            
            this.app.dataService.metricsDatabase[stateKey] = stateMetrics;
            this.app.dataService.globalMetrics = stateMetrics;
            
            configs.forEach(config => {
                const isOpt = config.includes('optimized');
                const geojson = isOpt ? optimizedCollection : enactedCollection;
                this.layerFeatures[config] = geojson.features;
                const myRenderer = L.canvas();
                // @ts-ignore
                this.layers[config] = L.geoJSON(geojson, {
                    renderer: myRenderer,
                    style: (f) => this.getStyle(f),
                    onEachFeature: (f, l) => this.onEachFeature(f, l)
                });
                // Monkey patch to allow leaflet-side-by-side to access the underlying canvas DOM element
                // @ts-ignore
                this.layers[config].getContainer = function() { return myRenderer._container; };
            });
            
            data.enacted_eg = stateMetrics.enacted.efficiency_gap;
            data.enacted_comp = stateMetrics.enacted.competitive_seats;
            data.enacted_compac = stateMetrics.enacted.avg_compactness;
            data.optimized_eg = stateMetrics.optimized_all.efficiency_gap;
            data.optimized_comp = stateMetrics.optimized_all.competitive_seats;
            data.optimized_compac = stateMetrics.optimized_all.avg_compactness;
            
            this.app.uiController.populateLeaderboardTable();
        }
        
        document.getElementById('detail-state-name').innerText = data.name;
        this.app.uiController.updateSummaryDashboard();
    }
    
    toggleSwipeMode() {
        if (!this.swipeControl) {
            // Enable swipe compare
            Object.values(this.layers).forEach(layer => this.map.removeLayer(layer));
            
            const leftLayer = this.layers['enacted'];
            const rightLayer = this.layers['optimized_all'];
            
            leftLayer.addTo(this.map);
            rightLayer.addTo(this.map);
            
            // @ts-ignore
            this.swipeControl = L.control.sideBySide(leftLayer, rightLayer);
            this.swipeControl.addTo(this.map);
        } else {
            // Disable swipe compare
            this.map.removeControl(this.swipeControl);
            this.swipeControl = null;
            
            this.map.removeLayer(this.layers['enacted']);
            this.map.removeLayer(this.layers['optimized_all']);
            
            const activeKey = this.app.uiController.getActiveLayerKey();
            if (this.layers[activeKey]) {
                this.map.addLayer(this.layers[activeKey]);
            }
        }
    }
}
