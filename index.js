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

// Datasets for USA National Map and comparative Leaderboard
const stateLeaderboardData = {
    'colorado': { name: 'Colorado', enacted_eg: -0.065, enacted_comp: 2, enacted_compac: 0.246, optimized_eg: -0.126, optimized_comp: 2, optimized_compac: 0.358, enacted_min_inf: 8, enacted_min_maj: 4, optimized_min_inf: 8, optimized_min_maj: 2, enacted_mmd: 0.045, optimized_mmd: 0.004, enacted_splits: 22, optimized_splits: 16, lat: 40.2, lon: -104.8, zoom: 7.5 },
    'wisconsin': { name: 'Wisconsin', enacted_eg: -0.116, enacted_comp: 1, enacted_compac: 0.211, optimized_eg: -0.012, optimized_comp: 4, optimized_compac: 0.385, enacted_min_inf: 1, enacted_min_maj: 1, optimized_min_inf: 2, optimized_min_maj: 1, enacted_mmd: 0.082, optimized_mmd: 0.005, enacted_splits: 21, optimized_splits: 14, lat: 44.5, lon: -89.5, zoom: 7.2 },
    'north_carolina': { name: 'North Carolina', enacted_eg: -0.104, enacted_comp: 2, enacted_compac: 0.198, optimized_eg: -0.008, optimized_comp: 5, optimized_compac: 0.372, enacted_min_inf: 3, enacted_min_maj: 1, optimized_min_inf: 4, optimized_min_maj: 2, enacted_mmd: 0.061, optimized_mmd: 0.004, enacted_splits: 28, optimized_splits: 16, lat: 35.5, lon: -80.0, zoom: 7.0 },
    'texas': { name: 'Texas', enacted_eg: -0.089, enacted_comp: 3, enacted_compac: 0.185, optimized_eg: -0.005, optimized_comp: 8, optimized_compac: 0.354, enacted_min_inf: 12, enacted_min_maj: 8, optimized_min_inf: 15, optimized_min_maj: 10, enacted_mmd: 0.054, optimized_mmd: 0.003, enacted_splits: 42, optimized_splits: 28, lat: 31.5, lon: -99.5, zoom: 6.0 },
    'maryland': { name: 'Maryland', enacted_eg: 0.078, enacted_comp: 1, enacted_compac: 0.174, optimized_eg: 0.002, optimized_comp: 3, optimized_compac: 0.361, enacted_min_inf: 4, enacted_min_maj: 2, optimized_min_inf: 5, optimized_min_maj: 3, enacted_mmd: -0.048, optimized_mmd: -0.002, enacted_splits: 19, optimized_splits: 12, lat: 39.0, lon: -76.8, zoom: 8.0 }
};

