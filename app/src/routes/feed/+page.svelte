<script>
    export let data;
</script>

<style>

.stuff.book-review{
    display: flex;
    flex-direction: column;
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

.stuff a .fruits{
    margin-right: 20px;
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

@keyframes underline-color-change {
    0% {background-color: rgb(240, 227, 212);}
    50% {background-color: rgb(230, 182, 26);}
    100% {background-color: rgb(91, 205, 233);}
}

.stuff a::before{
    content: "";
    background: rgb(240, 227, 212);
    position: absolute;
    bottom: 0;
    left: 40px;
    width: calc(100% - 40px);
    height: 2px;
}

.stuff.project a::before, .stuff.project a::after{
    left: 61px;
    width: calc(100% - 61px);
}

.stuff a:hover::before{
    animation: underline-color-change 1s linear;
    animation-fill-mode: forwards;
}

.content{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    margin: 30px auto;
}

</style>

<div class="content">
    <div class="stuff project">
        {#each data.projects as project}    
            <a href="/projects/{project.metadata.shortPath}">
                <div class="fruits flex">
                    <img src="/fruits/orange.svg" alt="" width="15">
                    <img src="/fruits/watermelon.svg" alt="" width="15" class="ml-2">
                </div>
                <span class="take-away">Project #{project.num}</span> : {project.metadata.title}
            </a>
        {/each}
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