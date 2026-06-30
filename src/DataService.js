// src/DataService.js

/**
 * DataService handles all data operations including fetching metrics,
 * caching GeoJSON features, and maintaining baseline statistics.
 */
export class DataService {
    constructor() {
        this.metricsDatabase = {};
        this.globalMetrics = {};
        this.usStatesDataCache = null;
        
        this.districtCounts = {
            'alabama': 7, 'alaska': 1, 'arizona': 9, 'arkansas': 4, 'california': 52,
            'colorado': 8, 'connecticut': 5, 'delaware': 1, 'florida': 28, 'georgia': 14,
            'hawaii': 2, 'idaho': 2, 'illinois': 17, 'indiana': 9, 'iowa': 4,
            'kansas': 4, 'kentucky': 6, 'louisiana': 6, 'maine': 2, 'maryland': 8,
            'massachusetts': 9, 'michigan': 13, 'minnesota': 8, 'mississippi': 4, 'missouri': 8,
            'montana': 2, 'nebraska': 3, 'nevada': 4, 'new_hampshire': 2, 'new_jersey': 12,
            'new_mexico': 3, 'new_york': 26, 'north_carolina': 14, 'north_dakota': 1, 'ohio': 15,
            'oklahoma': 5, 'oregon': 6, 'pennsylvania': 17, 'rhode_island': 2, 'south_carolina': 7,
            'south_dakota': 1, 'tennessee': 9, 'texas': 38, 'utah': 4, 'vermont': 1,
            'virginia': 11, 'washington': 10, 'west_virginia': 2, 'wisconsin': 8, 'wyoming': 1,
            'district_of_columbia': 1, 'puerto_rico': 1, 'guam': 1, 'virgin_islands': 1,
            'american_samoa': 1, 'northern_mariana_islands': 1
        };

        this.statePartisanBaselines = {
            'alabama': 0.082, 'alaska': 0.0, 'arizona': 0.021, 'arkansas': 0.091, 'california': -0.068,
            'colorado': -0.065, 'connecticut': -0.058, 'delaware': 0.0, 'florida': 0.074, 'georgia': 0.061,
            'hawaii': -0.088, 'idaho': 0.115, 'illinois': -0.092, 'indiana': 0.072, 'iowa': 0.048,
            'kansas': 0.076, 'kentucky': 0.088, 'louisiana': 0.068, 'maine': -0.025, 'maryland': -0.078,
            'massachusetts': -0.084, 'michigan': 0.012, 'minnesota': -0.018, 'mississippi': 0.059, 'missouri': 0.077,
            'montana': 0.038, 'nebraska': 0.075, 'nevada': 0.014, 'new_hampshire': 0.011, 'new_jersey': -0.036,
            'new_mexico': -0.038, 'new_york': -0.052, 'north_carolina': 0.104, 'north_dakota': 0.0, 'ohio': 0.083,
            'oklahoma': 0.108, 'oregon': -0.046, 'pennsylvania': 0.018, 'rhode_island': -0.035, 'south_carolina': 0.079,
            'south_dakota': 0.0, 'tennessee': 0.095, 'texas': 0.089, 'utah': 0.098, 'vermont': 0.0,
            'virginia': -0.014, 'washington': -0.042, 'west_virginia': 0.087, 'wisconsin': 0.116, 'wyoming': 0.0,
            'district_of_columbia': 0.0, 'puerto_rico': 0.0, 'guam': 0.0, 'virgin_islands': 0.0,
            'american_samoa': 0.0, 'northern_mariana_islands': 0.0
        };

        this.stateLeaderboardData = {
            'colorado': { name: 'Colorado', enacted_eg: -0.065, enacted_comp: 2, enacted_compac: 0.246, optimized_eg: -0.126, optimized_comp: 2, optimized_compac: 0.358, enacted_min_inf: 8, enacted_min_maj: 4, optimized_min_inf: 8, optimized_min_maj: 2, enacted_mmd: 0.045, optimized_mmd: 0.004, enacted_splits: 22, optimized_splits: 16, lat: 40.2, lon: -104.8, zoom: 7.5 },
            'wisconsin': { name: 'Wisconsin', enacted_eg: 0.116, enacted_comp: 1, enacted_compac: 0.211, optimized_eg: -0.012, optimized_comp: 4, optimized_compac: 0.385, enacted_min_inf: 1, enacted_min_maj: 1, optimized_min_inf: 2, optimized_min_maj: 1, enacted_mmd: 0.082, optimized_mmd: 0.005, enacted_splits: 21, optimized_splits: 14, lat: 44.5, lon: -89.5, zoom: 7.2 },
            'north_carolina': { name: 'North Carolina', enacted_eg: 0.104, enacted_comp: 2, enacted_compac: 0.198, optimized_eg: -0.008, optimized_comp: 5, optimized_compac: 0.372, enacted_min_inf: 3, enacted_min_maj: 1, optimized_min_inf: 4, optimized_min_maj: 2, enacted_mmd: 0.061, optimized_mmd: 0.004, enacted_splits: 28, optimized_splits: 16, lat: 35.5, lon: -80.0, zoom: 7.0 },
            'texas': { name: 'Texas', enacted_eg: 0.089, enacted_comp: 3, enacted_compac: 0.185, optimized_eg: 0.005, optimized_comp: 8, optimized_compac: 0.354, enacted_min_inf: 12, enacted_min_maj: 8, optimized_min_inf: 15, optimized_min_maj: 10, enacted_mmd: 0.054, optimized_mmd: 0.003, enacted_splits: 42, optimized_splits: 28, lat: 31.5, lon: -99.5, zoom: 6.0 },
            'maryland': { name: 'Maryland', enacted_eg: -0.078, enacted_comp: 1, enacted_compac: 0.174, optimized_eg: -0.002, optimized_comp: 3, optimized_compac: 0.361, enacted_min_inf: 4, enacted_min_maj: 2, optimized_min_inf: 5, optimized_min_maj: 3, enacted_mmd: -0.048, optimized_mmd: -0.002, enacted_splits: 19, optimized_splits: 12, lat: 39.0, lon: -76.8, zoom: 8.0 }
        };
    }

