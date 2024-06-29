<script>
    import Header from "$lib/header.svelte";
    import showdown from "showdown"

    export let data;

    // convert markdown
    const converter = new showdown.Converter({metadata : true})
    const html = converter.makeHtml(data.content)
    const metadata = converter.getMetadata()
</script>

<Header/>

<div class="content">
    <div class="stuff book-review">
        <h1>Book take away #1 : {metadata.title}</h1>
    </div>
    
    <img src="{data.icon}" alt="" width="200">

    <div class="review">
        {@html html}
    </div>
    
</div>