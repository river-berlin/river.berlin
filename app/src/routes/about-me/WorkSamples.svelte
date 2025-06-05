<script lang="ts">
  import { onMount } from 'svelte';
  
  interface WorkSample {
    title: string;
    logo: string;
    description: string;
    details: string[];
    demoLink?: string;
    demoLabel?: string;
    codeLink?: string;
    codeLabel?: string;
    technologies: string[];
  }
  
  const samples: WorkSample[] = [
    {
      title: "Personal Website",
      logo: "/work-samples/website.svg",
      description: "My personal website built with SvelteKit",
      details: [
        "Responsive design that works on all devices",
        "Dark mode with automatic system detection and manual toggle",
        "Content filtering system for blogs, projects, and book reviews",
        "Dynamic blog system with markdown support",
        "SEO optimized with meta tags and structured data"
      ],
      demoLink: "https://river.berlin",
      demoLabel: "Live Website",
      codeLink: "https://github.com/yourusername/river.berlin",
      codeLabel: "View Code",
      technologies: ["SvelteKit", "TypeScript", "TailwindCSS", "Markdown"]
    },
    {
      title: "AI Image Generator",
      logo: "/work-samples/ai-image.svg",
      description: "Text-to-image generation application",
      details: [
        "Integration with Stable Diffusion models",
        "Custom prompt engineering interface",
        "Image history and favorites system",
        "Advanced settings for controlling generation parameters",
        "Optimized for performance with WebGL acceleration"
      ],
      demoLink: "https://ai-demo.example.com",
      demoLabel: "Live Demo",
      technologies: ["React", "Python", "PyTorch", "WebGL", "Flask"]
    },
    {
      title: "Data Visualization Dashboard",
      logo: "/work-samples/dashboard.svg",
      description: "Interactive analytics dashboard",
      details: [
        "Real-time data processing and visualization",
        "Customizable charts and graphs",
        "User-configurable dashboard layouts",
        "Data export in multiple formats",
        "Role-based access control system"
      ],
      technologies: ["D3.js", "Vue.js", "Node.js", "MongoDB", "Express"]
    }
  ];
  
  // Track selected sample for desktop view
  let selectedSample: WorkSample = samples[0];
  
  // Track expanded state for mobile view
  let expandedSamples: {[key: string]: boolean} = {};
  
  function selectSample(sample: WorkSample): void {
    selectedSample = sample;
  }
  
  function toggleExpanded(title: string): void {
    expandedSamples[title] = !expandedSamples[title];
    expandedSamples = {...expandedSamples}; // Trigger reactivity
  }
  
  onMount(() => {
    // Initialize all samples as collapsed in mobile view
    samples.forEach(sample => {
      expandedSamples[sample.title] = false;
    });
  });
</script>

<div class="space-y-6">
  <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Work Samples</h2>
  
  <!-- Desktop layout (two-part) -->
  <div class="hidden lg:flex gap-8 bg-white/30 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
    <!-- Left side: Samples list -->
    <div class="w-1/3 border-r border-gray-200 dark:border-gray-800 pr-6 space-y-4">
      {#each samples as sample, index}
        <button 
          class="flex items-center gap-4 w-full p-3 rounded-lg text-left transition-all
                 {selectedSample === sample ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
          on:click={() => selectSample(sample)}
          aria-current={selectedSample === sample ? 'true' : 'false'}
        >
          <div class="p-2 h-12 px-4 flex items-center justify-center rounded-md bg-white dark:bg-white flex-shrink-0">
            <img src={sample.logo} alt="{sample.title} logo" class="h-8 w-auto max-w-[100px]" />
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">{sample.title}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">{sample.description}</p>
          </div>
        </button>
      {/each}
    </div>
    
    <!-- Right side: Selected sample details -->
    <div class="w-2/3 pl-4">
      {#if selectedSample}
        <div class="space-y-4">
          <h3 class="font-bold text-xl text-gray-900 dark:text-white">{selectedSample.title}</h3>
          <ul class="list-disc ml-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            {#each selectedSample.details as detail}
              <li>{detail}</li>
            {/each}
          </ul>
          
          <div class="flex flex-wrap gap-2 mt-4">
            {#each selectedSample.technologies as tech}
              <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {tech}
              </span>
            {/each}
          </div>
          
          <div class="flex gap-4 mt-4">
            {#if selectedSample.demoLink}
              <a 
                href={selectedSample.demoLink} 
                class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {selectedSample.demoLabel || 'View Demo'}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            {/if}
            
            {#if selectedSample.codeLink}
              <a 
                href={selectedSample.codeLink} 
                class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {selectedSample.codeLabel || 'View Code'}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Mobile layout (logo tabs at top, selected content below) -->
  <div class="lg:hidden space-y-6">
    <!-- Logo tabs grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
      {#each samples as sample}
        <button 
          class="p-2 rounded-lg transition-all
                 {selectedSample === sample ? 'bg-gray-100 dark:bg-gray-800 shadow-md' : 'bg-white/50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/80'}"
          on:click={() => selectSample(sample)}
          aria-current={selectedSample === sample ? 'true' : 'false'}
          title={sample.title}
        >
          <div class="h-12 px-4 flex items-center justify-center rounded-md bg-white dark:bg-white">
            <img src={sample.logo} alt="{sample.title} logo" class="h-8 w-auto max-w-[100px]" />
          </div>
        </button>
      {/each}
    </div>
    
    <!-- Selected sample details -->
    <div class="bg-white/30 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
      {#if selectedSample}
        <div class="space-y-4">
          <div class="flex items-center gap-3 mb-4">
            <h3 class="font-bold text-xl text-gray-900 dark:text-white">{selectedSample.title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{selectedSample.description}</p>
          </div>
          
          <ul class="list-disc ml-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            {#each selectedSample.details as detail}
              <li>{detail}</li>
            {/each}
          </ul>
          
          <div class="flex flex-wrap gap-2 mt-4">
            {#each selectedSample.technologies as tech}
              <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {tech}
              </span>
            {/each}
          </div>
          
          <div class="flex gap-4 mt-4">
            {#if selectedSample.demoLink}
              <a 
                href={selectedSample.demoLink} 
                class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {selectedSample.demoLabel || 'View Demo'}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            {/if}
            
            {#if selectedSample.codeLink}
              <a 
                href={selectedSample.codeLink} 
                class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {selectedSample.codeLabel || 'View Code'}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