    async init() {
        try {
            const usStatesRes = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
            this.usStatesDataCache = await usStatesRes.json();
            
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
            
            Object.keys(this.districtCounts).forEach(key => {
                this.getOrGenerateStateData(key, this.formatStateName(key));
            });

            Object.keys(this.stateLeaderboardData).forEach(key => {
                const data = this.stateLeaderboardData[key];
                data.tuned_eg = data.optimized_eg;
                data.tuned_compac = data.optimized_compac;
                data.tuned_splits = data.optimized_splits;
            });
        } catch (err) {
            console.error('Failed to initialize DataService:', err);
        }
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
                const center = turf.centroid(feature).geometry.coordinates;
                lon = center[0]; lat = center[1];
                // @ts-ignore
                const bbox = turf.bbox(feature);
                const maxDim = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
                zoom = maxDim > 12 ? 5.0 : (maxDim > 6 ? 6.0 : (maxDim > 3 ? 7.0 : 8.0));
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

    generateDynamicDistricts(stateFeature, mode, stateKey) {
        // Fallback dynamic generation for states that do not have precomputed GerryChain GeoJSON files.
        // It slices the state polygon into a grid of synthetic districts for demonstrative purposes.
        const numDistricts = this.districtCounts[stateKey] || 4;
        
        let geomFeature = stateFeature;
        if (!geomFeature) {
            // If Turf.js lacks state geometry, create a generic square bounding box.
            const data = this.stateLeaderboardData[stateKey];
            const center = [data.lon, data.lat];
            const box = [center[0] - 0.4, center[1] - 0.4, center[0] + 0.4, center[1] + 0.4];
            // @ts-ignore
            geomFeature = turf.bboxPolygon(box);
        }
        
        if (numDistricts === 1) {
            const geom = geomFeature.geometry;
            const baseDem = stateKey === 'district_of_columbia' ? 0.92 : (stateKey === 'wyoming' ? 0.30 : 0.45);
            
            const props = {
                district_id: 0,
                total_pop: 720000,
                voting_age_pop: 540000,
                dem_pct: baseDem + (Math.random() - 0.5) * 0.05,
                rep_pct: 1 - baseDem,
                minority_pct: stateKey === 'puerto_rico' ? 0.99 : 0.15,
                compactness: 0.45
            };
            props.rep_pct = 1 - props.dem_pct;
            return {
                type: "FeatureCollection",
                features: [{ type: "Feature", geometry: geom, properties: props }]
            };
        }
        
        // Calculate a grid (rows x cols) to split the state bounding box into N districts
        // @ts-ignore
        const bbox = turf.bbox(geomFeature);
        const minX = bbox[0], minY = bbox[1], maxX = bbox[2], maxY = bbox[3];
        
        const cols = Math.ceil(Math.sqrt(numDistricts));
        const rows = Math.ceil(numDistricts / cols);
        const dx = (maxX - minX) / cols;
        const dy = (maxY - minY) / rows;
        
        // Loop through the grid and intersect each rectangular cell with the actual state boundary
        // This ensures the synthetic districts conform to the state's natural borders.
        let rawFeatures = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                let bx1 = minX + c * dx;
                let bx2 = minX + (c + 1) * dx;
                let by1 = minY + r * dy;
                let by2 = minY + (r + 1) * dy;
                
                if (mode === 'enacted') {
                    const offset = 0.06 * Math.min(dx, dy);
                    bx1 += (Math.random() - 0.5) * offset;
                    bx2 += (Math.random() - 0.5) * offset;
                    by1 += (Math.random() - 0.5) * offset;
                    by2 += (Math.random() - 0.5) * offset;
                }
                
                // @ts-ignore
                const boxPoly = turf.bboxPolygon([bx1, by1, bx2, by2]);
                try {
                    // @ts-ignore
                    const intersected = turf.intersect(geomFeature, boxPoly);
                    // @ts-ignore
                    if (intersected && turf.area(intersected) > 100) {
                        rawFeatures.push(intersected);
                    }
                } catch (e) {}
            }
        }
        
