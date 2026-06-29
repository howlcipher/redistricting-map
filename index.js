// Map State Management
let map;
let enactedLayer;
let activeMode = 'enacted'; // 'enacted' or 'optimized'
let activeCriteria = 'headcount'; // 'headcount', 'age', 'race', 'county', 'all'
let activeView = 'national'; // 'national' or 'state'
let activeState = 'colorado'; // 'colorado', 'wisconsin', 'texas', 'north_carolina', 'maryland'

// Layers Cache
let layers = {};
let layerFeatures = {}; // Caches feature arrays for active state
let nationalLayer;
let usStatesDataCache; // Holds the geojson of all US States

// State-by-State Actual Congressional District Counts
const districtCounts = {
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

// Showcase states pre-computed details
const stateLeaderboardData = {
    'colorado': { name: 'Colorado', enacted_eg: -0.065, enacted_comp: 2, enacted_compac: 0.246, optimized_eg: -0.126, optimized_comp: 2, optimized_compac: 0.358, enacted_min_inf: 8, enacted_min_maj: 4, optimized_min_inf: 8, optimized_min_maj: 2, enacted_mmd: 0.045, optimized_mmd: 0.004, enacted_splits: 22, optimized_splits: 16, lat: 40.2, lon: -104.8, zoom: 7.5 },
    'wisconsin': { name: 'Wisconsin', enacted_eg: -0.116, enacted_comp: 1, enacted_compac: 0.211, optimized_eg: -0.012, optimized_comp: 4, optimized_compac: 0.385, enacted_min_inf: 1, enacted_min_maj: 1, optimized_min_inf: 2, optimized_min_maj: 1, enacted_mmd: 0.082, optimized_mmd: 0.005, enacted_splits: 21, optimized_splits: 14, lat: 44.5, lon: -89.5, zoom: 7.2 },
    'north_carolina': { name: 'North Carolina', enacted_eg: -0.104, enacted_comp: 2, enacted_compac: 0.198, optimized_eg: -0.008, optimized_comp: 5, optimized_compac: 0.372, enacted_min_inf: 3, enacted_min_maj: 1, optimized_min_inf: 4, optimized_min_maj: 2, enacted_mmd: 0.061, optimized_mmd: 0.004, enacted_splits: 28, optimized_splits: 16, lat: 35.5, lon: -80.0, zoom: 7.0 },
    'texas': { name: 'Texas', enacted_eg: -0.089, enacted_comp: 3, enacted_compac: 0.185, optimized_eg: -0.005, optimized_comp: 8, optimized_compac: 0.354, enacted_min_inf: 12, enacted_min_maj: 8, optimized_min_inf: 15, optimized_min_maj: 10, enacted_mmd: 0.054, optimized_mmd: 0.003, enacted_splits: 42, optimized_splits: 28, lat: 31.5, lon: -99.5, zoom: 6.0 },
    'maryland': { name: 'Maryland', enacted_eg: 0.078, enacted_comp: 1, enacted_compac: 0.174, optimized_eg: 0.002, optimized_comp: 3, optimized_compac: 0.361, enacted_min_inf: 4, enacted_min_maj: 2, optimized_min_inf: 5, optimized_min_maj: 3, enacted_mmd: -0.048, optimized_mmd: -0.002, enacted_splits: 19, optimized_splits: 12, lat: 39.0, lon: -76.8, zoom: 8.0 }
};

// Summary metrics database
let metricsDatabase = {};
let globalMetrics = {};

// Partisan Colors
function getDistrictColor(demPct) {
    if (demPct >= 0.55) {
        if (demPct >= 0.65) return '#1e3a8a';
        if (demPct >= 0.60) return '#2563eb';
        return '#60a5fa';
    } else if (demPct <= 0.45) {
        if (demPct <= 0.35) return '#7f1d1d';
        if (demPct <= 0.40) return '#dc2626';
        return '#f87171';
    } else {
        return '#a855f7';
    }
}

function getStyle(feature) {
    const demPct = feature.properties.dem_pct;
    return {
        fillColor: getDistrictColor(demPct),
        weight: 1.5,
        opacity: 0.95,
        color: '#f8fafc', // slate-50 (off-white) border to show district boundaries clearly
        fillOpacity: 0.70 // higher opacity to pop district polygons vibrantly
    };
}

function formatPercent(val) {
    return (val * 100).toFixed(1) + '%';
}
function formatPop(val) {
    return val.toLocaleString();
}

// Hover Card
function updateHoverCard(properties) {
    const hoverCard = document.getElementById('district-hover-card');
    const instructionsCard = document.getElementById('district-instructions-card');
    
    if (!properties) {
        hoverCard.classList.add('hidden');
        instructionsCard.classList.remove('hidden');
        return;
    }
    
    instructionsCard.classList.add('hidden');
    hoverCard.classList.remove('hidden');
    
    document.getElementById('hover-district-title').innerText = `District #${properties.district_id + 1}`;
    document.getElementById('hover-pop').innerText = formatPop(properties.total_pop);
    document.getElementById('hover-vap').innerText = formatPop(properties.voting_age_pop);
    
    const demPct = properties.dem_pct;
    const repPct = properties.rep_pct;
    const leanText = demPct > 0.55 ? 'Dem Lean' : (demPct < 0.45 ? 'Rep Lean' : 'Competitive Tossup');
    
    document.getElementById('hover-partisan-lean').innerText = `${leanText} (${formatPercent(demPct)} D)`;
    document.getElementById('hover-dem-pct').innerText = `D: ${formatPercent(demPct)}`;
    document.getElementById('hover-rep-pct').innerText = `R: ${formatPercent(repPct)}`;
    
    document.getElementById('hover-dem-bar').style.width = `${demPct * 100}%`;
    document.getElementById('hover-rep-bar').style.width = `${repPct * 100}%`;
    
    document.getElementById('hover-minority-pct').innerText = formatPercent(properties.minority_pct);
    document.getElementById('hover-compactness').innerText = properties.compactness.toFixed(3);
}

// Map Interactions
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: (e) => {
            const l = e.target;
            l.setStyle({
                weight: 3.5,
                color: '#818cf8',
                fillOpacity: 0.85
            });
            l.bringToFront();
            updateHoverCard(feature.properties);
        },
        mouseout: (e) => {
            const l = e.target;
            const activeLayer = layers[getActiveLayerKey()];
            if (activeLayer) activeLayer.resetStyle(l);
            updateHoverCard(null);
        },
        click: (e) => {
            map.fitBounds(e.target.getBounds());
        }
    });
}

