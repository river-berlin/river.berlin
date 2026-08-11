<script>
    import { onMount } from 'svelte';

    export let markdownHTML;
    export let blogNum;
    export let metadata;
    export let icon;

    let proseEl;

    onMount(() => {
        function handleClick(e) {
            const btn = e.target.closest('.code-copy-btn');
            if (!btn) return;
            const pre = btn.closest('.code-block')?.querySelector('pre');
            if (!pre) return;

            const label = btn.querySelector('.code-copy-label');

            navigator.clipboard.writeText(pre.innerText).then(() => {
                const original = label ? label.textContent : '';
                if (label) label.textContent = 'Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    if (label) label.textContent = original;
                    btn.classList.remove('copied');
                }, 1500);
            });
        }

        proseEl.addEventListener('click', handleClick);
        return () => proseEl.removeEventListener('click', handleClick);
    });
</script>

<div class="markdown-container">
    <div class="stuff book-review flex flex-col">
        <a href="/blog/{metadata.url}" class="relative p-1.5 mb-5 no-underline text-gray-900 dark:text-gray-100 group">
            <div class="flex flex-col">
                <span class="take-away font-medium text-primary-700 dark:text-primary-400">Blog #{blogNum}</span>
                <span class="font-medium mt-1">{metadata.title}</span>
            </div>
        </a>
    </div>
    
    <div class="flex flex-col items-center justify-center w-full mb-10">
        <img src="{icon}" alt="" width="200" class="my-5 rounded-lg transition-all duration-1000 ease-in-out" >
        {#if metadata.iconCredit}
            <p class="text-xs text-black dark:text-white">Illustration by <a href="{metadata.iconCreditUrl}" target="_blank" class="underline">{metadata.iconCredit}</a></p>
        {/if}
    </div>

    <div class="prose prose-lg dark:prose-invert max-w-none code-highlight-wrapper" bind:this={proseEl}>
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

    /* Numbered header + copy-button footer wrapped around each code block */
    :global(.code-block) {
        position: relative;
        margin: 1.5rem 0;
        border-radius: 0.375rem;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    :global(.code-block pre) {
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }

    :global(.code-block-header),
    :global(.code-block-footer) {
        display: flex;
        align-items: center;
        padding: 0.35rem 0.75rem;
        background: rgba(0, 0, 0, 0.35);
    }

    :global(.code-block-header) {
        justify-content: flex-start;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #9ca3af;
    }

    :global(.code-block-footer) {
        justify-content: flex-start;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    :global(.code-copy-btn) {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: inherit;
        font-size: 0.75rem;
        padding: 0.25rem 0.65rem;
        border-radius: 0.25rem;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.06);
        color: #d1d5db;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }

    :global(.code-copy-icon) {
        flex-shrink: 0;
    }

    :global(.code-copy-btn:hover) {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
    }

    :global(.code-copy-btn.copied) {
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.4);
    }

    /* Line numbers, generated purely with a CSS counter so the gutter never
       ends up in the copied text. */
    :global(.code-block pre code) {
        display: block;
        counter-reset: code-line;
    }

    :global(.code-line) {
        display: block;
        position: relative;
        padding-left: 2.75em;
    }

    :global(.code-line)::before {
        counter-increment: code-line;
        content: counter(code-line);
        position: absolute;
        left: 0;
        top: 0;
        width: 2.25em;
        text-align: right;
        color: rgba(255, 255, 255, 0.28);
        user-select: none;
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
