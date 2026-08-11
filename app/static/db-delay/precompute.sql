-- DB Delay Explorer precompute
-- Data: hf://datasets/piebro/deutsche-bahn-data (monthly_processed_data)
-- Station->state/city mapping: official DB StaDa registry (via db-stations),
-- joined on the eva station id.
-- "recent" = 2025-11 onwards: the months where ALL stations are collected
-- (before that only the ~100 biggest stations were recorded).
-- Punctuality follows DB's official definition: delay < 6 minutes.

SET memory_limit='4GB';
SET temp_directory='duckdb_tmp';

CREATE TABLE registry AS
SELECT eva, state, city, name
FROM read_json('eva_registry.json');





-- P2: distribution + time-of-day + weekday, recent months, one scan via grouping sets
COPY (
  SELECT train_type,
         least(greatest(delay_in_min, -10), 60) AS delay_bucket,
         hour(time) AS hour_of_day,
         dayofweek(time) AS weekday,
         count(*) AS n,
         round(avg(delay_in_min), 3) AS avg_delay
  FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */
  WHERE NOT is_canceled AND train_type IN ('ICE','IC','EC','RE','RB','S','Bus','STR','U')
  GROUP BY GROUPING SETS ((train_type, delay_bucket), (train_type, hour_of_day), (train_type, weekday))
) TO 'out/distributions.json' (FORMAT json, ARRAY true);

-- P3: per state x type, recent months, official registry join (rail only)
COPY (
  SELECT r.state, d.train_type,
         count(*) AS n,
         round(avg(d.delay_in_min) FILTER (NOT d.is_canceled), 2) AS avg_delay,
         round(100.0 * count(*) FILTER (NOT d.is_canceled AND d.delay_in_min < 6) / greatest(count(*) FILTER (NOT d.is_canceled), 1), 1) AS punctual_pct,
         round(100.0 * count(*) FILTER (d.is_canceled) / count(*), 2) AS cancel_pct,
         approx_quantile(d.delay_in_min, 0.9) FILTER (NOT d.is_canceled) AS p90
  FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */ d JOIN registry r ON d.eva = r.eva
  WHERE r.state IS NOT NULL
  GROUP BY GROUPING SETS ((r.state, d.train_type), (r.state))
) TO 'out/state_by_type.json' (FORMAT json, ARRAY true);

-- P4: per city x type, recent months, registry city (rail only), bigger cities
COPY (
  SELECT r.city, d.train_type,
         count(*) AS n,
         round(avg(d.delay_in_min) FILTER (NOT d.is_canceled), 2) AS avg_delay,
         round(100.0 * count(*) FILTER (NOT d.is_canceled AND d.delay_in_min < 6) / greatest(count(*) FILTER (NOT d.is_canceled), 1), 1) AS punctual_pct,
         round(100.0 * count(*) FILTER (d.is_canceled) / count(*), 2) AS cancel_pct
  FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */ d JOIN registry r ON d.eva = r.eva
  WHERE r.city IN ('Berlin','Hamburg','München','Köln','Frankfurt am Main','Stuttgart','Düsseldorf','Leipzig','Dresden','Hannover','Nürnberg','Bremen','Potsdam','Essen','Dortmund','Duisburg','Münster','Aachen','Karlsruhe','Mannheim','Freiburg im Breisgau','Kiel','Lübeck','Erfurt','Magdeburg','Halle (Saale)','Rostock','Mainz','Saarbrücken','Wiesbaden','Kassel','Augsburg','Regensburg','Würzburg','Braunschweig','Osnabrück','Oldenburg','Göttingen','Chemnitz','Bielefeld','Bochum','Wuppertal','Bonn','Darmstadt','Heidelberg','Ulm','Koblenz','Trier','Ludwigshafen am Rhein','Cottbus','Schwerin','Stralsund','Flensburg','Jena','Gera','Bremerhaven','Potsdam')
  GROUP BY GROUPING SETS ((r.city, d.train_type), (r.city))
) TO 'out/city_by_type.json' (FORMAT json, ARRAY true);

-- P5: Berlin lines (S-Bahn/regional via registry; bus/tram/U via ", Berlin" stop names)
COPY (
  SELECT d.line_number, d.train_type,
         count(*) AS n,
         round(avg(d.delay_in_min) FILTER (NOT d.is_canceled), 2) AS avg_delay,
         round(100.0 * count(*) FILTER (NOT d.is_canceled AND d.delay_in_min < 6) / greatest(count(*) FILTER (NOT d.is_canceled), 1), 1) AS punctual_pct,
         round(100.0 * count(*) FILTER (d.is_canceled) / count(*), 2) AS cancel_pct
  FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */ d
  WHERE (d.eva IN (SELECT eva FROM registry WHERE state = 'Berlin')
         OR d.xml_station_name LIKE '%, Berlin')
    AND d.line_number IS NOT NULL AND d.line_number != ''
  GROUP BY d.line_number, d.train_type
  HAVING count(*) >= 1000
  ORDER BY punctual_pct DESC
) TO 'out/berlin_lines.json' (FORMAT json, ARRAY true);



-- P7: the Potsdam example - trains riding Potsdam Hbf -> Berlin Hbf,
-- delay measured at arrival in Berlin (join on the ride id)
COPY (
  SELECT p.train_type, p.line_number,
         count(*) AS rides,
         round(avg(b.delay_in_min) FILTER (NOT b.is_canceled), 2) AS avg_delay_at_berlin,
         round(100.0 * count(*) FILTER (NOT b.is_canceled AND b.delay_in_min < 6) / greatest(count(*) FILTER (NOT b.is_canceled), 1), 1) AS punctual_pct,
         round(100.0 * count(*) FILTER (b.is_canceled OR p.is_canceled) / count(*), 2) AS cancel_pct,
         approx_quantile(b.delay_in_min, 0.9) FILTER (NOT b.is_canceled) AS p90_delay
  FROM (SELECT * FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */ WHERE eva = '08012666') p
  JOIN (SELECT * FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */ WHERE eva = '08011160') b
    ON p.train_line_ride_id = b.train_line_ride_id
   AND p.train_line_station_num < b.train_line_station_num
  GROUP BY p.train_type, p.line_number HAVING count(*) >= 50
  ORDER BY rides DESC
) TO 'out/potsdam_to_berlin.json' (FORMAT json, ARRAY true);

-- P8: per-station aggregates for Berlin (for the Kiez + Ringbahn questions)
COPY (
  SELECT d.eva, r.name,
         count(*) AS n,
         round(avg(d.delay_in_min) FILTER (NOT d.is_canceled), 2) AS avg_delay,
         round(100.0 * count(*) FILTER (NOT d.is_canceled AND d.delay_in_min < 6) / greatest(count(*) FILTER (NOT d.is_canceled), 1), 1) AS punctual_pct,
         round(100.0 * count(*) FILTER (d.is_canceled) / count(*), 2) AS cancel_pct
  FROM read_parquet('hf://datasets/piebro/deutsche-bahn-data/monthly_processed_data/data-2025-1[12].parquet') /* + 2026-01..07: the all-station months */ d JOIN registry r ON d.eva = r.eva
  WHERE r.state = 'Berlin'
  GROUP BY d.eva, r.name HAVING count(*) >= 500
) TO 'out/berlin_stations.json' (FORMAT json, ARRAY true);
