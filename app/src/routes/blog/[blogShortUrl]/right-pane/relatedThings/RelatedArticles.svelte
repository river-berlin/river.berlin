<script lang="ts">    
    interface BlogMetadata {
        title: string;
        dated: string | Date;
        shortPath?: string;
        icon_v2?: boolean;
        url?: string;
    }
    
    interface BlogItem {
        num: string;
        metadata: BlogMetadata;
    }
    
    export let currentBlogNum: string;
    export let allBlogs: BlogItem[] = [];
    
    // Calculate related blogs (excluding current)
    $: relatedBlogs = allBlogs
        .filter(blog => blog.num !== currentBlogNum)
        .filter(blog => !blog.metadata.hidden) // don't show hidden blogs
        .sort((a, b) => {
            // Sort by date, newest first
            const dateA = new Date(a.metadata.dated);
            const dateB = new Date(b.metadata.dated);
            return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5); // Show at most 5 related blogs
    
    function formatDate(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const restOfDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        return `${weekday} · ${restOfDate}`;
    }
</script>

<div class="related-container">
    <p class="text-lg font-thin mb-4 text-gray-900 dark:text-gray-100">Related</p>
    
    {#if relatedBlogs.length > 0}
        <div class="related-blogs">
            {#each relatedBlogs as blog}
                <!-- Force a full page reload for reliable navigation -->
                <a 
                    href="/blog/{blog.metadata.url}" 
                    class="related-blog-link block w-full text-left"
                    data-sveltekit-reload
                >
                    <div class="related-blog flex flex-col">
                        {#if blog.metadata.icon_v2}
                            <div class="min-w-[100px] mr-3 mb-2">
                                <img src="/blog/blog-{blog.num}/icon.jpg" alt="" class="rounded-lg w-[100px] h-[100px] object-cover">
                            </div>
                        {/if}
                        <div class="flex flex-col">
                            <h3 class="text-md font-medium text-gray-900 dark:text-gray-100">{blog.metadata.title}</h3>
                            <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(blog.metadata.dated)}</p>
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {:else}
        <p class="text-sm text-gray-400 dark:text-gray-500">No related articles found.</p>
    {/if}
</div>

<style>
    .related-container {
        padding: 1rem;
    }
    
    .related-blogs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .related-blog {
        transition: all 0.5s;
        margin-bottom: 1rem;
    }
    
    .related-blog-link {
        text-decoration: none;
        color: inherit;
    }
    
    .related-blog-link:hover .related-blog {
        border-left-color: #000000;
        border-left-width: 1px;
        padding-left: 1rem;
        transform: translateX(2px);
    }
    
    :global(.dark) .related-blog-link:hover .related-blog {
        border-left-color: #ffffff;
    }
</style>
