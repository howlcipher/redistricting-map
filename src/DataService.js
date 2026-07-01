// src/DataService.js
import localforage from 'localforage';

/**
 * DataService handles all data operations including fetching metrics,
 * caching GeoJSON features, and maintaining baseline statistics.
 */
export class DataService {
    constructor() {
        this.cache = localforage.createInstance({
            name: "RedistrictingCache",
            storeName: "geojson_data"
        });
        this.metricsDatabase = {};
        this.globalMetrics = {};
        this.usStatesDataCache = null;
        
        this.districtCounts = {};
        this.statePartisanBaselines = {};
        this.stateLeaderboardData = {};
        this.historicalData = [];
        this.activeDate = new Date().toISOString().split('T')[0];
    }

    async init() {
        try {
            const configRes = await fetch('./config.json');
            const config = await configRes.json();
            this.historicalData = config.historical_data;
            this.applyHistoricalData(this.activeDate);
            
            const cacheKey = 'us-states-geojson';
            let cachedGeoJSON = await this.cache.getItem(cacheKey);
            
            if (cachedGeoJSON) {
                console.log('Loaded state geometries from IndexedDB cache');
                this.usStatesDataCache = cachedGeoJSON;
            } else {
                console.log('Fetching state geometries from network...');
                const usStatesRes = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
                this.usStatesDataCache = await usStatesRes.json();
                
                try {
                    await this.cache.setItem(cacheKey, this.usStatesDataCache);
                    console.log('Saved state geometries to IndexedDB cache');
                } catch (e) {
                    console.warn('Failed to save to IndexedDB cache:', e);
                }
            }
            
            const territoryInsets = {
                'puerto_rico': { name: 'Puerto Rico', lat: 24.5, lon: -82.0 },
                'virgin_islands': { name: 'Virgin Islands', lat: 24.5, lon: -80.0 },
                'guam': { name: 'Guam', lat: 24.5, lon: -124.0 },
                'northern_mariana_islands': { name: 'Northern Mariana Islands', lat: 26.5, lon: -124.0 },
                'american_samoa': { name: 'American Samoa', lat: 22.5, lon: -124.0 }
            };
            
            const createInsetPolygon = (lon, lat, size = 1.2) => {
                const half = size / 2;
                return {
                    type: "Polygon",
                    coordinates: [[
                        [lon - half, lat - half], [lon + half, lat - half],
                        [lon + half, lat + half], [lon - half, lat + half],
                        [lon - half, lat - half]
                    ]]
                };
            };
            
            Object.keys(territoryInsets).forEach(key => {
                const exists = this.usStatesDataCache.features.some(f => f.properties.name.toLowerCase().replace(/ /g, '_') === key);
                if (!exists) {
                    const info = territoryInsets[key];
                    this.usStatesDataCache.features.push({
                        type: "Feature",
                        id: key,
                        properties: { name: info.name, density: 100 },
                        geometry: createInsetPolygon(info.lon, info.lat)
                    });
                }
            });

            const metricsRes = await fetch('./data/metrics.json').catch(() => ({ json: async () => ({}) }));
            this.metricsDatabase = await metricsRes.json();
            
        } catch (err) {
            console.error('Failed to initialize DataService:', err);
        }
    }

    applyHistoricalData(dateStr) {
        this.activeDate = dateStr;
        let beforeBlock = null;
        let afterBlock = null;
        
        // historicalData is assumed to be sorted by date descending (newest first)
        for (let i = 0; i < this.historicalData.length; i++) {
            const block = this.historicalData[i];
            if (dateStr >= block.date) {
                beforeBlock = block;
                afterBlock = i > 0 ? this.historicalData[i - 1] : block;
                break;
            }
        }
        
        if (!beforeBlock) {
            beforeBlock = this.historicalData[this.historicalData.length - 1];
            afterBlock = beforeBlock;
        }

        // Deep copy the base structure
        this.districtCounts = JSON.parse(JSON.stringify(beforeBlock.district_counts || {}));
        this.statePartisanBaselines = JSON.parse(JSON.stringify(beforeBlock.state_partisan_baselines || {}));
        this.stateLeaderboardData = JSON.parse(JSON.stringify(beforeBlock.state_leaderboard_data || {}));

        // Interpolate partisan baselines if between two blocks
        if (beforeBlock !== afterBlock && beforeBlock.date !== afterBlock.date) {
            const t1 = new Date(beforeBlock.date).getTime();
            const t2 = new Date(afterBlock.date).getTime();
            const t = new Date(dateStr).getTime();
            const ratio = Math.max(0, Math.min(1, (t - t1) / (t2 - t1)));
            
            Object.keys(this.statePartisanBaselines).forEach(state => {
                const val1 = beforeBlock.state_partisan_baselines[state] || 0.0;
                const val2 = afterBlock.state_partisan_baselines[state] !== undefined ? afterBlock.state_partisan_baselines[state] : val1;
                this.statePartisanBaselines[state] = val1 + (val2 - val1) * ratio;
                
                if (this.stateLeaderboardData[state] && afterBlock.state_leaderboard_data && afterBlock.state_leaderboard_data[state]) {
                    const eg1 = this.stateLeaderboardData[state].enacted_eg || 0.0;
                    const eg2 = afterBlock.state_leaderboard_data[state].enacted_eg !== undefined ? afterBlock.state_leaderboard_data[state].enacted_eg : eg1;
                    this.stateLeaderboardData[state].enacted_eg = eg1 + (eg2 - eg1) * ratio;
                }
            });
        }
        
        // Ensure all state data structures exist
        Object.keys(this.districtCounts).forEach(key => {
            this.getOrGenerateStateData(key, this.formatStateName(key));
        });

        // Initialize tuned properties
        Object.keys(this.stateLeaderboardData).forEach(key => {
            const data = this.stateLeaderboardData[key];
            data.tuned_eg = data.optimized_eg;
            data.tuned_compac = data.optimized_compac;
            data.tuned_splits = data.optimized_splits;
        });
    }

