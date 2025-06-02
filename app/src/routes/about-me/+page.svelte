<script>
  import WorkExperience from "./WorkExperience.svelte";
  import Reviews from "./Reviews.svelte";
</script>

<div class="flex flex-col gap-12 mx-auto p-6">
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

  <div class="curly-separator"></div>

  <div class="space-y-6">
    <Reviews />
  </div>
  

  <div class="space-y-6">
    <div class="curly-separator"></div>
    <WorkExperience />
  </div>
   
  <div class="curly-separator"></div>
</div>

<style>
  .curly-separator {
    height: 12px;
    width: 100%;
    margin: 0 auto;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='12' viewBox='0 0 100 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,6 C12.5,0 12.5,12 25,6 C37.5,0 37.5,12 50,6 C62.5,0 62.5,12 75,6 C87.5,0 87.5,12 100,6' stroke='%23ddd' fill='none' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: repeat-x;
    background-size: 100px 12px;
  }
</style>