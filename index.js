'use strict'

const fs = require('fs')
const H = require('highland')
const R = require('ramda')
const turf = {
  area: require('@turf/area'),
  bbox: require('@turf/bbox'),
  meta: require('@turf/meta'),
  kinks: require('@turf/kinks'),
  union: require('@turf/union'),
  buffer: require('@turf/buffer'),
  simplify: require('@turf/simplify'),
  intersect: require('@turf/intersect')
}

const getDate = (str) => new Date(`${str}`)

function groupMaps (filename, config) {
  // TODO: check config!!!!!!
  // Or add default config

  const toFeature = (object) => ({
    type: 'Feature',
    properties: Object.assign(config.properties(object), {
      group: config.groupBy(object),
      bbox: turf.bbox(object.geometry)
    }),
    geometry: object.geometry
  })

  const toGeoJSON = (stream) => {
    const geojson = {
      open: '{"type":"FeatureCollection","features":[',
      close: ']}\n'
    }

    const json = stream
      .map(JSON.stringify)
      .intersperse(',')

    return H([
      H([geojson.open]),
      json,
      H([geojson.close])
    ]).sequence()
  }

  const filters = {
    year: (object) => {
      let pass = true

      if (config.yearMin !== undefined || config.yearMax !== undefined) {
        if (config.yearMin !== undefined) {
          pass = pass && object.validSince && (getDate(object.validSince) >= getDate(config.yearMin))
        }

        if (config.yearMax !== undefined) {
          pass = pass && object.validUntil && (getDate(object.validUntil) <= getDate(config.yearMax))
        }
      }

      return pass
    },
    area: (object) => {
      let pass = true

      if (config.minArea !== undefined || config.maxArea !== undefined) {
        const area = turf.area(object.geometry)

        if (config.minArea !== undefined) {
          pass = pass && area >= config.maxArea
        }

        if (config.maxArea !== undefined) {
          pass = pass && area <= config.maxArea
        }
      }

      return pass
    },
    intersects: (object) => {
      if (object.geometry !== undefined) {
        const kinks = turf.kinks(object.geometry)
        if (kinks.features.length) {
          throw new Error(`Self-intersections found in ${object.id}`)
        } else {
          return turf.intersect(object.geometry, config.geometry) !== undefined
        }
      } else {
        return true
      }
    }
  }

  const simplify = (feature) => {
    if (config.simplifyTolerance !== undefined) {
      const simplified = turf.simplify(feature, config.simplifyTolerance)
      return simplified
    } else {
      return feature
    }
  }

  const buffer = (feature) => {
    if (config.buffer !== undefined) {
      const buffered = turf.buffer(feature, config.buffer, 'meters')
      return Object.assign(buffered, {
        properties: feature.properties
      })
    } else {
      return feature
    }
  }

  const union = (group) => {
    console.error(`Computing union for group ${group.group}: ${group.features.length} features`)

    var feature
    if (group.features.length === 1) {
      feature = group.features[0]
    } else {
      feature = turf.union.apply(this, group.features)
    }

    return {
      type: 'Feature',
      properties: {
        group: group.group,
        count: group.features.length
      },
      geometry: feature.geometry
    }
  }

  const roundCoordinates = (feature) => {
    var newFeature = R.clone(feature)
    turf.meta.coordEach(newFeature, (p) => {
      p[0] = Math.round(p[0] * 1e6) / 1e6
      p[1] = Math.round(p[1] * 1e6) / 1e6
    })
    return newFeature
  }

  const features = H(fs.createReadStream(filename))
    .split()
    .compact()
    .map(JSON.parse)
    .filter(R.allPass(R.values(filters)))
    .map(toFeature)
    .map(simplify)
    .map(buffer)

  const grouped = features.fork()
    .group((feature) => feature.properties.group)
    .map(R.toPairs)
    .sequence()
    .map(R.zipObj(['group', 'features']))
    .map(union)
    .map(roundCoordinates)

  return {
    grouped: toGeoJSON(grouped),
    all: toGeoJSON(features.fork().map(roundCoordinates))
  }
}

module.exports = groupMaps
