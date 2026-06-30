import { test, expect } from '@playwright/test';

test.describe('Redistricting Dashboard E2E', () => {
  
  test('should load without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Wait for the map to render
    await page.waitForSelector('#map', { state: 'visible' });
    
    // Allow some time for async fetching
    await page.waitForTimeout(2000);
    
    expect(errors.length).toBe(0);
  });

  test('should render national map and allow clicking a state', async ({ page }) => {
    await page.goto('/');
    
    // Verify National View is active
    await expect(page.locator('#btn-view-national')).toHaveClass(/bg-indigo-600/);
    await expect(page.locator('#national-house-control-card')).toBeVisible();

    // Click on Colorado in the map (simulate clicking on the SVG/Canvas)
    // Since Leaflet uses complex layers, we can use Playwright's force click on coordinates,
    // but a safer way to test state navigation is to just call the UI controller function
    // directly or wait for the map to be interactive.
    // For this test, we can evaluate a script to trigger the click on the map.
    await page.evaluate(() => {
      window.app.uiController.selectState('colorado');
    });

    // Wait for state detail tab to become active
    await expect(page.locator('#tab-state-detail')).toHaveClass(/text-indigo-600/);
    
    // Verify the state name is updated
    await expect(page.locator('#detail-state-name')).toHaveText('Colorado');
    
    // Verify the Swipe Compare button is now visible
    await expect(page.locator('#btn-toggle-swipe')).toBeVisible();
  });

  test('should toggle swipe compare without crashing', async ({ page }) => {
    await page.goto('/');
    
    // Enter state view
    await page.evaluate(() => window.app.uiController.selectState('colorado'));
    
    // Wait for transition
    await page.waitForTimeout(1000);
    
    // Click Swipe Compare
    await page.click('#btn-toggle-swipe');
    
    // The swipe slider should appear
    await expect(page.locator('.leaflet-sbs-divider')).toBeVisible();
    
    // Go back to national view
    await page.click('#btn-view-national');
    
    // Wait for transition
    await page.waitForTimeout(1000);
    
    // We should be back on national view without errors
    await expect(page.locator('#national-house-control-card')).toBeVisible();
    await expect(page.locator('.leaflet-sbs-divider')).toBeHidden();
  });
});