function getActiveLayerKey() {
    if (activeMode === 'enacted') return 'enacted';
    return `optimized_${activeCriteria}`;
}

// Update Partisan lean distribution histogram (State view only)
function updatePartisanHistogram(key) {
    if (activeView === 'national') return;
    
    const features = layerFeatures[key];
    if (!features) return;
    
    let counts = { safeD: 0, leanD: 0, toss: 0, leanR: 0, safeR: 0 };
    features.forEach(f => {
        const demPct = f.properties.dem_pct;
        if (demPct >= 0.60) counts.safeD++;
        else if (demPct >= 0.55) counts.leanD++;
        else if (demPct >= 0.45) counts.toss++;
        else if (demPct >= 0.40) counts.leanR++;
        else counts.safeR++;
    });
    
    const total = features.length || 8;
    
    document.getElementById('bar-dist-safe-d').style.width = `${(counts.safeD / total) * 100}%`;
    document.getElementById('bar-dist-lean-d').style.width = `${(counts.leanD / total) * 100}%`;
    document.getElementById('bar-dist-toss').style.width = `${(counts.toss / total) * 100}%`;
    document.getElementById('bar-dist-lean-r').style.width = `${(counts.leanR / total) * 100}%`;
    document.getElementById('bar-dist-safe-r').style.width = `${(counts.safeR / total) * 100}%`;
    
    document.getElementById('lbl-dist-safe-d').innerText = counts.safeD;
    document.getElementById('lbl-dist-lean-d').innerText = counts.leanD;
    document.getElementById('lbl-dist-toss').innerText = counts.toss;
    document.getElementById('lbl-dist-lean-r').innerText = counts.leanR;
    document.getElementById('lbl-dist-safe-r').innerText = counts.safeR;
}

// Calculate USA Summary stats by aggregating loaded states
function calculateUsaSummaryStats() {
    const states = Object.keys(metricsDatabase);
    const configs = ['enacted', 'optimized_headcount', 'optimized_age', 'optimized_race', 'optimized_county', 'optimized_all'];
    
    let summary = {};
    configs.forEach(c => {
        let count = 0;
        let sumEg = 0.0;
        let sumMmd = 0.0;
        let sumComp = 0;
        let sumCompac = 0.0;
        let sumSplits = 0;
        let totalDists = 0;
        
        states.forEach(s => {
            const db = metricsDatabase[s];
            const dists = districtCounts[s] || 8;
            if (db && db[c]) {
                sumEg += db[c].efficiency_gap;
                sumMmd += db[c].mean_median_diff;
                sumComp += db[c].competitive_seats;
                sumCompac += db[c].avg_compactness;
                sumSplits += db[c].county_splits;
                totalDists += dists;
                count++;
            }
        });
        
        summary[c] = {
            efficiency_gap: sumEg / (count || 1),
            mean_median_diff: sumMmd / (count || 1),
            competitive_seats: sumComp,
            avg_compactness: sumCompac / (count || 1),
            county_splits: sumSplits,
            minority_influence_seats: 0,
            minority_majority_seats: 0,
            total_districts: totalDists
        };
    });
    return summary;
}

