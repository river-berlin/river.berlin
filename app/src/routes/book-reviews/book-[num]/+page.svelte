<script>
    import Header from "$lib/header.svelte";

    export let data;
    let {blogNum, markdownHTML, metadata, icon} = data;
</script>

<Header/>

<div class="content">
    <div class="stuff book-review">
        <h1>Book take away #{blogNum} : {metadata.title}</h1>
    </div>
    
    <img src="{icon}" alt="" width="200">

    <div class="review">
        {@html markdownHTML}
    </div>
    
</div>