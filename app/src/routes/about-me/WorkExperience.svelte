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
      title: "Software Engineer",
      responsibilities: [
        "A cloud provider specialized for AI services, valued at $1B with over 1 million customers on the platform. One of the first engineers hired and led a team of four.",
        "Fine-tuned and deployed large language models and diffusion models; advised 1,200 organizations and customers on deploying, optimizing, and productionizing GPU-based VM deployments.",
        "Worked with PyTorch and Hugging Face Transformers as well as native CUDA code to optimize model deployment.",
        "Optimized S3 connections, network storage, and Hugging Face model caching across thousands of machines.",
        "Wrote numerous technical blog articles for RunPod as well as large parts of the developer documentation for RunPod's Python library."
      ],
      location: "Berlin, Germany · Remote (Full-time 2023–2024, 20 h/week alongside B.Sc. 2024–2025)",
      website: "https://www.runpod.io",
      websiteLabel: "RunPod Website"
    },
    {
      company: "Repunzel",
      logo: "/company-logos/repunzel.svg",
      period: "2020 - 2023",
      title: "Full-Stack Developer",
      responsibilities: [
        "Built a submission pipeline letting actors send their portfolios to over 1,000 agencies instantly, considerably improving their chances of being hired.",
        "Worked across frontend and backend with Svelte, TypeScript, Python, Flask, Postgres, and Firebase.",
        "Developed CI/CD pipelines for a fail-safe, resilient architecture; automated email validation, delivery tracking, and test environments.",
        "Built automated email testing and tracking to aggregate data for actors, reducing 8 hours of manual work per week to a 30-second application.",
        "Designed architecture for reliable scheduling and cancellation of tasks using RabbitMQ and Python."
      ],
      location: "Full-time (40 h/week)",
      website: "https://repunzel.com/",
      websiteLabel: "Repunzel Website"
    },
    {
      company: "TypeCodeLearn",
      logo: "/favicon.svg",
      period: "2019 - 2020",
      title: "Full-Stack Developer & Tutor",
      responsibilities: [
        "Taught Data Science, NumPy, Pandas, yfinance, and Python courses to students to specialize students in automated trading applications.",
        "Replaced all manual transaction handling with automatically documented, Stripe-based online payments.",
        "Managed OAuth, email, SMS, SendGrid, Twilio, Stripe, and Google Ads integrations.",
        "Created and maintained Python course curriculum and content."
      ],
      location: "Contract, freelance",
      website: "https://river.berlin",
      websiteLabel: "TypeCodeLearn"
    },
    {
      company: "Freelance",
      logo: "/company-logos/upwork.png",
      period: "2019 - 2022",
      title: "Freelance Software Engineer",
      responsibilities: [
        "Built and maintained websites for over 20 clients.",
        "Scraped and analyzed over 20,000 real-estate transactions to identify optimal deals, reducing weeks of manual work to minutes.",
        "Served as Undergraduate Teaching Assistant at Arizona State University for 2 semesters."
      ],
      location: "Contract · upwork.com",
      website: "https://www.upwork.com/freelancers/~01743d8599b93d48c7",
      websiteLabel: "Upwork Profile"
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
  <div class="hidden lg:flex gap-8 rounded-xl p-4">
    <!-- Left side: Companies list -->
    <div class="w-1/3 border-r border-gray-200 dark:border-white pr-6 space-y-4">
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
    <div class="w-2/3 pl-4 h-[400px]">
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


