const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  await page.goto('http://localhost:8000/redistricting-map/', { waitUntil: 'networkidle' });
  
  const stateKeys = await page.evaluate(() => Object.keys(window.app.dataService.stateLeaderboardData));
  console.log('Leaderboard states:', stateKeys.length);
  
  await browser.close();
})();