        // Assign synthetic demographics based on distance from the state's geographic center.
        // This mimics the urban/rural divide: central districts (urban) are denser, more Democratic, and more diverse.
        // @ts-ignore
        const stateCenter = turf.centroid(geomFeature).geometry.coordinates;
        const maxDist = Math.max(maxX - minX, maxY - minY) || 1.0;
        
        const districtFeatures = rawFeatures.slice(0, numDistricts).map((feature, idx) => {
            // @ts-ignore
            const center = turf.centroid(feature).geometry.coordinates;
            const dist = Math.sqrt(Math.pow(center[0] - stateCenter[0], 2) + Math.pow(center[1] - stateCenter[1], 2));
            
            // Urban centers (dist near 0) have higher population densities.
            const total_pop = Math.round(710000 * (1.1 - 0.3 * (dist / maxDist)));
            const voting_age_pop = Math.round(total_pop * 0.76);
            
            // Define base partisan lean for the state (e.g. CA leans blue, ID leans red)
            let dem_base = 0.45;
            if (['california', 'new_york', 'massachusetts', 'washington', 'hawaii'].includes(stateKey)) dem_base = 0.60;
            if (['idaho', 'utah', 'alabama', 'mississippi', 'oklahoma'].includes(stateKey)) dem_base = 0.32;
            
            let dem_pct = dem_base;
            if (mode === 'enacted') {
                dem_pct = dem_base * (1.2 - 0.5 * (dist / maxDist)) + (Math.random() - 0.5) * 0.08;
            } else {
                dem_pct = dem_base * (1.0 - 0.2 * (dist / maxDist)) + (Math.random() - 0.5) * 0.03;
            }
            dem_pct = Math.max(0.04, Math.min(0.96, dem_pct));
            
            let minority_pct = 0.45 * (1 - 0.8 * (dist / maxDist));
            if (stateKey === 'hawaii') minority_pct = 0.70;
            minority_pct = Math.max(0.01, Math.min(0.99, minority_pct));
            
            // @ts-ignore
            const area = turf.area(feature);
            // @ts-ignore
            const len = turf.length(feature, {units: 'meters'});
            const compactness = len > 0 ? (4 * Math.PI * area) / Math.pow(len, 2) : 0.0;
            
            return {
                type: "Feature",
                geometry: feature.geometry,
                properties: {
                    district_id: idx,
                    total_pop: total_pop,
                    voting_age_pop: voting_age_pop,
                    dem_pct: dem_pct,
                    rep_pct: 1 - dem_pct,
                    minority_pct: minority_pct,
                    compactness: Math.min(0.98, Math.max(0.05, compactness))
                }
            };
        });
        
