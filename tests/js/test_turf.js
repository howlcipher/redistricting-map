const turf = require('@turf/turf');
const fs = require('fs');
const usStates = JSON.parse(fs.readFileSync('/var/home/howlcipher/redistricting-map/data/colorado_enacted_districts.geojson'));
// Use just a standard feature
const feature = turf.polygon([[[-100, 40], [-100, 41], [-99, 41], [-99, 40], [-100, 40]]]);
const boxPoly = turf.bboxPolygon([-100, 40, -99.5, 40.5]);
try {
    const intersected = turf.intersect(feature, boxPoly);
    console.log("Success:", !!intersected);
} catch (e) {
    console.error("Error:", e.message);
}
