import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/var/home/howlcipher/redistricting-map/data/metrics.json', 'utf-8'));
let countEnacted = 0;
let countOptimized = 0;
let countZero = 0;
for (const state of Object.keys(data)) {
    if (data[state].enacted) countEnacted++;
    if (data[state].optimized_all) countOptimized++;
    if (Object.keys(data[state]).length === 0) countZero++;
}
console.log(`Enacted: ${countEnacted}, Optimized: ${countOptimized}, Empty: ${countZero}`);
