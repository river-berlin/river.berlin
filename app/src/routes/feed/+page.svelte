<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    
    interface Metadata {
        title: string;
        dated: string | Date; // Can be either string or Date object
        shortPath?: string;
        url?: string;
    }
    
    interface ContentItem {
        num: number;
        metadata: Metadata;
    }
    
    interface PageData {
        blogs: ContentItem[];
        projects: ContentItem[];
        bookTakeaways: ContentItem[];
    }
    
    export let data: PageData;
    
    function formatDate(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Get day of week
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Get the rest of the date
        const restOfDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Combine with en dash
        return `${weekday} · ${restOfDate}`;
    }
    
    let activeFilter: 'all' | 'blogs' | 'projects' | 'books' = 'all';
    
    // Update filter and modify URL query string
    function setFilter(filter: 'all' | 'blogs' | 'projects' | 'books') {
        activeFilter = filter;
        
        // Update URL query parameter without refreshing the page
        const url = new URL(window.location.href);
        if (filter === 'all') {
            url.searchParams.delete('filter');
        } else {
            url.searchParams.set('filter', filter);
        }
        goto(url.toString(), { replaceState: true, keepFocus: true });
    }
    
    // Initialize filter from URL query parameter on mount
    onMount(() => {
        const urlFilter = $page.url.searchParams.get('filter');
        if (urlFilter && ['blogs', 'projects', 'books'].includes(urlFilter)) {
            activeFilter = urlFilter as 'blogs' | 'projects' | 'books';
        }
    });
</script>