    formatStateName(key) {
        const specialNames = {
            'district_of_columbia': 'District of Columbia', 'puerto_rico': 'Puerto Rico',
            'virgin_islands': 'Virgin Islands', 'american_samoa': 'American Samoa',
            'northern_mariana_islands': 'Northern Mariana Islands'
        };
        if (specialNames[key]) return specialNames[key];
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    getOrGenerateStateData(stateKey, name) {
        if (this.stateLeaderboardData[stateKey]) return this.stateLeaderboardData[stateKey];
        
        const coords = {
            'district_of_columbia': { lat: 38.9072, lon: -77.0369, zoom: 11.0 },
            'puerto_rico': { lat: 18.2208, lon: -66.5901, zoom: 8.5 },
            'guam': { lat: 13.4443, lon: 144.7937, zoom: 10.0 },
            'virgin_islands': { lat: 18.3358, lon: -64.8963, zoom: 9.5 },
            'american_samoa': { lat: -14.2710, lon: -170.1322, zoom: 10.0 },
            'northern_mariana_islands': { lat: 15.0979, lon: 145.6739, zoom: 9.0 }
        };
        
        let lat = 39.8, lon = -98.5, zoom = 6.0;
        if (coords[stateKey]) {
            lat = coords[stateKey].lat; lon = coords[stateKey].lon; zoom = coords[stateKey].zoom;
        } else if (this.usStatesDataCache && this.usStatesDataCache.features) {
            const feature = this.usStatesDataCache.features.find(f => f.properties.name.toLowerCase().replace(/ /g, '_') === stateKey);
            if (feature) {
                // @ts-ignore
                try {
                    const center = turf.centroid(feature).geometry.coordinates;
                    lon = isNaN(center[0]) ? lon : center[0]; 
                    lat = isNaN(center[1]) ? lat : center[1];
                    // @ts-ignore
                    const bbox = turf.bbox(feature);
                    const maxDim = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
                    const calcZoom = maxDim > 12 ? 5.0 : (maxDim > 6 ? 6.0 : (maxDim > 3 ? 7.0 : 8.0));
                    zoom = (isNaN(calcZoom) || !isFinite(calcZoom)) ? zoom : calcZoom;
                } catch (e) {
                    // Fallback if Turf fails
                }
            }
        }
        
        const count = this.districtCounts[stateKey] || 4;
        const isSingle = count === 1;
        const baseEg = this.statePartisanBaselines[stateKey] !== undefined ? this.statePartisanBaselines[stateKey] : 0.0;
        const optEg = isSingle ? 0.0 : baseEg * 0.22;
        
        this.stateLeaderboardData[stateKey] = {
            name: name,
            enacted_eg: baseEg, enacted_comp: isSingle ? 0 : Math.round(count * 0.2), enacted_compac: isSingle ? 0.45 : (0.16 + Math.random() * 0.06),
            optimized_eg: optEg, optimized_comp: isSingle ? 0 : Math.round(count * 0.45), optimized_compac: isSingle ? 0.45 : (0.33 + Math.random() * 0.04),
            tuned_eg: optEg, tuned_compac: isSingle ? 0.45 : (0.33 + Math.random() * 0.04), tuned_splits: isSingle ? 0 : Math.round(count * 1.3),
            enacted_min_inf: isSingle ? 0 : Math.round(count * 0.3), enacted_min_maj: isSingle ? 0 : Math.round(count * 0.1),
            optimized_min_inf: isSingle ? 0 : Math.round(count * 0.35), optimized_min_maj: isSingle ? 0 : Math.round(count * 0.15),
            enacted_mmd: baseEg * 0.6, optimized_mmd: optEg * 0.6,
            enacted_splits: isSingle ? 0 : Math.round(count * 2.8), optimized_splits: isSingle ? 0 : Math.round(count * 1.3),
            lat: lat, lon: lon, zoom: zoom
        };
        
        return this.stateLeaderboardData[stateKey];
    }

    generateWithWorker(stateFeature, stateKey) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                this.worker = new Worker(new URL('./worker.js', import.meta.url));
                this.msgId = 0;
                this.callbacks = {};
                
                this.worker.addEventListener('message', (e) => {
                    const { action, msgId, data, error } = e.data;
                    if (action === 'GENERATE_AND_COMPILE_SUCCESS') {
                        if (this.callbacks[msgId]) {
                            this.callbacks[msgId].resolve(data);
                            delete this.callbacks[msgId];
                        }
                    } else if (error) {
                        if (this.callbacks[msgId]) {
                            this.callbacks[msgId].reject(error);
                            delete this.callbacks[msgId];
                        }
                    }
                });
                
                this.worker.addEventListener('error', (e) => {
                    console.error("Worker error:", e);
                    // Reject all pending callbacks
                    Object.keys(this.callbacks).forEach(id => {
                        this.callbacks[id].reject(e);
                        delete this.callbacks[id];
                    });
                });
            }
            
