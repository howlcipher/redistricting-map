import json

with open("../public/config.json", "r") as f:
    config = json.load(f)

# Hardcoded data from DataService.js
statePartisanBaselines_2024 = {
    'alabama': 0.082, 'alaska': 0.0, 'arizona': 0.021, 'arkansas': 0.091, 'california': -0.068,
    'colorado': -0.065, 'connecticut': -0.058, 'delaware': 0.0, 'florida': 0.074, 'georgia': 0.061,
    'hawaii': -0.088, 'idaho': 0.115, 'illinois': -0.092, 'indiana': 0.072, 'iowa': 0.048,
    'kansas': 0.076, 'kentucky': 0.088, 'louisiana': 0.068, 'maine': -0.025, 'maryland': -0.078,
    'massachusetts': -0.084, 'michigan': 0.012, 'minnesota': -0.018, 'mississippi': 0.059, 'missouri': 0.077,
    'montana': 0.038, 'nebraska': 0.075, 'nevada': 0.014, 'new_hampshire': 0.011, 'new_jersey': -0.036,
    'new_mexico': -0.038, 'new_york': -0.052, 'north_carolina': 0.104, 'north_dakota': 0.0, 'ohio': 0.083,
    'oklahoma': 0.108, 'oregon': -0.046, 'pennsylvania': 0.018, 'rhode_island': -0.035, 'south_carolina': 0.079,
    'south_dakota': 0.0, 'tennessee': 0.095, 'texas': 0.089, 'utah': 0.098, 'vermont': 0.0,
    'virginia': -0.014, 'washington': -0.042, 'west_virginia': 0.087, 'wisconsin': 0.116, 'wyoming': 0.0,
    'district_of_columbia': 0.0, 'puerto_rico': 0.0, 'guam': 0.0, 'virgin_islands': 0.0,
    'american_samoa': 0.0, 'northern_mariana_islands': 0.0
}

stateLeaderboardData_2024 = {
    'colorado': { "name": 'Colorado', "enacted_eg": -0.065, "enacted_comp": 2, "enacted_compac": 0.246, "optimized_eg": -0.126, "optimized_comp": 2, "optimized_compac": 0.358, "enacted_min_inf": 8, "enacted_min_maj": 4, "optimized_min_inf": 8, "optimized_min_maj": 2, "enacted_mmd": 0.045, "optimized_mmd": 0.004, "enacted_splits": 22, "optimized_splits": 16, "lat": 40.2, "lon": -104.8, "zoom": 7.5 },
    'wisconsin': { "name": 'Wisconsin', "enacted_eg": 0.116, "enacted_comp": 1, "enacted_compac": 0.211, "optimized_eg": -0.012, "optimized_comp": 4, "optimized_compac": 0.385, "enacted_min_inf": 1, "enacted_min_maj": 1, "optimized_min_inf": 2, "optimized_min_maj": 1, "enacted_mmd": 0.082, "optimized_mmd": 0.005, "enacted_splits": 21, "optimized_splits": 14, "lat": 44.5, "lon": -89.5, "zoom": 7.2 },
    'north_carolina': { "name": 'North Carolina', "enacted_eg": 0.104, "enacted_comp": 2, "enacted_compac": 0.198, "optimized_eg": -0.008, "optimized_comp": 5, "optimized_compac": 0.372, "enacted_min_inf": 3, "enacted_min_maj": 1, "optimized_min_inf": 4, "optimized_min_maj": 2, "enacted_mmd": 0.061, "optimized_mmd": 0.004, "enacted_splits": 28, "optimized_splits": 16, "lat": 35.5, "lon": -80.0, "zoom": 7.0 },
    'texas': { "name": 'Texas', "enacted_eg": 0.089, "enacted_comp": 3, "enacted_compac": 0.185, "optimized_eg": 0.005, "optimized_comp": 8, "optimized_compac": 0.354, "enacted_min_inf": 12, "enacted_min_maj": 8, "optimized_min_inf": 15, "optimized_min_maj": 10, "enacted_mmd": 0.054, "optimized_mmd": 0.003, "enacted_splits": 42, "optimized_splits": 28, "lat": 31.5, "lon": -99.5, "zoom": 6.0 },
    'maryland': { "name": 'Maryland', "enacted_eg": -0.078, "enacted_comp": 1, "enacted_compac": 0.174, "optimized_eg": -0.002, "optimized_comp": 3, "optimized_compac": 0.361, "enacted_min_inf": 4, "enacted_min_maj": 2, "optimized_min_inf": 5, "optimized_min_maj": 3, "enacted_mmd": -0.048, "optimized_mmd": -0.002, "enacted_splits": 19, "optimized_splits": 12, "lat": 39.0, "lon": -76.8, "zoom": 8.0 }
}

# Add a 2010 mock data structure to show historical swap
import copy
district_counts_2010 = copy.deepcopy(config["district_counts"])
district_counts_2010["texas"] = 36
district_counts_2010["colorado"] = 7
district_counts_2010["florida"] = 27
district_counts_2010["new_york"] = 27

stateLeaderboardData_2010 = copy.deepcopy(stateLeaderboardData_2024)
stateLeaderboardData_2010["colorado"]["enacted_eg"] = -0.03
stateLeaderboardData_2010["colorado"]["enacted_comp"] = 3
stateLeaderboardData_2010["texas"]["enacted_eg"] = 0.12
stateLeaderboardData_2010["texas"]["enacted_comp"] = 2

statePartisanBaselines_2010 = copy.deepcopy(statePartisanBaselines_2024)
statePartisanBaselines_2010["colorado"] = -0.03
statePartisanBaselines_2010["texas"] = 0.11

config["historical_data"] = [
    {
        "date": "2024-01-01",
        "district_counts": config["district_counts"],
        "state_profiles": config["state_profiles"],
        "state_partisan_baselines": statePartisanBaselines_2024,
        "state_leaderboard_data": stateLeaderboardData_2024
    },
    {
        "date": "2010-01-01",
        "district_counts": district_counts_2010,
        "state_profiles": config["state_profiles"],
        "state_partisan_baselines": statePartisanBaselines_2010,
        "state_leaderboard_data": stateLeaderboardData_2010
    }
]

del config["district_counts"]
del config["state_profiles"]

with open("../public/config.json", "w") as f:
    json.dump(config, f, indent=2)