<style>
  /* This keeps the curly separator styling using a custom background image */
  .curly-separator-bg {
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='12' viewBox='0 0 100 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,6 C12.5,0 12.5,12 25,6 C37.5,0 37.5,12 50,6 C62.5,0 62.5,12 75,6 C87.5,0 87.5,12 100,6' stroke='%23ddd' fill='none' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: repeat-x;
    background-size: 100px 12px;
  }
  
  /* Animation for the underline hover effect */
  @keyframes underline-color-change {
    100% {background-color: #89e6ff;}
  }
  
  .animate-underline:hover::before {
    animation: underline-color-change 1s linear forwards;
  }
</style>

<div class="flex flex-col items-center w-full mx-auto my-7">
    <div class="mb-4 font-['Sofia_Sans']">
        <div class="flex gap-3 justify-center">
            <div>
                <button 
                    class="text-gray-900 dark:text-gray-100 cursor-pointer bg-transparent border-0 p-0 font-inherit outline-none hover:underline hover:decoration-gray-200 dark:hover:decoration-gray-700 {activeFilter === 'all' ? 'underline decoration-gray-700 dark:decoration-gray-400' : ''}"
                    on:click={() => setFilter('all')}
                >
                    All
                </button>
            </div>
            <div class="text-gray-400 dark:text-gray-500">/</div>
            <div>
                <button 
                    class="text-gray-900 dark:text-gray-100 cursor-pointer bg-transparent border-0 p-0 font-inherit outline-none hover:underline hover:decoration-gray-200 dark:hover:decoration-gray-700 {activeFilter === 'blogs' ? 'underline decoration-gray-700 dark:decoration-gray-400' : ''}"
                    on:click={() => setFilter('blogs')}
                >
                    Blogs
                </button>
            </div>
            <div class="text-gray-400 dark:text-gray-500">/</div>
            <div>
                <button 
                    class="text-gray-900 dark:text-gray-100 cursor-pointer bg-transparent border-0 p-0 font-inherit outline-none hover:underline hover:decoration-gray-200 dark:hover:decoration-gray-700 {activeFilter === 'projects' ? 'underline decoration-gray-700 dark:decoration-gray-400' : ''}"
                    on:click={() => setFilter('projects')}
                >
                    Projects
                </button>
            </div>
            <div class="text-gray-400 dark:text-gray-500">/</div>
            <div>
                <button 
                    class="text-gray-900 dark:text-gray-100 cursor-pointer bg-transparent border-0 p-0 font-inherit outline-none hover:underline hover:decoration-gray-200 dark:hover:decoration-gray-700 {activeFilter === 'books' ? 'underline decoration-gray-700 dark:decoration-gray-400' : ''}"
                    on:click={() => setFilter('books')}
                >
                    Book Reviews
                </button>
            </div>
        </div>
    </div>
    
    <!-- First Separator -->
    <div class="h-3 w-full max-w-[600px] mx-auto mb-6 curly-separator-bg"></div>

    <!-- Blogs Section -->
    {#if activeFilter === 'all' || activeFilter === 'blogs'}
    <div class="flex flex-col w-full max-w-[600px] mx-auto">
        {#each data.blogs as blog }
            <div class="relative mb-4 w-full">
                <a href="/blog/{blog.metadata.url}" class="relative flex flex-col sm:flex-row p-1.5 mb-5 no-underline text-gray-900 dark:text-gray-100 group animate-underline">
                    <div class="flex items-center mb-1 sm:mb-0">
                        <img src="/scroll.svg" alt="" width="15" class="mr-3 transition-all duration-2000 group-hover:hue-rotate-[151deg]">
                        <span class="font-medium text-primary-700 dark:text-primary-400">Blog #{blog.num}</span>
                        <span class="mx-1 sm:inline">:</span>
                    </div>
                    <div class="pl-0 sm:pl-3">{blog.metadata.title}</div>
                    <span class="absolute bottom-0 left-0 sm:left-10 w-full sm:w-[calc(100%-2.5rem)] h-0.5 bg-amber-100 dark:bg-amber-900/50 group-hover:bg-sky-300 dark:group-hover:bg-sky-700 transition-colors duration-1000"></span>
                </a>
                <p class="absolute left-0 sm:left-10 bottom-0 text-xs text-gray-500 dark:text-gray-400">{formatDate(blog.metadata.dated)}</p>
            </div>
        {/each}
    </div>
    {/if}

    <!-- Middle Separator (conditional) -->
    {#if (activeFilter === 'all' && data.blogs.length > 0 && (data.projects.length > 0 || data.bookTakeaways.length > 0))}
    <div class="h-3 w-full max-w-[600px] mx-auto mb-6 curly-separator-bg"></div>
    {/if}

    <!-- Projects Section -->
    {#if activeFilter === 'all' || activeFilter === 'projects'}
    <div class="flex flex-col w-full max-w-[600px] mx-auto">
        {#each data.projects as project}  
            <div class="relative mb-9 w-full">  
                <a href="/projects/{project.metadata.shortPath}" class="relative flex flex-col sm:flex-row p-1.5 mb-5 no-underline text-gray-900 dark:text-gray-100 group animate-underline">
                    <div class="flex items-center mb-1 sm:mb-0">
                        <div class="flex mr-3">
                            <img src="/fruits/orange.svg" alt="" width="15" class="transition-all duration-2000 group-hover:hue-rotate-[151deg]">
                            <img src="/fruits/watermelon.svg" alt="" width="15" class="ml-2 transition-all duration-2000 group-hover:hue-rotate-[151deg]">
                        </div>
                        <span class="font-medium text-primary-700 dark:text-primary-400">Project #{project.num}</span>
                        <span class="mx-1 sm:inline">:</span>
                    </div>
                    <div class="pl-0 sm:pl-3">{project.metadata.title}</div>
                    <span class="absolute bottom-0 left-0 sm:left-[3.8rem] w-full sm:w-[calc(100%-3.8rem)] h-0.5 bg-amber-100 dark:bg-amber-900/50 group-hover:bg-sky-300 dark:group-hover:bg-sky-700 transition-colors duration-1000"></span>
                </a>
                <p class="absolute left-0 sm:left-[3.8rem] bottom-[-20px] text-xs text-gray-500 dark:text-gray-400">{formatDate(project.metadata.dated)}</p>
            </div>
        {/each}
    </div>
    {/if}

    <!-- Another Conditional Separator -->
    {#if (activeFilter === 'all' && data.projects.length > 0 && data.bookTakeaways.length > 0)}
    <div class="h-3 w-full max-w-[600px] mx-auto mb-6 curly-separator-bg"></div>
    {/if}

    <!-- Book Reviews Section -->
    {#if activeFilter === 'all' || activeFilter === 'books'}
    <div class="flex flex-col w-full max-w-[600px] mx-auto">
        {#each data.bookTakeaways as book }
            <div class="relative mb-4 w-full">
                <a href="/book-reviews/book-{book.num}" class="relative flex flex-col sm:flex-row p-1.5 mb-5 no-underline text-gray-900 dark:text-gray-100 group animate-underline">
                    <div class="flex items-center mb-1 sm:mb-0">
                        <img src="/scroll.svg" alt="" width="15" class="mr-3 transition-all duration-2000 group-hover:hue-rotate-[151deg]">
                        <span class="font-medium text-primary-700 dark:text-primary-400">Book take away #{book.num}</span>
                        <span class="mx-1 sm:inline">:</span>
                    </div>
                    <div class="pl-0 sm:pl-3">{book.metadata.title}</div>
                    <span class="absolute bottom-0 left-0 sm:left-10 w-full sm:w-[calc(100%-2.5rem)] h-0.5 bg-amber-100 dark:bg-amber-900/50 group-hover:bg-sky-300 dark:group-hover:bg-sky-700 transition-colors duration-1000"></span>
                </a>
                <p class="absolute left-0 sm:left-10 bottom-0 text-xs text-gray-500 dark:text-gray-400">{formatDate(book.metadata.dated)}</p>
            </div>
        {/each}
    </div>
    {/if}

    <!-- Final Separator and Appreciation Message -->
    <div class="h-3 w-full max-w-[600px] mx-auto mb-12 curly-separator-bg dark:opacity-50"></div>
    <p class="mb-1 text-gray-800 dark:text-gray-200">xoxo/appreciate you 🙂</p>
</div>