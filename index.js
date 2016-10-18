#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const R = require('ramda')
const postgis = require('spacetime-db-postgis')
const Handlebars = require('handlebars')
const minimist = require('minimist')

const argv = minimist(process.argv.slice(2), {
  string: [
    'config',
    'output',
    'geometry'
  ],
  alias: {
    c: 'config',
    o: 'output',
    g: 'geometry'
  }
})

Handlebars.registerHelper('toJSON', (object) => new Handlebars.SafeString(JSON.stringify(object)))
Handlebars.registerHelper('coalesce', (a, b) => a || b)

if (!argv.output || !argv.config) {
  console.log(`usage: group-maps --config /path/to/config.json --geometry /path/to/intersecting/geojson --output /path/to/output/dir`)
  process.exit()
}

const outputDir = argv.output
try {
  fs.accessSync(outputDir, fs.F_OK)
} catch (e) {
  console.error(`Output directory does not exist: ${outputDir}`)
  process.exit(1)
}

var config
try {
  config = JSON.parse(fs.readFileSync(argv.config, 'utf8'))
} catch (e) {
  console.error(`Could not load config file: ${argv.config}`)
  process.exit(1)
}

var geometry
if (argv.geometry) {
  try {
    geometry = JSON.parse(fs.readFileSync(argv.geometry, 'utf8'))
  } catch (e) {
    console.log(e)
    console.error(`Could not load geometry file: ${argv.geometry}`)
    process.exit(1)
  }
}

if (geometry) {
  config.geometry = geometry
}

const queries = {
  all: Handlebars.compile(fs.readFileSync(path.join(__dirname, 'sql/all.sql'), 'utf8'))(config),
  grouped: Handlebars.compile(fs.readFileSync(path.join(__dirname, 'sql/grouped.sql'), 'utf8'))(config)
}

Object.keys(queries).forEach((name) => {
  var query = queries[name]

  postgis.executeQuery(query, null, (err, rows) => {
    if (err) {
      console.error(err)
      console.error(query)
      return
    }

    const geojson = {
      type: 'FeatureCollection',
      features: rows.map((row) => ({
        type: 'Feature',
        properties: R.omit(['geometry'], row),
        geometry: row.geometry
      }))
    }

    fs.writeFileSync(path.join(outputDir, `${name}.geojson`), JSON.stringify(geojson))
  })
})