            const msgId = ++this.msgId;
            this.callbacks[msgId] = { resolve, reject };
            
            const count = this.districtCounts[stateKey] || 4;
            const isSingle = count === 1;
            const baseEg = this.statePartisanBaselines[stateKey] !== undefined ? this.statePartisanBaselines[stateKey] : 0.0;
            
            this.worker.postMessage({
                action: 'GENERATE_AND_COMPILE',
                msgId: msgId,
                data: {
                    stateFeature,
                    stateKey,
                    districtCount: count,
                    statePartisanBase: baseEg,
                    isSingle: isSingle
                }
            });
        });
    }

    calculateUsaSummaryStats() {
        const states = Object.keys(this.districtCounts).filter(s => 
            !['district_of_columbia', 'puerto_rico', 'guam', 'virgin_islands', 'american_samoa', 'northern_mariana_islands'].includes(s)
        );
        const configs = ['enacted', 'optimized_headcount', 'optimized_age', 'optimized_race', 'optimized_county', 'optimized_all'];
        
        let summary = {};
        configs.forEach(c => {
            let count = 0;
            let sumEg = 0.0, sumMmd = 0.0, sumComp = 0, sumCompac = 0.0, sumSplits = 0, totalDists = 0;
            
            states.forEach(s => {
                const db = this.metricsDatabase[s];
                const data = this.stateLeaderboardData[s];
                const dists = this.districtCounts[s] || 1;
                
                let eg = 0.0, mmd = 0.0, comp = 0, compac = 0.0, splits = 0;
                
                if (c === 'enacted') {
                    eg = this.statePartisanBaselines[s] !== undefined ? this.statePartisanBaselines[s] : 0.0;
                    mmd = data ? data.enacted_mmd : 0.0;
                    comp = data ? data.enacted_comp : 0;
                    compac = data ? data.enacted_compac : 0.45;
                    splits = data ? data.enacted_splits : 0;
                } else {
                    if (db && db[c]) {
                        eg = db[c].efficiency_gap;
                        mmd = db[c].mean_median_diff;
                        comp = db[c].competitive_seats;
                        compac = db[c].avg_compactness;
                        splits = db[c].county_splits;
                    } else if (data) {
                        eg = data.optimized_eg;
                        mmd = data.optimized_mmd;
                        comp = data.optimized_comp;
                        compac = data.optimized_compac;
                        splits = data.optimized_splits;
                    }
                }
                
                // Weight by districts for more accurate national average
                sumEg += (eg * dists);
                sumMmd += (mmd * dists);
                sumComp += comp;
                sumCompac += (compac * dists);
                sumSplits += splits;
                totalDists += dists;
                count++;
            });
            
            summary[c] = {
                efficiency_gap: sumEg / (totalDists || 1),
                mean_median_diff: sumMmd / (totalDists || 1),
                competitive_seats: sumComp,
                avg_compactness: sumCompac / (totalDists || 1),
                county_splits: sumSplits,
                minority_influence_seats: 0,
                minority_majority_seats: 0,
                total_districts: totalDists
            };
        });
        return summary;
    }
}
