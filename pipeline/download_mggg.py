import urllib.request
import zipfile
import os
import pandas as pd
import geopandas as gpd

# We will try to download all states from MGGG
STATE_ABBRS = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
    "montana": "MT", "nebraska": "NE", "nevada": "NV", "new_hampshire": "NH", "new_jersey": "NJ",
    "new_mexico": "NM", "new_york": "NY", "north_carolina": "NC", "north_dakota": "ND", "ohio": "OH",
    "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode_island": "RI", "south_carolina": "SC",
    "south_dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
    "virginia": "VA", "washington": "WA", "west_virginia": "WV", "wisconsin": "WI", "wyoming": "WY"
}

DATA_DIR = "public/data/raw_shapefiles"

def find_column(columns, candidates):
    for c in candidates:
        for col in columns:
            if col.upper() == c.upper():
                return col
    return None

def download_and_standardize(state_name):
    os.makedirs(DATA_DIR, exist_ok=True)
    if state_name not in STATE_ABBRS:
        return None
        
    abbr = STATE_ABBRS[state_name]
    
    zip_path = os.path.join(DATA_DIR, f"{state_name}.zip")
    extract_path = os.path.join(DATA_DIR, state_name)
        
    # Find the zip file dynamically using GitHub API
    if not os.path.exists(zip_path):
        import json
        import urllib.request
        
        api_url = f"https://api.github.com/repos/mggg-states/{abbr}-shapefiles/contents/"
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                contents = json.loads(response.read().decode())
                zip_url = None
                for item in contents:
                    if item['name'].endswith('.zip'):
                        zip_url = item['download_url']
                        break
                
                if zip_url:
                    urllib.request.urlretrieve(zip_url, zip_path)
                else:
                    print(f"Skipping {state_name}: No .zip file found in repo.")
                    return None
        except Exception as e:
            print(f"Skipping {state_name}: Repo not found or API rate limit exceeded ({e}).")
            return None
        
    print(f"Extracting {zip_path}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)
        
    shp_file = None
    for root, dirs, files in os.walk(extract_path):
        for file in files:
            if file.endswith(".shp") and not file.startswith("._"):
                shp_file = os.path.join(root, file)
                break
                
    if not shp_file:
        print(f"No .shp file found for {state_name}.")
        return None
        
    print(f"Loading {shp_file} with GeoPandas...")
    try:
        gdf = gpd.read_file(shp_file)
    except Exception as e:
        print(f"Failed to read shapefile: {e}")
        return None
        
    cols = gdf.columns.tolist()
    pop_col = vap_col = dem_col = rep_col = cd_col = county_col = None
    
    import re
    
    for col in cols:
        col_up = col.upper()
        # Population
        if re.match(r'^(TOTPOP|POP10|POP20|PERSONS|TOTAL_POP)', col_up):
            if not pop_col: pop_col = col
        # VAP
        elif re.match(r'^(VAP|VAP10|VAP20|TOTAL_VAP)', col_up):
            if not vap_col: vap_col = col
        # Presidential Dem
        elif re.match(r'^.*PRE.*D.*$', col_up) and 'IND' not in col_up:
            if not dem_col: dem_col = col
        # Presidential Rep
        elif re.match(r'^.*PRE.*R.*$', col_up) and 'IND' not in col_up:
            if not rep_col: rep_col = col
        # Congressional District
        elif re.match(r'^(CD|CD11|CONG_DIST)', col_up):
            if not cd_col: cd_col = col
        # County
        elif re.match(r'^(COUNTY|CNTY)', col_up):
            if not county_col: county_col = col
            
    # Fallback to other elections if Presidential is missing
    if not dem_col:
        for col in cols:
            if re.match(r'^.*(GOV|SEN|USH|AG).*D.*$', col.upper()):
                dem_col = col
                break
    if not rep_col:
        for col in cols:
            if re.match(r'^.*(GOV|SEN|USH|AG).*R.*$', col.upper()):
                rep_col = col
                break
                
    # Fallback for CD (use state senate if congressional is missing)
    if not cd_col:
        for col in cols:
            if re.match(r'^(SEN|SEND|SD|HDIST|SLDU)', col.upper()):
                cd_col = col
                break
    
    if not (pop_col and vap_col and dem_col and rep_col):
        print(f"Skipping {state_name}: Could not find essential columns. Found: {cols}")
        return None
        
    # Better Minority VAP calculation (summing non-white/hispanic columns if found)
    minority_cols = []
    for col in cols:
        col_up = col.upper()
        if col_up in ["HISP", "HVAP", "NH_BLACK", "BVAP", "NH_AMIN", "AMINVAP", "NH_ASIAN", "ASIANVAP", "NH_NHPI", "NHPIVAP", "NH_OTHER", "OTHERVAP"]:
            minority_cols.append(col)
            
    standard_gdf = gdf.copy()
    standard_gdf['population'] = pd.to_numeric(standard_gdf[pop_col], errors='coerce').fillna(0).astype(int)
    standard_gdf['voting_age_pop'] = pd.to_numeric(standard_gdf[vap_col], errors='coerce').fillna(0).astype(int)
    standard_gdf['dem_votes'] = pd.to_numeric(standard_gdf[dem_col], errors='coerce').fillna(0).astype(int)
    standard_gdf['rep_votes'] = pd.to_numeric(standard_gdf[rep_col], errors='coerce').fillna(0).astype(int)
    
    if minority_cols:
        standard_gdf['minority_pop'] = standard_gdf[minority_cols].apply(pd.to_numeric, errors='coerce').fillna(0).sum(axis=1).astype(int)
    else:
        standard_gdf['minority_pop'] = 0
        
    standard_gdf['enacted_district'] = pd.to_numeric(standard_gdf[cd_col], errors='coerce').fillna(-1).astype(int) if cd_col else -1
    standard_gdf['county'] = standard_gdf[county_col].fillna("Unknown") if county_col else "Unknown"
    
    standard_gdf['lib_votes'] = 0
    standard_gdf['grn_votes'] = 0
    standard_gdf['con_votes'] = 0
    standard_gdf['ref_votes'] = 0
    
    keep_cols = ['geometry', 'population', 'voting_age_pop', 'dem_votes', 'rep_votes', 'minority_pop', 'enacted_district', 'county', 'lib_votes', 'grn_votes', 'con_votes', 'ref_votes']
    standard_gdf = standard_gdf[keep_cols]
    
    out_file = os.path.join(DATA_DIR, f"{state_name}_standardized.geojson")
    print(f"Saving standardized data to {out_file}...")
    standard_gdf.to_file(out_file, driver="GeoJSON")
    print(f"Successfully processed {state_name}!")
    return out_file

if __name__ == "__main__":
    for state in STATE_ABBRS.keys():
        if not os.path.exists(os.path.join(DATA_DIR, f"{state}_standardized.geojson")):
            download_and_standardize(state)
