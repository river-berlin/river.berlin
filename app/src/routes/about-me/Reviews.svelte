<script lang="ts">
  // Add default export to fix module error
  export {};
  
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faExternalLink } from '@fortawesome/free-solid-svg-icons/faExternalLink';
  import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
  import { faChevronUp } from '@fortawesome/free-solid-svg-icons/faChevronUp';
  import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
  import { faAngleDown } from '@fortawesome/free-solid-svg-icons/faAngleDown';
  import { faAngleUp } from '@fortawesome/free-solid-svg-icons/faAngleUp';
  import { faAppleWhole } from '@fortawesome/free-solid-svg-icons/faAppleWhole';
  import { faLemon } from '@fortawesome/free-solid-svg-icons/faLemon';
  import { faCarrot } from '@fortawesome/free-solid-svg-icons/faCarrot';
  import { faPepperHot } from '@fortawesome/free-solid-svg-icons/faPepperHot';
  import { faCookie } from '@fortawesome/free-solid-svg-icons/faCookie';
  import { faBowlFood } from '@fortawesome/free-solid-svg-icons/faBowlFood';
  import { faIceCream } from '@fortawesome/free-solid-svg-icons/faIceCream';
  import { faCake } from '@fortawesome/free-solid-svg-icons/faCake';
  
  // Track which reviews are expanded
  let expandedReviews: {[key: string]: boolean} = {};
  
  // Track if the entire container is expanded on mobile
  let containerExpanded = false;
  
  // Store pre-generated icon-color pairs for each review
  let reviewIcons: {[key: string]: {icon: any, color: string}} = {};
  
  // Check if screen is small (mobile view)
  let isMobile = false;
  
  // Update mobile status on window resize
  function updateMobileStatus() {
    if (browser) {
      isMobile = window.innerWidth < 768; // Match md breakpoint from Tailwind
    }
  }
  
  // Function to generate a fallback icon component for a review
  function getFallbackIcon(rowName: string, index: number) {
    const key = `${rowName}-${index}`;
    if (!reviewIcons[key]) {
      // Initialize if not already created
      reviewIcons[key] = {
        icon: fallbackIcons[Math.floor(Math.random() * fallbackIcons.length)],
        color: getRandomColor()
      };
    }
    return reviewIcons[key];
  }

  interface Review {
    name: string;
    company: string;
    content: string;
    image?: string;
    profileUrl?: string;
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
      profileUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Howard",
      company: "Rapunzel.com",
      content: "Adi was an invaluable resource to me in the development of both my Saas products. He developed an early prototype of Repunzel.com, and although we were not able to finish the project together, I continued to rely on his technical advice and expertise for other related projects. He is passionate about technology, loyal, and kind. I would highly recommend Adi for anyone looking for a competent engineer.",
      image: "/review-images/howard.jpg",
      profileUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Mike Mosby",
      company: "Salesforce, Upwork",
      content: "Aditya was very easy to communicate with and prompt in his response.  He always seemed to be available to answer questions or make changes.  He completed the work quickly but also very thoroughly.  By far the best experience I've had on upwork and immediately booked another project with him.  He will be my go-to developer for the foreseeable future",
      image: "/review-images/mike-mosby.jpg",
      profileUrl: "https://www.upwork.com/freelancers/~01743d8599b93d48c7" // Upwork recommendation URL
    }
  ];
  
  const secondRowReviews: Review[] = [
    {
      name: "Tim Pietrusky",
      company: "RunPod",
      content: "Aditya stands out for his creative approach to solving customer problems. When faced with new challenges, he willingly goes above and beyond what is expected, finding innovative solutions that benefit both our team and our customers. His development of effective tools has helped us diagnose and resolve issues more quickly. Aditya's readiness to take on extra responsibilities and his genuine care for everyone around him make a real difference every day.",
      image: "/review-images/tim-pietrusky.jpg",
      profileUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Geovany",
      company: "Runpod",
      content: "Aditya is such a kind and knowledgeable person. They are a top tier performer in our group and are someone who is dependable. Their technical knowledge in cloud support based products and development truly shine in this field. Great person to work with! :)",
      image: "/review-images/geovany.jpg",
      profileUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
    {
      name: "Javier",
      company: "Runpod",
      content: "Adi is very knowledgeable and is always prepared. Respectful and professional. Couldn't ask for a better person to help me with my project. Thank you Adi!",
      profileUrl: "https://www.linkedin.com/in/aditya-shankar-338641252/details/recommendations" // LinkedIn recommendation URL
    },
  ];
  
  // Initialize expandable state
  onMount(() => {
    // Initialize for first row
    firstRowReviews.forEach((review, index) => {
      expandedReviews[`first-${index}`] = false;
    });
    
    // Initialize for second row
    secondRowReviews.forEach((review, index) => {
      expandedReviews[`second-${index}`] = false;
    });
    
    // Check initial mobile status
    updateMobileStatus();
    
    // Add resize listener
    window.addEventListener('resize', updateMobileStatus);
    
    return () => {
      window.removeEventListener('resize', updateMobileStatus);
    };
  });
  
  // Toggle the expanded state of a review
  function toggleExpanded(row: string, index: number) {
    const key = `${row}-${index}`;
    expandedReviews[key] = !expandedReviews[key];
    expandedReviews = expandedReviews; // Trigger reactivity
  }
  
  // Toggle the expanded state of the entire container
  function toggleContainerExpanded() {
    containerExpanded = !containerExpanded;
  }
  
  // Array of FontAwesome food icons to use as fallbacks
  const fallbackIcons = [
    faAppleWhole,
    faLemon,
    faCarrot,
    faPepperHot,
    faCookie,
    faBowlFood,
    faIceCream,
    faCake
  ];
  
  // Array of vibrant colors to rotate through
  const iconColors = [
    '#FF5252', // Red
    '#FF9800', // Orange
    '#FFEB3B', // Yellow
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#9C27B0', // Purple
    '#F06292', // Pink
    '#00BCD4', // Cyan
    '#FFA000', // Amber
    '#8BC34A'  // Light Green
  ];
  
  // Function to get a random color
  function getRandomColor(): string {
    return iconColors[Math.floor(Math.random() * iconColors.length)];
  }
  
  // Function to create FontAwesome icon SVG URL
  function createFontAwesomeIconUrl(icon: any): string {
    // Convert the icon's path data to an SVG string
    const path = icon.icon[4];
    const viewBox = `0 0 ${icon.icon[0]} ${icon.icon[1]}`;
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">
        <path d="${path}"></path>
      </svg>
    `;
    
    // Convert the SVG string to a data URL
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
      
    return `data:image/svg+xml;charset=UTF-8,${encoded}`;
  }
  
  // Function to handle image load errors
  function handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    // Pick a random icon from the fallback array
    const randomIndex = Math.floor(Math.random() * fallbackIcons.length);
    const selectedIcon = fallbackIcons[randomIndex];
    
    // Set the data URL as the image source
    const randomColor = getRandomColor();
    // Create a colorized SVG
    const path = selectedIcon.icon[4];
    const viewBox = `0 0 ${selectedIcon.icon[0]} ${selectedIcon.icon[1]}`;
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
        <rect width="100%" height="100%" fill="${randomColor}" opacity="0.2"/>
        <path d="${path}" fill="${randomColor}"></path>
      </svg>
    `;
    
    // Convert the SVG string to a data URL
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
      
    imgElement.src = `data:image/svg+xml;charset=UTF-8,${encoded}`;
    imgElement.classList.add("bg-gray-100", "dark:bg-gray-800");
  }
</script>

<div class="space-y-8">
  <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white">What people say about me!</h2>
  
  <!-- All reviews in a grid layout -->
  <div class="relative">
    <!-- Container with max-height on mobile -->
    <div class={`${isMobile ? 'relative overflow-hidden transition-all duration-500' : ''} ${containerExpanded ? 'max-h-[5000px]' : isMobile ? 'max-h-[600px]' : ''}`}>
      <!-- First row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {#each firstRowReviews as review, index}
          <div class="rounded-xl p-4">
            <div class="flex flex-col w-full">
              <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-2">
                {#if review.image}
                  <img class="rounded-lg h-10 w-10 object-cover" src={review.image} alt="Client from {review.company}" on:error={handleImageError} />
                {:else}
                  {@const fallback = getFallbackIcon('first', index)}
                  <div class="rounded-lg h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                    <div class="absolute inset-0 opacity-20" style="background-color: {fallback.color}"></div>
                    <FontAwesomeIcon icon={fallback.icon} class="h-7 w-7 z-10" style="color: {fallback.color}" />
                  </div>
                {/if}
                <div>
                  <h3 class="font-bold text-base text-gray-900 dark:text-white">{review.name}</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{review.company}</p>
                </div>
              </div>
              {#if review.profileUrl}
                <a 
                  href={review.profileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors ml-1" 
                  title="View profile"
                  aria-label="View {review.name}'s profile or recommendation"
                >
                  <FontAwesomeIcon icon={faExternalLink} class="h-3.5 w-3.5" />
                </a>
              {/if}
            </div>
            {#if review.rating}
              <div class="flex">
                {#each Array(review.rating) as _, i}
                  <FontAwesomeIcon icon={faStar} class="h-4 w-4 text-yellow-400" />
                {/each}
              </div>
            {/if}
          </div>
          <div class={`overflow-hidden transition-all duration-300 ${expandedReviews[`first-${index}`] ? 'max-h-[1000px]' : 'max-h-[100px]'}`}>
            <p class="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line">{review.content}</p>
          </div>
          <button 
            class="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-xs mt-2 focus:outline-none" 
            on:click={() => toggleExpanded('first', index)}
            aria-label={expandedReviews[`first-${index}`] ? "Collapse review" : "Expand review"}
          >
            {#if expandedReviews[`first-${index}`]}
              <FontAwesomeIcon icon={faChevronUp} class="h-3.5 w-3.5" />
              <span class="ml-1">Show less</span>
            {:else}
              <FontAwesomeIcon icon={faChevronDown} class="h-3.5 w-3.5" />
              <span class="ml-1">Show more</span>
            {/if}
          </button>
        </div>
      </div>
    {/each}
  </div>
  
    <!-- Second row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each secondRowReviews as review, index}
            <div class="rounded-xl p-4">
            <div class="flex flex-col w-full">
              <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-2">
                {#if review.image}
                  <img class="rounded-lg h-10 w-10 object-cover" src={review.image} alt="Client from {review.company}" on:error={handleImageError} />
                {:else}
                  {@const fallback = getFallbackIcon('first', index)}
                  <div class="rounded-lg h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                    <div class="absolute inset-0 opacity-20" style="background-color: {fallback.color}"></div>
                    <FontAwesomeIcon icon={fallback.icon} class="h-7 w-7 z-10" style="color: {fallback.color}" />
                  </div>
                {/if}
                <div>
                  <h3 class="font-bold text-base text-gray-900 dark:text-white">{review.name}</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{review.company}</p>
                </div>
              </div>
              {#if review.profileUrl}
                <a 
                  href={review.profileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors ml-1" 
                  title="View profile"
                  aria-label="View {review.name}'s profile or recommendation"
                >
                  <FontAwesomeIcon icon={faExternalLink} class="h-3.5 w-3.5" />
                </a>
              {/if}
            </div>
            {#if review.rating}
              <div class="flex">
                {#each Array(review.rating) as _, i}
                  <FontAwesomeIcon icon={faStar} class="h-4 w-4 text-yellow-400" />
                {/each}
              </div>
            {/if}
          </div>
          <div class={`overflow-hidden transition-all duration-300 ${expandedReviews[`second-${index}`] ? 'max-h-[1000px]' : 'max-h-[100px]'}`}>
            <p class="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line">{review.content}</p>
          </div>
          <button 
            class="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-xs mt-2 focus:outline-none" 
            on:click={() => toggleExpanded('second', index)}
            aria-label={expandedReviews[`second-${index}`] ? "Collapse review" : "Expand review"}
          >
            {#if expandedReviews[`second-${index}`]}
              <FontAwesomeIcon icon={faChevronUp} class="h-3.5 w-3.5" />
              <span class="ml-1">Show less</span>
            {:else}
              <FontAwesomeIcon icon={faChevronDown} class="h-3.5 w-3.5" />
              <span class="ml-1">Show more</span>
            {/if}
          </button>
        </div>
        </div>
      {/each}
    </div>
    
    <!-- Expand/collapse button for mobile only -->
    {#if isMobile}
      <!-- Fixed position button container at the bottom -->
      <div class="sticky bottom-4 left-0 right-0 flex justify-center z-10 mt-6">
        <button 
          class="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full text-gray-700 dark:text-gray-200 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105"
          on:click={toggleContainerExpanded}
          aria-expanded={containerExpanded}
          aria-controls="review-container"
        >
          <FontAwesomeIcon icon={containerExpanded ? faAngleUp : faAngleDown} class="h-6 w-6 animate-bounce" />
          <span class="font-medium">{containerExpanded ? 'Show less' : 'Show all reviews'}</span>
        </button>
      </div>
      
      <!-- Enhanced gradient overlay when collapsed -->
      {#if !containerExpanded}
        <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-black via-white/80 dark:via-black/80 to-transparent pointer-events-none"></div>
      {/if}
    {/if}
  </div>
  </div>
</div>
