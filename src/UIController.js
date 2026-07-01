// src/UIController.js
import Chart from 'chart.js/auto';

/**
 * UIController handles all DOM manipulations, event listeners, and state transitions
 * for the user interface, including sidebars, tabs, sliders, and buttons.
 * It reads from the DataService and orchestrates updates to the MapController.
 */
export class UIController {
    constructor(app) {
        this.app = app;
        this.activeMode = 'enacted';
        this.activeCriteria = 'headcount';
        this.activeView = 'national';
        this.activeState = 'colorado';
        this.partisanChart = null;
    }

    formatPercent(val) {
        if (val === undefined || val === null || isNaN(val)) return '-';
        return (val * 100).toFixed(1) + '%';
    }

    formatPop(val) {
        if (val === undefined || val === null || isNaN(val)) return '-';
        return val.toLocaleString();
    }

    getActiveLayerKey() {
        if (this.activeMode === 'enacted' || this.activeMode === 'historical') return 'enacted';
        if (this.activeMode === 'tuned') return 'optimized_all';
        return `optimized_${this.activeCriteria}`;
    }

    updateHoverCard(properties) {
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
        document.getElementById('hover-pop').innerText = this.formatPop(properties.total_pop);
        document.getElementById('hover-vap').innerText = this.formatPop(properties.voting_age_pop);
        
        let demPct = properties.dem_pct;
        let historicalSwing = 0.0;
        if (this.activeMode === 'historical') {
            const staticMetrics = this.app.dataService.metricsDatabase[this.activeState];
            const originalEg = staticMetrics && staticMetrics.enacted ? staticMetrics.enacted.efficiency_gap : 0.0;
            const currentEg = this.app.dataService.statePartisanBaselines[this.activeState] !== undefined ? this.app.dataService.statePartisanBaselines[this.activeState] : originalEg;
            historicalSwing = currentEg - originalEg;
        }
        
        if (this.activeMode === 'tuned') {
            const stateData = this.app.dataService.stateLeaderboardData[this.activeState];
            const swing = stateData ? (stateData.tuned_eg - stateData.optimized_eg) : 0.0;
            demPct = Math.max(0.02, Math.min(0.98, demPct - swing));
        } else if (historicalSwing !== 0.0) {
            demPct = Math.max(0.02, Math.min(0.98, demPct - historicalSwing));
        }
        const repPct = 1 - demPct;
        const leanText = demPct > 0.55 ? 'Dem Lean' : (demPct < 0.45 ? 'Rep Lean' : 'Competitive Tossup');
        
        document.getElementById('hover-partisan-lean').innerText = `${leanText} (${this.formatPercent(demPct)} D)`;
        document.getElementById('hover-dem-pct').innerText = `D: ${this.formatPercent(demPct)}`;
        document.getElementById('hover-rep-pct').innerText = `R: ${this.formatPercent(repPct)}`;
        
        document.getElementById('hover-dem-bar').style.width = `${demPct * 100}%`;
        document.getElementById('hover-rep-bar').style.width = `${repPct * 100}%`;
        
        document.getElementById('hover-minority-pct').innerText = this.formatPercent(properties.minority_pct);
        document.getElementById('hover-compactness').innerText = properties.compactness.toFixed(3);
    }

