<script lang="ts">
  import WorkExperience from "./WorkExperience.svelte";
  import Reviews from "./Reviews.svelte";
  import Profile from "./Profile.svelte";
  import Contact from "./Contact.svelte";
  
  let contactSection: HTMLDivElement;
  
  function scrollToContact() {
    contactSection.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<div class="flex flex-col gap-12 mx-auto p-6">
  <Profile {scrollToContact} />
  <div class="curly-separator"></div>

  <Reviews />
  <div class="curly-separator"></div>

  <WorkExperience />
  <div class="curly-separator"></div>
  <div bind:this={contactSection}>
    <Contact />
  </div>
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