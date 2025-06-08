<script lang="ts">
    import image from "$lib/images/meditating-enby.svg"
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { faBluesky, faDiscord } from '@fortawesome/free-brands-svg-icons';
    import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

    /**
     * checks if we're accessing something in the feed page
     */
    function checkFeed(page: any){
        const pathName = page.url.pathname
        return pathName.startsWith("/feed/")||pathName.startsWith("/projects/")||pathName.startsWith("/book-reviews/")||pathName.startsWith("/blog/")
    }
    
    let isDarkMode = false;
    
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }
    
    // Initialize dark mode based on localStorage or system preference
    onMount(() => {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            isDarkMode = true;
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'false') {
            isDarkMode = false;
            document.documentElement.classList.remove('dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            if (prefersDark.matches) {
                isDarkMode = true;
                document.documentElement.classList.add('dark');
            }
            
            // Listen for system preference changes
            prefersDark.addEventListener('change', (e) => {
                if (localStorage.getItem('darkMode') !== null) return; // User has manual preference
                if (e.matches) {
                    isDarkMode = true;
                    document.documentElement.classList.add('dark');
                } else {
                    isDarkMode = false;
                    document.documentElement.classList.remove('dark');
                }
            });
        }
    });
</script>

<style lang="postcss">
    .header-link {
        @apply text-gray-900 dark:text-white no-underline font-['Sofia_Sans'];
    }

    .page:hover{
        @apply underline decoration-gray-300 dark:decoration-gray-600;
    }

    .highlighted{
        @apply underline decoration-gray-700 dark:decoration-gray-300;
    }
    
    /* Dark mode button styles */
    .theme-toggle {
        @apply p-2 rounded-full hover:bg-primary-100 dark:hover:bg-gray-900 transition-colors;
    }
</style>

<div class="w-full flex justify-center px-6 pt-8 mb-8  transition-colors duration-200">
    <div class="flex flex-col md:flex-row justify-between items-center w-full max-w-[700px] gap-4">
        <div class="flex items-center">
            <img src="{image}" alt="a meditating non-binary person" height="80" class="h-20">
            <div class="flex flex-col ml-5">
                <a class="header-link" href="/">
                    <h1 class="text-4xl font-['Reenie_Beanie'] text-primary-700 dark:text-primary-400">River's webstuff</h1>
                </a>
                <div class="flex flex-row gap-1 mt-0.5 justify-start">
                    <a 
                        href="https://bsky.app/profile/riverofberlin.bsky.social" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="flex items-center gap-1 text-xs text-gray-700 transition-colors"
                        aria-label="Visit my Bluesky profile"
                    >
                        <div class="rounded-full p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center h-5 p-0.5">
                            <FontAwesomeIcon icon={faBluesky} class="h-2.5 w-2.5 text-primary-600" />
                            <span class="font-['Sofia_Sans'] ml-1">Bluesky</span>
                        </div>
                    </a>
                    
                    <a 
                        href="https://discord.gg/Zh2h2UB7AZ" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        aria-label="Join my Discord server"
                    >
                        <div class="rounded-full p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center h-5 p-0.5">
                            <FontAwesomeIcon icon={faDiscord} class="h-2.5 w-2.5 text-primary-600" />
                            <span class="font-['Sofia_Sans'] ml-1">Discord</span>
                        </div>
                    </a>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <div class="font-['Sofia_Sans']">
                <div class="flex gap-3">
                    <div class="page">
                        <a href="/about-me" class="text-gray-800 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" class:highlighted={$page.url.pathname.startsWith("/about-me/")}>About me</a>
                    </div>
                    <div class="text-gray-400 dark:text-gray-500">/</div>
                    <div class="page">
                        <a href="/feed" class="text-gray-800 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" class:highlighted={checkFeed($page)}>Feed</a>
                    </div>
                </div>
            </div>
            
            <button 
                aria-label="Toggle dark mode" 
                class="theme-toggle bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full aspect-square flex items-center justify-center" 
                on:click={toggleDarkMode}
            >
                {#if isDarkMode}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                {/if}
            </button>
            

        </div>
    </div>
</div>
