<script lang="ts">
    import '../app.css'
    import Header from "$lib/header.svelte"
    import { onMount } from 'svelte'
    import FireFlies from './fireflies'
    
    let fireflies: FireFlies;
    
    onMount(() => {
        // Initialize fireflies after a small delay to ensure DOM is ready
        setTimeout(() => {
            fireflies = new FireFlies('#fireflies-container', 5);
        }, 100);
        
        return () => {
            if (fireflies) {
                fireflies.destroy();
            }
        };
    });
</script>

<div class="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
    <div id="fireflies-container" class="fixed inset-0 pointer-events-none z-10"></div>
    <Header />
    <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <slot />
    </main>
</div>
