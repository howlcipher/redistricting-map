import os
import sys
import json
import pytest
from unittest.mock import patch, MagicMock
import geopandas as gpd
from shapely.geometry import Polygon

# Ensure we can import from the root directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

try:
    from generate_maps import GeoDataProcessor, RedistrictingSimulator
except ImportError:
    pass

class TestAdvancedDataProcessor:
    @patch('urllib.request.urlretrieve')
    def test_download_states_geojson_success(self, mock_urlretrieve, tmp_path):
        """Test downloading state data with a mocked API response"""
        # Set up mock to create a dummy file
        def side_effect(url, path):
            with open(path, 'w') as f:
                f.write(json.dumps({
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {"name": "Test State"},
                            "geometry": {"type": "Polygon", "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]}
                        }
                    ]
                }))
        mock_urlretrieve.side_effect = side_effect

        # Use a temporary file for the output
        output_file = tmp_path / "test_states.json"
        
        result = GeoDataProcessor.download_states_geojson(str(output_file))
        
        assert result == str(output_file)
        assert os.path.exists(result)
        
        with open(result, 'r') as f:
            data = json.load(f)
            assert data['features'][0]['properties']['name'] == "Test State"

    def test_synthetic_geodataframe_generation(self):
        """Test generating a simple grid GeoDataFrame"""
        # Create a synthetic 2x2 grid representing a state
        polygons = [
            Polygon([(0,0), (0,1), (1,1), (1,0), (0,0)]),
            Polygon([(1,0), (1,1), (2,1), (2,0), (1,0)]),
            Polygon([(0,1), (0,2), (1,2), (1,1), (0,1)]),
            Polygon([(1,1), (1,2), (2,2), (2,1), (1,1)])
        ]
        
        gdf = gpd.GeoDataFrame({
            'geometry': polygons,
            'population': [100, 100, 100, 100],
            'dem_votes': [60, 40, 70, 30],
            'rep_votes': [40, 60, 30, 70],
            'county': ['A', 'A', 'B', 'B'],
            'minority_pop': [20, 10, 30, 5],
            'vap': [80, 80, 80, 80]
        }, crs="EPSG:4326")
        
        assert len(gdf) == 4
        assert gdf['population'].sum() == 400
        
        # Build the graph
        from gerrychain import Graph
        graph = Graph.from_geodataframe(gdf)
        
        # Test the RedistrictingSimulator on this mini-grid
        partition = RedistrictingSimulator.run_single_optimization(
            graph, gdf, 
            num_districts=2, 
            steps=5, 
            optimize_by='headcount',
            pop_col='population',
            dem_col='dem_votes',
            rep_col='rep_votes',
            minority_col='minority_pop',
            vap_col='vap'
        )
        
        assert partition is not None
        assert len(partition.parts) == 2
