<script>
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  
  library.add(faPenToSquare);
  
  export let scrollToContact;
</script>

<div class="flex justify-center p-6 rounded-xl max-w-3xl mx-auto">
  <div class="flex flex-col md:flex-row items-center gap-8">
    <img
      src="/me.jpg"
      alt="me"
      class="w-48 h-48 rounded-lg"
    />
    <div class="mt-3 text-lg text-center md:text-left">
      <h1 class="text-2xl font-bold mb-3">Hi there! 👋</h1>
      <p class="mb-2">I am <span class="font-bold">Aditya Shankar</span>, I am a <span class="font-bold">Software Engineer</span> that dabbles with everything, I am currently in university to study <span class="font-bold">Artificial Intelligence</span></p>
      <p>I currently work at <a href="https://www.runpod.io" class="text-blue-400 hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer">RunPod</a> to give our customers the awesomest experience they could dream of.</p>
      <p></p><br/>
      <p>I do contract work, here is <a href="https://river.berlin/resume.pdf" class="text-blue-400 hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer">my resume</a></p>
    </div>
  </div>
</div>

<div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
  <p class="text-lg font-medium">Want to hire me?</p>
  <button 
    on:click={scrollToContact}
    class="group flex items-center gap-3 px-5 py-2.5 bg-blue-600 dark:bg-transparent text-white dark:text-blue-400 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-900/20 border-0 dark:border dark:border-blue-400 transition-colors">
    <span>Contact me</span>
    <FontAwesomeIcon icon={faPenToSquare} class="h-4 w-4 group-hover:animate-pulse" />
  </button>
</div>
