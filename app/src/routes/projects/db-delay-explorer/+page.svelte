<script>
    // All headline numbers are precomputed with DuckDB over the full dataset
    // (no sampling) - the exact SQL is shown next to the data below. The
    // route checker at the bottom runs DuckDB in your browser (WASM) against
    // the parquet files directly, so any station pair is queryable live.
    import { onMount } from 'svelte';
    import hljs from 'highlight.js/lib/core';
    import sql from 'highlight.js/lib/languages/sql';

    hljs.registerLanguage('sql', sql);

    const SNAPSHOT = 'data through 2026-07, computed 2026-08-06';
    const RECENT_NOTE = 'Nov 2025 - Jul 2026 (the months where all stations are recorded)';

    let stateData = $state(null); // rows from state_by_type.json
    let cityData = $state(null);
    let nationalData = $state(null);

    let mode = $state('state'); // 'state' | 'city'
    let place = $state('Berlin');
    let trainType = $state('');
    let sqlHtml = $state('');
    let showSql = $state(false);

    const TYPE_LABELS = {
        '': 'all types combined',
        ICE: 'ICE (long distance express)', IC: 'IC (intercity)', EC: 'EC (eurocity)',
        RE: 'RE (regional express)', RB: 'RB (regional)', S: 'S-Bahn',
        U: 'U-Bahn', STR: 'Tram', Bus: 'Bus'
    };

    onMount(async () => {
        [stateData, cityData, nationalData] = await Promise.all([
            fetch('/db-delay/state_by_type.json').then((r) => r.json()),
            fetch('/db-delay/city_by_type.json').then((r) => r.json()),
            fetch('/db-delay/national_by_type.json').then((r) => r.json())
        ]);
        fetch('/db-delay/precompute.sql')
            .then((r) => r.text())
            .then((t) => (sqlHtml = hljs.highlight(t, { language: 'sql' }).value));
    });

    const states = $derived(stateData ? [...new Set(stateData.map((r) => r.state))].sort() : []);
    const cities = $derived(cityData ? [...new Set(cityData.map((r) => r.city))].sort() : []);

    const availableTypes = $derived.by(() => {
        const data = mode === 'state' ? stateData : cityData;
        const key = mode === 'state' ? 'state' : 'city';
        if (!data) return [''];
        return ['', ...data.filter((r) => r[key] === place && r.train_type && (TYPE_LABELS[r.train_type] !== undefined)).map((r) => r.train_type)];
    });

    const result = $derived.by(() => {
        const data = mode === 'state' ? stateData : cityData;
        const key = mode === 'state' ? 'state' : 'city';
        if (!data) return null;
        // rows with train_type null are the all-types rollup (GROUPING SETS)
        return data.find((r) => r[key] === place && (trainType ? r.train_type === trainType : r.train_type == null)) || null;
    });

    function pickMode(m) {
        mode = m;
        place = m === 'state' ? 'Berlin' : 'Berlin';
        trainType = '';
    }

    // ---- route checker (duckdb-wasm) ----
    let stations = $state([]);
    let fromName = $state('Potsdam Hbf');
    let toName = $state('Berlin Hauptbahnhof');
    let monthCount = $state(1);
    let routeLoading = $state(false);
    let routeProgress = $state('');
    let routeError = $state('');
    let routeResult = $state(null);
    let db = null;

    const MONTHS = ['2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01', '2025-12', '2025-11'];

    onMount(async () => {
        stations = await fetch('/db-station-names.json').then((r) => r.json());
    });

    function evaOf(name) {
        const hit = stations.find(([n]) => n === name);
        return hit ? hit[1] : null;
    }

    async function initDuckdb() {
        if (db) return db;
        routeProgress = 'loading DuckDB (~35MB, once)...';
        const duckdb = await import('@duckdb/duckdb-wasm');
        const bundles = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(bundles);
        const workerUrl = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
        );
        const worker = new Worker(workerUrl);
        db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(4), worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(workerUrl);
        return db;
    }

    async function checkRoute() {
        routeError = '';
        routeResult = null;
        const fromEva = evaOf(fromName);
        const toEva = evaOf(toName);
        if (!fromEva || !toEva) {
            routeError = 'Pick both stations from the suggestions (exact names)';
            return;
        }
        routeLoading = true;
        try {
            const database = await initDuckdb();
            const files = MONTHS.slice(0, monthCount)
                .map((m) => `'https://huggingface.co/datasets/piebro/deutsche-bahn-data/resolve/main/monthly_processed_data/data-${m}.parquet'`)
                .join(', ');
            routeProgress = `querying ${monthCount} month${monthCount > 1 ? 's' : ''} of data (this streams ~${monthCount * 150}-${monthCount * 300}MB)...`;
            const conn = await database.connect();
            const q = await conn.query(`
                SELECT p.train_type, p.line_number,
                       count(*)::INT AS rides,
                       round(avg(b.delay_in_min) FILTER (NOT b.is_canceled), 1) AS avg_delay,
                       round(100.0 * count(*) FILTER (NOT b.is_canceled AND b.delay_in_min < 6) / greatest(count(*) FILTER (NOT b.is_canceled), 1), 0) AS punctual_pct,
                       round(100.0 * count(*) FILTER (b.is_canceled OR p.is_canceled) / count(*), 1) AS cancel_pct
                FROM (SELECT * FROM read_parquet([${files}]) WHERE eva = '${fromEva}') p
                JOIN (SELECT * FROM read_parquet([${files}]) WHERE eva = '${toEva}') b
                  ON p.train_line_ride_id = b.train_line_ride_id
                 AND p.train_line_station_num < b.train_line_station_num
                GROUP BY p.train_type, p.line_number
                HAVING count(*) >= 10
                ORDER BY rides DESC LIMIT 20`);
            const rows = q.toArray().map((r) => r.toJSON());
            await conn.close();
            if (rows.length === 0) {
                routeError = 'No direct rides found between those stations in the selected months (only direct connections are detectable)';
            } else {
                routeResult = rows;
            }
        } catch (e) {
            routeError = 'Query failed: ' + e.message;
        }
        routeLoading = false;
        routeProgress = '';
    }
