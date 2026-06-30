import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapController } from '../../src/MapController';

// Mock Leaflet
global.L = {
    map: vi.fn(() => {
        const m = {
            flyToBounds: vi.fn(),
            removeLayer: vi.fn(),
            hasLayer: vi.fn(() => true),
            addLayer: vi.fn()
        };
        m.setView = vi.fn(() => m);
        return m;
    }),
    tileLayer: vi.fn(() => ({
        addTo: vi.fn()
    })),
    canvas: vi.fn(() => ({
        _container: {}
    })),
    geoJSON: vi.fn(() => ({
        getContainer: vi.fn()
    }))
};

describe('MapController', () => {
    let mapController;
    let mockApp;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = `
            <div id="map"></div>
            <div id="loading-overlay"></div>
            <h2 id="detail-state-name"></h2>
        `;

        mockApp = {
            dataService: {
                getOrGenerateStateData: vi.fn(() => ({})),
                formatStateName: vi.fn(s => s),
                metricsDatabase: {},
                generateWithWorker: vi.fn(() => Promise.resolve({
                    enactedCollection: { type: 'FeatureCollection', features: [] },
                    optimizedCollection: { type: 'FeatureCollection', features: [] },
                    metrics: { enacted: {}, optimized_all: {} }
                })),
                usStatesDataCache: { features: [] }
            },
            uiController: {
                updateSummaryDashboard: vi.fn(),
                populateLeaderboardTable: vi.fn()
            }
        };

        mapController = new MapController(mockApp);
        mapController.initMap();
    });

    describe('getDistrictColor', () => {
        it('should return light color tint for highly competitive districts > 50%', () => {
            const isDark = true; // Use dark mode for test
            
            // Highly competitive Dem leaning (51%)
            const demCompetitive = mapController.getDistrictColor({ dem: 0.51, rep: 0.49 }, isDark);
            expect(demCompetitive).toBe('#172554'); // Very light blue
            
            // Highly competitive Rep leaning (53%)
            const repCompetitive = mapController.getDistrictColor({ dem: 0.47, rep: 0.53 }, isDark);
            expect(repCompetitive).toBe('#450a0a'); // Very light red
            
            // Exact tie or below 50% max (not possible natively but tests fallback)
            const exactTie = mapController.getDistrictColor({ dem: 0.50, rep: 0.50 }, isDark);
            expect(exactTie).toBe('#1e293b'); // grey fallback
        });
    });

    describe('loadStateGeometries', () => {
        it('should remove existing layers from the map before creating new ones', async () => {
            // Setup a fake existing layer
            const fakeLayer = {};
            mapController.layers = {
                enacted: fakeLayer
            };
            
            await mapController.loadStateGeometries('colorado');
            
            // Expect removeLayer to have been called on the old enacted layer
            expect(mapController.map.removeLayer).toHaveBeenCalledWith(fakeLayer);
            
            // Expect the layers object to have been reset and then repopulated 
            // (Note: in the mock it uses the worker path, which sets layers.enacted)
            expect(mapController.layers.enacted).toBeDefined();
        });
    });
});
