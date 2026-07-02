const fs = require('fs');
const metricsData = fs.readFileSync('/var/home/howlcipher/redistricting-map/data/metrics.json', 'utf-8');
const metrics = JSON.parse(metricsData);
console.log(Object.keys(metrics).slice(0, 10));
