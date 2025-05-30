<script lang="ts">
  import { onMount } from 'svelte';
  
  // Track which reviews are expanded
  let expandedReviews: {[key: string]: boolean} = {};

  interface Review {
    name: string;
    company: string;
    content: string;
    image: string;
    linkedInUrl: string;
    rating?: number;
  }
  
  // Sample reviews data - this could be moved to a data store or fetched from an API
  // Split reviews into two rows
  const firstRowReviews: Review[] = [
    {
      name: "Margarita Melkoumov",
      company: "RunPod",
      content: "Aditya's technical expertise and empathy with customers at RunPod have been phenomenal. He played an integral role in assisting the sales team by identifying key pain points and providing customers with top-tier technical insights - helping customers with developing fantastic language and image generation models, while optimizing their models for their preferred use cases, Aditya effectively bridged the gap between clients and the development team, ensuring solutions that improved customer retention. Beyond his technical skills, Aditya has been a fantastic colleague to work with at RunPod.",
      image: "/review-images/margarita.jpg",
      linkedInUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Geovany",
      company: "Repunzel",
      content: "Aditya is such a kind and knowledgeable person. They are a top tier performer in our group and are someone who is dependable. Their technical knowledge in cloud support based products and development truly shine in this field. Great person to work with! :)",
      image: "/review-images/geovany.jpg",
      linkedInUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Mike Mosby",
      company: "Salesforce, Upwork",
      content: "Aditya was very easy to communicate with and prompt in his response.  He always seemed to be available to answer questions or make changes.  He completed the work quickly but also very thoroughly.  By far the best experience I've had on upwork and immediately booked another project with him.  He will be my go-to developer for the foreseeable future",
      image: "/review-images/mike-mosby.jpg",
      linkedInUrl: "https://www.upwork.com/freelancers/~01743d8599b93d48c7" // Upwork recommendation URL
    }
  ];
  
  const secondRowReviews: Review[] = [
    {
      name: "Howard",
      company: "Rapunzel.com",
      content: "Adi was an invaluable resource to me in the development of both my Saas products. He developed an early prototype of Repunzel.com, and although we were not able to finish the project together, I continued to rely on his technical advice and expertise for other related projects. He is passionate about technology, loyal, and kind. I would highly recommend Adi for anyone looking for a competent engineer.",
      image: "/review-images/howard.jpg",
      linkedInUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Tim Pietrusky",
      company: "RunPod",
      content: "Aditya stands out for his creative approach to solving customer problems. When faced with new challenges, he willingly goes above and beyond what is expected, finding innovative solutions that benefit both our team and our customers. His development of effective tools has helped us diagnose and resolve issues more quickly. Aditya's readiness to take on extra responsibilities and his genuine care for everyone around him make a real difference every day.",
      image: "/review-images/tim-pietrusky.jpg",
      linkedInUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    }
  ];
  
  // Initialize expandable state
  onMount(() => {
    // Initialize for first row
    firstRowReviews.forEach((_, index) => {
      expandedReviews[`first-${index}`] = false;
    });
    
    // Initialize for second row
    secondRowReviews.forEach((_, index) => {
      expandedReviews[`second-${index}`] = false;
    });
  });
  
  // Toggle expanded state for a review
  function toggleExpanded(rowKey: string, index: number): void {
    const key = `${rowKey}-${index}`;
    expandedReviews[key] = !expandedReviews[key];
    expandedReviews = {...expandedReviews}; // Trigger reactivity
  }
  
  // Function to handle image load errors
  function handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = "/me.jpg"; // Fallback to the profile image
    imgElement.classList.add("opacity-80");
  }
</script>

<div class="space-y-8">
  <h2 class="text-2xl font-bold text-center">What people say about me!</h2>
  
  <!-- Two rows of reviews -->
  <div class="space-y-6">
    <!-- First row -->
    <div class="flex flex-wrap justify-center gap-6">
      {#each firstRowReviews as review, index}
        <div class="w-full md:w-[45%] rounded-xl p-4 bg-white/5">
          <div class="flex flex-col w-full">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-2">
                <img class="rounded-lg h-10 w-10" src={review.image} alt="Client from {review.company}" on:error={handleImageError} />
                <div>
                  <h3 class="font-bold text-base">{review.name}</h3>
                  <p class="text-xs text-gray-300">{review.company}</p>
                </div>
              </div>
              {#if review.linkedInUrl}
                <a 
                  href={review.linkedInUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="text-blue-400 hover:text-blue-300 transition-colors ml-1" 
                  title="View on LinkedIn"
                  aria-label="View {review.name}'s recommendation on LinkedIn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              {/if}
            </div>
            {#if review.rating}
              <div class="flex">
                {#each Array(review.rating) as _, i}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                {/each}
              </div>
            {/if}
          </div>
          <div class={`overflow-hidden transition-all duration-300 ${expandedReviews[`first-${index}`] ? 'max-h-[1000px]' : 'max-h-[100px]'}`}>
            <p class="text-gray-500 text-sm whitespace-pre-line">{review.content}</p>
          </div>
          <button 
            class="flex items-center text-blue-500 hover:text-blue-400 text-xs mt-2 focus:outline-none" 
            on:click={() => toggleExpanded('first', index)}
            aria-label={expandedReviews[`first-${index}`] ? "Collapse review" : "Expand review"}
          >
            {#if expandedReviews[`first-${index}`]}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              <span class="ml-1">Show less</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="ml-1">Show more</span>
            {/if}
          </button>
        </div>
      </div>
    {/each}
  </div>
  
    <!-- Second row -->
    <div class="flex flex-wrap justify-center gap-6">
      {#each secondRowReviews as review, index}
        <div class="w-full md:w-[45%] rounded-xl p-4 bg-white/5">
          <div class="flex flex-col w-full">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-2">
                <img class="rounded-lg h-10 w-10" src={review.image} alt="Client from {review.company}" on:error={handleImageError} />
                <div>
                  <h3 class="font-bold text-base">{review.name}</h3>
                  <p class="text-xs text-gray-300">{review.company}</p>
                </div>
              </div>
              {#if review.linkedInUrl}
                <a 
                  href={review.linkedInUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="text-blue-400 hover:text-blue-300 transition-colors ml-1" 
                  title="View on LinkedIn"
                  aria-label="View {review.name}'s recommendation on LinkedIn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              {/if}
            </div>
            {#if review.rating}
              <div class="flex">
                {#each Array(review.rating) as _, i}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                {/each}
              </div>
            {/if}
          </div>
          <div class={`overflow-hidden transition-all duration-300 ${expandedReviews[`second-${index}`] ? 'max-h-[1000px]' : 'max-h-[100px]'}`}>
            <p class="text-gray-500 text-sm whitespace-pre-line">{review.content}</p>
          </div>
          <button 
            class="flex items-center text-blue-500 hover:text-blue-400 text-xs mt-2 focus:outline-none" 
            on:click={() => toggleExpanded('second', index)}
            aria-label={expandedReviews[`second-${index}`] ? "Collapse review" : "Expand review"}
          >
            {#if expandedReviews[`second-${index}`]}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              <span class="ml-1">Show less</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              <span class="ml-1">Show more</span>
            {/if}
          </button>
        </div>
        </div>
      {/each}
    </div>
  </div>
</div>
