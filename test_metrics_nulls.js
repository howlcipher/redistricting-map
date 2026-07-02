import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/var/home/howlcipher/redistricting-map/data/metrics.json', 'utf-8'));
for (const state of Object.keys(data)) {
    if (!data[state].enacted.efficiency_gap && data[state].enacted.efficiency_gap !== 0) {
        console.log(state, "missing enacted eg");
    }
}
