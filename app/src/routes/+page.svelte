<script>
    export let data;

    let projects = [
        {
            projectNum : 1,
            name : "Press M to repeat voice",
            url : "/projects/voice-repeater"
        },
        {
            projectNum : 2,
            name : "Effect or Affect?",
            url : "/projects/effect-or-affect"
        }
    ]

    projects.sort((a, b) => a - b).reverse()
</script>

<div class="content">
    <div class="stuff project">
        {#each projects as project}    
            <a href="{project.url}">
                <div class="fruits">
                    <img src="/fruits/orange.svg" alt="" width="15">
                    <img src="/fruits/watermelon.svg" alt="" width="15">
                </div>
                <span class="take-away">Project #{project.projectNum}</span> : {project.name}
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