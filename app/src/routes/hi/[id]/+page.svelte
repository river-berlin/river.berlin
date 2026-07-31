<script>
    import { page } from '$app/stores';

    const WORKER_URL = 'https://hi-cards.theadityashankar.workers.dev';

    async function fetchCard(id) {
        const res = await fetch(`${WORKER_URL}/card/${id}`);
        if (!res.ok) throw new Error('not found');
        return res.json();
    }
</script>

<svelte:head>
    <title>hello there!</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center text-gray-900 dark:text-gray-100">
    {#await fetchCard($page.params.id)}
        <h1 class="text-3xl font-medium mb-3">hello there 👋</h1>
        <p class="text-gray-500 dark:text-gray-400">one moment...</p>
    {:then card}
        <h1 class="text-3xl font-medium mb-3">Hi {card.name} 👋</h1>
        <p class="text-gray-600 dark:text-gray-300 mb-8">Nice to meet you! I'm River — this is my corner of the internet.</p>
        <div class="flex flex-col gap-3">
            <a href="/feed" class="underline decoration-sky-400 hover:decoration-sky-600">check out my blog here</a>
            <a href="/about-me" class="underline decoration-sky-400 hover:decoration-sky-600">more about me</a>
        </div>
    {:catch}
        <h1 class="text-3xl font-medium mb-3">hello there 👋</h1>
        <p class="text-gray-600 dark:text-gray-300 mb-8">Nice to meet you! I'm River — this is my corner of the internet.</p>
        <div class="flex flex-col gap-3">
            <a href="/feed" class="underline decoration-sky-400 hover:decoration-sky-600">check out my blog here</a>
            <a href="/about-me" class="underline decoration-sky-400 hover:decoration-sky-600">more about me</a>
        </div>
    {/await}
</div>