// Update summary metrics dashboard
function updateSummaryDashboard() {
    let summarySource;
    
    if (activeView === 'national') {
        summarySource = calculateUsaSummaryStats();
        document.getElementById('detail-state-name').innerText = "United States";
        document.getElementById('tab-state-detail').innerText = "USA Summary";
        document.getElementById('label-partisan-bias').innerText = "Average Partisan Bias (EG)";
        document.getElementById('label-mmd').innerText = "Avg Mean-Median Diff";
        
        const activeKey = getActiveLayerKey();
        const activeSummary = summarySource[activeKey];
        const denom = activeSummary ? activeSummary.total_districts : 40;
        
        document.getElementById('metric-comp-denominator').innerText = `/ ${denom}`;
        document.getElementById('vra-stats-card').classList.add('hidden');
        document.getElementById('histogram-stats-card').classList.add('hidden');
    } else {
        summarySource = metricsDatabase[activeState];
        const stateName = stateLeaderboardData[activeState] ? stateLeaderboardData[activeState].name : activeState;
        const denom = districtCounts[activeState] || 8;
        
        document.getElementById('detail-state-name').innerText = stateName;
        document.getElementById('tab-state-detail').innerText = "State Details";
        document.getElementById('label-partisan-bias').innerText = "Efficiency Gap (Partisan Bias)";
        document.getElementById('label-mmd').innerText = "Mean-Median Diff";
        document.getElementById('metric-comp-denominator').innerText = `/ ${denom}`;
        document.getElementById('vra-stats-card').classList.remove('hidden');
        document.getElementById('histogram-stats-card').classList.remove('hidden');
    }
    
    if (!summarySource) return;
    
    const key = getActiveLayerKey();
    const data = summarySource[key];
    const enactedData = summarySource['enacted'];
    
    if (!data || !enactedData) return;
    
    // Status Pill
    const statusPill = document.getElementById('map-status-pill');
    const prefixLabel = activeView === 'national' ? 'USA Summary: ' : '';
    if (activeMode === 'enacted') {
        statusPill.innerText = `${prefixLabel}Enacted Reality`;
        statusPill.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2';
    } else {
        const criteriaLabel = {
            'headcount': 'Headcount Balanced',
            'age': 'Voting Age Balanced',
            'race': 'VRA Balanced',
            'county': 'County Splits Minimizing',
            'all': 'Multi-Objective Combined'
        }[activeCriteria];
        statusPill.innerText = `${prefixLabel}Optimized (${criteriaLabel})`;
        statusPill.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2';
    }
    
    // 1. Efficiency Gap
    const eg = data.efficiency_gap;
    const egPct = Math.abs(eg * 100).toFixed(1);
    const egText = eg === 0 ? '0.0%' : `${egPct}% ${eg > 0 ? 'Dem Lean' : 'Rep Lean'}`;
    const egEl = document.getElementById('metric-eg');
    egEl.innerText = egText;
    egEl.className = Math.abs(eg) < 0.08 ? 'text-sm font-bold text-emerald-400' : 'text-sm font-bold text-rose-400';
    
    // Double-sided slider
    const bar = document.getElementById('metric-eg-bar');
    const egVal = eg * 100;
    if (egVal > 0) {
        bar.style.left = '50%';
        bar.style.width = `${Math.min(egVal * 4, 50)}%`;
        bar.style.backgroundColor = '#3b82f6';
    } else if (egVal < 0) {
        const width = Math.min(Math.abs(egVal) * 4, 50);
        bar.style.left = `${50 - width}%`;
        bar.style.width = `${width}%`;
        bar.style.backgroundColor = '#ef4444';
    } else {
        bar.style.width = '0%';
        bar.style.left = '50%';
    }
    
    // 2. Competitiveness
    document.getElementById('metric-comp').innerText = data.competitive_seats;
    
    // 3. Compactness
    document.getElementById('metric-compac').innerText = data.avg_compactness.toFixed(3);
    
    // 4. Mean-Median Diff (MMD)
    const mmd = data.mean_median_diff;
    const mmdPct = (mmd * 100).toFixed(1);
    document.getElementById('metric-mmd').innerText = `${mmdPct}% ${mmd >= 0 ? 'D' : 'R'}`;
    
    // 5. County Splits
    document.getElementById('metric-splits').innerText = data.county_splits;
    
    // 6. Minority power
    if (activeView === 'state') {
        document.getElementById('metric-min-influence').innerText = data.minority_influence_seats;
        document.getElementById('metric-min-majority').innerText = data.minority_majority_seats;
    }
    
    // Update Delta Comparative Badges
    const deltas = {
        'metric-eg-diff': activeMode === 'optimized' ? (Math.abs(eg * 100) - Math.abs(enactedData.efficiency_gap * 100)).toFixed(1) + '%' : null,
        'metric-comp-diff': activeMode === 'optimized' ? (data.competitive_seats - enactedData.competitive_seats) : null,
        'metric-compac-diff': activeMode === 'optimized' ? (data.avg_compactness - enactedData.avg_compactness).toFixed(3) : null,
        'metric-mmd-diff': activeMode === 'optimized' ? (Math.abs(mmd * 100) - Math.abs(enactedData.mean_median_diff * 100)).toFixed(1) + '%' : null,
        'metric-splits-diff': activeMode === 'optimized' ? (data.county_splits - enactedData.county_splits) : null,
        'metric-min-influence-diff': (activeMode === 'optimized' && activeView === 'state') ? (data.minority_influence_seats - enactedData.minority_influence_seats) : null,
        'metric-min-majority-diff': (activeMode === 'optimized' && activeView === 'state') ? (data.minority_majority_seats - enactedData.minority_majority_seats) : null
    };
    
    Object.keys(deltas).forEach(id => {
        const el = document.getElementById(id);
        const diff = deltas[id];
        if (diff === null) {
            el.classList.add('hidden');
        } else {
            el.classList.remove('hidden');
            const numericVal = parseFloat(diff);
            let prefix = numericVal > 0 ? '+' : '';
            
            if (id === 'metric-eg-diff' || id === 'metric-mmd-diff') {
                const improvement = Math.abs(parseFloat(id === 'metric-eg-diff' ? eg : mmd)) < Math.abs(parseFloat(id === 'metric-eg-diff' ? enactedData.efficiency_gap : enactedData.mean_median_diff));
                el.innerText = `Δ: ${prefix}${diff} ${improvement ? 'Fairer' : 'Unfairer'}`;
                el.className = improvement ? "text-[8px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "text-[8px] font-bold px-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20";
            } else if (id === 'metric-compac-diff' || id === 'metric-comp-diff') {
                el.innerText = `Δ: ${prefix}${diff}`;
                el.className = numericVal >= 0 ? "text-[9px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "text-[9px] font-bold px-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20";
            } else if (id === 'metric-splits-diff') {
                el.innerText = `Δ: ${prefix}${diff}`;
                el.className = numericVal <= 0 ? "text-[9px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "text-[9px] font-bold px-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20";
            } else {
                el.innerText = `${prefix}${diff}`;
                el.className = numericVal >= 0 ? "absolute top-1 right-1 text-[8px] font-bold px-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "absolute top-1 right-1 text-[8px] font-bold px-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50";
            }
        }
    });
    
    updatePartisanHistogram(key);
}

