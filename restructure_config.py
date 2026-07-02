import json

with open('public/config.json', 'r') as f:
    config = json.load(f)

# Keys to move into historical_data
keys_to_move = [
    'territory_demographics',
    'third_party_shares',
    'simulation_params',
    'analytical_thresholds'
]

# For each historical block, add these keys if not present
for block in config['historical_data']:
    for key in keys_to_move:
        # Shallow copy or deep copy depending on needs, but since we are just putting them in it's fine
        # We will duplicate the root dicts into each historical block
        block[key] = config[key]

# Remove them from the root
for key in keys_to_move:
    del config[key]

with open('public/config.json', 'w') as f:
    json.dump(config, f, indent=2)

