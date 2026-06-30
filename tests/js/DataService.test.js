import { describe, it, expect, vi } from 'vitest';
import { DataService } from '../../src/DataService.js';
import { MapController } from '../../src/MapController.js';

describe('DataService & Math Logic', () => {
    it('should initialize with empty metrics database', () => {
        const service = new DataService();
        expect(service.metricsDatabase).toEqual({});
        expect(service.globalMetrics).toEqual({});
    });

    it('should properly format state names', () => {
        const service = new DataService();
        expect(service.formatStateName('new_york')).toBe('New York');
        expect(service.formatStateName('district_of_columbia')).toBe('District of Columbia');
        expect(service.formatStateName('texas')).toBe('Texas');
    });

    it('should accurately calculate colors based on efficiency gap', () => {
        // MapController expects an app object, we can mock it
        const mockApp = { dataService: new DataService(), uiController: {} };
        const mapController = new MapController(mockApp);
        
        // Negative EG = Democratic bias
        expect(mapController.getPartisanFillColor(-0.01, false)).toBe('#bfdbfe'); // Light blue
        expect(mapController.getPartisanFillColor(-0.05, false)).toBe('#60a5fa'); // Medium blue
        expect(mapController.getPartisanFillColor(-0.10, false)).toBe('#3b82f6'); // Strong blue
        
        // Positive EG = Republican bias
        expect(mapController.getPartisanFillColor(0.01, false)).toBe('#fecaca'); // Light red
        expect(mapController.getPartisanFillColor(0.05, false)).toBe('#f87171'); // Medium red
        expect(mapController.getPartisanFillColor(0.10, false)).toBe('#ef4444'); // Strong red
        
        // Zero EG = Neutral
        expect(mapController.getPartisanFillColor(0.0, false)).toBe('#cbd5e1'); // Neutral light mode
        expect(mapController.getPartisanFillColor(0.0, true)).toBe('#1e293b'); // Neutral dark mode
    });

    it('should handle fetch failures gracefully when initializing', async () => {
        const service = new DataService();
        
        // Mock global fetch to throw an error
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        
        // Suppress console.error for this test
        const originalError = console.error;
        console.error = vi.fn();
        
        await service.init();
        
        // Ensure it doesn't crash, but metricsDatabase remains empty due to failure
        expect(service.metricsDatabase).toEqual({});
        expect(console.error).toHaveBeenCalled();
        
        // Restore
        console.error = originalError;
    });
});
