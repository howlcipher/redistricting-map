import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/var/home/howlcipher/redistricting-map/data/us-states.json', 'utf-8'));
const missing = data.features.filter(f => !f.properties || !f.properties.name);
console.log("Missing name:", missing.length);
