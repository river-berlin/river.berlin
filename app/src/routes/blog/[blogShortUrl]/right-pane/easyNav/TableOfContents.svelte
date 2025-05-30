<script lang="ts">
    // Using export const since this property is only for external reference and not used directly
    export const markdownHTML : string = "";
    import { onMount } from 'svelte';
    
    let headings : any[] = [];
    
    onMount(() => {
        // Use a timeout to ensure the DOM is fully rendered
        setTimeout(() => {
            // Get all headings from the article
            const articleHeadings = document.querySelectorAll('.prose h2, .prose h3');
            
            headings = Array.from(articleHeadings).map(heading => {
                // Create an id if it doesn't exist
                if (!heading.id) {
                    heading.id = heading.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
                }
                
                return {
                    id: heading.id,
                    title: heading.textContent,
                    level: parseInt(heading.tagName.substring(1)) // Get heading level (2 for h2, 3 for h3)
                };
            });
        }, 100);
    });
</script>

<div class="toc-container !mb-0 !pb-0">
    <h2 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Contents</h2>
    <nav class="toc-nav">
        <ul class="toc-list">
            {#each headings as heading}
                <li class="toc-item" style="margin-left: {(heading.level - 2) * 16}px">
                    <a href="#{heading.id}" class="toc-link">
                        {heading.title}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
</div>

<style>
    .toc-container {
        background-color: rgba(240, 240, 240, 0.1);
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 2rem;
        border: 1px solid rgba(200, 200, 200, 0.1);
    }
    
    :global(.dark) .toc-container {
        background-color: rgba(30, 30, 30, 0.1);
        border: 1px solid rgba(70, 70, 70, 0.2);
    }
    
    .toc-list {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }
    
    .toc-item {
        margin-bottom: 0.5rem;
    }
    
    .toc-link {
        color: #4896b0;
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s;
    }
    
    :global(.dark) .toc-link {
        color: #5bcde9;
    }
    
    .toc-link:hover {
        color: #366d80;
        text-decoration: underline;
    }
    
    :global(.dark) .toc-link:hover {
        color: #89e6ff;
        text-decoration: underline;
    }
</style>
