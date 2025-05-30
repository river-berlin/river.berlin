<script>
    export let markdownHTML;
    export let blogNum;
    export let metadata;
    export let icon;
</script>

<div class="markdown-container">
    <div class="stuff book-review flex flex-col">
        <a href="/blog/{metadata.url}" class="relative p-1.5 mb-5 no-underline text-gray-900 dark:text-gray-100 group">
            <div class="flex flex-col">
                <span class="take-away font-medium text-primary-700 dark:text-primary-400">Blog #{blogNum}</span>
                <span class="font-medium mt-1">{metadata.title}</span>
            </div>
            <div class="absolute bottom-0 left-0 w-[calc(100%-40px)] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
        </a>
    </div>
    
    <div class="flex justify-center w-full">
        <img src="{icon}" alt="" width="200" class="my-5" >
    </div>

    <div class="prose prose-lg dark:prose-invert max-w-none code-highlight-wrapper">
        {@html markdownHTML}
    </div>
    
    <div class="curly-separator mt-8 mb-5 dark:opacity-50"></div>
    <p class="text-sm text-center mb-5 text-gray-800 dark:text-gray-200">xoxo - appreciate you</p>
</div>

<style>
    .curly-separator {
        height: 12px;
        width: 100%;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        background-image: url("data:image/svg+xml,%3Csvg width='100' height='12' viewBox='0 0 100 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,6 C12.5,0 12.5,12 25,6 C37.5,0 37.5,12 50,6 C62.5,0 62.5,12 75,6 C87.5,0 87.5,12 100,6' stroke='%23ddd' fill='none' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: repeat-x;
        background-size: 100px 12px;
    }
    
    /* Enhanced styling for code blocks */
    :global(pre) {
        position: relative;
        border-radius: 0.375rem;
        padding: 1rem;
        margin: 1.5rem 0;
        overflow-x: auto;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* Make sure inline code looks good too */
    :global(:not(pre) > code) {
        padding: 0.2em 0.4em;
        border-radius: 0.25rem;
        white-space: normal;
        background-color: rgba(0, 0, 0, 0.05);
    }
    
    :global(.dark :not(pre) > code) {
        background-color: rgba(255, 255, 255, 0.1);
    }

    /* Enhanced monospace fonts for all code elements */
    :global(code), 
    :global(pre) {
        font-family: 'JetBrains Mono', 'Source Code Pro', 'Roboto Mono', 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace !important;
        font-size: 0.875rem;
        line-height: 1.6;
        font-feature-settings: "liga" 0, "calt" 0; /* Disable ligatures for better readability */
        letter-spacing: 0.02em; /* Slightly increase letter spacing for readability */
    }
    
    /* Add language badges to code blocks */
    :global(pre)::before {
        content: attr(data-language);
        position: absolute;
        top: 0;
        right: 0;
        color: #232323;
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
        text-transform: uppercase;
        border-bottom-left-radius: 0.25rem;
        background-color: rgba(229, 229, 229, 0.8);
        z-index: 10;
    }
    
    :global(.dark pre)::before {
        color: #e0e0e0;
        background-color: rgba(40, 40, 40, 0.8);
    }

    .markdown-container {
        width: 100%;
        padding-right: 1rem;
    }
</style>
