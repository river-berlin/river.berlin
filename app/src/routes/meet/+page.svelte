<script>
    const WORKER_URL = 'https://meet.theadityashankar.workers.dev';
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    function localTime(startMs) {
        return new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const REMINDER_OPTIONS = [
        { minutes: 15, label: '15 minutes before' },
        { minutes: 30, label: '30 minutes before' },
        { minutes: 60, label: '1 hour before' },
        { minutes: 120, label: '2 hours before' },
        { minutes: 240, label: '4 hours before' }
    ];

    // next 14 weekdays to choose from
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

    let selectedDate = $state('');
    let slots = $state([]);
    let loadingSlots = $state(false);
    let selectedTime = $state('');

    let name = $state('');
    let email = $state('');
    let note = $state('');
    let reminderMinutes = $state(60);

    let booking = $state(false);
    let confirmation = $state('');
    let error = $state('');

    async function pickDate(iso) {
        selectedDate = iso;
        selectedTime = '';
        error = '';
        loadingSlots = true;
        slots = [];
        try {
            const res = await fetch(`${WORKER_URL}/slots?date=${iso}`);
            const data = await res.json();
            slots = data.slots || [];
        } catch {
            error = 'Could not load times, try again in a moment';
        }
        loadingSlots = false;
    }

    async function book() {
        error = '';
        if (!selectedDate || !selectedTime) { error = 'Pick a date and time first'; return; }
        if (!name.trim() || !email.includes('@')) { error = 'Your name and a valid email are needed'; return; }
        booking = true;
        try {
            const res = await fetch(`${WORKER_URL}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, note, date: selectedDate, time: selectedTime, reminderMinutes, tz: userTz })
            });
            const data = await res.json();
            if (res.ok) {
                confirmation = data.when;
            } else {
                error = data.error || 'Booking failed, sorry!';
                if (res.status === 409) pickDate(selectedDate); // refresh taken slots
            }
        } catch {
            error = 'Network hiccup - please try again';
        }
        booking = false;
    }
</script>

<svelte:head>
    <title>meet River</title>
</svelte:head>

<div class="flex flex-col items-center px-4 py-10 max-w-lg mx-auto text-gray-900 dark:text-gray-100">
    {#if confirmation}
        <h1 class="text-3xl font-medium mb-4">booked! 🎉</h1>
        <p class="text-gray-600 dark:text-gray-300 text-center mb-2">See you on <span class="font-medium">{confirmation}</span>.</p>
        <p class="text-gray-500 dark:text-gray-400 text-sm text-center">
            A confirmation email is on its way, you'll also get reminders 24 hours and
            {REMINDER_OPTIONS.find((o) => o.minutes === reminderMinutes)?.label.replace(' before', '')} before we meet.
        </p>
    {:else}
        <h1 class="text-3xl font-medium mb-2">meet me :)</h1>
        <p class="text-gray-600 dark:text-gray-300 text-center mb-8">Pick a time that suits you, times are shown in your timezone ({userTz}).</p>

        <h2 class="w-full text-sm font-medium mb-2">1. Pick a day</h2>
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

        {#if selectedDate}
            <h2 class="w-full text-sm font-medium mb-2">2. Pick a time</h2>
            {#if loadingSlots}
                <p class="w-full text-sm text-gray-500 dark:text-gray-400 mb-6">loading times...</p>
            {:else if slots.length === 0}
                <p class="w-full text-sm text-gray-500 dark:text-gray-400 mb-6">no free times that day, try another :(</p>
            {:else}
                <div class="w-full flex flex-wrap gap-2 mb-6">
                    {#each slots as slot}
                        <button
                            onclick={() => (selectedTime = slot.time)}
                            class="py-1.5 px-3 rounded-lg text-sm border transition-colors
                                {selectedTime === slot.time
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-gray-300 dark:border-gray-700 hover:border-emerald-400'}"
                        >
                            {localTime(slot.start)}
                        </button>
                    {/each}
                </div>
            {/if}
        {/if}

        {#if selectedTime}
            <h2 class="w-full text-sm font-medium mb-2">3. Your details</h2>
            <label class="w-full mb-3">
                <span class="block mb-1 text-sm">Name</span>
                <input bind:value={name} class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500" />
            </label>
            <label class="w-full mb-3">
                <span class="block mb-1 text-sm">Email <span class="text-gray-400">(for the confirmation & reminders)</span></span>
                <input type="email" bind:value={email} class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500" />
            </label>
            <label class="w-full mb-3">
                <span class="block mb-1 text-sm">Remind me</span>
                <select bind:value={reminderMinutes} class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 dark:bg-gray-900">
                    {#each REMINDER_OPTIONS as opt}
                        <option value={opt.minutes}>{opt.label}</option>
                    {/each}
                </select>
                <span class="block mt-1 text-xs text-gray-400">(everyone also gets a reminder 24 hours before)</span>
            </label>
            <label class="w-full mb-5">
                <span class="block mb-1 text-sm">Anything you want to tell me beforehand? <span class="text-gray-400">(optional)</span></span>
                <textarea bind:value={note} rows="2" class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500 resize-y"></textarea>
            </label>

            <button
                onclick={book}
                disabled={booking}
                class="w-full py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
                {booking ? 'Booking...' : `Book ${localTime(slots.find((s) => s.time === selectedTime)?.start)} on ${days.find((d) => d.iso === selectedDate)?.label}`}
            </button>
        {/if}

        {#if error}
            <p class="mt-4 text-sm text-red-500">{error}</p>
        {/if}
    {/if}
</div>
