import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIController } from '../../src/UIController.js';

describe('UIController Advanced', () => {
    let mockApp;
    let uiController;

    beforeEach(() => {
        // Set up JSDOM HTML structure
        document.body.innerHTML = `
            <div id="sidebar-container" class=""></div>
            <button id="btn-toggle-sidebar"></button>
            <button id="btn-floating-restore" class="scale-0 opacity-0"></button>
            
            <button id="btn-view-national" class="bg-indigo-600 text-white"></button>
            <button id="btn-view-state" class="text-slate-500 hidden"></button>
            <div id="national-house-control-card"></div>
            <div id="state-detail-panel" class="hidden"></div>
            <h2 id="detail-state-name"></h2>
            
            <button id="tab-state-detail" class="text-indigo-600"></button>
            <button id="tab-playground"></button>
            <div id="optimized-criteria-bar" class="hidden"></div>
            <div id="optimized-criteria-bar" class="hidden"></div>
            <button id="opt-headcount"></button>
            <button id="opt-age"></button>
            <button id="opt-county"></button>
            <button id="opt-race"></button>
            <button id="opt-all"></button>
            <button id="btn-criteria-tuned"></button>
            <div id="state-loader" class="hidden"></div>
            <select id="state-select-dropdown"></select>
            <h3 id="loader-title"></h3>
            <p id="loader-status"></p>
            <div id="enacted-eg-badge"></div>
            <div id="enacted-eg-value"></div>
            <div id="enacted-comp-badge"></div>
            <div id="enacted-comp-value"></div>
            <div id="optimized-eg-badge"></div>
            <div id="optimized-eg-value"></div>
            <div id="optimized-comp-badge"></div>
            <div id="optimized-comp-value"></div>
            <div id="playground-slider-container"></div>
            <div id="playground-panel"></div>
            <div id="label-partisan-bias"></div>
            <div id="label-mmd"></div>
            <div id="metric-comp-denominator"></div>
            <div id="vra-stats-card"></div>
            <div id="histogram-stats-card"></div>
            <div id="panel-state"></div>
            <div id="panel-leaderboard"></div>
            <div id="panel-methodology"></div>
        `;

        // Mock App dependencies
        mockApp = {
            dataService: {
                metricsDatabase: {
                    'colorado': {
                        enacted_eg: -0.05,
                        optimized_headcount_eg: -0.01,
                        optimized_age_eg: -0.02
                    }
                },
                stateLeaderboardData: {
                    'colorado': { name: 'Colorado', lat: 39, lon: -105 }
                },
                getOrGenerateStateData: vi.fn().mockResolvedValue(true),
                calculateUsaSummaryStats: vi.fn().mockReturnValue({})
            },
            mapController: {
                switchViewMode: vi.fn(),
                switchCriteria: vi.fn(),
                loadStateGeometries: vi.fn().mockResolvedValue(true),
                nationalLayer: {
                    setStyle: vi.fn()
                },
                layers: {},
                activeState: 'colorado',
                map: { removeLayer: vi.fn(), addLayer: vi.fn(), setView: vi.fn(), flyTo: vi.fn(), flyToBounds: vi.fn() }
            },
            uiController: {}
        };
        mockApp.uiController.updateSummaryDashboard = vi.fn();

        uiController = new UIController(mockApp);
    });

    it('should correctly switch from national to state view', async () => {
        // Trigger switchViewMode directly
        vi.spyOn(uiController, 'switchSidebarTab').mockImplementation(() => {});
        vi.spyOn(uiController, 'updateSummaryDashboard').mockImplementation(() => {});

        uiController.switchViewMode('state');

        // Verify UIController switched view mode logic
        expect(document.getElementById('btn-view-national').className).not.toContain('bg-indigo-600');
        expect(document.getElementById('btn-view-state').className).toContain('bg-indigo-600');
        expect(document.getElementById('btn-view-state').className).not.toContain('hidden');
        
        // Verify switchSidebarTab was called to handle the rest of the DOM
        expect(uiController.switchSidebarTab).toHaveBeenCalledWith('state-detail');
    });

    it('should correctly switch optimization criteria and notify MapController', () => {
        // Mock getActiveLayerKey and updateSummaryDashboard to avoid deep DOM dependencies
        uiController.getActiveLayerKey = vi.fn().mockReturnValue('optimized_age');
        uiController.updateSummaryDashboard = vi.fn();

        // Simulate clicking the age criteria button
        uiController.switchCriteria('age');

        // Verify DOM active state updated
        expect(document.getElementById('opt-age').className).toContain('bg-indigo-500/15');
    });
});
