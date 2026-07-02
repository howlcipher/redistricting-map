const fs = require('fs');

async function test() {
    const metricsData = fs.readFileSync('/var/home/howlcipher/redistricting-map/data/metrics.json', 'utf-8');
    const metrics = JSON.parse(metricsData);
    console.log("metrics.json keys:", Object.keys(metrics).length);
}
test();
