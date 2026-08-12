<script lang="ts">
    import { page } from '$app/stores';

    const WORKER_URL = 'https://subscribe.theadityashankar.workers.dev';

    let email = $page.url.searchParams.get('email') || '';
    let honeypot = '';

    let status: 'idle' | 'submitting' | 'success' | 'error' = 'idle';
    let errorMessage = '';

    async function handleSubmit() {
        if (!email) {
            status = 'error';
            errorMessage = 'Please enter an email address';
            return;
        }

        status = 'submitting';
        errorMessage = '';

        try {
            const res = await fetch(`${WORKER_URL}/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, honeypot })
            });

            const data = await res.json();

            if (!res.ok) {
                status = 'error';
                errorMessage = data.error || 'Something went wrong, please try again';
                return;
            }

            status = 'success';
        } catch (e) {
            status = 'error';
            errorMessage = 'Something went wrong, please try again';
        }
    }
</script>

<svelte:head>
    <title>Unsubscribe - River's webstuff</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-col items-center w-full max-w-[500px] mx-auto my-10 px-4">
    <h1 class="text-3xl font-['Reenie_Beanie'] text-primary-700 dark:text-primary-400 mb-2">Unsubscribe</h1>

    {#if status === 'success'}
        <div class="w-full text-center py-10">
            <p class="text-lg text-gray-900 dark:text-gray-100 mb-2">You're unsubscribed 👋</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">You won't get any more emails from that address. Sorry to see you go.</p>
        </div>
    {:else}
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
            Enter the email address you subscribed with, and I'll take it off the list.
        </p>

        <form class="w-full flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
            <div>
                <label for="email" class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    placeholder="you@example.com"
                    required
                    class="w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent outline-none focus:border-sky-500"
                />
            </div>

            <!-- honeypot field, hidden from real users -->
            <input
                type="text"
                bind:value={honeypot}
                tabindex="-1"
                autocomplete="off"
                class="absolute opacity-0 pointer-events-none -z-10"
                aria-hidden="true"
            />

            {#if status === 'error'}
                <p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            {/if}

            <button
                type="submit"
                disabled={status === 'submitting'}
                class="w-full py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
                {status === 'submitting' ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>
        </form>
    {/if}
</div>
