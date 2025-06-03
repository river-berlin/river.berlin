<script lang="ts">
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { faPaperPlane, faEnvelope } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';
  
  library.add(faPaperPlane, faEnvelope);
  
  let name = '';
  let email = '';
  let body = '';
  let honeypot = '';
  let sending = false;
  let sent = false;
  let error = '';
  let messageTextarea: HTMLTextAreaElement;
  
  // Auto-resize the textarea based on content
  function autoGrow() {
    if (messageTextarea) {
      // Reset height to auto first to allow shrinking
      messageTextarea.style.height = 'auto';


      if (!body.includes("\n")) {
        messageTextarea.style.height = '40px';
      } else {
        messageTextarea.style.height = messageTextarea.scrollHeight + 2 + 'px';
      }
    }
  }
  
  // Initialize height on mount and when content changes
  onMount(() => {
    if (messageTextarea) {
      messageTextarea.style.minHeight =  '0px';
      autoGrow();
    }
  });

  async function handleSubmit() {
    if (honeypot) {
      // Honeypot filled - silently reject but pretend success
      sent = true;
      return;
    }

    sending = true;
    error = '';

    try {
      const response = await fetch('http://emailer.theadityashankar.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email: 'me@river.berlin', // Destination email
          body,
          honeypot: ''
        })
      });

      if (response.ok) {
        sent = true;
        name = '';
        email = '';
        body = '';
      } else {
        error = 'Failed to send message. Please try again later.';
      }
    } catch (err) {
      error = 'Failed to send message. Please try again later.';
      console.error(err);
    } finally {
      sending = false;
    }
  }
</script>

<div class="space-y-6" id="contact">
  <div class="flex items-center justify-center gap-3 mb-2">
    <FontAwesomeIcon icon={faEnvelope} class="h-5 w-5 text-blue-500 dark:text-blue-400" />
    <h2 class="text-2xl font-bold text-center">Get in Touch</h2>
  </div>
  
  <p class="text-center text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
    Have a project in mind or want to discuss potential opportunities? Feel free to reach out and I'll get back to you as soon as possible.
  </p>
  
  {#if !sent}
    <div class="max-w-2xl mx-auto p-6">
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div>
          <label for="name" class="block mb-1 font-medium">Your Name</label>
          <input 
            type="text" 
            id="name" 
            bind:value={name} 
            required
            class="w-full py-2 px-1 bg-transparent border-b border-black dark:border-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
            placeholder="John Doe"
          />
        </div>
        
        <div>
          <label for="email" class="block mb-1 font-medium">Your Email</label>
          <input 
            type="email" 
            id="email" 
            bind:value={email} 
            required
            class="w-full py-2 px-1 bg-transparent border-b border-black dark:border-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <label for="message" class="block mb-1 font-medium">Message</label>
          <textarea 
            id="message" 
            bind:this={messageTextarea}
            bind:value={body} 
            on:input={autoGrow}
            required
            class="w-full py-2 px-1 bg-transparent border-b border-black dark:border-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors resize-none overflow-hidden"
            placeholder="I'd like to discuss a potential project..."
          ></textarea>
        </div>
        
        <!-- Honeypot field - invisible to users but bots might fill it -->
        <div class="hidden" aria-hidden="true">
          <label for="honeypot">Subject</label>
          <input type="text" id="honeypot" bind:value={honeypot} tabindex="-1" autocomplete="off" />
        </div>
        
        {#if error}
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p class="text-red-600 dark:text-red-400">{error}</p>
          </div>
        {/if}
        
        <div class="flex justify-center mt-6">
          <button 
            type="submit"
            disabled={sending}
            class="group flex items-center gap-2 px-8 py-2.5 bg-blue-600 dark:bg-transparent text-white dark:text-blue-400 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800/20 border-0 dark:border dark:border-blue-400 transition-colors disabled:opacity-50">
            <span class="font-medium">{sending ? 'Sending...' : 'Send Message'}</span>
            <FontAwesomeIcon icon={faPaperPlane} class="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  {:else}
    <div class="max-w-2xl mx-auto p-8 text-center">
      <div class="mb-4 flex justify-center">
        <div class="rounded-full bg-green-100 dark:bg-green-800 p-3 inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h3 class="text-xl font-bold text-green-800 dark:text-green-200 mb-3">Message Sent!</h3>
      <p class="text-green-700 dark:text-green-300 mb-6">Thank you for reaching out! I'll get back to you as soon as possible.</p>
      <button 
        on:click={() => { sent = false; }}
        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
        Send Another Message
      </button>
    </div>
  {/if}
</div>