</script>

<svelte:head>
    <title>DB Delay Explorer</title>
</svelte:head>

<!-- .sql-block styling lives in app.css: the highlighted spans are injected
     at runtime via {@html}, which svelte's scoped styles can't reliably target -->


<div class="flex flex-col items-center px-4 py-10 max-w-lg mx-auto text-gray-900 dark:text-gray-100">
    <h1 class="text-3xl font-medium mb-2">DB Delay Explorer 🚆</h1>
    <p class="text-gray-600 dark:text-gray-300 text-center mb-2">
        How late are the trains where you live? Exact numbers over
        <a href="https://huggingface.co/datasets/piebro/deutsche-bahn-data" target="_blank" rel="noopener noreferrer" class="underline decoration-sky-400">piebro/deutsche-bahn-data</a>
        (205M station events).
    </p>
    <p class="text-xs text-gray-400 text-center mb-8">{SNAPSHOT} · rankings use {RECENT_NOTE} · rail stations via the official DB StaDa registry</p>

    <div class="w-full flex gap-2 mb-3">
        <button onclick={() => pickMode('state')} class="flex-1 py-1.5 rounded-lg text-sm border transition-colors {mode === 'state' ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-300 dark:border-gray-700'}">By state</button>
        <button onclick={() => pickMode('city')} class="flex-1 py-1.5 rounded-lg text-sm border transition-colors {mode === 'city' ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-300 dark:border-gray-700'}">By city</button>
    </div>

    <label class="w-full mb-3">
        <span class="block mb-1 text-sm font-medium">{mode === 'state' ? 'State' : 'City'}</span>
        <select bind:value={place} class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 dark:bg-gray-900">
            {#each mode === 'state' ? states : cities as p}
                <option value={p}>{p}</option>
            {/each}
        </select>
    </label>

    <label class="w-full mb-5">
        <span class="block mb-1 text-sm font-medium">Transportation type</span>
        <select bind:value={trainType} class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 dark:bg-gray-900">
            {#each availableTypes as t}
                <option value={t}>{TYPE_LABELS[t] ?? t}</option>
            {/each}
        </select>
    </label>

    {#if !stateData}
        <p class="text-sm text-gray-500 dark:text-gray-400">loading data...</p>
    {:else if result}
        <div class="w-full rounded-xl bg-gray-100 dark:bg-gray-800 p-5">
            <p class="text-center mb-4">
                <span class="text-5xl font-medium">{result.avg_delay}</span>
                <span class="text-gray-500 dark:text-gray-400"> min average delay</span>
            </p>
            <div class="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                <div>
                    <p class="font-medium text-lg">{result.punctual_pct}%</p>
                    <p class="text-gray-500 dark:text-gray-400">punctual (&lt;6 min, DB's definition)</p>
                </div>
                <div>
                    <p class="font-medium text-lg">{result.cancel_pct}%</p>
                    <p class="text-gray-500 dark:text-gray-400">canceled</p>
                </div>
                <div>
                    <p class="font-medium text-lg">{result.n.toLocaleString()}</p>
                    <p class="text-gray-500 dark:text-gray-400">stop events</p>
                </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 text-center">exact aggregate over every matching stop event — no sampling</p>
        </div>
    {:else}
        <p class="text-sm text-gray-500 dark:text-gray-400">no data for that combination</p>
    {/if}

    <button onclick={() => (showSql = !showSql)} class="mt-4 text-xs text-gray-500 dark:text-gray-400 underline">
        {showSql ? 'hide' : 'show'} the exact DuckDB SQL behind this data
    </button>
    {#if showSql}
        <pre class="sql-block w-full mt-2 p-3 rounded-lg text-[11px] leading-snug overflow-x-auto max-h-96 overflow-y-auto">{#if sqlHtml}{@html sqlHtml}{:else}loading...{/if}</pre>
    {/if}

    <!-- route checker -->
    <div class="w-full mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <h2 class="text-xl font-medium mb-1">Check your own route 🔍</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Punctuality of direct trains between two stations, computed in your browser
            with DuckDB-WASM straight from the parquet files — any route, no server.
        </p>
        <p class="text-xs text-amber-600 dark:text-amber-400 mb-4">
            heads-up: this downloads ~150-300MB per month of data queried (nothing is stored)
        </p>

        <label class="w-full block mb-3">
            <span class="block mb-1 text-sm font-medium">From</span>
            <input bind:value={fromName} list="station-list" class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500" />
        </label>
        <label class="w-full block mb-3">
            <span class="block mb-1 text-sm font-medium">To</span>
            <input bind:value={toName} list="station-list" class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500" />
        </label>
        <datalist id="station-list">
            {#each stations as [name]}
                <option value={name}></option>
            {/each}
        </datalist>
        <label class="w-full block mb-4">
            <span class="block mb-1 text-sm font-medium">Data range</span>
            <select bind:value={monthCount} class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 dark:bg-gray-900">
                <option value={1}>last month (~200MB)</option>
                <option value={3}>last 3 months (~600MB)</option>
                <option value={6}>last 6 months (~1.2GB)</option>
                <option value={9}>all 9 all-station months (~2GB)</option>
            </select>
        </label>

        <button onclick={checkRoute} disabled={routeLoading} class="w-full py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {routeLoading ? routeProgress || 'working...' : 'Check this route'}
        </button>

        {#if routeError}
            <p class="mt-4 text-sm text-red-500">{routeError}</p>
        {/if}
        {#if routeResult}
            <div class="w-full mt-5 overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-gray-500 dark:text-gray-400">
                            <th class="py-1 pr-2">line</th>
                            <th class="py-1 pr-2">rides</th>
                            <th class="py-1 pr-2">avg delay</th>
                            <th class="py-1 pr-2">punctual</th>
                            <th class="py-1">canceled</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each routeResult as r}
                            <tr class="border-t border-gray-200 dark:border-gray-800">
                                <td class="py-1.5 pr-2 font-medium">{r.train_type} {r.line_number}</td>
                                <td class="py-1.5 pr-2">{r.rides}</td>
                                <td class="py-1.5 pr-2">{r.avg_delay} min</td>
                                <td class="py-1.5 pr-2">{r.punctual_pct}%</td>
                                <td class="py-1.5">{r.cancel_pct}%</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">delay measured at the destination station, direct rides only (same ride id at both stations)</p>
            </div>
        {/if}
    </div>
</div>
