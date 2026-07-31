<script>
    import { page } from '$app/stores';
    import { faBluesky, faLinkedin, faWhatsapp, faSignalMessenger } from '@fortawesome/free-brands-svg-icons';
    import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
    import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

    const WORKER_URL = 'https://hi-cards.theadityashankar.workers.dev';

    const CONTACTS = [
        { label: 'Email me', href: 'mailto:me@river.berlin', icon: faEnvelope },
        { label: 'Connect on Bluesky', href: 'https://bsky.app/profile/riverofberlin.bsky.social', icon: faBluesky },
        { label: 'Connect on LinkedIn', href: 'https://www.linkedin.com/in/aditya-shankar-338641252/', icon: faLinkedin }
    ];

    async function fetchCard(id) {
        const res = await fetch(`${WORKER_URL}/card/${id}`);
        if (!res.ok) throw new Error('not found');
        return res.json();
    }
</script>

<svelte:head>
    <title>hello there!</title>
    <!-- these pages are personal bearer-URLs, keep them out of search engines -->
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#snippet links(card)}
    <div class="flex flex-col gap-3 mb-10">
        <a href="/feed" class="underline decoration-sky-400 hover:decoration-sky-600">check out my blog here</a>
        <a href="/about-me" class="underline decoration-sky-400 hover:decoration-sky-600">more about me</a>
    </div>

    <div class="flex flex-col gap-2.5 w-full max-w-xs">
        {#if card?.contact?.whatsapp}
            <a
                href={card.contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors no-underline text-gray-900 dark:text-gray-100"
            >
                <FontAwesomeIcon icon={faWhatsapp} class="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span class="text-sm">Add me on WhatsApp</span>
            </a>
        {/if}
        {#if card?.contact?.signal}
            <a
                href={card.contact.signal}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors no-underline text-gray-900 dark:text-gray-100"
            >
                <FontAwesomeIcon icon={faSignalMessenger} class="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span class="text-sm">Message me on Signal</span>
            </a>
        {/if}
        {#each CONTACTS as contact}
            <a
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors no-underline text-gray-900 dark:text-gray-100"
            >
                <FontAwesomeIcon icon={contact.icon} class="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span class="text-sm">{contact.label}</span>
            </a>
        {/each}
    </div>
{/snippet}

<div class="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10 text-center text-gray-900 dark:text-gray-100">
    {#await fetchCard($page.params.id)}
        <h1 class="text-3xl font-medium mb-3">hello there 👋</h1>
        <p class="text-gray-500 dark:text-gray-400">one moment...</p>
    {:then card}
        <h1 class="text-3xl font-medium mb-3">Hi {card.name} 👋</h1>
        {#if card.message}
            <p class="text-gray-700 dark:text-gray-200 mb-3 max-w-md italic">"{card.message}"</p>
        {/if}
        <p class="text-gray-600 dark:text-gray-300 mb-8">Nice to meet you! I'm River — this is my corner of the internet.</p>
        {@render links(card)}
    {:catch}
        <h1 class="text-3xl font-medium mb-3">hello there 👋</h1>
        <p class="text-gray-600 dark:text-gray-300 mb-8">Nice to meet you! I'm River — this is my corner of the internet.</p>
        {@render links(null)}
    {/await}
</div>
