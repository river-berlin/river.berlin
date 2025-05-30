<script lang="ts">
    import TableOfContents from './easyNav/TableOfContents.svelte';
    import RelatedArticles from './relatedThings/RelatedArticles.svelte';
    
    interface BlogMetadata {
        title: string;
        dated: string | Date;
        shortPath?: string;
    }
    
    interface BlogItem {
        num: string;
        metadata: BlogMetadata;
    }
    
    export let markdownHTML: string;
    export let blogNum: string;
    export let allBlogs: BlogItem[] = [];
</script>

<div class="right-pane">
    <TableOfContents {markdownHTML} />
    <div class="curly-separator !ml-[15px] dark:opacity-50"></div>
    <RelatedArticles currentBlogNum={blogNum} {allBlogs} />
</div>

<style>
    .right-pane {
        width: 100%;
        position: sticky;
        top: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .curly-separator {
        height: 12px;
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
        background-image: url("data:image/svg+xml,%3Csvg width='100' height='12' viewBox='0 0 100 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,6 C12.5,0 12.5,12 25,6 C37.5,0 37.5,12 50,6 C62.5,0 62.5,12 75,6 C87.5,0 87.5,12 100,6' stroke='%23ddd' fill='none' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: repeat-x;
        background-size: 100px 12px;
    }
    
    @media (max-width: 768px) {
        .right-pane {
            position: static;
            margin-top: 2rem;
        }
    }
</style>