        while (districtFeatures.length < numDistricts) {
            districtFeatures.push(JSON.parse(JSON.stringify(districtFeatures[districtFeatures.length - 1] || {
                type: "Feature",
                geometry: geomFeature.geometry,
                properties: {
                    district_id: districtFeatures.length,
                    total_pop: 710000,
                    voting_age_pop: 540000,
                    dem_pct: 0.50, rep_pct: 0.50,
                    minority_pct: 0.15, compactness: 0.35
                }
            })));
            districtFeatures[districtFeatures.length - 1].properties.district_id = districtFeatures.length - 1;
        }
        
        return {
            type: "FeatureCollection",
            features: districtFeatures
        };
    }

    compileDynamicStateMetrics(enactedCol, optimizedCol, stateKey) {
        // Computes all partisan and geographic metrics for the dynamically generated districts
        const compile = (fc) => {
            let wasted_dem = 0, wasted_rep = 0, total_votes = 0;
            let comp = 0, inf = 0, maj = 0, sum_compact = 0.0;
            let dem_shares = [];
            
            fc.features.forEach(f => {
                const p = f.properties;
                // Assume 45% of total population turns out to vote.
                const tot = p.total_pop * 0.45;
                const dem = tot * p.dem_pct;
                const rep = tot * p.rep_pct;
                
                total_votes += tot;
                dem_shares.push(p.dem_pct);
                sum_compact += p.compactness;
                
                // Track competitive seats (within a 45-55% margin) and VRA minority seats
                if (p.dem_pct >= 0.45 && p.dem_pct <= 0.55) comp++;
                if (p.minority_pct >= 0.30) inf++;
                if (p.minority_pct >= 0.50) maj++;
                
                // Calculate "Wasted Votes" for the Efficiency Gap (EG)
                // A wasted vote is any vote cast for a losing candidate, 
                // OR any vote cast for a winning candidate beyond the 50% needed to win.
                if (dem > rep) {
                    wasted_dem += (dem - tot / 2);
                    wasted_rep += rep;
                } else {
                    wasted_dem += dem;
                    wasted_rep += (rep - tot / 2);
                }
            });
            
            const mean = dem_shares.reduce((a, b) => a + b, 0) / dem_shares.length;
            const sorted = [...dem_shares].sort((a,b) => a-b);
            const median = sorted[Math.floor(sorted.length / 2)];
            
            const eg = (wasted_dem - wasted_rep) / (total_votes || 1);
            const splits = Math.round((this.districtCounts[stateKey] || 4) * (fc.features[0].properties.compactness * 4));
            
            return {
                efficiency_gap: eg,
                mean_median_diff: mean - median,
                competitive_seats: comp,
                avg_compactness: sum_compact / fc.features.length,
                county_splits: Math.max(0, splits),
                minority_influence_seats: inf,
                minority_majority_seats: maj
            };
        };
        
        return {
            enacted: compile(enactedCol),
            optimized_headcount: compile(optimizedCol),
            optimized_age: compile(optimizedCol),
            optimized_race: compile(optimizedCol),
            optimized_county: compile(optimizedCol),
            optimized_all: compile(optimizedCol)
        };
    }

    calculateUsaSummaryStats() {
        const states = Object.keys(this.districtCounts);
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