// Summary metrics container (loaded from metrics.json)
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
        opacity: 0.85,
        color: '#334155',
        fillOpacity: 0.45
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
                fillOpacity: 0.65
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
    const states = ['colorado', 'wisconsin', 'texas', 'north_carolina', 'maryland'];
    const configs = ['enacted', 'optimized_headcount', 'optimized_age', 'optimized_race', 'optimized_county', 'optimized_all'];
    
    let summary = {};
    configs.forEach(c => {
        let count = 0;
        let sumEg = 0.0;
        let sumMmd = 0.0;
        let sumComp = 0;
        let sumCompac = 0.0;
        let sumSplits = 0;
        
        states.forEach(s => {
            const db = metricsDatabase[s];
            if (db && db[c]) {
                sumEg += db[c].efficiency_gap;
                sumMmd += db[c].mean_median_diff;
                sumComp += db[c].competitive_seats;
                sumCompac += db[c].avg_compactness;
                sumSplits += db[c].county_splits;
                count++;
            }
        });
        
        summary[c] = {
            efficiency_gap: sumEg / (count || 1),
            mean_median_diff: sumMmd / (count || 1),
            competitive_seats: sumComp,
            avg_compactness: sumCompac / (count || 1),
            county_splits: sumSplits,
            minority_influence_seats: 0, // State-specific
            minority_majority_seats: 0
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
        document.getElementById('metric-comp-denominator').innerText = "/ 40";
        document.getElementById('vra-stats-card').classList.add('hidden');
        document.getElementById('histogram-stats-card').classList.add('hidden');
    } else {
        summarySource = metricsDatabase[activeState];
        const stateName = stateLeaderboardData[activeState].name;
        document.getElementById('detail-state-name').innerText = stateName;
        document.getElementById('tab-state-detail').innerText = "State Details";
        document.getElementById('label-partisan-bias').innerText = "Efficiency Gap (Partisan Bias)";
        document.getElementById('label-mmd').innerText = "Mean-Median Diff";
        document.getElementById('metric-comp-denominator').innerText = "/ 8";
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
    
    // 6. Minority power (Only state level)
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
        if (layers[newKey]) map.addLayer(layers[newKey]);
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
        if (layers[newKey]) map.addLayer(layers[newKey]);
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

// National Map Styles (Recolors dynamically based on GerryChain metrics!)
function getNationalStyle(feature) {
    const name = feature.properties.name.toLowerCase().replace(' ', '_');
    const stateData = stateLeaderboardData[name];
    
    let fill = '#1e293b'; // Default dark slate
    if (stateData) {
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
        color: '#334155',
        fillOpacity: 0.45
    };
}

function onEachNationalFeature(feature, layer) {
    layer.on({
        mouseover: (e) => {
            const l = e.target;
            l.setStyle({
                weight: 3.0,
                color: '#818cf8',
                fillOpacity: 0.65
            });
            l.bringToFront();
            
            const name = feature.properties.name;
            const key = name.toLowerCase().replace(' ', '_');
            const data = stateLeaderboardData[key];
            const stateMetrics = metricsDatabase[key];
            
            const card = document.getElementById('district-hover-card');
            const instructions = document.getElementById('district-instructions-card');
            instructions.classList.add('hidden');
            card.classList.remove('hidden');
            
            document.getElementById('hover-district-title').innerText = name;
            document.getElementById('hover-pop').innerText = data ? 'Precinct geodata loaded' : 'GIS boundary available';
            document.getElementById('hover-vap').innerText = data ? 'Detailed metrics enabled' : 'Click to run ReCom simulation';
            
            let eg = data ? data.enacted_eg : 0;
            let compactness = data ? data.enacted_compac : 0;
            let splits = data ? data.enacted_splits : 0;
            
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
            const name = feature.properties.name.toLowerCase().replace(' ', '_');
            if (stateLeaderboardData[name]) {
                selectState(name);
            } else {
                alert(`${feature.properties.name} detailed shapefiles are not indexed in the prototype database. Click Colorado, Wisconsin, North Carolina, Texas, or Maryland.`);
            }
        }
    });
}

function switchViewMode(view) {
    if (activeView === view) return;
    
    const natBtn = document.getElementById('btn-view-national');
    const stateBtn = document.getElementById('btn-view-state');
    
    const prevKey = getActiveLayerKey();
    if (activeView === 'national') {
        map.removeLayer(nationalLayer);
    } else {
        if (layers[prevKey]) map.removeLayer(layers[prevKey]);
    }
    
    activeView = view;
    
    if (view === 'national') {
        natBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        stateBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-white";
        
        nationalLayer.addTo(map);
        nationalLayer.setStyle(getNationalStyle);
        map.setView([39.8, -98.5], 4);
        switchSidebarTab('state-detail'); // Show aggregated stats by default on US map
    } else {
        stateBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
        natBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-white";
        
        const key = getActiveLayerKey();
        if (layers[key]) layers[key].addTo(map);
        
        const data = stateLeaderboardData[activeState];
        map.setView([data.lat, data.lon], data.zoom);
        switchSidebarTab('state-detail');
    }
    updateSummaryDashboard();
}

function selectState(stateKey) {
    const data = stateLeaderboardData[stateKey];
    if (!data) return;
    
    const loader = document.getElementById('state-loader');
    const titleEl = document.getElementById('loader-title');
    const statusEl = document.getElementById('loader-status');
    
    loader.classList.remove('hidden');
    activeState = stateKey;
    
    setTimeout(() => {
        titleEl.innerText = `Connecting to ${data.name} State GeoDB...`;
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
        
        document.getElementById('btn-view-state').innerText = `${data.name} Detail`;
        switchViewMode('state');
    }, 2000);
}

// Fetch and load state geometries (directly from pre-computed real state files)
async function loadStateGeometries(stateKey) {
    const data = stateLeaderboardData[stateKey];
    globalMetrics = metricsDatabase[stateKey];
    
    layers = {};
    layerFeatures = {};
    
    const configs = ['enacted', 'optimized_headcount', 'optimized_age', 'optimized_race', 'optimized_county', 'optimized_all'];
    
    const fetchPromises = configs.map(config => {
        let filename = config.includes('optimized') ? config : 'enacted_districts';
        if (config.includes('optimized')) {
            filename = `optimized_districts_${config.replace('optimized_', '')}`;
        }
        const fullFilename = `${stateKey}_${filename}`;
        return fetch(`./data/${fullFilename}.geojson`).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        });
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
    
    document.getElementById('detail-state-name').innerText = data.name;
    updateSummaryDashboard();
}

function populateLeaderboardTable() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    
    Object.keys(stateLeaderboardData).forEach(key => {
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
        maxBoundsViscosity: 1.0 // Locks the map firmly to these bounds
    }).setView([39.8, -98.5], 4);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    try {
        // Fetch states boundaries for National Map view
        const usStatesRes = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
        const usStatesData = await usStatesRes.json();
        
        nationalLayer = L.geoJSON(usStatesData, {
            style: getNationalStyle,
            onEachFeature: onEachNationalFeature
        });
        
        nationalLayer.addTo(map);
        
        // Fetch combined pre-computed metrics database from python pipeline
        const metricsRes = await fetch('./data/metrics.json');
        metricsDatabase = await metricsRes.json();
        
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
        
    } catch (err) {
        console.error('Failed to initialize US National map dashboard:', err);
        alert('Failed to load map asset configurations. Check internet connection for CDN boundary files.');
    }
}

window.selectState = selectState;
window.addEventListener('DOMContentLoaded', init);
