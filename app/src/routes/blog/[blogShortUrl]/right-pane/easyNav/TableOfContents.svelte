<script lang="ts">
    // Using export const since this property is only for external reference and not used directly
    export const markdownHTML : string = "";
    import { onMount } from 'svelte';
    
    let headings : any[] = [];
    
    // Function to handle smooth scrolling
    function handleLinkClick(e: Event, id: string): void {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 20, // Adding a small offset for better visibility
                behavior: 'smooth'
            });
            // Update URL hash without jumping
            history.pushState(null, '', `#${id}`);
        }
    }
    
    onMount(() => {
        // Use a timeout to ensure the DOM is fully rendered
        setTimeout(() => {
            // Get all headings from the article
            const articleHeadings = document.querySelectorAll('.prose h1, .prose h2, .prose h3');
            
            headings = Array.from(articleHeadings).map(heading => {
                // Create an id if it doesn't exist
                if (!heading.id) {
                    heading.id = heading.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
                }

                console.log("found heading", heading, "level", parseInt(heading.tagName.substring(1)), heading.tagName)
                
                return {
                    id: heading.id,
                    title: heading.textContent || '',
                    level: parseInt(heading.tagName.substring(1)) // Get heading level (2 for h2, 3 for h3)
                };
            });
        }, 100);
    });
</script>

<div class="toc-container !mb-0 !pb-0">
    <h2 class="text-lg mb-4 text-gray-900 dark:text-gray-100">Contents</h2>
    <nav class="toc-nav">
        <ul class="toc-list">
            {#each headings as heading}
                <li class="toc-item" style="margin-left: {(heading.level - 1) * 16}px">
                    <a href="#{heading.id}" class="toc-link" on:click={(e) => handleLinkClick(e, heading.id)}>
                        {heading.title}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
</div>

<style>
    .toc-container {
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 2rem;
    }
    
    .toc-link {
        transition: color 0.2s ease;
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
