<script lang="ts">
  import { onMount } from 'svelte';
  
  interface WorkExperience {
    company: string;
    logo: string;
    period: string;
    title: string;
    responsibilities: string[];
    location: string;
    website: string;
    websiteLabel: string;
  }
  
  const experiences: WorkExperience[] = [
    {
      company: "RunPod",
      logo: "/company-logos/runpod.svg",
      period: "2023 - 2025",
      title: "Software Engineer, Expert Technical Support Executive",
      responsibilities: [
        "Helped RunPod grow to a customer base of 1 Million+ customers",
        "Worked with a company that received $20M in seed funding from Intel",
        "Developed large language models and text-to-image models",
        "Consulted thousands of organizations on GPU-based VM deployments",
        "Helped customers deploy and organize ML models, CUDA libraries, and diffusers",
        "Fine-tuned and managed LLMs (Llama 3.3, Llama, T5) and image models (Stable Diffusion, Flux)",
        "Optimized model deployment using PyTorch, Hugging Face, and raw CUDA code",
        "Created technical blog articles on SSH authentication, AI language learning, and Docker solutions",
        "Wrote comprehensive documentation for RunPod's Python library"
      ],
      location: "Berlin, Germany · Remote (Full-time, 40 hours/week)",
      website: "https://www.runpod.io",
      websiteLabel: "RunPod Website"
    },
    {
      company: "Upwork",
      logo: "/company-logos/upwork.png",
      period: "2019 - 2022",
      title: "Software Engineer",
      responsibilities: [
        "Created and managed websites for 20+ clients",
        "Built and managed data extraction pipelines to automatically update administrators of product changes",
        "Worked on scraping and managing real estate dealings, parsing 20,000+ real estate dealings",
        "Optimized deal management processes, reducing manual labor from weeks to minutes",
        "Implemented Twilio APIs to automatically email or SMS users with new information",
        "Developed complex routing for automatic emailing pipelines",
        "Built systems that led to millions of dollars in profit for real estate companies",
        "Designed and implemented end-to-end solutions for data extraction and automation"
      ],
      location: "Contract - Full time (40 hours/week)",
      website: "https://www.upwork.com/freelancers/~01743d8599b93d48c7",
      websiteLabel: "Upwork Profile"
    },
    {
      company: "Auditional",
      logo: "/company-logos/auditional.svg",
      period: "Jan 2022 - Jan 2023",
      title: "Data Extraction Engineer & Bot Developer",
      responsibilities: [
        "Increased actor performance and scheduling rates by 4x through automated systems",
        "Designed and implemented sophisticated data extraction pipelines for talent management",
        "Built intelligent scheduling bots that significantly reduced booking times",
        "Developed APIs to connect various platforms in the talent management ecosystem",
        "Created automated notification systems for casting opportunities",
        "Optimized backend processes resulting in faster talent discovery and placement",
        "Integrated AI-based recommendation systems for matching talents with opportunities"
      ],
      location: "Remote (Contract)",
      website: "https://www.auditional.com",
      websiteLabel: "Auditional Website"
    },
    {
      company: "Repunzel",
      logo: "/company-logos/repunzel.svg",
      period: "2020 - 2023",
      title: "Full Stack Web Developer",
      responsibilities: [
        "Reduced actor hiring time by 300% for LA-based actors via optimized agent listings and submissions",
        "Worked on creating an interface to email 1000+ agents and actors",
        "Built both frontend and backend with Svelte, Python, Flask, and Cloudflare",
        "Designed CI/CD pipelines to ensure non-failing and resilient architecture, decreasing mis-emailed agents by 200%",
        "Created automated email testing and tracking mechanisms to aggregate data for actors",
        "Optimized systems reducing 8 hours of manual work per week to a 30-second application",
        "Developed frontend architectures to improve user experiences and reduce unexpected emailing errors",
        "Performed load validation to ensure system resource constraints were not exceeded",
        "Implemented reliable scheduling and cancellation of tasks using RabbitMQ and Python"
      ],
      location: "Full time (40 hours/week)",
      website: "https://repunzel.com/",
      websiteLabel: "Repunzel Website"
    }
  ];
  
  // Track selected company for desktop view
  let selectedCompany: WorkExperience = experiences[0];
  
  // Track expanded state for mobile view
  let expandedCompanies: {[key: string]: boolean} = {};
  
  function selectCompany(company: WorkExperience): void {
    selectedCompany = company;
  }
  
  function toggleExpanded(company: string): void {
    expandedCompanies[company] = !expandedCompanies[company];
    expandedCompanies = {...expandedCompanies}; // Trigger reactivity
  }
  
  onMount(() => {
    // Initialize all companies as collapsed in mobile view
    experiences.forEach(exp => {
      expandedCompanies[exp.company] = false;
    });
  });
