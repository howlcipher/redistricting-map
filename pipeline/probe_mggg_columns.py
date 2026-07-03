import os
import urllib.request
import zipfile
import geopandas as gpd
import json

STATE_ABBRS = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new_hampshire': 'NH',
    'new_jersey': 'NJ', 'new_mexico': 'NM', 'new_york': 'NY', 'north_carolina': 'NC',
    'north_dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
    'rhode_island': 'RI', 'south_carolina': 'SC', 'south_dakota': 'SD', 'tennessee': 'TN',
    'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
    'west_virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'district_of_columbia': 'DC', 'puerto_rico': 'PR',
    'guam': 'GU', 'virgin_islands': 'VI', 'american_samoa': 'AS', 'northern_mariana_islands': 'MP'
}

def probe_state_columns():
    os.makedirs("public/data/raw_shapefiles", exist_ok=True)
    all_columns = {}
    
    for state_name, abbr in STATE_ABBRS.items():
        zip_path = f"public/data/raw_shapefiles/{state_name}.zip"
        extract_path = f"public/data/raw_shapefiles/{state_name}"
        
        # Download if we don't have it
        if not os.path.exists(zip_path):
            urls = [
                f"https://github.com/mggg-states/{abbr}-shapefiles/raw/main/{abbr}.zip",
                f"https://github.com/mggg-states/{abbr}-shapefiles/raw/master/{abbr}.zip",
                f"https://github.com/mggg-states/{abbr}-shapefiles/raw/main/{abbr}_vtds.zip",
                f"https://github.com/mggg-states/{abbr}-shapefiles/raw/master/{abbr}_vtds.zip",
                f"https://github.com/mggg-states/{abbr}-shapefiles/raw/main/{abbr}_precincts.zip",
                f"https://github.com/mggg-states/{abbr}-shapefiles/raw/master/{abbr}_precincts.zip"
            ]
            downloaded = False
            for url in urls:
                try:
                    urllib.request.urlretrieve(url, zip_path)
                    downloaded = True
                    break
                except Exception as e:
                    continue
            
            if not downloaded:
                all_columns[state_name] = {"error": "Not Found"}
                continue
                
        # Extract and read
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
            
            shp_file = None
            for root, dirs, files in os.walk(extract_path):
                for file in files:
                    if file.endswith(".shp") and not file.startswith("._"):
                        shp_file = os.path.join(root, file)
                        break
                        
            if shp_file:
                # Read just the first row to get columns quickly
                gdf = gpd.read_file(shp_file, rows=1)
                all_columns[state_name] = {"columns": list(gdf.columns)}
            else:
                all_columns[state_name] = {"error": "No SHP file found"}
        except Exception as e:
            all_columns[state_name] = {"error": str(e)}
            
    with open("mggg_columns_dump.json", "w") as f:
        json.dump(all_columns, f, indent=2)
    print("Done dumping columns to mggg_columns_dump.json")

if __name__ == "__main__":
    probe_state_columns()
