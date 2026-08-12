<script lang="ts">
    const WORKER_URL = 'https://subscribe.theadityashankar.workers.dev';

    let email = '';
    let blogPosts = true;
    let events = true;
    let misc = true;
    let honeypot = '';

    let status: 'idle' | 'submitting' | 'success' | 'error' = 'idle';
    let errorMessage = '';

    async function handleSubmit() {
        if (!email) {
            status = 'error';
            errorMessage = 'Please enter an email address';
            return;
        }

        if (!blogPosts && !events && !misc) {
            status = 'error';
            errorMessage = 'Pick at least one thing to subscribe to';
            return;
        }

        status = 'submitting';
        errorMessage = '';

        try {
            const res = await fetch(`${WORKER_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, blogPosts, events, misc, honeypot })
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
    <title>Subscribe - River's webstuff</title>
    <meta name="description" content="Subscribe to new blog posts, Berlin events, and other updates from River" />
</svelte:head>

<div class="flex flex-col items-center w-full max-w-[500px] mx-auto my-10 px-4">
    <h1 class="text-3xl font-['Reenie_Beanie'] text-primary-700 dark:text-primary-400 mb-2">Subscribe</h1>

    {#if status === 'success'}
        <div class="w-full text-center py-10">
            <p class="text-lg text-gray-900 dark:text-gray-100 mb-2">You're in! 🎉</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Thanks for subscribing, I'll keep you posted.</p>
        </div>
    {:else}
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
            Get an email whenever I post something new. Pick whatever's relevant to you.
        </p>

        <form class="w-full flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
            <div class="flex flex-col items-center gap-3 mx-auto">
                <label class="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                    <input type="checkbox" bind:checked={blogPosts} class="h-4 w-4 rounded accent-sky-600" />
                    New blog posts
                </label>
                <label class="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                    <input type="checkbox" bind:checked={events} class="h-4 w-4 rounded accent-sky-600" />
                    New events I organize in Berlin
                </label>
                <label class="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                    <input type="checkbox" bind:checked={misc} class="h-4 w-4 rounded accent-sky-600" />
                    Other miscellaneous stuff
                </label>
            </div>

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
                class="w-full py-3 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
                {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
            </button>
        </form>
    {/if}

    <a href="/unsubscribe" class="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-6">
        Already subscribed and want out? Unsubscribe here
    </a>
</div>
