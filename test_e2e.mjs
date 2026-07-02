import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

const testMapFeatures = async () => {
    console.log('Starting local server for testing...');
    const server = spawn('npm', ['run', 'preview', '--', '--port', '4173'], { stdio: 'pipe' });
    
    // Wait a moment for server to start
    await new Promise(r => setTimeout(r, 2000));
    
    let browser;
    try {
        console.log('Launching Puppeteer...');
        browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        
        const page = await browser.newPage();
        const errors = [];
        page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
        page.on('pageerror', err => {
            console.error('PAGE ERROR:', err.message);
            errors.push(err);
        });
        
        console.log('Navigating to http://localhost:4173');
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
        
        console.log('Selecting Colorado...');
        await page.evaluate(() => {
            window.app.uiController.selectState('colorado');
        });
        
        // Wait for state to load
        await new Promise(r => setTimeout(r, 4000));
        
        console.log('Clicking Optimized Map button...');
        await page.screenshot({ path: 'before_click_optimized.png' });
        await page.click('#toggle-optimized');
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'after_click_optimized.png' });
        
        console.log('Verifying no NaN values in the DOM...');
        const hasNaN = await page.evaluate(() => {
            return document.body.innerText.includes('NaN');
        });
        
        if (hasNaN) {
            console.error('Test Failed: Found "NaN" in the rendered page text!');
            errors.push(new Error('NaN value found in DOM'));
        } else {
            console.log('Check passed: No "NaN" text found.');
        }
        
        console.log('Checking for page errors...');
        if (errors.length > 0) {
            console.error('Page errors encountered:', errors);
            process.exit(1);
        } else {
            console.log('No errors! Tests passed.');
        }
    } catch (e) {
        console.error('Test failed with exception:', e);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        server.kill();
        process.exit(0);
    }
};

testMapFeatures();