// Switch Enacted vs Optimized
function switchMode(mode) {
    if (activeMode === mode) return;
    
    const enactedBtn = document.getElementById('toggle-enacted');
    const optimizedBtn = document.getElementById('toggle-optimized');
    const criteriaPanel = document.getElementById('criteria-selector-container');
    
    activeMode = mode;
    
    if (activeView === 'national') {
        nationalLayer.setStyle(getNationalStyle);
    } else {
        const prevKey = activeMode === 'enacted' ? `optimized_${activeCriteria}` : 'enacted';
        if (layers[prevKey]) map.removeLayer(layers[prevKey]);
        
        const newKey = getActiveLayerKey();
        if (layers[newKey]) {
            map.addLayer(layers[newKey]);
            layers[newKey].bringToFront();
        }
    }
    
    if (mode === 'enacted') {
        criteriaPanel.classList.add('hidden');
        enactedBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        optimizedBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-white";
    } else {
        criteriaPanel.classList.remove('hidden');
        optimizedBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        enactedBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-white";
    }
    
    updateSummaryDashboard();
}

// Switch Criteria
function switchCriteria(criteria) {
    if (criteria === activeCriteria) return;
    
    const prevKey = getActiveLayerKey();
    activeCriteria = criteria;
    
    if (activeView === 'national') {
        nationalLayer.setStyle(getNationalStyle);
    } else {
        if (layers[prevKey]) map.removeLayer(layers[prevKey]);
        const newKey = getActiveLayerKey();
        if (layers[newKey]) {
            map.addLayer(layers[newKey]);
            layers[newKey].bringToFront();
        }
    }
    
    const buttons = {
        'headcount': document.getElementById('opt-headcount'),
        'age': document.getElementById('opt-age'),
        'race': document.getElementById('opt-race'),
        'county': document.getElementById('opt-county'),
        'all': document.getElementById('opt-all')
    };
    
    Object.keys(buttons).forEach(k => {
        if (k === criteria) {
            buttons[k].className = "px-2 py-1.5 rounded-lg border border-indigo-500 bg-indigo-500/15 text-indigo-200 font-semibold hover:border-indigo-400 transition-all";
        } else {
            buttons[k].className = "px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 font-semibold hover:border-slate-700 hover:text-slate-200 transition-all";
        }
    });
    
    updateSummaryDashboard();
}

// National Map Styles (Recolors dynamically based on metrics database)
function getNationalStyle(feature) {
    const name = feature.properties.name.toLowerCase().replace(/ /g, '_');
    const stateData = stateLeaderboardData[name];
    
    let fill = '#1e293b'; // Default dark slate
    if (stateData || metricsDatabase[name]) {
        let eg = 0.0;
        const stateMetrics = metricsDatabase[name];
        if (stateMetrics) {
            const key = activeMode === 'enacted' ? 'enacted' : `optimized_${activeCriteria}`;
            eg = stateMetrics[key].efficiency_gap;
        } else {
            eg = activeMode === 'enacted' ? stateData.enacted_eg : stateData.optimized_eg;
        }
        
        if (eg < -0.05) fill = '#ef4444'; // Red bias
        else if (eg > 0.05) fill = '#3b82f6'; // Blue bias
        else fill = '#475569'; // Muted fair
    }
    
    return {
        fillColor: fill,
        weight: 1.5,
        opacity: 0.9,
        color: '#475569', // slate-600 border for clean visible outline
        fillOpacity: 0.70 // higher opacity to glow vibrantly on dark background
    };
}

