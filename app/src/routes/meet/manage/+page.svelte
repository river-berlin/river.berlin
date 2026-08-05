<script>
    import { page } from '$app/stores';

    const WORKER_URL = 'https://meet.theadityashankar.workers.dev';
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const token = $page.url.searchParams.get('token') || '';

    let appt = $state(null);
    let notFound = $state(false);
    let status = $state('');
    let error = $state('');
    let working = $state(false);
    let done = $state('');

    // reschedule picker
    let rescheduling = $state(false);
    let selectedDate = $state('');
    let slots = $state([]);
    let loadingSlots = $state(false);

    const days = [];
    {
        const d = new Date();
        while (days.length < 14) {
            d.setDate(d.getDate() + 1);
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6) {
                days.push({
                    iso: d.toISOString().slice(0, 10),
                    label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                });
            }
        }
    }

    function localTime(startMs) {
        return new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    async function load() {
        if (!token) { notFound = true; return; }
        try {
            const res = await fetch(`${WORKER_URL}/appt?token=${token}`);
            if (!res.ok) { notFound = true; return; }
            appt = await res.json();
        } catch {
            error = 'Could not load your appointment, try refreshing';
        }
    }
    load();

    async function cancelAppt() {
        if (!confirm('Cancel this appointment?')) return;
        working = true;
        error = '';
        try {
            const res = await fetch(`${WORKER_URL}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await res.json();
            if (res.ok) done = 'Your appointment is cancelled. Feel free to book a new one any time!';
            else error = data.error || 'Could not cancel';
        } catch {
            error = 'Network hiccup - please try again';
        }
        working = false;
    }

    async function pickDate(iso) {
        selectedDate = iso;
        error = '';
        loadingSlots = true;
        slots = [];
        try {
            const res = await fetch(`${WORKER_URL}/slots?date=${iso}`);
            const data = await res.json();
            slots = data.slots || [];
        } catch {
            error = 'Could not load times';
        }
        loadingSlots = false;
    }

    async function rescheduleTo(slot) {
        working = true;
        error = '';
        try {
            const res = await fetch(`${WORKER_URL}/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, date: selectedDate, time: slot.time })
            });
            const data = await res.json();
            if (res.ok) done = `Rescheduled! See you on ${data.when}.`;
            else {
                error = data.error || 'Could not reschedule';
                if (res.status === 409) pickDate(selectedDate);
            }
        } catch {
            error = 'Network hiccup - please try again';
        }
        working = false;
    }
</script>

<svelte:head>
    <title>manage appointment</title>
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col items-center px-4 py-10 max-w-lg mx-auto text-gray-900 dark:text-gray-100">
    {#if done}
        <h1 class="text-2xl font-medium mb-3">all done ✅</h1>
        <p class="text-gray-600 dark:text-gray-300 text-center">{done}</p>
        <a href="/meet" class="mt-6 underline decoration-sky-400">book a new time</a>
    {:else if notFound}
        <h1 class="text-2xl font-medium mb-3">hmm 🤔</h1>
        <p class="text-gray-600 dark:text-gray-300 text-center">This link doesn't match any appointment — it may have already been cancelled.</p>
        <a href="/meet" class="mt-6 underline decoration-sky-400">book a new time</a>
    {:else if appt}
        <h1 class="text-2xl font-medium mb-3">your appointment</h1>
        <p class="text-gray-600 dark:text-gray-300 text-center mb-1">Hi {appt.name}! You're booked for:</p>
        <p class="font-medium text-center mb-8">{appt.when}</p>

        {#if !rescheduling}
            <div class="flex gap-3">
                <button
                    onclick={() => (rescheduling = true)}
                    class="py-2.5 px-5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                >
                    Reschedule
                </button>
                <button
                    onclick={cancelAppt}
                    disabled={working}
                    class="py-2.5 px-5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                    Cancel appointment
                </button>
            </div>
        {:else}
            <h2 class="w-full text-sm font-medium mb-2">Pick a new day <span class="text-gray-400">(times in your timezone, {userTz})</span></h2>
            <div class="w-full flex flex-wrap gap-2 mb-6">
                {#each days as day}
                    <button
                        onclick={() => pickDate(day.iso)}
                        class="py-1.5 px-3 rounded-lg text-sm border transition-colors
                            {selectedDate === day.iso
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'border-gray-300 dark:border-gray-700 hover:border-sky-400'}"
                    >
                        {day.label}
                    </button>
                {/each}
            </div>
            {#if loadingSlots}
                <p class="w-full text-sm text-gray-500 dark:text-gray-400">loading times...</p>
            {:else if selectedDate && slots.length === 0}
                <p class="w-full text-sm text-gray-500 dark:text-gray-400">no free times that day, try another</p>
            {:else}
                <div class="w-full flex flex-wrap gap-2">
                    {#each slots as slot}
                        <button
                            onclick={() => rescheduleTo(slot)}
                            disabled={working}
                            class="py-1.5 px-3 rounded-lg text-sm border border-gray-300 dark:border-gray-700 hover:border-emerald-400 transition-colors disabled:opacity-50"
                        >
                            {localTime(slot.start)}
                        </button>
                    {/each}
                </div>
            {/if}
            <button onclick={() => (rescheduling = false)} class="mt-6 text-sm text-gray-500 dark:text-gray-400 underline">never mind, keep my time</button>
        {/if}
    {:else if error}
        <p class="text-sm text-red-500">{error}</p>
    {:else}
        <p class="text-gray-500 dark:text-gray-400">loading...</p>
    {/if}

    {#if error && appt && !done}
        <p class="mt-4 text-sm text-red-500">{error}</p>
    {/if}
</div>
