<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    
    interface Metadata {
        title: string;
        dated: string | Date; // Can be either string or Date object
        shortPath?: string;
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
        return `${weekday} – ${restOfDate}`;
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
.filter-nav {
    margin-bottom: 16px;
}

.curly-separator {
    height: 12px;
    width: 100%;
    max-width: 600px;
    margin: 0 auto 24px;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='12' viewBox='0 0 100 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,6 C12.5,0 12.5,12 25,6 C37.5,0 37.5,12 50,6 C62.5,0 62.5,12 75,6 C87.5,0 87.5,12 100,6' stroke='%23ddd' fill='none' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: repeat-x;
    background-size: 100px 12px;
}

.curly-separator.final{
    margin-bottom: 50px;
}

/* These styles should match header.svelte styles */
.filter-link {
    color: black;
    text-decoration: none;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    outline: none;
}

.filter-link:hover {
    text-decoration: underline;
    text-decoration-color: gainsboro;
}

.highlighted {
    text-decoration: underline !important;
    text-decoration-color: rgb(68, 68, 68) !important;
}

.stuff.book-review{
    display: flex;
    flex-direction: column;
}

.stuff .blog-or-book-container{
    position: relative;
    margin-bottom: 15px;

}

.stuff .blog-or-book-container .dated{
    position: absolute;
    left: 40px;
    bottom: 0;
    font-size: 12px;
}

.stuff .project-container{
    position: relative;
    margin-bottom: 35px;
}

.stuff .project-container .dated{
    position: absolute;
    left: 61px;
    bottom: -20px;
    font-size: 12px;
}

.stuff a{
    position: relative;
    display: flex;
    padding: 5px;
    background-size: 20px 20px;
    margin-bottom: 20px;
    text-decoration: none;
    color: black;
}

.stuff a img{
    margin-right: 20px;
    transition: 2s filter;
}

.stuff a .fruits{
    margin-right: 20px;
}

.stuff a .fruits img{
    margin-right: 0;
}

.stuff a:hover img{
    filter: hue-rotate(151deg);
}

.stuff a .take-away{
    font-weight: 500;
    color: #375883;
}

@keyframes underline-color-change {
    0% {background-color: rgb(240, 227, 212);}
    50% {background-color: rgb(230, 182, 26);}
    100% {background-color: rgb(91, 205, 233);}
}

.stuff a::before{
    content: "";
    background: rgb(240, 227, 212);
    position: absolute;
    bottom: 0;
    left: 40px;
    width: calc(100% - 40px);
    height: 2px;
}

.stuff.project{
    margin-bottom: 20px;
}

.stuff.project a::before, .stuff.project a::after{
    left: 61px;
    width: calc(100% - 61px);
}

.stuff a:hover::before{
    animation: underline-color-change 1s linear;
    animation-fill-mode: forwards;
}

.content{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    margin: 30px auto;
}

.appreciation{
    margin-bottom: 5px;
}

</style>

<div class="content">
    <div class="filter-nav font-['Sofia_Sans']">
        <div class="flex gap-3 justify-center">
            <div class="page">
                <button class="filter-link {activeFilter === 'all' ? 'highlighted' : ''}" on:click={() => setFilter('all')}>All</button>
            </div>
            <div class="text-gray-400">/</div>
            <div class="page">
                <button class="filter-link {activeFilter === 'blogs' ? 'highlighted' : ''}" on:click={() => setFilter('blogs')}>Blogs</button>
            </div>
            <div class="text-gray-400">/</div>
            <div class="page">
                <button class="filter-link {activeFilter === 'projects' ? 'highlighted' : ''}" on:click={() => setFilter('projects')}>Projects</button>
            </div>
            <div class="text-gray-400">/</div>
            <div class="page">
                <button class="filter-link {activeFilter === 'books' ? 'highlighted' : ''}" on:click={() => setFilter('books')}>Book Reviews</button>
            </div>
        </div>
    </div>
    
    <div class="curly-separator"></div>

    {#if activeFilter === 'all' || activeFilter === 'blogs'}
    <div class="stuff book-review">
        {#each data.blogs as blog }
            <div class="blog-or-book-container">
                <a href="/blog/blog-{blog.num}">
                    <img src="/scroll.svg" alt="" width="15">
                    <span class="take-away">Blog #{blog.num}</span> : {blog.metadata.title}
                </a>
                <p class="dated">{formatDate(blog.metadata.dated)}</p>
            </div>
        {/each}
    </div>
    {/if}

    {#if (activeFilter === 'all' && data.blogs.length > 0 && (data.projects.length > 0 || data.bookTakeaways.length > 0))}
    <div class="curly-separator"></div>
    {/if}

    {#if activeFilter === 'all' || activeFilter === 'projects'}
    <div class="stuff project">
        {#each data.projects as project}  
            <div class="project-container">  
                <a href="/projects/{project.metadata.shortPath}">
                    <div class="fruits flex">
                        <img src="/fruits/orange.svg" alt="" width="15">
                        <img src="/fruits/watermelon.svg" alt="" width="15" class="ml-2">
                    </div>
                    <span class="take-away">Project #{project.num}</span> : {project.metadata.title}
                </a>
                <p class="dated">{formatDate(project.metadata.dated)}</p>
            </div>
        {/each}
    </div>
    {/if}

    {#if (activeFilter === 'all' && data.projects.length > 0 && data.bookTakeaways.length > 0)}
    <div class="curly-separator"></div>
    {/if}

    {#if activeFilter === 'all' || activeFilter === 'books'}
    <div class="stuff book-review">
        {#each data.bookTakeaways as book }
            <div class="blog-or-book-container">
                <a href="/book-reviews/book-{book.num}">
                    <img src="/scroll.svg" alt="" width="15">
                    <span class="take-away">Book take away #{book.num}</span> : {book.metadata.title}
                </a>
                <p class="dated">{formatDate(book.metadata.dated)}</p>
            </div>
        {/each}
    </div>
    {/if}

    <div class="final curly-separator"></div>
    <p class="appreciation">xoxo/appreciate you 🙂</p>
</div>