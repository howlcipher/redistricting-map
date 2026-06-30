import os
import sys
import pytest
from shapely.geometry import Polygon

# Ensure we can import from the root directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

try:
    from generate_maps import MetricsAnalyzer, PipelineManager
except ImportError:
    pass # Will fail the test later, but prevents collection error if syntax is wrong

class TestGenerateMaps:
    def test_pipeline_manager_initialization(self):
        manager = PipelineManager(steps=10)
        assert manager.steps == 10

    def test_district_counts_constant(self):
        # Verify the constants are accessible and correct
        from generate_maps import DISTRICT_COUNTS
        assert DISTRICT_COUNTS['colorado'] == 8
        assert DISTRICT_COUNTS['california'] == 52
        assert 'district_of_columbia' in DISTRICT_COUNTS
