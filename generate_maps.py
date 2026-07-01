import os
import argparse
import json
import urllib.request
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import box, Polygon
from gerrychain import Graph, Partition, MarkovChain
from gerrychain.updaters import Tally, cut_edges
from gerrychain.proposals import recom
from gerrychain.constraints import within_percent_of_ideal_population
from gerrychain.tree import recursive_tree_part
import networkx as nx
from functools import partial

# Load configuration from config.json
config_path = os.path.join(os.path.dirname(__file__), 'config.json')
with open(config_path, 'r') as f:
    CONFIG = json.load(f)

STATES_URL = CONFIG["urls"]["states_geojson"]
DISTRICT_COUNTS = CONFIG["district_counts"]
STATE_PROFILES = CONFIG["state_profiles"]
TERRITORY_COORDS = CONFIG["territory_coords"]
TERRITORY_DEMOGRAPHICS = CONFIG["territory_demographics"]
THIRD_PARTY_SHARES = CONFIG["third_party_shares"]
SIMULATION_PARAMS = CONFIG["simulation_params"]
class GeoDataProcessor:
    """
    Handles geographical data processing, including downloading boundary data,
    grid generation, and synthetic demographics/voter assignment.
    """

    @staticmethod
    def download_states_geojson(output_path=None):
        """
        Downloads the U.S. states GeoJSON file if it doesn't already exist.

        Args:
            output_path (str): The local path where the file should be saved.

        Returns:
            str: The output path of the downloaded file.
        """
        if output_path is None:
            output_path = CONFIG["files"]["states_geojson"]
        if not os.path.exists(output_path):
            print(f"Downloading U.S. state boundaries from {STATES_URL}...")
            urllib.request.urlretrieve(STATES_URL, output_path)
        return output_path

    @staticmethod
    def load_census_vtd_data(shapefile_path):
        """
        STUB: Ingests true Census VTD (Voting Tabulation District) shapefiles.
        This prepares the pipeline for transitioning from synthetic grid intersections
        to real-world census block geometries.
        
        Args:
            shapefile_path (str): Path to the TIGER/Line VTD shapefile.
            
        Returns:
            GeoDataFrame: Processed VTDs with joined PL94-171 demographic data.
        """
        # TODO: Implement actual PySAL/GeoPandas spatial join logic for real census data.
        # gdf = gpd.read_file(shapefile_path)
        # return gdf
        pass

    @staticmethod
    def generate_state_geometries(states_file, state_name, num_districts=None, grid_size=None):
        """
        Loads the state border polygon, clips a grid to it, filters out small islands,
        and returns a connected GeoDataFrame in EPSG:3857 planar projection with synthesized
        demographic and partisan data.


        Args:
            states_file (str): Path to the GeoJSON file containing state boundaries.
            state_name (str): Name of the state to process.
            num_districts (int): Target number of districts for the state.
            grid_size (int): Resolution of the grid.

        Returns:
            GeoDataFrame: The processed grid intersections with the state boundary.
        """
        if num_districts is None:
            num_districts = CONFIG["default_args"]["num_districts"]
        if grid_size is None:
            grid_size = CONFIG["default_args"]["grid_size"]
            
        print(f"\nProcessing boundaries for {state_name}...")
        
        name_lower = state_name.lower().replace(' ', '_')
        if name_lower in TERRITORY_COORDS:
            lat = TERRITORY_COORDS[name_lower]['lat']
            lon = TERRITORY_COORDS[name_lower]['lon']
            d = 0.05
            poly = Polygon([
                (lon - d, lat - d),
                (lon - d, lat + d),
                (lon + d, lat + d),
                (lon + d, lat - d)
            ])
            gdf = gpd.GeoDataFrame(geometry=[poly], crs="EPSG:4326")
            gdf_3857 = gdf.to_crs(epsg=3857)
            for key, value in TERRITORY_DEMOGRAPHICS.items():
                gdf_3857[key] = value
            return gdf_3857

        states_gdf = gpd.read_file(states_file)
        state_gdf = states_gdf[states_gdf['name'].str.lower() == state_name.lower()]
        
        if len(state_gdf) == 0:
            raise ValueError(f"State '{state_name}' not found in US states boundaries file.")
            
        state_geom = state_gdf.geometry.iloc[0]
        
        # Generate coordinates using np.linspace to avoid floating-point gaps
        minx, miny, maxx, maxy = state_geom.bounds
        x_coords = np.linspace(minx, maxx, grid_size + 1)
        y_coords = np.linspace(miny, maxy, grid_size + 1)
        
        boxes = []
        for i in range(grid_size):
            for j in range(grid_size):
                boxes.append(box(x_coords[i], y_coords[j], x_coords[i+1], y_coords[j+1]))
                
        grid_gdf = gpd.GeoDataFrame(geometry=boxes, crs="EPSG:4326")
        
        # Clip grid to the actual state boundary in planar EPSG:3857 for robustness
        state_gdf_3857 = state_gdf.to_crs(epsg=3857)
        grid_gdf_3857 = grid_gdf.to_crs(epsg=3857)
        
        clipped_gdf = gpd.clip(grid_gdf_3857, state_gdf_3857)
        # Drop tiny slivers less than 1000 square meters
        clipped_gdf = clipped_gdf[clipped_gdf.geometry.area > 1000].reset_index(drop=True)
        
        # Build a temporary graph to check connectivity and extract the mainland
        temp_graph = Graph.from_geodataframe(clipped_gdf)
        largest_cc = max(nx.connected_components(temp_graph), key=len)
        
        # Keep only the largest connected component (mainland) to ensure ReCom works
        clipped_gdf = clipped_gdf.iloc[list(largest_cc)].reset_index(drop=True)
        
        # Re-project to geographic for coordinate calculations
        gdf_wgs84 = clipped_gdf.to_crs(epsg=4326)
        gdf_wgs84['x_coord'] = [geom.centroid.x for geom in gdf_wgs84['geometry']]
        gdf_wgs84['y_coord'] = [geom.centroid.y for geom in gdf_wgs84['geometry']]
        
        # Center of state for urban core simulation
        center_x = gdf_wgs84['x_coord'].mean()
        center_y = gdf_wgs84['y_coord'].mean()
        distances = np.sqrt((gdf_wgs84['x_coord'] - center_x)**2 + (gdf_wgs84['y_coord'] - center_y)**2)
        max_dist = distances.max() if distances.max() > 0 else 1.0
        
        # 1. Population: Higher in center, lower at edges
        clipped_gdf['population'] = (SIMULATION_PARAMS['pop_base'] * (1 - SIMULATION_PARAMS['pop_decay'] * (distances / max_dist))).astype(int)
        
        # 2. Voting Age Pop
        vap_ratio = SIMULATION_PARAMS['vap_base'] - SIMULATION_PARAMS['vap_decay'] * (distances / max_dist)
        clipped_gdf['voting_age_pop'] = (clipped_gdf['population'] * vap_ratio).astype(int)
        
        # 3. Partisan Vote Share: Dem concentrated in urban center, Rep in rural
        state_key = state_name.lower().replace(' ', '_')
        profile = STATE_PROFILES.get(state_key, STATE_PROFILES['default'])
        
        dem_base = profile['dem_base']
        dem_mult = profile['dem_mult']
            
        dem_share = dem_base * (1 - dem_mult * (distances / max_dist)) + SIMULATION_PARAMS['dem_offset']
        dem_share = np.clip(dem_share + np.random.normal(0, SIMULATION_PARAMS['dem_noise'], len(clipped_gdf)), SIMULATION_PARAMS['dem_min'], SIMULATION_PARAMS['dem_max'])
        
        clipped_gdf['dem_votes'] = (clipped_gdf['population'] * dem_share * SIMULATION_PARAMS['two_party_turnout']).astype(int)
        clipped_gdf['rep_votes'] = (clipped_gdf['population'] * (1 - dem_share) * SIMULATION_PARAMS['two_party_turnout']).astype(int)
        for party, share in THIRD_PARTY_SHARES.items():
            clipped_gdf[f'{party}_votes'] = (clipped_gdf['population'] * share).astype(int)
        
        # 4. Demographics: Minority groups concentrated in urban center
        minority_base = profile['minority_base']
        minority_share = minority_base * (1 - SIMULATION_PARAMS['minority_decay'] * (distances / max_dist)) + SIMULATION_PARAMS['minority_offset']
        minority_share = np.clip(minority_share + np.random.normal(0, SIMULATION_PARAMS['minority_noise'], len(clipped_gdf)), 0.0, 1.0)
        clipped_gdf['minority_pop'] = (clipped_gdf['population'] * minority_share).astype(int)
        clipped_gdf['white_pop'] = clipped_gdf['population'] - clipped_gdf['minority_pop']
        
        # 5. Define a 3x3 county layout over the state's bounding box
        cx = ((gdf_wgs84['x_coord'] - minx) // ((maxx - minx) / 3)).astype(int).clip(0, 2)
        cy = ((gdf_wgs84['y_coord'] - miny) // ((maxy - miny) / 3)).astype(int).clip(0, 2)
        clipped_gdf['county'] = "County_" + cx.astype(str) + "_" + cy.astype(str)
        
        # 6. Create Enacted district map by vertical slices with a wiggle gerrymander
        minx_p = clipped_gdf.geometry.centroid.x.min()
        maxx_p = clipped_gdf.geometry.centroid.x.max()
        raw_stripes = ((clipped_gdf.geometry.centroid.x - minx_p) // ((maxx_p - minx_p) / num_districts)).astype(int)
        clipped_gdf['enacted_district'] = np.clip(raw_stripes, 0, num_districts - 1)
        
        # Add a squiggle in the middle vertical band
        miny_p = clipped_gdf.geometry.centroid.y.min()
        maxy_p = clipped_gdf.geometry.centroid.y.max()
        midy_low = miny_p + (maxy_p - miny_p) * SIMULATION_PARAMS['wiggle_low_pct']
        midy_high = miny_p + (maxy_p - miny_p) * SIMULATION_PARAMS['wiggle_high_pct']
        
        mask_wiggle = (clipped_gdf.geometry.centroid.y >= midy_low) & (clipped_gdf.geometry.centroid.y <= midy_high)
        clipped_gdf.loc[mask_wiggle & (clipped_gdf['enacted_district'] == 3), 'enacted_district'] = 4
        clipped_gdf.loc[mask_wiggle & (clipped_gdf['enacted_district'] == 4), 'enacted_district'] = 3
        
        return clipped_gdf

class RedistrictingSimulator:
    """
    Manages the GerryChain Markov Chain Monte Carlo simulations for 
    generating optimal redistricting plans based on various constraints.
    """

    @staticmethod
    def run_single_optimization(graph, gdf, num_districts, steps, optimize_by, pop_col, dem_col, rep_col, minority_col, vap_col):
        """
        Runs a Markov Chain Monte Carlo simulation using the ReCom (Recombination) algorithm 
        to optimize a districting plan according to specified criteria.

        Args:
            graph (Graph): GerryChain graph representation of the geography.
            gdf (GeoDataFrame): GeoDataFrame containing the underlying geographic and demographic data.
            num_districts (int): Target number of districts.
            steps (int): Number of steps to run the Markov chain.
            optimize_by (list): List of criteria to optimize ('headcount', 'age', 'race', 'county').
            pop_col (str): Column name for total population.
            dem_col (str): Column name for democratic votes.
            rep_col (str): Column name for republican votes.
            minority_col (str): Column name for minority population.
            vap_col (str): Column name for voting age population.

        Returns:
            Partition: The best districting plan (Partition) found during the chain run.
        """
        updaters = {
            "population": Tally(pop_col, alias="population"),
            "voting_age_pop": Tally(vap_col, alias="voting_age_pop"),
            "dem_votes": Tally(dem_col, alias="dem_votes"),
            "rep_votes": Tally(rep_col, alias="rep_votes"),
            "minority_pop": Tally(minority_col, alias="minority_pop"),
            "cut_edges": cut_edges
        }
        
        balance_col = vap_col if "age" in optimize_by else pop_col
        total_balance_pop = gdf[balance_col].sum()
        ideal_balance_pop = total_balance_pop / num_districts
        
        eps = 0.05 if num_districts > 10 else 0.03
        
        # Create an initial random districting plan using a recursive tree partitioning algorithm.
        # This algorithm:
        # 1. Generates a random spanning tree of the geographic graph.
        # 2. Finds an edge that can be cut to detach a piece (district) whose population 
        #    is within the specified epsilon tolerance of the ideal population.
        # 3. Recursively applies this process on the remaining graph until all districts are formed.
        # This provides a valid starting state for the Markov Chain.
        seed_assignment = recursive_tree_part(
            graph, 
            parts=range(num_districts), 
            pop_target=ideal_balance_pop, 
            pop_col=balance_col, 
            epsilon=eps, 
            node_repeats=2
        )
        
        initial_partition = Partition(graph, seed_assignment, updaters)
        
        # The ReCom (Recombination) algorithm proposal function is the core of the MCMC step.
        # It operates by:
        # 1. Selecting an edge that connects two adjacent districts in the current partition.
        # 2. Merging the subgraphs of these two districts into a single connected component.
        # 3. Drawing a spanning tree of the merged subgraph.
        # 4. Finding a cut (edge to remove) in the spanning tree that splits it into two new districts 
        #    such that both maintain a population within the `epsilon` tolerance of the `pop_target`.
        # This approach ensures compactness and contiguity dynamically while traversing the state space.
        proposal = partial(
            recom,
            pop_col=balance_col,
            pop_target=ideal_balance_pop,
            epsilon=eps,
            node_repeats=2
        )
        
        # Constraint to ensure proposed plans don't violate population balance limits.
        # Proposed plans (from ReCom) will only be valid if the total population of every district 
        # is within `epsilon` percent of the `ideal_balance_pop`.
        compactness_bound = within_percent_of_ideal_population(initial_partition, eps, pop_key=balance_col)
        
        # The Markov Chain configuration sets up a random walk through the space of valid districting plans.
        # At each step:
        # - The `proposal` function (ReCom) suggests a new plan.
        # - The `constraints` check if the proposed plan is valid (e.g. population balanced).
        # - The `accept` function determines whether to adopt the valid proposed plan. 
        #   (Here, we use a greedy/simulated annealing style search where accept is always True 
        #   and we manually track the lowest cost plan).
        chain = MarkovChain(
            proposal=proposal,
            constraints=[compactness_bound],
            accept=lambda p: True,
            initial_state=initial_partition,
            total_steps=steps
        )
        
        def calculate_score(partition):
            """
            Evaluates a partition. Lower score is better.
            We use a simulated annealing style cost function.
            """
            score = 0.0
            # Penalize non-compact maps by adding the number of cut edges.
            # Cut edges are edges in the dual graph whose endpoints belong to different districts.
            # Fewer cut edges correspond to smoother boundaries and higher compactness.
            score += len(partition["cut_edges"]) * 1.0
            
            if "race" in optimize_by:
                mm_count = sum(1 for d in partition.parts if (partition["minority_pop"][d] / partition["population"][d]) >= 0.45)
                if mm_count < 2:
                    score += (2 - mm_count) * 150.0
                    
            if "county" in optimize_by:
                temp_assignment = pd.Series(partition.assignment)
                splits = MetricsAnalyzer.count_county_splits(gdf, temp_assignment)
                score += splits * 30.0
                
            return score
            
        best_partition = initial_partition
        best_score = calculate_score(initial_partition)
        
        for i, partition in enumerate(chain):
            score = calculate_score(partition)
            if score < best_score:
                best_score = score
                best_partition = partition
                
        return best_partition

class MetricsAnalyzer:
    """
    Responsible for evaluating districting plans, calculating partisan metrics
    (like efficiency gap), compactness, and minority representation.
    """

    @staticmethod
    def count_county_splits(gdf, partition_assignment, county_col=None):
        """
        Counts the number of times a county is split across multiple districts.

        Args:
            gdf (GeoDataFrame): The state geometry data.
            partition_assignment (str, dict, Series): The district assignments for each node.
            county_col (str): The column name identifying the county of each node.

        Returns:
            int: Total number of county splits.
        """
        if county_col is None:
            county_col = CONFIG["default_args"]["split_county_col"]
            
        if isinstance(partition_assignment, str):
            assignment_series = gdf[partition_assignment]
        elif isinstance(partition_assignment, dict):
            assignment_series = pd.Series(partition_assignment)
        else:
            assignment_series = partition_assignment
            
        grouped = assignment_series.groupby(gdf[county_col]).nunique()
        splits = 0
        for num_districts in grouped.values:
            if num_districts > 1:
                splits += (num_districts - 1)
        return int(splits)

    @staticmethod
    def calculate_summary_metrics(df, gdf, assignment_col, thresholds=None):
        """
        Calculates summary metrics for a given redistricting plan, including
        the efficiency gap, competitive seats, minority representation, and compactness.

        Args:
            df (DataFrame): Aggregated district-level dataframe.
            gdf (GeoDataFrame): Node-level geography dataframe.
            assignment_col (str): The column name for district assignments.
            thresholds (dict): Thresholds for metrics calculations.

        Returns:
            dict: Summary metrics.
        """
        if thresholds is None:
            # Fallback to defaults
            thresholds = {
                "competitive_min": 0.45,
                "competitive_max": 0.55,
                "minority_influence": 0.30,
                "minority_majority": 0.50,
                "wasted_votes_divisor": 2.0
            }
        total_votes = df['dem_votes_sum'].sum() + df['rep_votes_sum'].sum()
        
        wasted_dem = 0
        wasted_rep = 0
        competitive_seats = 0
        minority_influence_seats = 0
        minority_majority_seats = 0
        dem_shares = []
        
        for _, row in df.iterrows():
            dem = row['dem_votes_sum']
            rep = row['rep_votes_sum']
            tot = dem + rep
            pop = row['total_pop']
            minority = row['minority_pop_sum']
            
            dem_share = dem / tot if tot > 0 else 0.0
            dem_shares.append(dem_share)
            if thresholds["competitive_min"] <= dem_share <= thresholds["competitive_max"]:
                competitive_seats += 1
                
            if dem > rep:
                w_dem = dem - (tot / thresholds["wasted_votes_divisor"])
                w_rep = rep
            else:
                w_dem = dem
                w_rep = rep - (tot / thresholds["wasted_votes_divisor"])
            wasted_dem += w_dem
            wasted_rep += w_rep
            
            min_pct = minority / pop if pop > 0 else 0.0
            if min_pct >= thresholds["minority_influence"]:
                minority_influence_seats += 1
            if min_pct >= thresholds["minority_majority"]:
                minority_majority_seats += 1
                
        # Efficiency gap: A mathematical measure of partisan gerrymandering.
        # It compares the difference between each party's wasted votes.
        # Wasted votes are: (1) All votes cast for a losing candidate, and 
        # (2) all votes cast for a winning candidate beyond the 50% threshold needed to win.
        # Efficiency Gap = (Wasted Dem - Wasted Rep) / Total Votes
        # A positive value favors Democrats (fewer wasted Dem votes), negative favors Republicans.
        efficiency_gap = (wasted_dem - wasted_rep) / total_votes if total_votes > 0 else 0.0
        avg_compactness = df['compactness'].mean()
        
        mean_dem = np.mean(dem_shares)
        median_dem = np.median(dem_shares)
        mean_median_diff = mean_dem - median_dem
        
        county_splits = MetricsAnalyzer.count_county_splits(gdf, assignment_col)
        
        return {
            "efficiency_gap": float(efficiency_gap),
            "mean_median_diff": float(mean_median_diff),
            "competitive_seats": int(competitive_seats),
            "minority_influence_seats": int(minority_influence_seats),
            "minority_majority_seats": int(minority_majority_seats),
            "avg_compactness": float(avg_compactness),
            "county_splits": int(county_splits)
        }

class PipelineManager:
    """
    Coordinates the end-to-end pipeline of downloading data, simulating
    redistricting, analyzing metrics, and saving outputs.
    """

    def __init__(self, steps=80, output_dir="public/data", thresholds=None):
        """
        Initializes the pipeline manager with simulation steps and output directory.

        Args:
            steps (int): Number of steps to run the Markov chain.
            output_dir (str): Output directory for geojson and metrics.
            thresholds (dict): Thresholds for metrics calculations.
        """
        self.steps = steps
        self.output_dir = output_dir
        self.thresholds = thresholds

    @staticmethod
    def _create_district_features(gdf, assignment_col, pop_col, vap_col, dem_col, rep_col, minority_col):
        """
        Helper method to aggregate node-level geography into districts and compute geometries and metrics.
        
        Args:
            gdf (GeoDataFrame): The node-level geographic data.
            assignment_col (str): The column denoting district assignments.
            pop_col (str): Column name for total population.
            vap_col (str): Column name for voting age population.
            dem_col (str): Column name for democratic votes.
            rep_col (str): Column name for republican votes.
            minority_col (str): Column name for minority population.
            
        Returns:
            GeoDataFrame: A GeoDataFrame with aggregated district-level data.
        """
        districts = gdf.dissolve(by=assignment_col, aggfunc={
            pop_col: 'sum',
            vap_col: 'sum',
            dem_col: 'sum',
            rep_col: 'sum',
            'lib_votes': 'sum',
            'grn_votes': 'sum',
            'con_votes': 'sum',
            'ref_votes': 'sum',
            minority_col: 'sum'
        }).reset_index().rename(columns={assignment_col: 'district_id'})
        
        districts['total_pop'] = districts[pop_col]
        districts['voting_age_pop'] = districts[vap_col]
        districts['dem_votes_sum'] = districts[dem_col]
        districts['rep_votes_sum'] = districts[rep_col]
        districts['lib_votes_sum'] = districts['lib_votes']
        districts['grn_votes_sum'] = districts['grn_votes']
        districts['con_votes_sum'] = districts['con_votes']
        districts['ref_votes_sum'] = districts['ref_votes']
        districts['minority_pop_sum'] = districts[minority_col]
        
        total_votes_dist = districts['dem_votes_sum'] + districts['rep_votes_sum'] + districts['lib_votes_sum'] + districts['grn_votes_sum'] + districts['con_votes_sum'] + districts['ref_votes_sum']
        districts['dem_pct'] = np.where(total_votes_dist > 0, districts['dem_votes_sum'] / total_votes_dist, 0.0)
        districts['rep_pct'] = np.where(total_votes_dist > 0, districts['rep_votes_sum'] / total_votes_dist, 0.0)
        districts['lib_pct'] = np.where(total_votes_dist > 0, districts['lib_votes_sum'] / total_votes_dist, 0.0)
        districts['grn_pct'] = np.where(total_votes_dist > 0, districts['grn_votes_sum'] / total_votes_dist, 0.0)
        districts['con_pct'] = np.where(total_votes_dist > 0, districts['con_votes_sum'] / total_votes_dist, 0.0)
        districts['ref_pct'] = np.where(total_votes_dist > 0, districts['ref_votes_sum'] / total_votes_dist, 0.0)
        districts['minority_pct'] = np.where(districts['total_pop'] > 0, districts['minority_pop_sum'] / districts['total_pop'], 0.0)
        
        df_planar = districts.to_crs(epsg=3857)
        
        # Polsby-Popper compactness measure: 4 * pi * Area / Perimeter^2
        # A mathematical ratio that compares a district's area to the area of a circle with the same perimeter.
        # Scores range from 0 (least compact, e.g., a highly convoluted squiggle) 
        # to 1 (most compact, a perfect circle).
        districts['compactness'] = [(4 * np.pi * row['geometry'].area) / (row['geometry'].length ** 2) if row['geometry'].length > 0 else 0.0 for _, row in df_planar.iterrows()]
        
        cols_to_drop = [c for c in [pop_col, dem_col, rep_col, minority_col, vap_col] if c not in ['total_pop', 'voting_age_pop', 'district_id']]
        districts.drop(columns=cols_to_drop, inplace=True, errors='ignore')
        
        return districts

    def run_redistricting_pipeline_for_state(self, state_name, gdf, num_districts, pop_col, dem_col, rep_col, minority_col, vap_col):
        """
        Executes the redistricting optimization pipeline for a single state, generating
        multiple districting plans according to various optimization criteria.

        Args:
            state_name (str): Name of the state.
            gdf (GeoDataFrame): GeoDataFrame containing state's geographical and demographic nodes.
            num_districts (int): Target number of districts for the state.
            pop_col (str): Column name for total population.
            dem_col (str): Column name for democratic votes.
            rep_col (str): Column name for republican votes.
            minority_col (str): Column name for minority population.
            vap_col (str): Column name for voting age population.

        Returns:
            dict: Metrics for the enacted and optimized districting plans.
        """
        state_key = state_name.lower().replace(' ', '_')
        print(f"\n==========================================")
        print(f"RUNNING REDISTRICTING PIPELINE FOR {state_name.upper()}")
        print(f"==========================================")
        
        graph = Graph.from_geodataframe(gdf)
        
        # 1. Evaluate Enacted Map
        enacted_districts = self._create_district_features(gdf, 'enacted_district', pop_col, vap_col, dem_col, rep_col, minority_col)
        
        enacted_districts_wgs84 = enacted_districts.to_crs(epsg=4326)
        enacted_districts_wgs84.to_file(os.path.join(self.output_dir, f"{state_key}_enacted_districts.geojson"), driver="GeoJSON")
        
        state_metrics = {
            "enacted": MetricsAnalyzer.calculate_summary_metrics(enacted_districts, gdf, 'enacted_district', self.thresholds)
        }
        
        # 2. Run Optimization Configs
        configs = [
            {"name": "headcount", "optimize_by": ["headcount"]},
            {"name": "age", "optimize_by": ["age"]},
            {"name": "race", "optimize_by": ["race"]},
            {"name": "county", "optimize_by": ["county"]},
            {"name": "all", "optimize_by": ["headcount", "age", "race", "county"]}
        ]
        
        if num_districts == 1:
            for config in configs:
                name = config["name"]
                enacted_districts_wgs84.to_file(os.path.join(self.output_dir, f"{state_key}_optimized_districts_{name}.geojson"), driver="GeoJSON")
                state_metrics[f"optimized_{name}"] = state_metrics["enacted"]
            return state_metrics
        
        for config in configs:
            name = config["name"]
            opt_list = config["optimize_by"]
            
            best_partition = RedistrictingSimulator.run_single_optimization(
                graph=graph,
                gdf=gdf,
                num_districts=num_districts,
                steps=self.steps,
                optimize_by=opt_list,
                pop_col=pop_col,
                dem_col=dem_col,
                rep_col=rep_col,
                minority_col=minority_col,
                vap_col=vap_col
            )
            
            assignment_col_name = f'opt_{name}'
            gdf[assignment_col_name] = gdf.index.map(dict(best_partition.assignment))
            
            opt_districts = self._create_district_features(gdf, assignment_col_name, pop_col, vap_col, dem_col, rep_col, minority_col)
            
            opt_districts_wgs84 = opt_districts.to_crs(epsg=4326)
            opt_districts_wgs84.to_file(os.path.join(self.output_dir, f"{state_key}_optimized_districts_{name}.geojson"), driver="GeoJSON")
            
            state_metrics[f"optimized_{name}"] = MetricsAnalyzer.calculate_summary_metrics(opt_districts, gdf, assignment_col_name, self.thresholds)
            
        return state_metrics

    def run_all(self, target_states, states_file):
        """
        Coordinates running the redistricting pipeline across all target states, saving metrics.

        Args:
            target_states (list): List of dicts with state config (key, name, districts, grid_size).
            states_file (str): Path to the state boundaries GeoJSON.
        """
        metrics_path = os.path.join(self.output_dir, "metrics.json")
        all_metrics = {}
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, 'r') as f:
                    all_metrics = json.load(f)
                print(f"Loaded {len(all_metrics)} existing state metrics from {metrics_path} for merging.")
            except Exception as e:
                print(f"Could not load existing metrics file, starting fresh: {e}")
        
        for state_info in target_states:
            name = state_info["name"]
            dists = state_info["districts"]
            grid_size = state_info["grid_size"]
            state_key = state_info["key"]
            
            try:
                # Generate shape, clip to state border
                gdf = GeoDataProcessor.generate_state_geometries(states_file, name, num_districts=dists, grid_size=grid_size)
                
                # Run simulation
                state_metrics = self.run_redistricting_pipeline_for_state(
                    state_name=name,
                    gdf=gdf,
                    num_districts=dists,
                    pop_col="population",
                    dem_col="dem_votes",
                    rep_col="rep_votes",
                    minority_col="minority_pop",
                    vap_col="voting_age_pop"
                )
                
                all_metrics[state_key] = state_metrics
                
            except Exception as e:
                print(f"Error processing {name}: {e}")
                import traceback
                traceback.print_exc()
                
        # Write combined metrics file
        os.makedirs(self.output_dir, exist_ok=True)
        with open(metrics_path, 'w') as f:
            json.dump(all_metrics, f, indent=2)
            
        print(f"\n==========================================")
        print(f"ALL STATES PIPELINES COMPLETE. Saved to {self.output_dir}/")
        print(f"==========================================")

def format_state_name(key):
    """
    Format a state key (e.g., 'north_carolina') into a readable name ('North Carolina').
    """
    words = key.split('_')
    formatted = []
    for word in words:
        if word in ['of', 'and']:
            formatted.append(word)
        else:
            formatted.append(word.capitalize())
    return ' '.join(formatted)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GerryChain Custom Multi-State Redistricting Pipeline")
    parser.add_argument("--steps", type=int, default=80, help="Number of steps for the MCMC chain")
    parser.add_argument("--output-dir", type=str, default="public/data", help="Output directory")
    parser.add_argument("--states", type=str, default="colorado,wisconsin,texas,north_carolina,maryland", 
                        help="Comma-separated list of state keys to run, or 'all' for all 56 jurisdictions (default: showcase states)")
    parser.add_argument("--grid-size", type=int, default=None, help="Override default grid resolution")
    parser.add_argument("--comp-min", type=float, default=None, help="Override competitive seat min threshold")
    parser.add_argument("--comp-max", type=float, default=None, help="Override competitive seat max threshold")
    parser.add_argument("--min-infl", type=float, default=None, help="Override minority influence threshold")
    parser.add_argument("--min-maj", type=float, default=None, help="Override minority majority threshold")
    parser.add_argument("--wasted-div", type=float, default=None, help="Override wasted votes divisor")
    
    args = parser.parse_args()
    
    # Download states boundary geojson
    states_file = GeoDataProcessor.download_states_geojson()
    
    # Determine which states to run
    if args.states.lower() == 'all':
        run_keys = list(DISTRICT_COUNTS.keys())
    else:
        run_keys = [k.strip().lower() for k in args.states.split(',') if k.strip().lower() in DISTRICT_COUNTS]
        
    target_states = []
    for key in run_keys:
        dists = DISTRICT_COUNTS[key]
        if dists == 1:
            grid_size = 10
        elif dists <= 8:
            grid_size = 20
        elif dists <= 15:
            grid_size = 30
        elif dists <= 30:
            grid_size = 40
        else:
            grid_size = 50
        if args.grid_size is not None:
            grid_size = args.grid_size
            
        target_states.append({
            "key": key,
            "name": format_state_name(key),
            "districts": dists,
            "grid_size": grid_size
        })
        
    thresholds = CONFIG["analytical_thresholds"].copy()
    if args.comp_min is not None: thresholds["competitive_min"] = args.comp_min
    if args.comp_max is not None: thresholds["competitive_max"] = args.comp_max
    if args.min_infl is not None: thresholds["minority_influence"] = args.min_infl
    if args.min_maj is not None: thresholds["minority_majority"] = args.min_maj
    if args.wasted_div is not None: thresholds["wasted_votes_divisor"] = args.wasted_div
        
    pipeline = PipelineManager(steps=args.steps, output_dir=args.output_dir, thresholds=thresholds)
    pipeline.run_all(target_states, states_file)
