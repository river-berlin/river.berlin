<script>
    import { page } from '$app/stores';
</script>

<svelte:head>
    <title>hello there!</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[60vh] text-gray-900 dark:text-gray-100">
    <h1 class="text-3xl font-medium mb-3">hello there 👋</h1>
    <p class="text-gray-500 dark:text-gray-400">you reached /hi/{$page.params.id}</p>
</div>
