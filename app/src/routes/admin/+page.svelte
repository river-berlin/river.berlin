<script>
    import { onMount, onDestroy } from 'svelte';
    import jsQR from 'jsqr';

    const WORKER_URL = 'https://hi-cards.theadityashankar.workers.dev';

    let video;
    let scanning = false;
    let stream = null;
    let scanInterval = null;
    let scanCanvas = null; // offscreen canvas reused between frames

    let cardId = '';
    let name = '';
    let message = '';
    let location = '';
    let password = '';
    let status = '';
    let statusIsError = false;
    let existing = null; // currently stored JSON for the scanned id, if any

    let allCards = [];
    let loadingCards = false;

    async function loadAllCards() {
        loadingCards = true;
        try {
            const res = await fetch(`${WORKER_URL}/cards`, {
                headers: { 'X-Admin-Password': password }
            });
            if (res.ok) {
                const data = await res.json();
                allCards = data.cards.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
            }
        } catch {}
        loadingCards = false;
    }

    function editCard(card) {
        cardId = card.id;
        existing = { ...card };
        delete existing.id;
        name = card.name || '';
        message = card.message || '';
        location = card.location || '';
        status = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    let unlocked = false;
    let unlockError = '';
    let checkingPassword = false;

    onMount(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {});
        }
        // re-verify the remembered password on every open
        const saved = localStorage.getItem('cardAdminPassword');
        if (saved) {
            password = saved;
            unlock();
        }
    });

    async function unlock() {
        unlockError = '';
        checkingPassword = true;
        try {
            const res = await fetch(`${WORKER_URL}/auth`, {
                headers: { 'X-Admin-Password': password }
            });
            if (res.ok) {
                unlocked = true;
                localStorage.setItem('cardAdminPassword', password);
                loadAllCards();
            } else {
                unlockError = 'Wrong password';
                localStorage.removeItem('cardAdminPassword');
            }
        } catch (err) {
            unlockError = 'Network error: ' + err.message;
        } finally {
            checkingPassword = false;
        }
    }

    function lock() {
        unlocked = false;
        password = '';
        localStorage.removeItem('cardAdminPassword');
        stopScan();
    }

    onDestroy(stopScan);

    // Accepts a full https://river.berlin/hi/<id> URL or a bare id
    function extractId(text) {
        const urlMatch = text.match(/\/hi\/([A-Za-z0-9_-]+)/);
        if (urlMatch) return urlMatch[1];
        if (/^[A-Za-z0-9_-]{1,64}$/.test(text)) return text;
        return null;
    }

    async function lookupExisting(id) {
        existing = null;
        name = '';
        message = '';
        location = '';
        try {
            const res = await fetch(`${WORKER_URL}/card/${id}`);
            if (res.ok) {
                existing = await res.json();
                if (existing.name) name = existing.name;
                if (existing.message) message = existing.message;
                if (existing.location) location = existing.location;
            }
        } catch {}
    }

    async function startScan() {
        status = '';
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            await video.play();
            scanning = true;

            scanInterval = setInterval(() => {
                try {
                    if (!video.videoWidth) return; // camera not delivering frames yet
                    if (!scanCanvas) scanCanvas = document.createElement('canvas');
                    scanCanvas.width = video.videoWidth;
                    scanCanvas.height = video.videoHeight;
                    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(video, 0, 0);
                    const imageData = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code) {
                        const id = extractId(code.data);
                        if (id) {
                            cardId = id;
                            stopScan();
                            lookupExisting(id);
                        }
                    }
                } catch {}
            }, 300);
        } catch (err) {
            status = 'Could not open camera: ' + err.message;
            statusIsError = true;
        }
    }

    function stopScan() {
        scanning = false;
        if (scanInterval) clearInterval(scanInterval);
        scanInterval = null;
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            stream = null;
        }
    }

    async function save() {
        status = '';
        if (!cardId || !name.trim()) {
            status = 'Need an id and a name';
            statusIsError = true;
            return;
        }
        try {
            // keep any existing fields, update the editable ones
            const payload = { ...(existing || {}), name: name.trim() };
            if (message.trim()) payload.message = message.trim();
            else delete payload.message;
            if (location.trim()) payload.location = location.trim();
            else delete payload.location;
            const res = await fetch(`${WORKER_URL}/card/${cardId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': password
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                status = `Saved! ${cardId} -> ${name.trim()}`;
                statusIsError = false;
                existing = data.saved || payload;
                loadAllCards();
            } else {
                status = data.error || 'Failed to save';
                statusIsError = true;
            }
        } catch (err) {
            status = 'Network error: ' + err.message;
            statusIsError = true;
        }
    }
</script>

<svelte:head>
    <title>card admin</title>
    <link rel="manifest" href="/admin-manifest.json" />
</svelte:head>

{#if !unlocked}
<div class="flex flex-col items-center justify-center px-4 min-h-[60vh] max-w-md mx-auto text-gray-900 dark:text-gray-100">
    <h1 class="text-2xl font-medium mb-6">business card admin</h1>
    <form class="w-full" on:submit|preventDefault={unlock}>
        <label class="w-full block mb-4">
            <span class="block mb-1 text-sm font-medium">Password</span>
            <input
                type="password"
                bind:value={password}
                class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500"
            />
        </label>
        <button
            type="submit"
            disabled={checkingPassword}
            class="w-full py-3 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
        >
            {checkingPassword ? 'Checking...' : 'Unlock'}
        </button>
    </form>
    {#if unlockError}
        <p class="mt-4 text-sm text-red-500">{unlockError}</p>
    {/if}
</div>
{:else}
<div class="flex flex-col items-center px-4 py-10 max-w-md mx-auto text-gray-900 dark:text-gray-100">
    <div class="w-full flex items-center justify-between mb-6">
        <h1 class="text-2xl font-medium">business card admin</h1>
        <button on:click={lock} class="text-sm text-gray-500 dark:text-gray-400 underline">lock</button>
    </div>

    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        bind:this={video}
        class="w-full rounded-lg mb-4 bg-black {scanning ? '' : 'hidden'}"
        playsinline
    ></video>

    {#if !scanning}
        <button
            on:click={startScan}
            class="w-full py-3 mb-4 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
        >
            Scan a card's QR code
        </button>
    {:else}
        <button
            on:click={stopScan}
            class="w-full py-3 mb-4 rounded-lg bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
        >
            Stop scanning
        </button>
    {/if}

    <label class="w-full mb-3">
        <span class="block mb-1 text-sm font-medium">Card id</span>
        <input
            bind:value={cardId}
            on:change={() => cardId && lookupExisting(cardId)}
            placeholder="scanned or typed id"
            class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500"
        />
    </label>

    {#if existing}
        <p class="w-full mb-3 text-sm text-gray-500 dark:text-gray-400">
            Currently stored: {JSON.stringify(existing)}
        </p>
    {/if}

    <label class="w-full mb-3">
        <span class="block mb-1 text-sm font-medium">Person's name</span>
        <input
            bind:value={name}
            placeholder="who gets this card?"
            class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500"
        />
    </label>

    <label class="w-full mb-3">
        <span class="block mb-1 text-sm font-medium">Personal message <span class="text-gray-400">(optional, shown on their hi page)</span></span>
        <textarea
            bind:value={message}
            rows="2"
            placeholder="lovely meeting you at ..."
            class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 resize-y"
        ></textarea>
    </label>

    <label class="w-full mb-5">
        <span class="block mb-1 text-sm font-medium">Where we met <span class="text-gray-400">(optional, just for me)</span></span>
        <input
            bind:value={location}
            placeholder="e.g. robotics meetup Berlin"
            class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500"
        />
    </label>

    <button
        on:click={save}
        class="w-full py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
    >
        Save
    </button>

    {#if status}
        <p class="mt-4 text-sm {statusIsError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}">
            {status}
        </p>
    {/if}

    <div class="w-full mt-10">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-medium">Assigned cards</h2>
            <button on:click={loadAllCards} class="text-sm text-gray-500 dark:text-gray-400 underline">refresh</button>
        </div>
        {#if loadingCards}
            <p class="text-sm text-gray-500 dark:text-gray-400">loading...</p>
        {:else if allCards.length === 0}
            <p class="text-sm text-gray-500 dark:text-gray-400">no cards assigned yet</p>
        {:else}
            <ul class="divide-y divide-gray-200 dark:divide-gray-800">
                {#each allCards as card (card.id)}
                    <li>
                        <button
                            on:click={() => editCard(card)}
                            class="w-full py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900 rounded px-2 transition-colors"
                        >
                            <span class="font-medium">{card.name || '(no name)'}</span>
                            <span class="text-gray-400 text-sm ml-2">{card.id}</span>
                            <span class="block text-xs text-gray-500 dark:text-gray-400">
                                {#if card.location}{card.location} · {/if}{card.addedAt ? new Date(card.addedAt).toLocaleDateString() : ''}
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
{/if}
