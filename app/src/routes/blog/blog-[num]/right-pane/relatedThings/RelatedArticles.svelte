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
    <p class="text-lg font-thin mb-4">Related</p>
    
    {#if relatedBlogs.length > 0}
        <div class="related-blogs">
            {#each relatedBlogs as blog}
                <!-- Force a full page reload for reliable navigation -->
                <a 
                    href="/blog/blog-{blog.num}" 
                    class="related-blog-link block w-full text-left"
                    data-sveltekit-reload
                >
                    <div class="related-blog">
                        <h3 class="text-md font-medium">{blog.metadata.title}</h3>
                        <p class="text-xs text-gray-400">{formatDate(blog.metadata.dated)}</p>
                    </div>
                </a>
            {/each}
        </div>
    {:else}
        <p class="text-sm text-gray-400">No related articles found.</p>
    {/if}
</div>

<style>
    .related-container {
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 0.5rem;
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .related-blogs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .related-blog {
        border-left: 2px solid #5bcde9;
        padding-left: 0.75rem;
        transition: all 0.2s;
    }
    
    .related-blog-link {
        text-decoration: none;
        color: inherit;
    }
    
    .related-blog-link:hover .related-blog {
        border-left-color: #89e6ff;
        background-color: rgba(255, 255, 255, 0.03);
        transform: translateX(2px);
    }
</style>
