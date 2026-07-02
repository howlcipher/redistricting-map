import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'public', 'data');
const metricsFile = path.join(dataDir, 'metrics.json');
const configFile = path.join(__dirname, 'public', 'config.json');

// Read existing configs
let config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
let metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));

const states = Object.keys(config.historical_data[0].district_counts);
let totalDemEnacted = 0;
let totalRepEnacted = 0;

for (const state of states) {
    if (['district_of_columbia', 'puerto_rico', 'guam', 'virgin_islands', 'american_samoa', 'northern_mariana_islands'].includes(state)) continue;

    const enactedFile = path.join(dataDir, `${state}_enacted_districts.geojson`);
    const optFile = path.join(dataDir, `${state}_optimized_districts_all.geojson`);
    
    if (!fs.existsSync(enactedFile)) continue;
    
    const enactedData = JSON.parse(fs.readFileSync(enactedFile, 'utf8'));
    
    // Calculate seats for enacted
    let distVotes = {};
    for (const feature of enactedData.features) {
        const props = feature.properties;
        const dist = props.enacted_district;
        if (!distVotes[dist]) distVotes[dist] = { d: 0, r: 0 };
        distVotes[dist].d += (props.dem_votes || 0);
        distVotes[dist].r += (props.rep_votes || 0);
    }
    
    let stateDem = 0, stateRep = 0;
    for (const dist in distVotes) {
        if (distVotes[dist].d > distVotes[dist].r) stateDem++;
        else stateRep++;
    }
    
    const N = stateDem + stateRep;
    if (N > 0) {
        const impliedEg = 0.50 - (stateDem / N);
        config.historical_data[0].state_partisan_baselines[state] = impliedEg;
    }
    
    // Also do the same for optimized map
    if (fs.existsSync(optFile)) {
        const optData = JSON.parse(fs.readFileSync(optFile, 'utf8'));
        let optDistVotes = {};
        for (const feature of optData.features) {
            const props = feature.properties;
            const dist = props.opt_all;
            if (!optDistVotes[dist]) optDistVotes[dist] = { d: 0, r: 0 };
            optDistVotes[dist].d += (props.dem_votes || 0);
            optDistVotes[dist].r += (props.rep_votes || 0);
        }
        
        let optStateDem = 0, optStateRep = 0;
        for (const dist in optDistVotes) {
            if (optDistVotes[dist].d > optDistVotes[dist].r) optStateDem++;
            else optStateRep++;
        }
        
        const optImpliedEg = N > 0 ? 0.50 - (optStateDem / N) : 0;
        
        if (!metrics[state]) metrics[state] = {};
        if (!metrics[state].enacted) metrics[state].enacted = {};
        if (!metrics[state].optimized_all) metrics[state].optimized_all = {};
        
        metrics[state].enacted.efficiency_gap = config.historical_data[0].state_partisan_baselines[state] || 0;
        metrics[state].optimized_all.efficiency_gap = optImpliedEg;
        
        if (!config.historical_data[0].state_leaderboard_data) {
            config.historical_data[0].state_leaderboard_data = {};
        }
        if (!config.historical_data[0].state_leaderboard_data[state]) {
            config.historical_data[0].state_leaderboard_data[state] = {};
        }
        
        config.historical_data[0].state_leaderboard_data[state].enacted_eg = config.historical_data[0].state_partisan_baselines[state];
        config.historical_data[0].state_leaderboard_data[state].optimized_eg = optImpliedEg;
        config.historical_data[0].state_leaderboard_data[state].tuned_eg = optImpliedEg;
        config.historical_data[0].state_leaderboard_data[state].enacted_dem_seats = stateDem;
        config.historical_data[0].state_leaderboard_data[state].optimized_dem_seats = optStateDem;
    }
}

fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
console.log("Metrics updated successfully based on precinct vote aggregates!");
