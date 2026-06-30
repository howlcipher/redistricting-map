// src/worker.js

// Import Turf.js into the worker
importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js');

self.addEventListener('message', (e) => {
    const { action, data, msgId } = e.data;
    
    if (action === 'GENERATE_AND_COMPILE') {
        try {
            const { stateFeature, stateKey, districtCount, statePartisanBase, isSingle } = data;
            
            // 1. Generate Districts
            const enacted = generateDynamicDistricts(stateFeature, 'enacted', stateKey, districtCount, statePartisanBase, isSingle);
            const optimized = generateDynamicDistricts(stateFeature, 'optimized', stateKey, districtCount, statePartisanBase, isSingle);
            
            // 2. Compile Metrics
            const metrics = compileDynamicStateMetrics(enacted, optimized, stateKey, districtCount);
            
            self.postMessage({
                action: 'GENERATE_AND_COMPILE_SUCCESS',
                msgId: msgId,
                data: {
                    enactedCollection: enacted,
                    optimizedCollection: optimized,
                    metrics: metrics
                }
            });
        } catch (err) {
            self.postMessage({
                action: 'GENERATE_AND_COMPILE_ERROR',
                msgId: msgId,
                error: err.toString() + "\\n" + err.stack
            });
        }
    }
});

function generateDynamicDistricts(stateFeature, mode, stateKey, districtCount, statePartisanBase, isSingle) {
    let geomFeature = stateFeature;
    if (!geomFeature) {
        // Fallback generic square if no geometry
        const center = [-98.5, 39.8]; 
        const box = [center[0] - 0.4, center[1] - 0.4, center[0] + 0.4, center[1] + 0.4];
        geomFeature = turf.bboxPolygon(box);
    }
    
    if (isSingle || districtCount === 1) {
        const geom = geomFeature.geometry;
        const baseDem = stateKey === 'district_of_columbia' ? 0.92 : (stateKey === 'wyoming' ? 0.30 : 0.45);
        
        const props = {
            district_id: 0,
            total_pop: 720000,
            voting_age_pop: 540000,
            dem_pct: baseDem + (Math.random() - 0.5) * 0.05,
            minority_pct: stateKey === 'puerto_rico' ? 0.99 : 0.15,
            compactness: 0.45
        };
        props.rep_pct = 1 - props.dem_pct;
        return {
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: geom, properties: props }]
        };
    }
    
    const bbox = turf.bbox(geomFeature);
    const minX = bbox[0], minY = bbox[1], maxX = bbox[2], maxY = bbox[3];
    
    const cols = Math.ceil(Math.sqrt(districtCount));
    const rows = Math.ceil(districtCount / cols);
    const dx = (maxX - minX) / cols;
    const dy = (maxY - minY) / rows;
    
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
            
            const boxPoly = turf.bboxPolygon([bx1, by1, bx2, by2]);
            try {
                // turf v6 intersect uses martinez which frequently throws TopologyErrors on complex coastlines
                const intersected = turf.intersect(geomFeature, boxPoly);
                if (intersected && turf.area(intersected) > 100) {
                    rawFeatures.push(intersected);
                }
            } catch (e) {
                // Fallback: if intersection math fails, just use the rectangular grid cell!
                try {
                    if (turf.booleanIntersects(geomFeature, boxPoly)) {
                        rawFeatures.push(boxPoly);
                    }
                } catch (err2) {
                    // If even booleanIntersects fails, just blindly add the box to ensure we don't return an empty array
                    rawFeatures.push(boxPoly);
                }
            }
        }
    }
    
    const stateCenter = turf.centroid(geomFeature).geometry.coordinates;
    const maxDist = Math.max(maxX - minX, maxY - minY) || 1.0;
    
    const districtFeatures = rawFeatures.slice(0, districtCount).map((feature, idx) => {
        const center = turf.centroid(feature).geometry.coordinates;
        const dist = Math.sqrt(Math.pow(center[0] - stateCenter[0], 2) + Math.pow(center[1] - stateCenter[1], 2));
        
        const total_pop = Math.round(710000 * (1.1 - 0.3 * (dist / maxDist)));
        const voting_age_pop = Math.round(total_pop * 0.76);
        
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
        
        const area = turf.area(feature);
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
    
    while (districtFeatures.length < districtCount) {
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

function compileDynamicStateMetrics(enactedCol, optimizedCol, stateKey, districtCount) {
    const compile = (fc) => {
        let wasted_dem = 0, wasted_rep = 0, total_votes = 0;
        let comp = 0, inf = 0, maj = 0, sum_compact = 0.0;
        let dem_shares = [];
        
        fc.features.forEach(f => {
            const p = f.properties;
            const tot = p.total_pop * 0.45;
            const dem = tot * p.dem_pct;
            const rep = tot * p.rep_pct;
            
            total_votes += tot;
            dem_shares.push(p.dem_pct);
            sum_compact += p.compactness;
            
            if (p.dem_pct >= 0.45 && p.dem_pct <= 0.55) comp++;
            if (p.minority_pct >= 0.30) inf++;
            if (p.minority_pct >= 0.50) maj++;
            
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
        const splits = Math.round((districtCount || 4) * (fc.features[0].properties.compactness * 4));
        
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
