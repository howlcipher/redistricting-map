#!/bin/bash
set -e

# All 50 states (and DC) by their abbreviation and full name
declare -A STATES=(
    ["AL"]="alabama" ["AK"]="alaska" ["AZ"]="arizona" ["AR"]="arkansas" ["CA"]="california"
    ["CO"]="colorado" ["CT"]="connecticut" ["DE"]="delaware" ["FL"]="florida" ["GA"]="georgia"
    ["HI"]="hawaii" ["ID"]="idaho" ["IL"]="illinois" ["IN"]="indiana" ["IA"]="iowa"
    ["KS"]="kansas" ["KY"]="kentucky" ["LA"]="louisiana" ["ME"]="maine" ["MD"]="maryland"
    ["MA"]="massachusetts" ["MI"]="michigan" ["MN"]="minnesota" ["MS"]="mississippi" ["MO"]="missouri"
    ["MT"]="montana" ["NE"]="nebraska" ["NV"]="nevada" ["NH"]="new_hampshire" ["NJ"]="new_jersey"
    ["NM"]="new_mexico" ["NY"]="new_york" ["NC"]="north_carolina" ["ND"]="north_dakota" ["OH"]="ohio"
    ["OK"]="oklahoma" ["OR"]="oregon" ["PA"]="pennsylvania" ["RI"]="rhode_island" ["SC"]="south_carolina"
    ["SD"]="south_dakota" ["TN"]="tennessee" ["TX"]="texas" ["UT"]="utah" ["VT"]="vermont"
    ["VA"]="virginia" ["WA"]="washington" ["WV"]="west_virginia" ["WI"]="wisconsin" ["WY"]="wyoming"
)

echo "Starting ALARM Project Full 50-State Pipeline via Podman..."

for abbr in "${!STATES[@]}"; do
    state_name="${STATES[$abbr]}"
    echo "Processing $state_name ($abbr)..."
    podman run --rm -v "$(pwd)":/app:Z -w /app localhost/r-redist Rscript run_pipeline.R "$abbr" "$state_name"
done

echo "=========================================="
echo "PIPELINE COMPLETE! All 50 states processed."
echo "=========================================="
