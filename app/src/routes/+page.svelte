<script>
    import Header from "$lib/header.svelte";

    export let data;
</script>

<div class="content">
    <div class="stuff project">
        <a href="/voice-repeater">
            <div class="fruits">
                <img src="/fruits/orange.svg" alt="" width="15">
                <img src="/fruits/watermelon.svg" alt="" width="15">
            </div>
            <span class="take-away">Project #1</span> : Press M to repeat voice
        </a>
    </div>
    <div class="stuff book-review">
        {#each data.blogs as blog }
            <a href="/book-reviews/book-{blog.num}">
                <img src="/scroll.svg" alt="" width="15">
                <span class="take-away">Book take away #{blog.num}</span> : {blog.metadata.title}
            </a>
        {/each}
    </div>
</div>