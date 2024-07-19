<script>
    import { dev } from '$app/environment';

    export let data;
    let {project} = data;
    let metadata = project.metadata


    let BASE_URL="https://river.berlin";

    if (dev) {
        BASE_URL=`https://${data.codespaceName}-5000.app.github.dev`
    }
</script>

<svelte:head>
    <title>River's Blog: Book takeaways - {metadata.title}</title>
    <meta name="twitter:title" content="River's Blog: Book takeaways - {metadata.title}" />
    <meta property="og:title" content="River's Blog: Book takeaways - {metadata.title}" />


    <meta property="og:url" content="{BASE_URL}/projects/{metadata.shortPath}">
    <meta property="og:type" content="article" />
    <meta property="article:publisher" content="https://river.berlin" />
    <!-- <meta property="article:section" content="Coding" />
    <meta property="article:tag" content="Coding" /> -->

    <meta property="og:image" content="{BASE_URL}/opengraph/projects/{metadata.shortPath}.png" />
    <meta name="twitter:image" content="{BASE_URL}/opengraph/projects/{metadata.shortPath}.png" />

    <meta property="og:image:secure_url" content="{BASE_URL}/opengraph/projects/{metadata.shortPath}.png" />
    <meta property="og:description" content="{metadata.shortSummary}" />
    <meta property="og:image:width" content="1000">
    <meta property="og:image:height" content="500">
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="{BASE_URL}" />
    <meta name="twitter:description" content="{metadata.shortSummary}" />
</svelte:head>

<slot />