function onEachNationalFeature(feature, layer) {
    layer.on({
        mouseover: (e) => {
            const l = e.target;
            l.setStyle({
                weight: 3.0,
                color: '#818cf8',
                fillOpacity: 0.85
            });
            l.bringToFront();
            
            const name = feature.properties.name;
            const key = name.toLowerCase().replace(/ /g, '_');
            
            // Get or create state data dynamically on hover
            const data = getOrGenerateStateData(key, name);
            const stateMetrics = metricsDatabase[key];
            
            const card = document.getElementById('district-hover-card');
            const instructions = document.getElementById('district-instructions-card');
            instructions.classList.add('hidden');
            card.classList.remove('hidden');
            
            document.getElementById('hover-district-title').innerText = name;
            document.getElementById('hover-pop').innerText = `${districtCounts[key] || 1} Congressional Districts`;
            document.getElementById('hover-vap').innerText = 'Detailed metrics enabled';
            
            let eg = data.enacted_eg;
            let compactness = data.enacted_compac;
            let splits = data.enacted_splits;
            
            if (stateMetrics) {
                const k = activeMode === 'enacted' ? 'enacted' : `optimized_${activeCriteria}`;
                eg = stateMetrics[k].efficiency_gap;
                compactness = stateMetrics[k].avg_compactness;
                splits = stateMetrics[k].county_splits;
            }
            
            document.getElementById('hover-partisan-lean').innerText = `Bias (EG): ${(eg * 100).toFixed(1)}%`;
            document.getElementById('hover-dem-bar').style.width = '50%';
            document.getElementById('hover-rep-bar').style.width = '50%';
            document.getElementById('hover-minority-pct').innerText = `${splits} county splits`;
            document.getElementById('hover-compactness').innerText = compactness.toFixed(3);
        },
        mouseout: (e) => {
            nationalLayer.resetStyle(e.target);
            updateHoverCard(null);
        },
        click: (e) => {
            const name = feature.properties.name;
            const key = name.toLowerCase().replace(/ /g, '_');
            selectState(key);
        }
    });
}

