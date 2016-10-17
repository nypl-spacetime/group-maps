# group-maps

group-maps selects a set of maps from NYC Space/Time Directory database, and groups them in bands of a configurable amount of years.

Creates two GeoJSON files, one with __all__ the maps, and one containing one Feature per group.

![Example: Maps by Decade](maps-by-decade.png)

## Prerequisites

group-maps needs a Space/Time PostGIS database, with Map Warper maps:

  - Get NYPL Map Warper data and transform to Space/Time NDJSON with [`etl-mapwarper`](https://github.com/nypl-spacetime/etl-mapwarper)
  - Create and fill PostGIS database (information coming soon)

## Installation

    git clone https://github.com/nypl-spacetime/group-maps.git
    npm install

## Usage

    node index --config /path/to/config.json --output /path/to/output/dir

Running with `example.config.json`:

    mkdir data
    node index.js -c ./example.config.json -o ./data

## Configuration

- `bandSize`: group maps by this many years
- `geometry`: GeoJSON geometry, only use maps that this geometry intersects/contains
- `geometryOperation`: PostGIS operation to use, `ST_Contains` or `ST_Intersects`
- `geometryBuffer`: buffer around the geometry, in meters
- `yearMin`: only use maps from this year
- `yearMax`: only use maps until this year
- `maxArea`: only use maps depicting an area of this amount of square meters or more
- `minArea`: only use maps depicting an area of this amount of square meters or less
- `buffer`: buffer around grouped polygon, in meters
- `simplifyTolerance`: tolerance of [ST_Simplify](http://www.postgis.org/docs/ST_Simplify.html) function

Instead of using the `geometry` field in the configuration file, you can also use the `--geometry` command line option and use a separate GeoJSON (containing a single GeoJSON geometry).

## Examples:

- [Maps by Decade](http://bertspaan.nl/maps-by-decade) - https://github.com/bertspaan/maps-by-decade
- [Along the Hudson](http://bertspaan.nl/along-the-hudson) - https://github.com/bertspaan/along-the-hudson
