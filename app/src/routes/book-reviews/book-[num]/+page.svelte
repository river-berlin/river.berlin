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
        margin-left: auto;
        margin-right: auto;
        margin: 30px auto;
        font-family: "Inter", system-ui;
        font-optical-sizing: auto;
        font-style: normal;
    }

    .stuff.book-review{
        display: flex;
        flex-direction: column;
    }

    .stuff.book-review *{
        font-family: "Inter", system-ui;
        font-optical-sizing: auto;
        font-style: normal;
    }

    .stuff a{
        position: relative;
        display: flex;
        padding: 5px;
        background-size: 20px 20px;
        margin-bottom: 20px;
        text-decoration: none;
        color: black;
    }

    .stuff a img{
        margin-right: 20px;
        transition: 2s filter;
    }

    .stuff a .fruits img{
        margin-right: 0;
    }

    .stuff a:hover img{
        filter: hue-rotate(151deg);
    }

    .stuff a .take-away{
        font-weight: 500;
        color: #375883;
    }

    .stuff a::before{
        content: "";
        background: rgb(91, 205, 233);
        position: absolute;
        bottom: 0;
        left: 40px;
        width: calc(100% - 40px);
        height: 2px;
    }
</style>

<svelte:head>
    <title>River's Blog: Book takeaways- {metadata.title}</title>
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

<div class="content w-full max-w-3xl font-inter">

    <div class="stuff book-review">
        <a href="/blog/blog-{blogNum}">
            <img src="/scroll.svg" alt="" width="15">
            <span class="take-away">Book take away #{blogNum}</span> : {metadata.title}
        </a>
    </div>
    
    <img src="{icon}" alt="" width="200">

    <div class="review">
        {@html markdownHTML}
    </div>
    
</div>