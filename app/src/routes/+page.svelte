<script>
    import Header from "$lib/header.svelte";

    export let data;
</script>

<Header />

<div class="content">
    <div class="stuff book-review">
        {#each data.blogs as blog }
            <a href="/book-reviews/book-{blog.num}">Book take away #{blog.num} : {blog.metadata.title}</a>
        {/each}
    </div>
</div>