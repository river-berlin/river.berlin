<script>
    export let markdownHTML;
    import { onMount } from 'svelte';
    
    let headings = [];
    
    onMount(() => {
        // Use a timeout to ensure the DOM is fully rendered
        setTimeout(() => {
            // Get all headings from the article
            const articleHeadings = document.querySelectorAll('.prose h2, .prose h3');
            
            headings = Array.from(articleHeadings).map(heading => {
                // Create an id if it doesn't exist
                if (!heading.id) {
                    heading.id = heading.textContent.toLowerCase().replace(/\s+/g, '-');
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
    <h2 class="text-lg font-bold mb-4">Contents</h2>
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
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
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
        color: #5bcde9;
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s;
    }
    
    .toc-link:hover {
        color: #89e6ff;
        text-decoration: underline;
    }
</style>