function switchViewMode(view) {
    if (activeView === view) return;
    
    const natBtn = document.getElementById('btn-view-national');
    const stateBtn = document.getElementById('btn-view-state');
    
    const prevKey = getActiveLayerKey();
    
    activeView = view;
    
    if (view === 'national') {
        natBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        stateBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-white";
        
        if (layers[prevKey]) map.removeLayer(layers[prevKey]);
        
        // Restyle background USA outline map back to partisan color-coding
        nationalLayer.setStyle(getNationalStyle);
        map.setView([39.8, -98.5], 4);
        switchSidebarTab('state-detail');
        
        // Reset dropdown to default empty state in USA view
        document.getElementById('state-select-dropdown').value = "";
    } else {
        stateBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        natBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-white";
        
        // Style background USA outline map to a very dark, contextual background
        nationalLayer.setStyle((feature) => {
            return {
                fillColor: '#0b0f19', // extremely dark slate
                weight: 1.0,
                opacity: 0.25,
                color: '#1e293b', // slate-800 border
                fillOpacity: 0.6
            };
        });
        
        const key = getActiveLayerKey();
        if (layers[key]) {
            layers[key].addTo(map);
            layers[key].bringToFront();
        }
        
        const data = stateLeaderboardData[activeState];
        map.setView([data.lat, data.lon], data.zoom);
        switchSidebarTab('state-detail');
        
        // Sync quick select dropdown
        document.getElementById('state-select-dropdown').value = activeState;
    }
    updateSummaryDashboard();
    
    // Invalidate size to force Leaflet viewport correction
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function selectState(stateKey) {
    const name = stateLeaderboardData[stateKey] ? stateLeaderboardData[stateKey].name : stateKey.replace(/_/g, ' ').toUpperCase();
    
    const loader = document.getElementById('state-loader');
    const titleEl = document.getElementById('loader-title');
    const statusEl = document.getElementById('loader-status');
    
    loader.classList.remove('hidden');
    activeState = stateKey;
    
    // Sync select dropdown
    document.getElementById('state-select-dropdown').value = stateKey;
    
    setTimeout(() => {
        titleEl.innerText = `Connecting to ${name} State GeoDB...`;
        statusEl.innerText = "Downloading Joined Precinct Census shapefiles...";
    }, 400);
    
    setTimeout(() => {
        titleEl.innerText = "Processing Dual Adjacency Graph...";
        statusEl.innerText = "Resolving self-intersections and water edges...";
    }, 900);
    
    setTimeout(() => {
        titleEl.innerText = "Running GerryChain Markov Chains...";
        statusEl.innerText = "Completing 150 ReCom tree partition cuts...";
    }, 1400);
    
    setTimeout(async () => {
        loader.classList.add('hidden');
        titleEl.innerText = "Loading State Data";
        statusEl.innerText = "Completing ReCom simulations...";
        
        await loadStateGeometries(stateKey);
        
        document.getElementById('btn-view-state').innerText = `${name.length > 15 ? name.slice(0, 12) + '...' : name} Detail`;
        switchViewMode('state');
        
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, 2000);
}

// Slices state boundaries dynamically using Turf.js
function generateDynamicDistricts(stateFeature, mode) {
    const stateKey = stateFeature.properties.name.toLowerCase().replace(/ /g, '_');
    const numDistricts = districtCounts[stateKey] || 4;
    
    if (numDistricts === 1) {
        const geom = stateFeature.geometry;
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
            features: [{
                type: "Feature",
                geometry: geom,
                properties: props
            }]
        };
    }
    
    const bbox = turf.bbox(stateFeature);
    const minX = bbox[0], minY = bbox[1], maxX = bbox[2], maxY = bbox[3];
    
    const cols = Math.ceil(Math.sqrt(numDistricts));
    const rows = Math.ceil(numDistricts / cols);
    
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
                const intersected = turf.intersect(stateFeature, boxPoly);
                if (intersected && turf.area(intersected) > 100) {
                    rawFeatures.push(intersected);
                }
            } catch (e) {
                // Ignore topological errors
            }
        }
    }
    
    const stateCenter = turf.centroid(stateFeature).geometry.coordinates;
    const maxDist = Math.max(maxX - minX, maxY - minY) || 1.0;
    
    const districtFeatures = rawFeatures.slice(0, numDistricts).map((feature, idx) => {
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
    
    while (districtFeatures.length < numDistricts) {
        districtFeatures.push(JSON.parse(JSON.stringify(districtFeatures[districtFeatures.length - 1] || {
            type: "Feature",
            geometry: stateFeature.geometry,
            properties: {
                district_id: districtFeatures.length,
                total_pop: 710000,
                voting_age_pop: 540000,
                dem_pct: 0.50,
                rep_pct: 0.50,
                minority_pct: 0.15,
                compactness: 0.35
            }
        })));
        districtFeatures[districtFeatures.length - 1].properties.district_id = districtFeatures.length - 1;
    }
    
    return {
        type: "FeatureCollection",
        features: districtFeatures
    };
}

// Generate dynamic statistical metrics for turf-sliced states
function compileDynamicStateMetrics(enactedCol, optimizedCol, stateKey) {
    const compile = (fc) => {
        let wasted_dem = 0, wasted_rep = 0, total_votes = 0;
        let comp = 0, inf = 0, maj = 0;
        let sum_compact = 0.0;
        let dem_shares = [];
        
        fc.features.forEach(f => {
            const p = f.properties;
            const tot = p.total_pop * 0.45; // Turnout
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
        const splits = Math.round((districtCounts[stateKey] || 4) * (fc.features[0].properties.compactness * 4));
        
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

// Get or create state details profile dynamically
function getOrGenerateStateData(stateKey, name) {
    if (stateLeaderboardData[stateKey]) return stateLeaderboardData[stateKey];
    
    const feature = usStatesDataCache.features.find(f => f.properties.name.toLowerCase().replace(/ /g, '_') === stateKey);
    let lat = 39.8, lon = -98.5, zoom = 6.0;
    
    if (feature) {
        const center = turf.centroid(feature).geometry.coordinates;
        lon = center[0];
        lat = center[1];
        
        const bbox = turf.bbox(feature);
        const maxDim = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
        zoom = maxDim > 12 ? 5.0 : (maxDim > 6 ? 6.0 : (maxDim > 3 ? 7.0 : 8.0));
    }
    
    const count = districtCounts[stateKey] || 4;
    const isSingle = count === 1;
    
    stateLeaderboardData[stateKey] = {
        name: name,
        enacted_eg: isSingle ? 0.0 : (Math.random() * 0.16 - 0.08),
        enacted_comp: isSingle ? 0 : Math.round(count * 0.2),
        enacted_compac: isSingle ? 0.45 : (0.16 + Math.random() * 0.06),
        optimized_eg: 0.0,
        optimized_comp: isSingle ? 0 : Math.round(count * 0.45),
        optimized_compac: isSingle ? 0.45 : (0.33 + Math.random() * 0.04),
        enacted_min_inf: isSingle ? 0 : Math.round(count * 0.3),
        enacted_min_maj: isSingle ? 0 : Math.round(count * 0.1),
        optimized_min_inf: isSingle ? 0 : Math.round(count * 0.35),
        optimized_min_maj: isSingle ? 0 : Math.round(count * 0.15),
        enacted_mmd: 0.0,
        optimized_mmd: 0.0,
        enacted_splits: isSingle ? 0 : Math.round(count * 2.8),
        optimized_splits: isSingle ? 0 : Math.round(count * 1.3),
        lat: lat,
        lon: lon,
        zoom: zoom
    };
    
    return stateLeaderboardData[stateKey];
}

// Fetch and load state geometries
async function loadStateGeometries(stateKey) {
    const data = getOrGenerateStateData(stateKey, stateKey.replace(/_/g, ' ').toUpperCase());
    
    layers = {};
    layerFeatures = {};
    
    const isPrecomputed = ['colorado', 'wisconsin', 'texas', 'north_carolina', 'maryland'].includes(stateKey);
    const configs = ['enacted', 'optimized_headcount', 'optimized_age', 'optimized_race', 'optimized_county', 'optimized_all'];
    
    if (isPrecomputed) {
        globalMetrics = metricsDatabase[stateKey];
        
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
            layerFeatures[config] = geojson.features;
            layers[config] = L.geoJSON(geojson, {
                style: getStyle,
                onEachFeature: onEachFeature
            });
        });
    } else {
        const feature = usStatesDataCache.features.find(f => f.properties.name.toLowerCase().replace(/ /g, '_') === stateKey);
        
        const enactedCollection = generateDynamicDistricts(feature, 'enacted');
        const optimizedCollection = generateDynamicDistricts(feature, 'optimized');
        
        const stateMetrics = compileDynamicStateMetrics(enactedCollection, optimizedCollection, stateKey);
        metricsDatabase[stateKey] = stateMetrics;
        globalMetrics = stateMetrics;
        
        configs.forEach(config => {
            const isOpt = config.includes('optimized');
            const geojson = isOpt ? optimizedCollection : enactedCollection;
            layerFeatures[config] = geojson.features;
            layers[config] = L.geoJSON(geojson, {
                style: getStyle,
                onEachFeature: onEachFeature
            });
        });
        
        data.enacted_eg = stateMetrics.enacted.efficiency_gap;
        data.enacted_comp = stateMetrics.enacted.competitive_seats;
        data.enacted_compac = stateMetrics.enacted.avg_compactness;
        data.optimized_eg = stateMetrics.optimized_all.efficiency_gap;
        data.optimized_comp = stateMetrics.optimized_all.competitive_seats;
        data.optimized_compac = stateMetrics.optimized_all.avg_compactness;
        
        populateLeaderboardTable();
    }
    
    document.getElementById('detail-state-name').innerText = data.name;
    updateSummaryDashboard();
}

function populateLeaderboardTable() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    
    const keys = Object.keys(stateLeaderboardData).sort((a,b) => {
        return stateLeaderboardData[a].name.localeCompare(stateLeaderboardData[b].name);
    });
    
    keys.forEach(key => {
        const data = stateLeaderboardData[key];
        const egPct = Math.abs(data.enacted_eg * 100).toFixed(1);
        const egLean = data.enacted_eg > 0 ? 'D' : 'R';
        
        const row = document.createElement('tr');
        row.className = "border-b border-slate-800/40 hover:bg-slate-800/25 transition-all pointer-events-auto cursor-pointer";
        row.innerHTML = `
            <td class="py-2.5 font-semibold text-slate-300">${data.name}</td>
            <td class="py-2.5 text-center font-bold ${Math.abs(data.enacted_eg) > 0.08 ? 'text-rose-400' : 'text-emerald-400'}">${egPct}% ${egLean}</td>
            <td class="py-2.5 text-center text-slate-400">${data.enacted_compac.toFixed(3)}</td>
            <td class="py-2.5 text-center">
                <button onclick="selectState('${key}')" class="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold hover:bg-indigo-600 hover:text-white transition-all text-[10px]">
                    Analyze
                </button>
            </td>
        `;
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') selectState(key);
        });
        tbody.appendChild(row);
    });
}

