  # Claude's research notes for blog-122 (not for publication)

Everything below is raw findings + process for you to draw from in your own words.
All numbers are exact aggregates (DuckDB over the full dataset, no sampling).
Unless noted: window = Nov 2025 - Jul 2026 (the all-station months), "punctual" =
DB's own definition (< 6 min late), rail stations matched via the official StaDa
registry joined on the eva station id, cancellations excluded from delay averages.

Data files backing every number: app/static/db-delay/*.json
Exact SQL: app/static/db-delay/precompute.sql (also shown on the project page)
Interactive: /projects/db-delay-explorer (cached lookups + in-browser DuckDB route checker)

---

## Q: Which State/City is most punctual?

Chart: chart_state_punctuality.png

- Best states: Berlin 95%, Mecklenburg-Vorpommern 92%, Saarland 91%
- Worst: Nordrhein-Westfalen 76%, Niedersachsen 79%, Hessen 80%
- Cities: best Rostock 97.1%, Chemnitz 95.9%, Berlin 94.9%; worst Koblenz 67%, Magdeburg 69%, Duisburg 69.4%
- Fairness note: city-states are all-urban, S-Bahn-dominated networks; comparing
  Berlin vs a mixed state like NRW is apples-to-oranges. North-east generally
  beats the west.

## Q: Is DB late, or are my friends late?

Chart: chart_delay_distributions.png (small multiples per type)

- Distributions are NOT bell curves: huge spike at 0-2 min, long right tail.
- Nationwide, full 2 years: S-Bahn 88% punctual (median 1 min), RB 86%, RE 76%,
  IC 59% (41% of stops 6+ min late), ICE 57% (avg delay 11.4 min - the flagship
  is the least punctual product).
- "Bus" shows 96% punctual / avg 0.85 min - given your lived experience, this
  says more about API honesty for buses than about buses.
- Angle you could take: friend on Berlin S-Bahn (95% punctual) & often late ->
  probably the friend. Friend on ICE -> believe them.

## Q: How early should I be?

Chart: chart_how_early.png (percentiles), chart_delay_by_hour.png, chart_delay_by_weekday.png, chart_monthly_trend.png

Percentiles of delay (full range, nationwide):
- S-Bahn: p50=1, p80=4, p90=6, p95=10 min
- RB: p50=1, p80=4, p90=7, p95=12
- RE: p50=2, p80=7, p90=13, p95=20
- IC: p50=3, p80=15, p90=28, p95=43
- ICE: p50=4, p80=18, p90=32, p95=48 (1 in 10 ICE stops is 32+ min late)

IMPORTANT NUANCE (your own criticism, valid): "be X minutes early" is the wrong
mental model. Going to the station early doesn't get you an earlier train - you
board the same delayed train. The percentiles measure "how much later than
SCHEDULED you will arrive at the destination". So the actionable version is:
- pick a connection whose *scheduled arrival* is at least pXX minutes before
  your deadline;
- because departures are quantized (RE typically hourly, S-Bahn every 5-10 min),
  that rounds up to taking the previous connection - a full headway earlier -
  for regional/long-distance, while for S-Bahn the headway is short enough that
  the naive buffer logic roughly works;
- cancellation rates (4-7% rail, and e.g. RE7 at 12%) mean for must-not-miss
  appointments the previous-train rule applies regardless of delay stats,
  because a cancellation costs you a full headway minimum.

Other patterns:
- Delays compound over the day: morning trains clearly more punctual than
  evening (cascade effect, resets overnight). ICE delay roughly doubles from
  ~7am to evening peak.
- Weekdays similar to each other; weekends slightly better.
- Monthly trend (constant ~100-station cohort for comparability): no dramatic
  improvement over the 2 years; seasonal wobble visible.

## Q: Potsdam Hbf -> Berlin, specific train between 2 points?

Data: app/static/db-delay/potsdam_to_berlin.json (delay measured AT Berlin Hbf,
ride-id join: same ride at both stations, Potsdam stop before Berlin stop)

- RE1: 78.6% punctual, avg 4.2 min, p90 = 13 min
- RE7: 70.2%, avg 5.5 min, p90 = 16, and 12.4% cancellation (!)
- RB23: 94.2%, avg 1.5 min, p90 = 4 - the punctual insider option
- IC: 48.4%, avg 12.6 min
- ICE (few stop there): 19.3% punctual, avg 38.3 min, p90 = 83 min
- Story: if the friend rides RE1 (most likely), every ~5th arrival is 6+ min
  late through no fault of theirs. If RB23: busted.
- The route checker on the project page lets any reader compute this for their
  own station pair, in-browser (duckdb-wasm, no server).
- Caveat: "rides" counts are stop-pairs and may double-count repeat snapshots
  of the same physical ride; percentages robust, absolute counts not.

## Q: Top 10 most/least punctual lines in Berlin (per type)

Charts: chart_berlin_lines_S.png, chart_berlin_lines_RE.png,
chart_berlin_lines_RB.png, chart_berlin_lines_Bus.png
Data: app/static/db-delay/berlin_lines_by_type.json
(qualifying = present in >=8 of 9 months with >=100 stops/month, so the S15
is excluded; labels normalized and merged, e.g. "RE"+"1" and "RE"+"RE1" -> RE1;
the old combined best/worst charts are deleted)

Final per-type numbers:
- S-Bahn (15 lines): a remarkably tight band, 95.1-97.8%. Best S75 (97.8),
  S47 (97.7), S26 (97.6). "Worst" S7 (95.1), S5 (95.7), S3 (96.0) - the
  worst S-Bahn line still beats every RE line's best. Note the busiest lines
  (S7, S5, S3, S41 ring) sit at the bottom - load correlates with delay.
- RE (8 lines): best FEX airport express 90.1, RE6 89.1; worst RE4 68.3,
  RE2 70.6, RE7 71.3. The RE4 quietly took the crown of Berlin's least
  punctual qualifying line.
- RB (only 3 qualify): RB21 90.3, RB32 86.6, RB24 81.8.
- Bus (5 qualify - and ALL of them are S-Bahn replacement services!): Bus S9
  97.4, Bus S7 96.2, then Bus S46/S41 87.6, Bus S42 85.4. The "SEV buses are
  the most punctual lines" story from before survives partially: the best SEV
  buses beat everything, but the ring SEVs (S41/S42) do not. There are zero
  qualifying regular DB bus lines in Berlin - the Bus category here is
  entirely Ersatzverkehr.

- HARD LIMITATION: no trams, no U-Bahn anywhere in the dataset - BVG doesn't
  feed DB's API. "Bus" = DB-side buses only. The question as asked cannot be
  answered for tram/U-Bahn from this data.
- Fun finding that survived scrutiny so far: S-Bahn *replacement buses*
  (Schienenersatzverkehr, e.g. "Bus S47") rank among the most punctual "lines"
  in Berlin - the replacement bus beats the train it replaces (bus-API caveat
  applies).
- Least punctual: consistently the RE lines (RE2, RE7 in the 56-75% range
  depending on labeling) - regional expresses import Brandenburg's delays.
- Your S15 catch was right: it only launched recently, and it also only shows
  ~1 month of presence in the data. The per-type rerun requires a line to be
  present in >=8 of 9 months, which drops it. Labels are also now normalized
  ("RE" + "1" vs "RE" + "RE1" merged into RE1).

## Q: Which Kiez is most punctual?

Chart: chart_berlin_bezirke.png
Data: app/static/db-delay/berlin_bezirke.json (+ berlin_stations.json per station)

- Computed per Bezirk, not Kiez: Berlin has ~130 rail stations vs 96 Ortsteile,
  so Kiez-level would be 1-2 stations per area = noise. Every station assigned
  by its actual coordinates (point-in-polygon against official Bezirk shapes).
- Best: Reinickendorf 97.1%, Pankow 96.6%, Treptow-Köpenick / Marzahn-
  Hellersdorf 95.8%
- Worst by a mile: Spandau 86.2% (only Bezirk far below the pack - its stations
  are dominated by regional/long-distance traffic, not S-Bahn). Mitte 93.7%
  (every long-distance train in the country passes through it).
- Note cancel rates run 5-8.4% (Neukölln highest) - could be its own angle.

## Q: Inside vs outside the Ringbahn?

Chart: chart_berlin_ring.png
Data: app/static/db-delay/berlin_ring.json

- outside the Ring: 95.8% punctual (94 stations)
- ON the Ring: 95.1% (30 stations) but highest cancellation rate: 8.2%
- inside the Ring: 93.6% (29 stations)
- Counter-intuitive result (I expected inside to win). Explanation consistent
  with the Bezirk data: inside the Ring = the big hub stations hosting
  long-distance traffic that imports delays; outside = quiet S-Bahn shuttle
  territory.
- Method: station coordinates classified against a polygon built from the S41
  ring stations' own coordinates.

## Process / method notes

- Pipeline: DuckDB (native, streaming) over the dataset's monthly parquet on
  Hugging Face; hit rate limits twice, ended up downloading the 9 all-station
  months temporarily (deleted after; disk never dropped below 36GB free).
- Station->state/city: official DB StaDa registry (via the db-stations dump),
  joined on eva id - exact, no name matching. Geo questions (Bezirk, Ring) use
  registry coordinates + point-in-polygon.
- The earlier LIKE-on-station-name approach and its false positives
  ("Berliner Platz" bus stops etc.) is fully replaced by the eva join.
- Coverage caveat: Jul 2024 - Oct 2025 only ~100 biggest stations; rankings
  use Nov 2025+ only; the trend chart uses the constant founding cohort.
- Each row = a stop event, not a journey: multi-stop cities weigh more; a
  delayed train counts at every stop it makes.
- Swiss-standard aside: DB's <6 min definition is generous; at <3 min
  everything would look substantially worse.

## Chart inventory (all in blog/blog-122/)

- chart_state_punctuality.png - states ranked
- chart_type_avg_delay.png - avg delay per type nationwide
- chart_delay_distributions.png - the "bell curve" view (spike + long tail), 6 types
- chart_how_early.png - percentile dots per type
- chart_delay_by_hour.png - delays compound over the day
- chart_delay_by_weekday.png - weekday pattern
- chart_monthly_trend.png - 2-year trend, constant cohort
- chart_berlin_bezirke.png - Bezirk ranking
- chart_berlin_ring.png - inside/on/outside Ring
- chart_berlin_lines_S.png / _RE.png / _RB.png / _Bus.png - per-type line
  rankings (S15 and other short-lived lines excluded)
