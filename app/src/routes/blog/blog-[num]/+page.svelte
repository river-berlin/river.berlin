<script>
    export let data;
    let {blogNum, markdownHTML, metadata, icon} = data;

    import { dev } from '$app/environment';

    let BASE_URL = "https://river.berlin";

    if (dev) {
        if (data.codespaceName) {
            BASE_URL = `https://${data.codespaceName}-5000.app.github.dev`;
        } else {
            const port = import.meta.env.VITE_PORT;
            BASE_URL = `http://localhost:${port}`;
        }
    }
</script>

<svelte:head>
    <title>River's Blog: Blog - {metadata.title}</title>
    <meta name="twitter:title" content="River's Blog: Blog - {metadata.title}" />
    <meta property="og:title" content="River's Blog: Blog - {metadata.title}" />
    
    <!-- Highlight.js CSS for code syntax highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css">
    
    <!-- Google Fonts for code blocks -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Roboto+Mono:wght@400;500&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">


    <meta property="og:url" content="{BASE_URL}/blog/blog-{blogNum}/">
    <meta property="og:type" content="article" />
    <meta property="article:publisher" content="https://river.berlin" />
    <!-- <meta property="article:section" content="Coding" />
    <meta property="article:tag" content="Coding" /> -->

    <meta property="og:image" content="{BASE_URL}/opengraph/blog/{blogNum}.png" />
    <meta name="twitter:image" content="{BASE_URL}/opengraph/blog/{blogNum}.png" />

    <meta property="og:image:secure_url" content="{BASE_URL}/opengraph/blog/{blogNum}.png" />
    <meta property="og:description" content="{metadata.shortSummary}" />
    <meta property="og:image:width" content="1000">
    <meta property="og:image:height" content="500">
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="{BASE_URL}" />
    <meta name="twitter:description" content="{metadata.shortSummary}" />
</svelte:head>

<div class="content w-full max-w-3xl font-inter flex flex-col items-center mx-auto my-7">
    <div class="stuff book-review flex flex-col">
        <a href="/blog/blog-{blogNum}" class="relative flex p-1.5 mb-5 no-underline text-black group">
            <img src="/scroll.svg" alt="" width="15" class="mr-5 transition-all duration-700 group-hover:hue-rotate-[151deg]">
            <span class="take-away font-medium text-[#375883]">Blog #{blogNum}</span> : {metadata.title}
            <div class="absolute bottom-0 left-10 w-[calc(100%-40px)] h-0.5 bg-[#5bcde9]"></div>
        </a>
    </div>
    
    <img src="{icon}" alt="" width="200" class="my-5" >

    <div class="prose prose-lg dark:prose-invert max-w-none code-highlight-wrapper">
        {@html markdownHTML}
    </div>
</div>