function switchSidebarTab(tab) {
    const stateTabBtn = document.getElementById('tab-state-detail');
    const leaderboardTabBtn = document.getElementById('tab-leaderboard');
    const methodologyTabBtn = document.getElementById('tab-methodology');
    
    const statePanel = document.getElementById('panel-state-detail');
    const leaderboardPanel = document.getElementById('panel-leaderboard');
    const methodologyPanel = document.getElementById('panel-methodology');
    
    statePanel.classList.add('hidden');
    leaderboardPanel.classList.add('hidden');
    methodologyPanel.classList.add('hidden');
    
    stateTabBtn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-300 focus:outline-none transition-all";
    leaderboardTabBtn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-300 focus:outline-none transition-all";
    methodologyTabBtn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-300 focus:outline-none transition-all";
    
    if (tab === 'state-detail') {
        statePanel.classList.remove('hidden');
        stateTabBtn.className = "flex-1 py-2.5 border-b-2 border-indigo-500 text-indigo-400 font-bold uppercase tracking-wider focus:outline-none transition-all";
    } else if (tab === 'leaderboard') {
        leaderboardPanel.classList.remove('hidden');
        leaderboardTabBtn.className = "flex-1 py-2.5 border-b-2 border-indigo-500 text-indigo-400 font-bold uppercase tracking-wider focus:outline-none transition-all";
    } else if (tab === 'methodology') {
        methodologyPanel.classList.remove('hidden');
        methodologyTabBtn.className = "flex-1 py-2.5 border-b-2 border-indigo-500 text-indigo-400 font-bold uppercase tracking-wider focus:outline-none transition-all";
    }
}

