const fs = require('fs');

async function test() {
    const districtCounts = { 'alabama': 7, 'alaska': 1 };
    
    // Read local metrics to ensure it parses
    const metricsData = fs.readFileSync('/var/home/howlcipher/redistricting-map/data/metrics.json', 'utf-8');
    const metrics = JSON.parse(metricsData);
    console.log("metrics.json keys:", Object.keys(metrics).length);
    
    console.log("Test passed");
}
test();
