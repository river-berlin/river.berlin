<script lang="ts">
    import image from "$lib/images/meditating-enby.svg"
    import { page } from '$app/stores';

    /**
     * checks if we're accessing something in the feed page
     */
    function checkFeed(page: any){
        const pathName = page.url.pathname
        return pathName.startsWith("/feed/")||pathName.startsWith("/projects/")||pathName.startsWith("/book-reviews/")||pathName.startsWith("/blog/")
    }
</script>

<style lang="postcss">
    .header-link {
        color: black;
        text-decoration: none;
        font-family: 'Sofia Sans', sans-serif;
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

<div class="w-full flex justify-center px-6 mt-8 mb-8">
    <div class="flex flex-col md:flex-row justify-between items-center w-full max-w-[700px] gap-4">
        <a class="header-link" href="/">
            <div class="flex items-center">
                <img src="{image}" alt="a meditating non-binary person" height="80" class="h-20">
                <h1 class="ml-5 text-4xl font-['Reenie_Beanie']">River's webstuff</h1>
            </div>
        </a>

        <div class="font-['Sofia_Sans']">
            <div class="flex gap-3">
                <div class="page">
                    <a href="/about-me" class:highlighted={$page.url.pathname.startsWith("/about-me/")}>About me</a>
                </div>
                <div class="text-gray-400">/</div>
                <div class="page">
                    <a href="/feed" class:highlighted={checkFeed($page)}>Feed</a>
                </div>
            </div>
        </div>
    </div>
</div>
