<script>
    export let data;
    let {blogNum, markdownHTML, metadata, icon} = data;

    import { dev } from '$app/environment';

    let BASE_URL="https://river.berlin";

    if (dev) {
        BASE_URL=`https://${data.codespaceName}-5000.app.github.dev`
    }
</script>

<style>
    .content{
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin-left: auto;
        margin-right: auto;
        margin: 30px auto;
    }
</style>

<svelte:head>
    <title>River's Blog: Book takeaways`- {metadata.title}</title>
    <meta name="twitter:title" content="River's Blog: Book takeaways - {metadata.title}" />
    <meta property="og:title" content="River's Blog: Book takeaways - {metadata.title}" />


    <meta property="og:url" content="{BASE_URL}/book-reviews/book-{blogNum}/">
    <meta property="og:type" content="article" />
    <meta property="article:publisher" content="https://river.berlin" />
    <!-- <meta property="article:section" content="Coding" />
    <meta property="article:tag" content="Coding" /> -->

    <meta property="og:image" content="{BASE_URL}/opengraph/book-takeaways/{blogNum}.png" />
    <meta name="twitter:image" content="{BASE_URL}/opengraph/book-takeaways/{blogNum}.png" />

    <meta property="og:image:secure_url" content="{BASE_URL}/opengraph/book-takeaways/{blogNum}.png" />
    <meta property="og:description" content="{metadata.shortSummary}" />
    <meta property="og:image:width" content="1000">
    <meta property="og:image:height" content="500">
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="{BASE_URL}" />
    <meta name="twitter:description" content="{metadata.shortSummary}" />
</svelte:head>

<div class="content">

    <div class="stuff book-review">
        <h1>Book take away #{blogNum} : {metadata.title}</h1>
    </div>
    
    <img src="{icon}" alt="" width="200">

    <div class="review">
        {@html markdownHTML}
    </div>
    
</div>