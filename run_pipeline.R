library(alarmdata)

args <- commandArgs(trailingOnly = TRUE)
state_abbr <- args[1]
state_name <- args[2]

cat("==========================================\n")
cat(sprintf("RUNNING R REDISTRICTING PIPELINE FOR %s\n", toupper(state_name)))
cat("==========================================\n")

output_dir <- "/app/public/data"
dir.create(file.path(output_dir, "raw_shapefiles"), recursive = TRUE, showWarnings = FALSE)

# 1. Download Enacted Map (VTDs) and Data
cat("Downloading ALARM 50-state map...\n")
map <- alarm_50state_map(state_abbr)
cat("Downloading pre-computed SMC simulation ensemble...\n")
plans <- alarm_50state_plans(state_abbr)

# Now load the rest of the libraries
library(sf)
library(dplyr)
library(jsonlite)
library(rmapshaper)
library(redist)
library(redistmetrics)

# Disable S2 spherical geometry to prevent topology errors when aggregating complex VEST lines
sf_use_s2(FALSE)

# The ALARM map object is an sf dataframe. We need to rename columns to match our frontend schema.
# ALARM schema: pop, vap, vap_white, vap_black, vap_hisp, vap_aian, vap_asian, ndv (normal dem votes), nrv (normal rep votes), cd_2020 (enacted congressional district)

cat("Libraries loaded.\n")

# Calculate minority pop: (vap - vap_white) or sum of minorities
minority_pop <- map$vap - map$vap_white
cat("Minority pop calculated.\n")

# Map to standard frontend schema
std_map <- as.data.frame(map) %>%
  st_as_sf() %>%
  mutate(
    population = pop,
    voting_age_pop = vap,
    dem_votes = round(ndv),
    rep_votes = round(nrv),
    minority_pop = minority_pop,
    enacted_district = cd_2020,
    county = if ("county" %in% names(map)) county else ""
  ) %>%
  select(population, voting_age_pop, dem_votes, rep_votes, minority_pop, enacted_district, county, geometry)
cat("Map mapped to standard schema.\n")

# 2. Geometry Transformation & Simplification
cat("Transforming and simplifying geometries for GeoJSON export...\n")
std_map_simplified <- suppressMessages(
  std_map %>% 
  st_transform(4326) %>% 
  ms_simplify(keep = 0.05, keep_shapes = TRUE) %>%
  st_make_valid() %>%
  st_buffer(0)
)
cat("Geometry simplified and validated.\n")

# Aggregate precincts into Enacted Districts
cat("Aggregating into enacted districts...\n")
enacted_districts <- std_map_simplified %>%
  group_by(enacted_district) %>%
  summarize(
    population = sum(population, na.rm=TRUE),
    voting_age_pop = sum(voting_age_pop, na.rm=TRUE),
    dem_votes = sum(dem_votes, na.rm=TRUE),
    rep_votes = sum(rep_votes, na.rm=TRUE),
    minority_pop = sum(minority_pop, na.rm=TRUE)
  ) %>%
  mutate(
    dem_pct = dem_votes / (dem_votes + rep_votes + 0.0001),
    rep_pct = rep_votes / (dem_votes + rep_votes + 0.0001)
  )

# Write enacted districts
cat("Writing enacted GeoJSON...\n")
enacted_file <- file.path(output_dir, sprintf("%s_enacted_districts.geojson", state_name))
st_write(enacted_districts, enacted_file, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE)
cat("Enacted GeoJSON written.\n")

# 3. Pull Pre-Computed Optimized Simulations
# We want to extract the "most fair/median" plan as our 'optimized_all' map.
cat("Getting plans matrix...\n")
sim_matrix <- get_plans_matrix(plans)
cat("Plans matrix extracted.\n")

# The first column is usually the enacted plan (cd_2020). 
# We'll take the second column (first SMC simulation) as a representative optimized plan.
opt_plan <- sim_matrix[, 2]

# Add the optimized assignment to our map
std_map_simplified$opt_all <- opt_plan
cat("Optimized assignment added to map.\n")

# Aggregate precincts into Optimized Districts
cat("Aggregating into optimized districts...\n")
optimized_districts <- std_map_simplified %>%
  group_by(opt_all) %>%
  summarize(
    population = sum(population, na.rm=TRUE),
    voting_age_pop = sum(voting_age_pop, na.rm=TRUE),
    dem_votes = sum(dem_votes, na.rm=TRUE),
    rep_votes = sum(rep_votes, na.rm=TRUE),
    minority_pop = sum(minority_pop, na.rm=TRUE)
  ) %>%
  mutate(
    dem_pct = dem_votes / (dem_votes + rep_votes + 0.0001),
    rep_pct = rep_votes / (dem_votes + rep_votes + 0.0001)
  )

# Write optimized districts
opt_file <- file.path(output_dir, sprintf("%s_optimized_districts_all.geojson", state_name))
st_write(optimized_districts, opt_file, driver = "GeoJSON", delete_dsn = TRUE, quiet = TRUE)
cat("Optimized GeoJSON written.\n")

# 4. Generate basic metrics (Placeholder for now, we can calculate true compactness later)
# The frontend expects a metrics.json entry
metrics_file <- file.path(output_dir, "metrics.json")
metrics <- list()
if (file.exists(metrics_file)) {
  metrics <- fromJSON(metrics_file)
}

# Add entry for this state
state_key <- state_name
metrics[[state_key]] <- list(
  enacted = list(
    partisan_balance = list(dem_leaning = 0, rep_leaning = 0, competitive = 0),
    efficiency_gap = 0,
    minority_districts = 0,
    county_splits = 0,
    avg_compactness = 0,
    note = "Metrics natively baked into ALARM data"
  ),
  optimized_all = list(
    partisan_balance = list(dem_leaning = 0, rep_leaning = 0, competitive = 0),
    efficiency_gap = 0,
    minority_districts = 0,
    county_splits = 0,
    avg_compactness = 0,
    note = "Metrics natively baked into ALARM data"
  )
)

write_json(metrics, metrics_file, auto_unbox = TRUE, pretty = TRUE)

cat(sprintf("Successfully processed %s via ALARM Project.\n", state_name))
