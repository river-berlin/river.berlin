<script>
    import { onMount, onDestroy } from 'svelte';
    import jsQR from 'jsqr';

    const WORKER_URL = 'https://hi-cards.theadityashankar.workers.dev';
    const MEET_WORKER_URL = 'https://meet.theadityashankar.workers.dev';
    const SUBSCRIBE_WORKER_URL = 'https://subscribe.theadityashankar.workers.dev';

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

    // ---- meeting-slot blocking ----
    let meetDate = '';
    let meetSlots = [];
    let loadingMeetSlots = false;
    let meetError = '';

    const meetDays = [];
    {
        const d = new Date();
        while (meetDays.length < 14) {
            d.setDate(d.getDate() + 1);
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6) {
                meetDays.push({
                    iso: d.toISOString().slice(0, 10),
                    label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                });
            }
        }
    }

    async function loadMeetDay(iso) {
        meetDate = iso;
        meetError = '';
        loadingMeetSlots = true;
        meetSlots = [];
        try {
            const res = await fetch(`${MEET_WORKER_URL}/day?date=${iso}`, {
                headers: { 'X-Admin-Password': password }
            });
            const data = await res.json();
            if (res.ok) meetSlots = data.slots;
            else meetError = data.error || 'Could not load day';
        } catch {
            meetError = 'Network error loading day';
        }
        loadingMeetSlots = false;
    }

    async function toggleBlock(slot) {
        if (slot.status === 'booked') return;
        const blocked = slot.status === 'free';
        try {
            const res = await fetch(`${MEET_WORKER_URL}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
                body: JSON.stringify({ date: meetDate, time: slot.time, blocked })
            });
            const data = await res.json();
            if (res.ok) {
                meetSlots = meetSlots.map((s) => (s.time === slot.time ? { ...s, status: blocked ? 'blocked' : 'free' } : s));
            } else {
                meetError = data.error || 'Could not update slot';
            }
        } catch {
            meetError = 'Network error updating slot';
        }
    }

    // ---- email subscribers (manual broadcast only, never automatic) ----
    let subscribers = [];
    let loadingSubscribers = false;
    let subscribersError = '';

    let broadcastBlogPosts = false;
    let broadcastEvents = false;
    let broadcastMisc = false;
    let broadcastSubject = '';
    let broadcastText = '';
    let sending = false;
    let broadcastStatus = '';
    let broadcastStatusIsError = false;

    $: recipientCount = subscribers.filter(
        (s) => (broadcastBlogPosts && s.blogPosts) || (broadcastEvents && s.events) || (broadcastMisc && s.misc)
    ).length;

    async function loadSubscribers() {
        loadingSubscribers = true;
        subscribersError = '';
        try {
            const res = await fetch(`${SUBSCRIBE_WORKER_URL}/admin/subscribers`, {
                headers: { 'X-Admin-Password': password }
            });
            const data = await res.json();
            if (res.ok) {
                subscribers = data.subscribers;
            } else {
                subscribersError = data.error || 'Could not load subscribers';
            }
        } catch {
            subscribersError = 'Network error loading subscribers';
        }
        loadingSubscribers = false;
    }

    async function sendBroadcast() {
        broadcastStatus = '';
        if (!broadcastSubject.trim() || !broadcastText.trim()) {
            broadcastStatus = 'Need a subject and a message';
            broadcastStatusIsError = true;
            return;
        }
        if (recipientCount === 0) {
            broadcastStatus = 'No subscribers match the selected audience';
            broadcastStatusIsError = true;
            return;
        }
        const confirmed = confirm(`Send "${broadcastSubject.trim()}" to ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'}? This cannot be undone.`);
        if (!confirmed) return;

        sending = true;
        try {
            const res = await fetch(`${SUBSCRIBE_WORKER_URL}/admin/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
                body: JSON.stringify({
                    subject: broadcastSubject.trim(),
                    text: broadcastText.trim(),
                    blogPosts: broadcastBlogPosts,
                    events: broadcastEvents,
                    misc: broadcastMisc
                })
            });
            const data = await res.json();
            if (res.ok) {
                broadcastStatus = `Sent to ${data.sent}/${data.total}${data.failed ? ` (${data.failed} failed)` : ''}`;
                broadcastStatusIsError = data.failed > 0;
            } else {
                broadcastStatus = data.error || 'Failed to send';
                broadcastStatusIsError = true;
            }
        } catch {
            broadcastStatus = 'Network error sending broadcast';
            broadcastStatusIsError = true;
        }
        sending = false;
    }

    let removingEmail = '';

    async function removeSubscriber(email) {
        const confirmed = confirm(`Remove ${email} from all subscriptions?`);
        if (!confirmed) return;

        removingEmail = email;
        try {
            const res = await fetch(`${SUBSCRIBE_WORKER_URL}/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                subscribers = subscribers.filter((s) => s.email !== email);
            } else {
                subscribersError = 'Could not remove subscriber';
            }
        } catch {
            subscribersError = 'Network error removing subscriber';
        }
        removingEmail = '';
    }

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

    let activeTab = 'cards'; // 'cards' | 'meetings' | 'subscribers'

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
                loadSubscribers();
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

    <div class="w-full flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-800">
        <button
            on:click={() => (activeTab = 'cards')}
            class="py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors {activeTab === 'cards' ? 'border-sky-600 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}"
        >
            Cards
        </button>
        <button
            on:click={() => (activeTab = 'meetings')}
            class="py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors {activeTab === 'meetings' ? 'border-sky-600 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}"
        >
            Meetings
        </button>
        <button
            on:click={() => (activeTab = 'subscribers')}
            class="py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors {activeTab === 'subscribers' ? 'border-sky-600 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}"
        >
            Subscribers
        </button>
    </div>

    {#if activeTab === 'cards'}
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
    {/if}

    {#if activeTab === 'meetings'}
    <div class="w-full">
        <h2 class="text-lg font-medium mb-3">Meeting times</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Tap a free slot to block it, tap a blocked slot to free it. Times are Berlin time. Booked slots show the person's name.</p>
        <div class="flex flex-wrap gap-2 mb-4">
            {#each meetDays as day}
                <button
                    on:click={() => loadMeetDay(day.iso)}
                    class="py-1 px-2.5 rounded-lg text-xs border transition-colors {meetDate === day.iso ? 'bg-sky-600 text-white border-sky-600' : 'border-gray-300 dark:border-gray-700 hover:border-sky-400'}"
                >
                    {day.label}
                </button>
            {/each}
        </div>
        {#if loadingMeetSlots}
            <p class="text-sm text-gray-500 dark:text-gray-400">loading day...</p>
        {:else if meetSlots.length > 0}
            <div class="flex flex-wrap gap-2 mb-2">
                {#each meetSlots as slot}
                    <button
                        on:click={() => toggleBlock(slot)}
                        disabled={slot.status === 'booked'}
                        title={slot.status === 'booked' ? `booked: ${slot.name}` : slot.status}
                        class="py-1 px-2.5 rounded-lg text-xs border transition-colors
                            {slot.status === 'free' ? 'border-gray-300 dark:border-gray-700 hover:border-red-400' : ''}
                            {slot.status === 'blocked' ? 'bg-red-600/80 text-white border-red-600' : ''}
                            {slot.status === 'booked' ? 'bg-emerald-700 text-white border-emerald-700 cursor-default' : ''}"
                    >
                        {slot.time}{slot.status === 'booked' ? ` · ${slot.name}` : ''}
                    </button>
                {/each}
            </div>
        {/if}
        {#if meetError}
            <p class="text-sm text-red-500">{meetError}</p>
        {/if}
    </div>
    {/if}

    {#if activeTab === 'subscribers'}
    <div class="w-full">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-medium">Email subscribers</h2>
            <button on:click={loadSubscribers} class="text-sm text-gray-500 dark:text-gray-400 underline">refresh</button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Nothing here sends automatically - pick an audience, write the email, and hit send yourself.
        </p>

        {#if loadingSubscribers}
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">loading subscribers...</p>
        {:else if subscribersError}
            <p class="text-sm text-red-500 mb-3">{subscribersError}</p>
        {:else}
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {subscribers.length} total subscriber{subscribers.length === 1 ? '' : 's'}
                ({subscribers.filter((s) => s.blogPosts).length} blog posts ·
                {subscribers.filter((s) => s.events).length} events ·
                {subscribers.filter((s) => s.misc).length} misc)
            </p>
        {/if}

        <div class="flex flex-col gap-2 mb-3">
            <label class="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                <input type="checkbox" bind:checked={broadcastBlogPosts} class="h-4 w-4 rounded accent-sky-600" />
                Blog post subscribers
            </label>
            <label class="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                <input type="checkbox" bind:checked={broadcastEvents} class="h-4 w-4 rounded accent-sky-600" />
                Events subscribers
            </label>
            <label class="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                <input type="checkbox" bind:checked={broadcastMisc} class="h-4 w-4 rounded accent-sky-600" />
                Misc subscribers
            </label>
        </div>

        <label class="w-full mb-3 block">
            <span class="block mb-1 text-sm font-medium">Subject</span>
            <input
                bind:value={broadcastSubject}
                placeholder="e.g. New post: ..."
                class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500"
            />
        </label>

        <label class="w-full mb-3 block">
            <span class="block mb-1 text-sm font-medium">Message</span>
            <textarea
                bind:value={broadcastText}
                rows="5"
                placeholder="Plain text - an unsubscribe link is added automatically"
                class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 resize-y"
            ></textarea>
        </label>

        <button
            on:click={sendBroadcast}
            disabled={sending}
            class="w-full py-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
            {sending ? 'Sending...' : `Send to ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'}`}
        </button>

        {#if broadcastStatus}
            <p class="mt-3 text-sm {broadcastStatusIsError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}">
                {broadcastStatus}
            </p>
        {/if}
    </div>

    <div class="w-full mt-10">
        <h3 class="text-base font-medium mb-3">Manage subscribers</h3>
        {#if !loadingSubscribers && !subscribersError && subscribers.length === 0}
            <p class="text-sm text-gray-500 dark:text-gray-400">no subscribers yet</p>
        {:else if !loadingSubscribers && !subscribersError}
            <ul class="divide-y divide-gray-200 dark:divide-gray-800">
                {#each subscribers as s (s.email)}
                    <li class="py-2.5 flex items-center justify-between gap-3">
                        <div>
                            <span class="text-sm">{s.email}</span>
                            <span class="block text-xs text-gray-500 dark:text-gray-400">
                                {[s.blogPosts && 'blog posts', s.events && 'events', s.misc && 'misc'].filter(Boolean).join(', ') || 'no categories'}
                            </span>
                        </div>
                        <button
                            on:click={() => removeSubscriber(s.email)}
                            disabled={removingEmail === s.email}
                            class="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 shrink-0"
                        >
                            {removingEmail === s.email ? 'removing...' : 'remove'}
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
    {/if}
</div>
{/if}
