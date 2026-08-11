<script lang="ts">
    import '../app.css'
    import Header from "$lib/header.svelte"
    import { onMount } from 'svelte'
    import FireFlies from './fireflies'
    import { page } from '$app/stores'
    import BackgroundArtifacts from '$lib/BackgroundArtifacts.svelte'
    
    let fireflies: FireFlies | null = null;
    
    onMount(() => {
/*         // Only initialize fireflies on the about-me page or the feed page
        if ($page.url.pathname.startsWith('/about-me') || $page.url.pathname.startsWith('/feed')) {
            // Initialize fireflies after a small delay to ensure DOM is ready
            setTimeout(() => {
                fireflies = new FireFlies('#fireflies-container', 10);
            }, 100);
        } */
        
        return () => {
            if (fireflies) {
                // @ts-ignore
                fireflies.destroy();
            }
        };
    });
</script>

<div class="min-h-screen page-background text-gray-900 dark:text-white transition-colors duration-200 relative">
    <div class="absolute inset-0 pointer-events-none z-0">
        <BackgroundArtifacts />
    </div>
    <div id="fireflies-container" class="fixed inset-0 pointer-events-none z-10"></div>
    <!-- relative z-20 keeps all page content painting above the background canvas -->
    <div class="relative z-20">
        <Header />
        <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
            <slot />
        </main>
    </div>
</div>

