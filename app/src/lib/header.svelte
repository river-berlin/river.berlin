<script lang="ts">
    import image from "$lib/images/meditating-enby.svg"
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
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
    let dropdownOpen = false;
    let themeMode: 'light' | 'dark' | 'system' = 'system';

    function toggleDropdown() {
        dropdownOpen = !dropdownOpen;
    }

    function closeDropdown() {
        dropdownOpen = false;
    }

    function setTheme(mode: 'light' | 'dark' | 'system') {
        if (mode === 'dark') {
            isDarkMode = true;
            themeMode = 'dark';
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else if (mode === 'light') {
            isDarkMode = false;
            themeMode = 'light';
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        } else if (mode === 'system') {
            // Use system preference
            localStorage.removeItem('darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            isDarkMode = prefersDark.matches;
            themeMode = 'system';
            if (prefersDark.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        
        // Close dropdown after selection
        dropdownOpen = false;
    }
    
    // Initialize theme based on localStorage or system preference
    onMount(() => {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            isDarkMode = true;
            themeMode = 'dark';
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'false') {
            isDarkMode = false;
            themeMode = 'light';
            document.documentElement.classList.remove('dark');
        } else {
            // Use system preference
            themeMode = 'system';
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            if (prefersDark.matches) {
                isDarkMode = true;
                document.documentElement.classList.add('dark');
            }
            
            // Listen for system preference changes
            prefersDark.addEventListener('change', (e) => {
                if (themeMode !== 'system') return; // User has manual preference
                if (e.matches) {
                    isDarkMode = true;
                    document.documentElement.classList.add('dark');
                } else {
                    isDarkMode = false;
                    document.documentElement.classList.remove('dark');
                }
            });
        }
        
        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (dropdownOpen && !target.closest('.theme-dropdown')) {
                closeDropdown();
            }
        }
        
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
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
    
    .curly-line {
        @apply w-full h-full;
    }
    
    .curly-path {
        stroke-width: 1.5px;
        fill: none;
        @apply stroke-primary-600 dark:stroke-yellow-400;
    }

    .theme-dropdown {
        @apply relative;
    }

    .dropdown-menu {
        @apply absolute right-0 mt-2 py-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50;
    }

    .dropdown-item {
        @apply flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer w-full text-left bg-transparent border-0;
    }

    .dropdown-item.active {
        @apply bg-gray-100 dark:bg-gray-700;
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
            
            <div class="theme-dropdown">
                <button 
                    aria-label="Toggle theme options" 
                    class="p-2 rounded-full hover:bg-primary-100 dark:hover:bg-gray-900 transition-colors relative text-gray-800 dark:text-gray-200 rounded-full aspect-square flex items-center justify-center" 
                    on:click={toggleDropdown}
                >
                    {#if isDarkMode}
                        <!-- Moon icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    {:else}
                        <!-- Sun icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
                        </svg>
                    {/if}
                    {#if themeMode === 'system'}
                    <span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-2 flex items-center justify-center;">
                        <svg class="curly-line" viewBox="0 0 24 4" xmlns="http://www.w3.org/2000/svg">
                            <path class="curly-path" d="M0,2 C4,-0.5 8,4.5 12,2 C16,-0.5 20,4.5 24,2" />
                        </svg>
                    </span>
                    {/if}
                </button>
    
                {#if dropdownOpen}
                <div class="dropdown-menu" transition:fade={{ duration: 150 }}>
                    <!-- Light theme option -->
                    <button 
                        class="dropdown-item {themeMode === 'light' ? 'active' : ''}" 
                        on:click={() => setTheme('light')}
                        on:keydown={(e) => e.key === 'Enter' && setTheme('light')}
                        role="menuitem"
                        tabindex="0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
                        </svg>
                        Light
                    </button>
                    
                    <!-- Dark theme option -->
                    <button 
                        class="dropdown-item {themeMode === 'dark' ? 'active' : ''}" 
                        on:click={() => setTheme('dark')}
                        on:keydown={(e) => e.key === 'Enter' && setTheme('dark')}
                        role="menuitem"
                        tabindex="0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                        Dark
                    </button>
                    
                    <!-- System theme option -->
                    <button 
                        class="dropdown-item {themeMode === 'system' ? 'active' : ''}" 
                        on:click={() => setTheme('system')}
                        on:keydown={(e) => e.key === 'Enter' && setTheme('system')}
                        role="menuitem"
                        tabindex="0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd" />
                        </svg>
                        System
                    </button>
                </div>
                {/if}
            </div>
            

        </div>
    </div>
</div>
