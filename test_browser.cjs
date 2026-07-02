const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log("Page loaded. Clicking 'Optimized Map'...");
  await page.click('#toggle-optimized');
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Clicking 'Combined (Optimal)'...");
  await page.click('#opt-all');
  await new Promise(r => setTimeout(r, 1000));

  await browser.close();
})();
