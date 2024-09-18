<script>
    import image from "$lib/images/meditating-enby.svg"
    import { page } from '$app/stores';

    /**
     * checks if we're accessing something in the feed page
     */
    function checkFeed(page){
        const pathName = page.url.pathname
        return pathName.startsWith("/feed/")||pathName.startsWith("/projects/")||pathName.startsWith("/book-reviews/")||pathName.startsWith("/blog/")
    }
</script>

<style lang="postcss">
    .header-link {
        color: black;
        text-decoration: none;
    }

    .page:hover{
        text-decoration: underline;
        text-decoration-color: gainsboro;
    }

    .highlighted{
        text-decoration: underline;
        text-decoration-color: rgb(68, 68, 68);
    }
</style>

<div class="flex flex-col w-max my-6 mx-auto" style:position="relative">
    <a class="header-link" href="/">
        <div class="flex m-2.5 items-center">
            <img src="{image}" alt="a meditating non-binary person" height="80" class="h-20">
            <h1 class="ml-5 text-4xl">River's blog</h1>
        </div>
    </a>

    <div class="max-content flex justify-center mt-3">
        <div class="page">
            <a href="/about-me" class:highlighted={$page.url.pathname.startsWith("/about-me/")}>About me</a>
        </div>
        <div class="page ml-3 ">
            <a href="/feed" class:highlighted={checkFeed($page)}>Feed</a>
        </div>
    </div>
</div>
