<script lang="ts">
    import MarkdownDisplay from './left-pane/MarkdownDisplay.svelte';
    import RightPane from './right-pane/RightPane.svelte';
    import { dev } from '$app/environment';
    
    interface BlogMetadata {
        title: string;
        dated: string | Date;
        shortPath?: string;
        shortSummary?: string;
        [key: string]: any; // For other potential metadata properties
    }
    
    interface BlogItem {
        num: string;
        metadata: BlogMetadata;
    }
    
    interface PageData {
        blogNum: string;
        markdownHTML: string;
        metadata: BlogMetadata;
        icon: string;
        allBlogs: BlogItem[];
    }
    
    export let data: PageData;
    
    let {blogNum, markdownHTML, metadata, icon, allBlogs} = data;

    let BASE_URL = "https://river.berlin";

    if (dev) {
        let port = 5001; 
        if (typeof window !== 'undefined') {
            const windowPort = window.location.port;
            BASE_URL = `http://localhost:${windowPort}`;
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

<div class="content w-full max-w-6xl font-inter mx-auto my-7">
    <div class="flex flex-col lg:flex-row gap-8">
        <div class="lg:w-3/4 w-full">
            <MarkdownDisplay {markdownHTML} {blogNum} {metadata} {icon} />
        </div>
        
        <!-- Hide on mobile screens, show on lg (large) screens and up -->
        <div class="hidden lg:block lg:w-1/4">
            <RightPane {markdownHTML} {blogNum} {allBlogs} />
        </div>
    </div>
</div>