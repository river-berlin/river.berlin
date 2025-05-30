<script>
    import '../app.css'
    import Header from "$lib/header.svelte"
    import { onMount } from 'svelte';
    
    // This ensures dark mode class is applied to HTML element
    // during server-side rendering to prevent flash of light mode
    onMount(() => {
        // We don't need additional logic here as the header
        // component handles dark mode toggling and persistence
    });
</script>

<style>
    /* Global styles can be defined here */
</style>

<div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
    <Header />
    <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <slot />
    </main>
</div>
