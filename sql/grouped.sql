SELECT
  band * {{ bandSize }} AS band,
  ST_AsGeoJSON(ST_Union(geometry))::json AS geometry,
  COUNT(*) AS count
FROM (
  SELECT
    ST_SimplifyPreserveTopology(
      Geometry(
        ST_Buffer(
          Geography(geometry),
          {{ buffer }}
        )
      ),
      {{ simplifyTolerance }}
    ) AS geometry,
    (
      (date_part('year', lower(validsince)) +
      date_part('year', upper(validuntil))) / 2
    )::int / {{ bandSize }} AS band
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
) d
GROUP BY
  band
ORDER BY
  band
