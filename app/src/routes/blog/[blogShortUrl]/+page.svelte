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
        german: { markdownHTML: string; metadata: BlogMetadata } | null;
        language: string;
    }
    
    export let data: PageData;
    
    $: language = data.language;
    $: ({blogNum, icon, allBlogs} = data);
    $: markdownHTML = language === 'de' && data.german ? data.german.markdownHTML : data.markdownHTML;
    $: metadata = language === 'de' && data.german ? data.german.metadata : data.metadata;
    $: articlePath = `${language === 'de' ? '/de' : ''}/blog/${data.metadata.url}/`;
    $: openGraphImage = `${BASE_URL}/opengraph/blog/${language === 'de' ? 'de/' : ''}${blogNum}.png`;

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


    <meta property="og:url" content="{BASE_URL}{articlePath}">
    <link rel="canonical" href="{BASE_URL}{articlePath}" />
    {#if data.german}
        <link rel="alternate" hreflang="en" href="{BASE_URL}/blog/{data.metadata.url}/" />
        <link rel="alternate" hreflang="de" href="{BASE_URL}/de/blog/{data.metadata.url}/" />
    {/if}
    <meta property="og:type" content="article" />
    <meta property="article:publisher" content="https://river.berlin" />
    <!-- <meta property="article:section" content="Coding" />
    <meta property="article:tag" content="Coding" /> -->

    <meta property="og:image" content={openGraphImage} />
    <meta name="twitter:image" content={openGraphImage} />
    <meta property="og:image:alt" content={metadata.title} />
    <meta name="twitter:image:alt" content={metadata.title} />
    <meta property="og:locale" content={language === 'de' ? 'de_DE' : 'en_US'} />

    <meta property="og:image:secure_url" content={openGraphImage} />
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
            {#if language === 'de' && data.german}
                <aside lang="de" class="mb-6 rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                    <strong>Hinweis zu meinem Deutsch:</strong>
                    Ich lerne noch Deutsch, deshalb ist diese Version wahrscheinlich nicht perfekt.
                    Ich nutze das Schreiben als Ausrede, um mehr Deutsch zu üben.
                </aside>
            {/if}
            <div lang={language}>
                <MarkdownDisplay {markdownHTML} {blogNum} {metadata} {icon} {articlePath}>
                    <svelte:fragment slot="language">
                        {#if data.german}
                            <a
                                class="shrink-0 rounded border border-blue-500 bg-transparent px-3 py-1 text-sm text-black no-underline"
                                href={`${language === 'en' ? '/de' : ''}/blog/${data.metadata.url}/`}
                                hreflang={language === 'en' ? 'de' : 'en'}
                                lang={language === 'en' ? 'de' : 'en'}
                            >
                                {language === 'en' ? 'Lies das auf Deutsch' : 'Read this in English'}
                            </a>
                        {/if}
                    </svelte:fragment>
                </MarkdownDisplay>
            </div>
        </div>
        
        <!-- Hide on mobile screens, show on lg (large) screens and up -->
        <div class="hidden lg:block lg:w-1/4">
            {#key markdownHTML}
                <RightPane {markdownHTML} {blogNum} {allBlogs} />
            {/key}
        </div>
    </div>
</div>