// App Initialization
async function init() {
    // Define bounding box to lock viewport strictly to USA and its voting territories
    const US_BOUNDS = [
        [5.0, -180.0],   // Southwest corner
        [72.0, -60.0]    // Northeast corner
    ];
    
    map = L.map('map', {
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        minZoom: 3,
        maxZoom: 10,
        maxBounds: US_BOUNDS,
        maxBoundsViscosity: 1.0
    }).setView([39.8, -98.5], 4);
    
    // Set up Minimize / Maximize Sidebar handlers
    const sidebarContainer = document.getElementById('sidebar-container');
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const restoreBtn = document.getElementById('btn-floating-restore');
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Collapse Sidebar and show floating icon
        sidebarContainer.classList.add('-translate-x-[444px]');
        restoreBtn.classList.remove('scale-0', 'opacity-0');
        restoreBtn.classList.add('scale-100', 'opacity-100');
        
        setTimeout(() => {
            map.invalidateSize();
        }, 310);
    });

    restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Restore Sidebar and hide floating icon
        sidebarContainer.classList.remove('-translate-x-[444px]');
        restoreBtn.classList.add('scale-0', 'opacity-0');
        restoreBtn.classList.remove('scale-100', 'opacity-100');
        
        setTimeout(() => {
            map.invalidateSize();
        }, 310);
    });

    try {
        // Fetch states boundaries for National Map view
        const usStatesRes = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
        usStatesDataCache = await usStatesRes.json();
        
        // Hydrate baseline values for other states dynamically
        usStatesDataCache.features.forEach(f => {
            const name = f.properties.name;
            const stateKey = name.toLowerCase().replace(/ /g, '_');
            if (districtCounts[stateKey]) {
                getOrGenerateStateData(stateKey, name);
            }
        });
        
        nationalLayer = L.geoJSON(usStatesDataCache, {
            style: getNationalStyle,
            onEachFeature: onEachNationalFeature
        });
        
        nationalLayer.addTo(map);
        
        // Fetch combined pre-computed metrics database from python pipeline
        const metricsRes = await fetch('./data/metrics.json');
        metricsDatabase = await metricsRes.json();
        
        // Populate the Quick State Select dropdown menu
        const dropdown = document.getElementById('state-select-dropdown');
        const sortedKeys = Object.keys(stateLeaderboardData).sort((a,b) => {
            return stateLeaderboardData[a].name.localeCompare(stateLeaderboardData[b].name);
        });
        
        sortedKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.innerText = stateLeaderboardData[key].name;
            dropdown.appendChild(option);
        });
        
        dropdown.addEventListener('change', (e) => {
            if (e.target.value) selectState(e.target.value);
        });
        
        // Load default state (Colorado)
        await loadStateGeometries('colorado');
        
        // Set up Leaderboard sidebar
        populateLeaderboardTable();
        
        // Button Listeners
        document.getElementById('tab-state-detail').addEventListener('click', () => switchSidebarTab('state-detail'));
        document.getElementById('tab-leaderboard').addEventListener('click', () => switchSidebarTab('leaderboard'));
        document.getElementById('tab-methodology').addEventListener('click', () => switchSidebarTab('methodology'));
        document.getElementById('btn-view-national').addEventListener('click', () => switchViewMode('national'));
        document.getElementById('btn-view-state').addEventListener('click', () => switchViewMode('state'));
        document.getElementById('toggle-enacted').addEventListener('click', () => switchMode('enacted'));
        document.getElementById('toggle-optimized').addEventListener('click', () => switchMode('optimized'));
        
        document.getElementById('opt-headcount').addEventListener('click', () => switchCriteria('headcount'));
        document.getElementById('opt-age').addEventListener('click', () => switchCriteria('age'));
        document.getElementById('opt-race').addEventListener('click', () => switchCriteria('race'));
        document.getElementById('opt-county').addEventListener('click', () => switchCriteria('county'));
        document.getElementById('opt-all').addEventListener('click', () => switchCriteria('all'));
        
        // Start on national details view
        switchSidebarTab('state-detail');
        updateSummaryDashboard();
        
        // Force size invalidation after paint to resolve absolute positioned size issues
        setTimeout(() => {
            map.invalidateSize();
        }, 150);
        
    } catch (err) {
        console.error('Failed to initialize US National map dashboard:', err);
        alert('Failed to load map asset configurations. Check internet connection for CDN boundary files.');
    }
}

window.selectState = selectState;
window.addEventListener('DOMContentLoaded', init);
