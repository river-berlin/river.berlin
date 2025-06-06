<script lang="ts">    
    interface BlogMetadata {
        title: string;
        dated: string | Date;
        shortPath?: string;
        // Add other metadata properties as needed
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
                    <div class="related-blog">
                        <h3 class="text-md font-medium text-gray-900 dark:text-gray-100">{blog.metadata.title}</h3>
                        <p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(blog.metadata.dated)}</p>
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
        background-color: rgba(240, 240, 240, 0.1);
        border-radius: 0.5rem;
        padding: 1rem;
        border: 1px solid rgba(200, 200, 200, 0.1);
    }
    
    :global(.dark) .related-container {
        background-color: rgba(30, 30, 30, 0.1);
        border: 1px solid rgba(70, 70, 70, 0.2);
    }
    
    .related-blogs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .related-blog {
        border-left: 2px solid #4896b0;
        padding-left: 0.75rem;
        transition: all 0.2s;
    }
    
    :global(.dark) .related-blog {
        border-left: 2px solid #5bcde9;
    }
    
    .related-blog-link {
        text-decoration: none;
        color: inherit;
    }
    
    .related-blog-link:hover .related-blog {
        border-left-color: #366d80;
        background-color: rgba(0, 0, 0, 0.03);
        transform: translateX(2px);
    }
    
    :global(.dark) .related-blog-link:hover .related-blog {
        border-left-color: #89e6ff;
        background-color: rgba(255, 255, 255, 0.03);
    }
</style>
