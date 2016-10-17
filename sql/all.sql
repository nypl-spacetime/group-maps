SELECT
  id,
  name,
  (data->>'nyplUrl')::text AS url,
  (data->>'nyplDigitalId')::text AS digital_id,
  date_part('year', lower(validsince)) AS validsince,
  date_part('year', upper(validuntil)) AS validuntil,
  (
    (date_part('year', lower(validsince)) +
    date_part('year', upper(validuntil))) / 2
  )::int / {{ bandSize }} * {{ bandSize }} AS band,
  json_build_array(
    ST_XMin(geometry),
    ST_YMin(geometry),
    ST_XMax(geometry),
    ST_YMax(geometry)
  ) AS boundingbox,
  ST_AsGeoJSON(
    ST_SimplifyPreserveTopology(
      Geometry(
        ST_Buffer(
          Geography(geometry),
          {{ buffer }}
        )
      ),
      {{ simplifyTolerance }}
    )
  )::json AS geometry
FROM
  pits
WHERE
  dataset = 'mapwarper' AND
  (data->>'masked')::boolean = true AND

  {{#if maxArea}}
  ST_Area(Geography(geometry)) <= {{ maxArea }} AND
  {{/if}}

  {{#if minArea}}
  ST_Area(Geography(geometry)) >= {{ minArea }} AND
  {{/if}}

  {{#if geometry}}
  (
    {{ geometryOperation }}(
      Geometry(
        ST_Buffer(
          Geography(
            ST_SetSRID(ST_GeomFromGeoJSON('{{ toJSON geometry }}'), 4326)
          ), {{ coalesce geometryBuffer 0 }}
        )
      ),
      geometry
    )
  ) AND
  {{/if}}

  daterange('{{ yearMin }}-01-01', '{{ yearMax }}-12-31') @> validsince AND
  daterange('{{ yearMin }}-01-01', '{{ yearMax }}-12-31') @> validuntil