</script>

<div class="space-y-6">
  <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Work Experience</h2>
  
  <!-- Desktop layout (two-part) -->
  <div class="hidden lg:flex gap-8 bg-white/30 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
    <!-- Left side: Companies list -->
    <div class="w-1/3 border-r border-gray-200 dark:border-gray-800 pr-6 space-y-4">
      {#each experiences as experience, index}
        <button 
          class="flex items-center gap-4 w-full p-3 rounded-lg text-left transition-all
                 {selectedCompany === experience ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
          on:click={() => selectCompany(experience)}
          aria-current={selectedCompany === experience ? 'true' : 'false'}
        >
          <div class="p-2 h-12 px-4 flex items-center justify-center rounded-md bg-white dark:bg-white flex-shrink-0">
            <img src={experience.logo} alt="{experience.company} logo" class="h-8 w-auto max-w-[100px]" />
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">{experience.company}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">{experience.period}</p>
          </div>
        </button>
      {/each}
    </div>
    
    <!-- Right side: Selected company details -->
    <div class="w-2/3 pl-4">
      {#if selectedCompany}
        <div class="space-y-4">
          <h3 class="font-bold text-xl text-gray-900 dark:text-white">{selectedCompany.title}</h3>
          <ul class="list-disc ml-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            {#each selectedCompany.responsibilities as responsibility}
              <li>{responsibility}</li>
            {/each}
          </ul>
          <p class="text-sm text-gray-500 dark:text-gray-400">{selectedCompany.location}</p>
          <a 
            href={selectedCompany.website} 
            class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {selectedCompany.websiteLabel}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Mobile layout (logo tabs at top, selected content below) -->
  <div class="lg:hidden space-y-6">
    <!-- Logo tabs grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
      {#each experiences as experience}
        <button 
          class="p-2 rounded-lg transition-all
                 {selectedCompany === experience ? 'bg-gray-100 dark:bg-gray-800 shadow-md' : 'bg-white/50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/80'}"
          on:click={() => selectCompany(experience)}
          aria-current={selectedCompany === experience ? 'true' : 'false'}
          title={experience.company}
        >
          <div class="h-12 px-4 flex items-center justify-center rounded-md bg-white dark:bg-white">
            <img src={experience.logo} alt="{experience.company} logo" class="h-8 w-auto max-w-[100px]" />
          </div>
        </button>
      {/each}
    </div>
    
    <!-- Selected company details -->
    <div class="bg-white/30 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
      {#if selectedCompany}
        <div class="space-y-4">
          <div class="flex items-center gap-3 mb-4">
            <h3 class="font-bold text-xl text-gray-900 dark:text-white">{selectedCompany.company}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{selectedCompany.period}</p>
          </div>
          
          <h4 class="font-medium text-gray-800 dark:text-gray-200">{selectedCompany.title}</h4>
          
          <ul class="list-disc ml-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            {#each selectedCompany.responsibilities as responsibility}
              <li>{responsibility}</li>
            {/each}
          </ul>
          
          <p class="text-sm text-gray-500 dark:text-gray-400">{selectedCompany.location}</p>
          
          <a 
            href={selectedCompany.website} 
            class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {selectedCompany.websiteLabel}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      {/if}
    </div>
  </div>
</div>