    updatePartisanHistogram(key) {
        if (this.activeView === 'national') return;
        
        const features = this.app.mapController.layerFeatures[key];
        if (!features) return;
        
        let historicalSwing = 0.0;
        let tunedSwing = 0.0;
        
        if (this.activeMode === 'historical') {
            const staticMetrics = this.app.dataService.metricsDatabase[this.activeState];
            const originalEg = staticMetrics && staticMetrics.enacted ? staticMetrics.enacted.efficiency_gap : 0.0;
            const currentEg = this.app.dataService.statePartisanBaselines[this.activeState] !== undefined ? this.app.dataService.statePartisanBaselines[this.activeState] : originalEg;
            historicalSwing = currentEg - originalEg;
        } else if (this.activeMode === 'tuned') {
            const stateData = this.app.dataService.stateLeaderboardData[this.activeState];
            tunedSwing = stateData ? (stateData.tuned_eg - stateData.optimized_eg) : 0.0;
        }
        
        let counts = { safeD: 0, leanD: 0, toss: 0, leanR: 0, safeR: 0 };
        features.forEach(f => {
            let demPct = f.properties.dem_pct;
            if (this.activeMode === 'tuned') demPct = Math.max(0.02, Math.min(0.98, demPct - tunedSwing));
            else if (this.activeMode === 'historical') demPct = Math.max(0.02, Math.min(0.98, demPct - historicalSwing));
            
            if (demPct >= 0.60) counts.safeD++;
            else if (demPct >= 0.55) counts.leanD++;
            else if (demPct >= 0.45) counts.toss++;
            else if (demPct >= 0.40) counts.leanR++;
            else counts.safeR++;
        });

        const ctx = document.getElementById('partisanChart');
        if (!ctx) return;

        const data = [counts.safeD, counts.leanD, counts.toss, counts.leanR, counts.safeR];
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#475569';
        
        if (this.partisanChart) {
            this.partisanChart.data.datasets[0].data = data;
            this.partisanChart.options.scales.x.ticks.color = textColor;
            this.partisanChart.update();
        } else {
            this.partisanChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Safe D', 'Lean D', 'Comp', 'Lean R', 'Safe R'],
                    datasets: [{
                        data: data,
                        backgroundColor: ['#2563eb', '#60a5fa', '#a855f7', '#f87171', '#dc2626'],
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    },
                    scales: {
                        y: { display: false, beginAtZero: true },
                        x: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { font: { family: 'Outfit', size: 10 }, color: textColor }
                        }
                    }
                }
            });
        }
    }

    updateSummaryDashboard() {
        // Toggle synthetic watermark
        const watermark = document.getElementById('synthetic-watermark');
        if (watermark) {
            const isPrecomputed = ['colorado', 'wisconsin', 'texas', 'north_carolina', 'maryland'].includes(this.activeState);
            if (this.activeView === 'state' && !isPrecomputed) {
                watermark.classList.remove('hidden');
            } else {
                watermark.classList.add('hidden');
            }
        }

        let summarySource;
        
        if (this.activeView === 'national') {
            summarySource = this.app.dataService.calculateUsaSummaryStats();
            document.getElementById('detail-state-name').innerText = "United States";
            document.getElementById('tab-state-detail').innerText = "USA Summary";
            document.getElementById('label-partisan-bias').innerText = "Average Partisan Bias (EG)";
            document.getElementById('label-mmd').innerText = "Avg Mean-Median Diff";
            
            const activeKey = this.getActiveLayerKey();
            const activeSummary = summarySource[activeKey];
            const denom = activeSummary ? activeSummary.total_districts : 40;
            
            document.getElementById('metric-comp-denominator').innerText = `/ ${denom}`;
            document.getElementById('vra-stats-card').classList.add('hidden');
            document.getElementById('histogram-stats-card').classList.add('hidden');
            document.getElementById('national-house-control-card').classList.remove('hidden');
            
            const waveSlider = document.getElementById('slider-wave');
            const waveVal = waveSlider ? parseFloat(waveSlider.value) : 0.0;
            const waveSwing = -waveVal / 100;
            
            const votingStates = Object.keys(this.app.dataService.stateLeaderboardData);
            
            let demSeats = 0;
            let repSeats = 0;
            let totalDemVoteShareSum = 0;
            
            votingStates.forEach(s => {
                if (['district_of_columbia', 'puerto_rico', 'guam', 'virgin_islands', 'american_samoa', 'northern_mariana_islands'].includes(s)) return;
                
                const N = this.app.dataService.districtCounts[s] || 1;
                const data = this.app.dataService.stateLeaderboardData[s];
                if (!data) return;
                
                let eg = 0.0;
                const baseEg = this.app.dataService.statePartisanBaselines[s] || 0.0;
                
                if (this.activeMode === 'enacted' || this.activeMode === 'historical') {
                    eg = baseEg;
                } else {
                    const stateMetrics = this.app.dataService.metricsDatabase[s];
                    if (stateMetrics) {
                        const key = this.getActiveLayerKey();
                        if (stateMetrics[key]) {
                            eg = stateMetrics[key].efficiency_gap;
                        }
                    } else {
                        eg = data.optimized_eg;
                    }
                }
                
                const demVoteShare = 0.50 - baseEg;
                totalDemVoteShareSum += (N * (demVoteShare + waveSwing));
                
                let stateDemSeats = Math.round(N * (demVoteShare + waveSwing - eg));
                stateDemSeats = Math.max(0, Math.min(N, stateDemSeats));
                
                demSeats += stateDemSeats;
                repSeats += (N - stateDemSeats);
            });
            
            const nationalDemVoteShare = totalDemVoteShareSum / 435;
            const proportionalDemSeats = Math.round(435 * nationalDemVoteShare);
            const seatShift = proportionalDemSeats - demSeats;
            
            let shiftText = "0 Seats Shifted";
            if (seatShift > 0) shiftText = `R +${seatShift} Seat Bias`;
            else if (seatShift < 0) shiftText = `D +${Math.abs(seatShift)} Seat Bias`;
            else shiftText = "Perfectly Proportional";
            
            const demSeatShare = demSeats / 435;
            const bias = (demSeatShare - nationalDemVoteShare) * 100;
            const biasText = `${bias > 0 ? '+' : ''}${bias.toFixed(1)}% ${bias > 0 ? 'Dem Lean' : 'Rep Lean'}`;
            
            document.getElementById('house-dem-seats').innerText = `D: ${demSeats}`;
            document.getElementById('house-rep-seats').innerText = `R: ${repSeats}`;
            
            let majorityText = "Split Control";
            if (demSeats >= 218) majorityText = `D Majority (+${demSeats - 217})`;
            else majorityText = `R Majority (+${repSeats - 217})`;
            
            document.getElementById('house-majority-text').innerText = majorityText;
            
            const demBarPct = (demSeats / 435) * 100;
            const repBarPct = 100 - demBarPct;
            document.getElementById('house-bar-dem').style.width = `${demBarPct}%`;
            document.getElementById('house-bar-rep').style.width = `${repBarPct}%`;
            
            document.getElementById('house-gerrymander-tax').innerText = shiftText;
            document.getElementById('house-disproportionality').innerText = biasText;
            
            const taxEl = document.getElementById('house-gerrymander-tax');
            const biasEl = document.getElementById('house-disproportionality');
            if (Math.abs(seatShift) > 5) {
                taxEl.className = "font-bold text-rose-600 dark:text-rose-450 text-xs mt-0.5";
                biasEl.className = "font-bold text-rose-600 dark:text-rose-450 text-xs mt-0.5";
            } else if (Math.abs(seatShift) > 0) {
                taxEl.className = "font-bold text-amber-600 dark:text-amber-450 text-xs mt-0.5";
                biasEl.className = "font-bold text-amber-600 dark:text-amber-450 text-xs mt-0.5";
            } else {
                taxEl.className = "font-bold text-emerald-600 dark:text-emerald-450 text-xs mt-0.5";
                biasEl.className = "font-bold text-emerald-600 dark:text-emerald-450 text-xs mt-0.5";
            }
        } else {
            summarySource = this.app.dataService.metricsDatabase[this.activeState];
            const stateName = this.app.dataService.stateLeaderboardData[this.activeState] ? this.app.dataService.stateLeaderboardData[this.activeState].name : this.activeState;
            const denom = this.app.dataService.districtCounts[this.activeState] || 8;
            
            document.getElementById('detail-state-name').innerText = stateName;
            document.getElementById('tab-state-detail').innerText = "State Details";
            document.getElementById('label-partisan-bias').innerText = "Efficiency Gap (Partisan Bias)";
            document.getElementById('label-mmd').innerText = "Mean-Median Diff";
            document.getElementById('metric-comp-denominator').innerText = `/ ${denom}`;
            document.getElementById('vra-stats-card').classList.remove('hidden');
            document.getElementById('histogram-stats-card').classList.remove('hidden');
            document.getElementById('national-house-control-card').classList.add('hidden');
        }
        
        if (!summarySource) return;
        
        const key = this.getActiveLayerKey();
        const data = summarySource[key];
        const enactedData = summarySource['enacted'];
        
        if (!data || !enactedData) return;
        
        const statusPill = document.getElementById('map-status-pill');
        const prefixLabel = this.activeView === 'national' ? 'USA Summary: ' : '';
        if (this.activeMode === 'enacted' || this.activeMode === 'historical') {
            statusPill.innerText = `${prefixLabel}${this.activeMode === 'historical' ? 'Historical Enacted' : 'Enacted Reality'}`;
            statusPill.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-2';
        } else {
            const criteriaLabel = {
                'headcount': 'Headcount Balanced',
                'age': 'Voting Age Balanced',
                'race': 'VRA Balanced',
                'county': 'County Splits Minimizing',
                'all': 'Multi-Objective Combined'
            }[this.activeCriteria];
            statusPill.innerText = `${prefixLabel}Optimized (${criteriaLabel})`;
            statusPill.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2';
        }
        
        const eg = data.efficiency_gap;
        const egPct = Math.abs(eg * 100).toFixed(1);
        const egText = eg === 0 ? '0.0%' : `${egPct}% ${eg > 0 ? 'Rep Lean' : 'Dem Lean'}`;
        const egEl = document.getElementById('metric-eg');
        egEl.innerText = egText;
        egEl.className = Math.abs(eg) < 0.08 ? 'text-sm font-bold text-emerald-600 dark:text-emerald-400' : 'text-sm font-bold text-rose-600 dark:text-rose-400';
        
        const bar = document.getElementById('metric-eg-bar');
        const egVal = eg * 100;
        if (egVal > 0) {
            bar.style.left = '50%';
            bar.style.width = `${Math.min(egVal * 4, 50)}%`;
            bar.style.backgroundColor = '#ef4444';
        } else if (egVal < 0) {
            const width = Math.min(Math.abs(egVal) * 4, 50);
            bar.style.left = `${50 - width}%`;
            bar.style.width = `${width}%`;
            bar.style.backgroundColor = '#3b82f6';
        } else {
            bar.style.width = '0%';
            bar.style.left = '50%';
        }
        
        document.getElementById('metric-comp').innerText = data.competitive_seats;
        document.getElementById('metric-compac').innerText = data.avg_compactness.toFixed(3);
        
        const mmd = data.mean_median_diff;
        const mmdPct = (Math.abs(mmd) * 100).toFixed(1);
        document.getElementById('metric-mmd').innerText = `${mmdPct}% ${mmd >= 0 ? 'D' : 'R'}`;
        
        document.getElementById('metric-splits').innerText = data.county_splits;
        
        if (this.activeView === 'state') {
            document.getElementById('metric-min-influence').innerText = data.minority_influence_seats;
            document.getElementById('metric-min-majority').innerText = data.minority_majority_seats;
        }
        
        const deltas = {
            'metric-eg-diff': this.activeMode === 'optimized' ? (Math.abs(eg * 100) - Math.abs(enactedData.efficiency_gap * 100)).toFixed(1) + '%' : null,
            'metric-comp-diff': this.activeMode === 'optimized' ? (data.competitive_seats - enactedData.competitive_seats) : null,
            'metric-compac-diff': this.activeMode === 'optimized' ? (data.avg_compactness - enactedData.avg_compactness).toFixed(3) : null,
            'metric-mmd-diff': this.activeMode === 'optimized' ? (Math.abs(mmd * 100) - Math.abs(enactedData.mean_median_diff * 100)).toFixed(1) + '%' : null,
            'metric-splits-diff': this.activeMode === 'optimized' ? (data.county_splits - enactedData.county_splits) : null,
            'metric-min-influence-diff': (this.activeMode === 'optimized' && this.activeView === 'state') ? (data.minority_influence_seats - enactedData.minority_influence_seats) : null,
            'metric-min-majority-diff': (this.activeMode === 'optimized' && this.activeView === 'state') ? (data.minority_majority_seats - enactedData.minority_majority_seats) : null
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
                    el.className = improvement ? "text-[8px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "text-[8px] font-bold px-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20";
                } else if (id === 'metric-compac-diff' || id === 'metric-comp-diff') {
                    el.innerText = `Δ: ${prefix}${diff}`;
                    el.className = numericVal >= 0 ? "text-[9px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "text-[9px] font-bold px-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20";
                } else if (id === 'metric-splits-diff') {
                    el.innerText = `Δ: ${prefix}${diff}`;
                    el.className = numericVal <= 0 ? "text-[9px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "text-[9px] font-bold px-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20";
                } else {
                    el.innerText = `${prefix}${diff}`;
                    el.className = numericVal >= 0 ? "absolute top-1 right-1 text-[8px] font-bold px-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "absolute top-1 right-1 text-[8px] font-bold px-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-350 dark:border-slate-700/50";
                }
            }
        });
        
        this.updatePartisanHistogram(key);
    }

    switchMode(mode) {
        if (this.activeMode === mode && !this.app.mapController.swipeControl) return;
        
        if (this.app.mapController.swipeControl) {
            this.app.mapController.toggleSwipeMode();
            const swipeBtn = document.getElementById('btn-toggle-swipe');
            if (swipeBtn) swipeBtn.className = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1";
        }
        
        const enactedBtn = document.getElementById('toggle-enacted');
        const optimizedBtn = document.getElementById('toggle-optimized');
        const tunedBtn = document.getElementById('toggle-tuned');
        const historicalBtn = document.getElementById('toggle-historical');
        
        const criteriaPanel = document.getElementById('criteria-selector-container');
        const playgroundPanel = document.getElementById('playground-slider-container');
        const historicalDateContainer = document.getElementById('historical-date-container');
        
        const prevKey = this.getActiveLayerKey();
        const wasHistorical = this.activeMode === 'historical';
        this.activeMode = mode;
        
        if (this.activeView === 'national') {
            this.app.mapController.nationalLayer.setStyle((f) => this.app.mapController.getNationalStyle(f));
        } else {
            if (this.app.mapController.layers[prevKey]) this.app.mapController.map.removeLayer(this.app.mapController.layers[prevKey]);
            const newKey = this.getActiveLayerKey();
            if (this.app.mapController.layers[newKey]) {
                this.app.mapController.map.addLayer(this.app.mapController.layers[newKey]);
            }
        }
        
        [enactedBtn, optimizedBtn, tunedBtn, historicalBtn].forEach(btn => {
            if (btn) btn.className = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
        });
        
        if (historicalDateContainer) historicalDateContainer.classList.add('hidden');
        
        if (mode !== 'historical' && wasHistorical) {
            const today = new Date().toISOString().split('T')[0];
            if (this.app.dataService.activeDate !== today) {
                this.app.dataService.applyHistoricalData(today);
                this.populateLeaderboardTable();
            }
        }
        
        if (mode === 'enacted') {
            if (enactedBtn) enactedBtn.className = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
            criteriaPanel.classList.add('hidden');
            playgroundPanel.classList.add('hidden');
        } else if (mode === 'optimized') {
            if (optimizedBtn) optimizedBtn.className = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
            criteriaPanel.classList.remove('hidden');
            playgroundPanel.classList.add('hidden');
        } else if (mode === 'tuned') {
            if (tunedBtn) tunedBtn.className = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
            criteriaPanel.classList.add('hidden');
            playgroundPanel.classList.remove('hidden');
            this.syncSlidersToActiveState();
        } else if (mode === 'historical') {
            if (historicalBtn) historicalBtn.className = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
            criteriaPanel.classList.add('hidden');
            playgroundPanel.classList.add('hidden');
            if (historicalDateContainer) historicalDateContainer.classList.remove('hidden');
            const datePicker = document.getElementById('history-date-picker');
            if (datePicker && datePicker.value) {
                this.app.dataService.applyHistoricalData(datePicker.value);
                this.populateLeaderboardTable();
            }
        }
        
        this.updateSummaryDashboard();
    }

    syncSlidersToActiveState() {
        const data = this.app.dataService.stateLeaderboardData[this.activeState];
        if (data) {
            document.getElementById('slider-eg').value = (data.tuned_eg * 100).toFixed(1);
            document.getElementById('slider-compac').value = Math.round(data.tuned_compac * 1000);
            document.getElementById('slider-splits').value = data.tuned_splits;
            
            document.getElementById('val-slider-eg').innerText = data.tuned_eg === 0.0 ? '0.0% Neutral' : `${Math.abs(data.tuned_eg * 100).toFixed(1)}% ${data.tuned_eg > 0 ? 'Rep Lean' : 'Dem Lean'}`;
            document.getElementById('val-slider-compac').innerText = data.tuned_compac.toFixed(3);
            document.getElementById('val-slider-splits').innerText = `${data.tuned_splits} splits`;
        }
    }

    switchCriteria(criteria) {
        if (criteria === this.activeCriteria) return;
        
        const prevKey = this.getActiveLayerKey();
        this.activeCriteria = criteria;
        
        if (this.activeView === 'national') {
            this.app.mapController.nationalLayer.setStyle((f) => this.app.mapController.getNationalStyle(f));
        } else {
            if (this.app.mapController.layers[prevKey]) this.app.mapController.map.removeLayer(this.app.mapController.layers[prevKey]);
            const newKey = this.getActiveLayerKey();
            if (this.app.mapController.layers[newKey]) {
                this.app.mapController.map.addLayer(this.app.mapController.layers[newKey]);
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
                buttons[k].className = "px-2 py-1.5 rounded-lg border border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-200 font-semibold hover:border-indigo-400 transition-all";
            } else {
                buttons[k].className = "px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all";
            }
        });
        
        this.updateSummaryDashboard();
    }

    switchViewMode(view) {
        if (this.activeView === view) return;
        this.activeView = view;
        
        const nationalBtn = document.getElementById('btn-view-national');
        const stateBtn = document.getElementById('btn-view-state');
        const swipeBtn = document.getElementById('btn-toggle-swipe');
        
        if (view === 'national') {
            nationalBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
            stateBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
            
            if (swipeBtn) swipeBtn.classList.add('hidden');
            
            if (this.app.mapController.swipeControl) {
                this.app.mapController.toggleSwipeMode(); // Disable swipe before switching
            }
            
            this.app.mapController.map.flyToBounds(this.app.mapController.US_BOUNDS, {
                duration: 1.5,
                easeLinearity: 0.25
            });
            
            Object.values(this.app.mapController.layers).forEach(layer => this.app.mapController.map.removeLayer(layer));
            this.app.mapController.map.addLayer(this.app.mapController.nationalLayer);
            this.app.mapController.nationalLayer.setStyle((f) => this.app.mapController.getNationalStyle(f));
        } else {
            stateBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md";
            nationalBtn.className = "px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
            
            if (swipeBtn) swipeBtn.classList.remove('hidden');
            
            this.app.mapController.map.removeLayer(this.app.mapController.nationalLayer);
            
            const key = this.getActiveLayerKey();
            if (this.app.mapController.layers[key]) {
                this.app.mapController.layers[key].addTo(this.app.mapController.map);
                this.app.mapController.layers[key].setStyle((f) => this.app.mapController.getStyle(f));
            }
            
            const data = this.app.dataService.stateLeaderboardData[this.activeState];
            if (data) {
                this.app.mapController.map.flyTo([data.lat, data.lon], data.zoom, {
                    duration: 1.5,
                    easeLinearity: 0.1
                });
            }
            
            this.switchSidebarTab('state-detail');
            document.getElementById('state-select-dropdown').value = this.activeState;
        }
        
        this.updateSummaryDashboard();
        
        setTimeout(() => this.app.mapController.map.invalidateSize(), 100);
    }

    selectState(stateKey) {
        const name = this.app.dataService.stateLeaderboardData[stateKey] ? this.app.dataService.stateLeaderboardData[stateKey].name : stateKey.replace(/_/g, ' ').toUpperCase();
        
        const loader = document.getElementById('state-loader');
        const titleEl = document.getElementById('loader-title');
        const statusEl = document.getElementById('loader-status');
        
        loader.classList.remove('hidden');
        this.activeState = stateKey;
        document.getElementById('state-select-dropdown').value = stateKey;
        
        setTimeout(() => { titleEl.innerText = `Connecting to ${name} State GeoDB...`; statusEl.innerText = "Downloading Joined Precinct Census shapefiles..."; }, 400);
        setTimeout(() => { titleEl.innerText = "Processing Dual Adjacency Graph..."; statusEl.innerText = "Resolving self-intersections and water edges..."; }, 900);
        setTimeout(() => { titleEl.innerText = "Running GerryChain Markov Chains..."; statusEl.innerText = "Completing 150 ReCom tree partition cuts..."; }, 1400);
        
        setTimeout(async () => {
            loader.classList.add('hidden');
            titleEl.innerText = "Loading State Data";
            statusEl.innerText = "Completing ReCom simulations...";
            
            await this.app.mapController.loadStateGeometries(stateKey);
            
            document.getElementById('btn-view-state').innerText = `${name.length > 15 ? name.slice(0, 12) + '...' : name} Detail`;
            this.switchViewMode('state');
            
            setTimeout(() => this.app.mapController.map.invalidateSize(), 100);
        }, 2000);
    }

    populateLeaderboardTable(searchQuery = '') {
        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = '';
        
        let keys = Object.keys(this.app.dataService.stateLeaderboardData).sort((a,b) => {
            return this.app.dataService.stateLeaderboardData[a].name.localeCompare(this.app.dataService.stateLeaderboardData[b].name);
        });
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            keys = keys.filter(key => this.app.dataService.stateLeaderboardData[key].name.toLowerCase().includes(query));
        }
        
        keys.forEach(key => {
            const data = this.app.dataService.stateLeaderboardData[key];
            const egPct = Math.abs(data.enacted_eg * 100).toFixed(1);
            const egLean = data.enacted_eg > 0 ? 'R' : 'D';
            
            const row = document.createElement('tr');
            row.className = "border-b border-slate-200 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/25 transition-all pointer-events-auto cursor-pointer";
            row.innerHTML = `
                <td class="py-2.5 font-semibold text-slate-700 dark:text-slate-350">${data.name}</td>
                <td class="py-2.5 text-center font-bold ${data.enacted_eg === 0 ? 'text-slate-500' : (Math.abs(data.enacted_eg) > 0.08 ? 'text-rose-600 dark:text-rose-450' : 'text-emerald-600 dark:text-emerald-450')}">${data.enacted_eg === 0 ? '0.0%' : egPct + '% ' + egLean}</td>
                <td class="py-2.5 text-center text-slate-500 dark:text-slate-400">${data.enacted_compac.toFixed(3)}</td>
                <td class="py-2.5 text-center">
                    <button class="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-600 hover:text-white transition-all text-[10px]">Analyze</button>
                </td>
            `;
            row.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') this.selectState(key);
            });
            const btn = row.querySelector('button');
            btn.addEventListener('click', () => this.selectState(key));
            tbody.appendChild(row);
        });
    }

    switchSidebarTab(tab) {
        const stateTabBtn = document.getElementById('tab-state-detail');
        const leaderboardTabBtn = document.getElementById('tab-leaderboard');
        const methodologyTabBtn = document.getElementById('tab-methodology');
        
        const statePanel = document.getElementById('panel-state-detail');
        const leaderboardPanel = document.getElementById('panel-leaderboard');
        const methodologyPanel = document.getElementById('panel-methodology');
        
        statePanel.classList.add('hidden');
        leaderboardPanel.classList.add('hidden');
        methodologyPanel.classList.add('hidden');
        
        stateTabBtn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none transition-all";
        leaderboardTabBtn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none transition-all";
        methodologyTabBtn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none transition-all";
        
        if (tab === 'state-detail') {
            statePanel.classList.remove('hidden');
            stateTabBtn.className = "flex-1 py-2.5 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider focus:outline-none transition-all";
        } else if (tab === 'leaderboard') {
            leaderboardPanel.classList.remove('hidden');
            leaderboardTabBtn.className = "flex-1 py-2.5 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider focus:outline-none transition-all";
        } else if (tab === 'methodology') {
            methodologyPanel.classList.remove('hidden');
            methodologyTabBtn.className = "flex-1 py-2.5 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider focus:outline-none transition-all";
        }
    }

    toggleSwipe() {
        if (this.activeView !== 'state') return;
        this.app.mapController.toggleSwipeMode();
        
        const swipeBtn = document.getElementById('btn-toggle-swipe');
        const enactedBtn = document.getElementById('toggle-enacted');
        const optimizedBtn = document.getElementById('toggle-optimized');
        const tunedBtn = document.getElementById('toggle-tuned');
        
        const activeClass = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-indigo-600 text-white shadow-md flex items-center gap-1";
        const inactiveClass = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1";
        
        const baseClass = "px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300";
        const inactiveBase = `${baseClass} text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white`;
        
        if (this.app.mapController.swipeControl) {
            swipeBtn.className = activeClass;
            [enactedBtn, optimizedBtn, tunedBtn].forEach(btn => {
                if (btn) btn.className = inactiveBase;
            });
            document.getElementById('criteria-selector-container').classList.add('hidden');
            document.getElementById('playground-slider-container').classList.add('hidden');
        } else {
            swipeBtn.className = inactiveClass;
            // Restore previous mode state
            this.activeMode = null; // force refresh
            const mode = document.getElementById('toggle-tuned').classList.contains('bg-indigo-600') ? 'tuned' : 
                         document.getElementById('toggle-optimized').classList.contains('bg-indigo-600') ? 'optimized' : 'enacted';
            this.switchMode(mode);
        }
    }
}
