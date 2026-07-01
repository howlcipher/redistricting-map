// src/main.js

import './index.css';
import { DataService } from './DataService.js';
import { MapController } from './MapController.js';
import { UIController } from './UIController.js';

/**
 * Main application class that orchestrates data fetching, map rendering, and UI interactions.
 * It serves as the central hub connecting the DataService, MapController, and UIController.
 */
class App {
    /**
     * Initializes the core services required for the dashboard.
     */
    constructor() {
        this.dataService = new DataService();
        this.mapController = new MapController(this);
        this.uiController = new UIController(this);
    }

    /**
     * Bootstraps the application by initializing the map, fetching requisite data,
     * setting up UI event listeners, and drawing the initial national view.
     */
    async init() {
        try {
            this.mapController.initMap();
            
            const sidebarContainer = document.getElementById('sidebar-container');
            const toggleBtn = document.getElementById('btn-toggle-sidebar');
            const restoreBtn = document.getElementById('btn-floating-restore');
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebarContainer.classList.add('translate-y-[150%]', 'sm:translate-y-0', 'sm:-translate-x-[444px]');
                restoreBtn.classList.remove('scale-0', 'opacity-0');
                restoreBtn.classList.add('scale-100', 'opacity-100');
                setTimeout(() => this.mapController.map.invalidateSize(), 310);
            });

            restoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebarContainer.classList.remove('translate-y-[150%]', 'sm:-translate-x-[444px]');
                restoreBtn.classList.add('scale-0', 'opacity-0');
                restoreBtn.classList.remove('scale-100', 'opacity-100');
                setTimeout(() => this.mapController.map.invalidateSize(), 310);
            });
            // Auto-minimize sidebar on mobile view to save space
            if (window.innerWidth < 640) {
                sidebarContainer.classList.add('translate-y-[150%]', 'sm:translate-y-0', 'sm:-translate-x-[444px]');
                restoreBtn.classList.remove('scale-0', 'opacity-0');
                restoreBtn.classList.add('scale-100', 'opacity-100');
            }

            const hamburgerBtn = document.getElementById('btn-hamburger');
            const mobileMenu = document.getElementById('mobile-menu-collapse');
            if (hamburgerBtn && mobileMenu) {
                hamburgerBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                    mobileMenu.classList.toggle('flex');
                });
            }
            
            const themeToggleBtns = [document.getElementById('btn-theme-toggle'), document.getElementById('btn-theme-toggle-mobile')];
            const themeIconsMoon = document.querySelectorAll('.theme-icon-moon-svg');
            const themeIconsSun = document.querySelectorAll('.theme-icon-sun-svg');
            
            themeToggleBtns.forEach(btn => {
                if (!btn) return;
                btn.addEventListener('click', () => {
                    const isDarkNow = document.body.classList.contains('dark');
                    if (isDarkNow) {
                        document.body.classList.remove('dark');
                        document.documentElement.classList.remove('dark');
                        themeIconsMoon.forEach(icon => icon.classList.add('hidden'));
                        themeIconsSun.forEach(icon => icon.classList.remove('hidden'));
                    } else {
                        document.body.classList.add('dark');
                        document.documentElement.classList.add('dark');
                        themeIconsMoon.forEach(icon => icon.classList.remove('hidden'));
                        themeIconsSun.forEach(icon => icon.classList.add('hidden'));
                    }
                    setTimeout(() => this.mapController.setDarkTheme(!isDarkNow), 50);
                    
                    const isDark = document.body.classList.contains('dark');
                    if (this.mapController.nationalLayer) {
                        if (this.uiController.activeView === 'national') {
                            this.mapController.nationalLayer.setStyle((f) => this.mapController.getNationalStyle(f));
                        } else {
                            this.mapController.nationalLayer.setStyle((f) => {
                                return { fillColor: isDark ? '#0b0f19' : '#e2e8f0', weight: 1.0, opacity: 0.25, color: isDark ? '#1e293b' : '#cbd5e1', fillOpacity: 0.6 };
                            });
                        }
                    }
                    
                    const activeKey = this.uiController.getActiveLayerKey();
                    if (this.mapController.layers[activeKey]) {
                        this.mapController.layers[activeKey].setStyle((f) => this.mapController.getStyle(f));
                    }
                });
            });

            await this.dataService.init();

            const isDarkInitial = document.body.classList.contains('dark');
            if (isDarkInitial) {
                document.documentElement.classList.add('dark');
                themeIconsMoon.forEach(icon => icon.classList.remove('hidden'));
                themeIconsSun.forEach(icon => icon.classList.add('hidden'));
            } else {
                document.documentElement.classList.remove('dark');
                themeIconsMoon.forEach(icon => icon.classList.add('hidden'));
                themeIconsSun.forEach(icon => icon.classList.remove('hidden'));
            }

            // @ts-ignore
            this.mapController.nationalLayer = L.geoJSON(this.dataService.usStatesDataCache, {
                style: (f) => this.mapController.getNationalStyle(f),
                onEachFeature: (f, l) => this.mapController.onEachNationalFeature(f, l)
            });
            this.mapController.nationalLayer.addTo(this.mapController.map);
            this.mapController.nationalLayer.setStyle((f) => this.mapController.getNationalStyle(f));
            
            const dropdown = document.getElementById('state-select-dropdown');
            const sortedKeys = Object.keys(this.dataService.stateLeaderboardData).sort((a,b) => {
                return this.dataService.stateLeaderboardData[a].name.localeCompare(this.dataService.stateLeaderboardData[b].name);
            });
            
            sortedKeys.forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.innerText = this.dataService.stateLeaderboardData[key].name;
                dropdown.appendChild(option);
            });
            
            dropdown.addEventListener('change', (e) => {
                // @ts-ignore
                if (e.target.value) this.uiController.selectState(e.target.value);
            });
            
            await this.mapController.loadStateGeometries('colorado');
            this.uiController.populateLeaderboardTable();
            
            document.getElementById('tab-state-detail').addEventListener('click', () => this.uiController.switchSidebarTab('state-detail'));
            document.getElementById('tab-leaderboard').addEventListener('click', () => this.uiController.switchSidebarTab('leaderboard'));
            document.getElementById('tab-methodology').addEventListener('click', () => this.uiController.switchSidebarTab('methodology'));
            document.getElementById('btn-view-national').addEventListener('click', () => this.uiController.switchViewMode('national'));
            document.getElementById('btn-view-state').addEventListener('click', () => this.uiController.switchViewMode('state'));
            document.getElementById('toggle-enacted').addEventListener('click', () => this.uiController.switchMode('enacted'));
            document.getElementById('toggle-optimized').addEventListener('click', () => this.uiController.switchMode('optimized'));
            document.getElementById('toggle-tuned').addEventListener('click', () => this.uiController.switchMode('tuned'));
            document.getElementById('toggle-historical').addEventListener('click', () => this.uiController.switchMode('historical'));
            
            const datePicker = document.getElementById('history-date-picker');
            if (datePicker) {
                // @ts-ignore
                datePicker.value = this.dataService.activeDate;
                datePicker.addEventListener('change', (e) => {
                    // @ts-ignore
                    const newDate = e.target.value;
                    if (newDate) {
                        this.dataService.applyHistoricalData(newDate);
                        this.uiController.populateLeaderboardTable();
                        this.uiController.updateSummaryDashboard();
                        
                        if (this.uiController.activeView === 'national' && this.mapController.nationalLayer) {
                            this.mapController.nationalLayer.setStyle((f) => this.mapController.getNationalStyle(f));
                        } else if (this.uiController.activeView === 'state') {
                            const layerKey = this.uiController.getActiveLayerKey();
                            const activeLayer = this.mapController.layers[layerKey];
                            if (activeLayer) {
                                activeLayer.setStyle((f) => this.mapController.getStyle(f));
                            }
                        }
                    }
                });
            }

            document.getElementById('btn-toggle-swipe').addEventListener('click', () => {
                this.uiController.toggleSwipe();
            });
            document.getElementById('opt-headcount').addEventListener('click', () => this.uiController.switchCriteria('headcount'));
            document.getElementById('opt-age').addEventListener('click', () => this.uiController.switchCriteria('age'));
            document.getElementById('opt-race').addEventListener('click', () => this.uiController.switchCriteria('race'));
            document.getElementById('opt-county').addEventListener('click', () => this.uiController.switchCriteria('county'));
            document.getElementById('opt-all').addEventListener('click', () => this.uiController.switchCriteria('all'));

            const sliderEg = document.getElementById('slider-eg');
            const sliderCompac = document.getElementById('slider-compac');
            const sliderSplits = document.getElementById('slider-splits');
            
            const updateTunedValues = () => {
                // @ts-ignore
                const egVal = parseFloat(sliderEg.value) / 100;
                // @ts-ignore
                const compacVal = parseFloat(sliderCompac.value) / 1000;
                // @ts-ignore
                const splitsVal = parseInt(sliderSplits.value);
                
                document.getElementById('val-slider-eg').innerText = egVal === 0.0 ? '0.0% Neutral' : `${Math.abs(egVal * 100).toFixed(1)}% ${egVal > 0 ? 'Rep Lean' : 'Dem Lean'}`;
                document.getElementById('val-slider-compac').innerText = compacVal.toFixed(3);
                document.getElementById('val-slider-splits').innerText = `${splitsVal} splits`;
                
                const stateData = this.dataService.stateLeaderboardData[this.uiController.activeState];
                if (stateData) {
                    stateData.tuned_eg = egVal;
                    stateData.tuned_compac = compacVal;
                    stateData.tuned_splits = splitsVal;
                    
                    if (!this.dataService.metricsDatabase[this.uiController.activeState]) {
                        this.dataService.metricsDatabase[this.uiController.activeState] = {};
                    }
                    this.dataService.metricsDatabase[this.uiController.activeState]['tuned'] = {
                        efficiency_gap: egVal,
                        mean_median_diff: egVal * 0.6,
                        competitive_seats: Math.max(0, Math.round((this.dataService.districtCounts[this.uiController.activeState] || 8) * (compacVal * 1.5))),
                        avg_compactness: compacVal,
                        county_splits: splitsVal,
                        minority_influence_seats: Math.round((this.dataService.districtCounts[this.uiController.activeState] || 8) * 0.3),
                        minority_majority_seats: Math.round((this.dataService.districtCounts[this.uiController.activeState] || 8) * 0.1)
                    };
                }
                
                if (this.uiController.activeView === 'national' && this.mapController.nationalLayer) {
                    this.mapController.nationalLayer.setStyle((f) => this.mapController.getNationalStyle(f));
                }
                
                const key = this.uiController.getActiveLayerKey();
                if (this.uiController.activeView === 'state' && this.mapController.layers[key]) {
                    this.mapController.layers[key].setStyle((f) => this.mapController.getStyle(f));
                }
                
                this.uiController.updateSummaryDashboard();
            };
            
            sliderEg.addEventListener('input', updateTunedValues);
            sliderCompac.addEventListener('input', updateTunedValues);
            sliderSplits.addEventListener('input', updateTunedValues);
            
            const sliderWave = document.getElementById('slider-wave');
            if (sliderWave) {
                sliderWave.addEventListener('input', (e) => {
                    // @ts-ignore
                    const waveVal = parseFloat(e.target.value);
                    const waveText = waveVal === 0.0 ? '0.0% Wave' : `${Math.abs(waveVal).toFixed(1)}% ${waveVal < 0 ? 'Dem Wave' : 'Rep Wave'}`;
                    document.getElementById('val-slider-wave').innerText = waveText;
                    this.uiController.updateSummaryDashboard();
                });
            }

            const searchInput = document.getElementById('leaderboard-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    // @ts-ignore
                    this.uiController.populateLeaderboardTable(e.target.value);
                });
            }
            
            this.uiController.switchSidebarTab('state-detail');
            this.uiController.updateSummaryDashboard();
            
            setTimeout(() => this.mapController.map.invalidateSize(), 150);
            
        } catch (err) {
            console.error('Failed to initialize App:', err);
        }
    }
}

window.onload = () => {
    const app = new App();
    window.app = app; // Expose for E2E testing
    app.init();
};
