<script>
    import '../app.css'
    import Header from "$lib/header.svelte"
</script>

<style>
    .contents{
        width: 100vw;
        height: 100vh;
        display: inline-block;
    }
</style>

<div class="contents">
    <Header />
    <slot />
</div>
