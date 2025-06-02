<script lang="ts">
    import '../app.css'
    import Header from "$lib/header.svelte"
    import { onMount } from 'svelte';
    
    let cursorX = 0;
    let cursorY = 0;
    let cursorVisible = false;
    
    // Handle cursor movement
    function handleMouseMove(event: MouseEvent) {
        cursorX = event.clientX;
        cursorY = event.clientY;
        
        if (!cursorVisible) {
            cursorVisible = true;
        }
    }
    
    // Handle cursor leaving the window
    function handleMouseLeave() {
        cursorVisible = false;
    }
    
    onMount(() => {
        // Add event listeners for cursor effects
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        
        return () => {
            // Clean up event listeners
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    });
</script>

<style>
    /* Global styles can be defined here */
    .cursor-circle {
        position: fixed;
        pointer-events: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        background-color: rgba(255, 215, 0, 0.5);
        mix-blend-mode: multiply;
        transition: transform 0.15s ease-out, opacity 0.2s ease-in-out;
        transform: translate(-50%, -50%);
        z-index: 1000;
    }
    
    :global(.dark) .cursor-circle {
        background-color: rgba(255, 255, 0, 0.3);
        mix-blend-mode: screen;
    }
</style>

<div class="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
    <Header />
    <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <slot />
    </main>
    {#if cursorVisible}
        <div 
            class="cursor-circle" 
            style={`left: ${cursorX}px; top: ${cursorY}px; opacity: 1;`}
        ></div>
    {/if}
</div>
