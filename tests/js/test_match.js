import fs from 'fs';
const data = JSON.parse(fs.readFileSync('/var/home/howlcipher/redistricting-map/tests/fixtures/us-states.json', 'utf-8'));
const districtCounts = {
    'alabama': 7, 'alaska': 1, 'arizona': 9, 'arkansas': 4, 'california': 52,
    'colorado': 8, 'connecticut': 5, 'delaware': 1, 'florida': 28, 'georgia': 14,
    'hawaii': 2, 'idaho': 2, 'illinois': 17, 'indiana': 9, 'iowa': 4,
    'kansas': 4, 'kentucky': 6, 'louisiana': 6, 'maine': 2, 'maryland': 8,
    'massachusetts': 9, 'michigan': 13, 'minnesota': 8, 'mississippi': 4, 'missouri': 8,
    'montana': 2, 'nebraska': 3, 'nevada': 4, 'new_hampshire': 2, 'new_jersey': 12,
    'new_mexico': 3, 'new_york': 26, 'north_carolina': 14, 'north_dakota': 1, 'ohio': 15,
    'oklahoma': 5, 'oregon': 6, 'pennsylvania': 17, 'rhode_island': 2, 'south_carolina': 7,
    'south_dakota': 1, 'tennessee': 9, 'texas': 38, 'utah': 4, 'vermont': 1,
    'virginia': 11, 'washington': 10, 'west_virginia': 2, 'wisconsin': 8, 'wyoming': 1,
    'district_of_columbia': 1, 'puerto_rico': 1, 'guam': 1, 'virgin_islands': 1,
    'american_samoa': 1, 'northern_mariana_islands': 1
};
const keys = Object.keys(districtCounts);
const matched = [];
const unmatched = [];
for (const f of data.features) {
    if (f.properties && f.properties.name) {
        const name = f.properties.name.toLowerCase().replace(/ /g, '_');
        if (keys.includes(name)) {
            matched.push(name);
        } else {
            unmatched.push(name);
        }
    }
}
const missing = keys.filter(k => !matched.includes(k));
console.log("Matched:", matched.length);
console.log("Unmatched GeoJSON:", unmatched);
console.log("Missing from GeoJSON:", missing);
