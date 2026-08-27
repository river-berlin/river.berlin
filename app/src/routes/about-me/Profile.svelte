<script lang="ts">
	import { library } from '@fortawesome/fontawesome-svg-core';
	import { faPenToSquare, faCalendarDays, faFilePdf } from '@fortawesome/free-solid-svg-icons';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

	library.add(faPenToSquare, faCalendarDays, faFilePdf);

	export let scrollToContact: () => void;
</script>

<div class="flex justify-center p-6 rounded-xl max-w-3xl mx-auto">
	<div class="flex flex-col md:flex-row items-center gap-8">
		<img src="/me.jpg" alt="Aditya Shankar" class="w-48 h-48 rounded-2xl object-cover shadow-md shrink-0" />
		<div class="mt-3 text-lg text-center md:text-left space-y-3">
			<h1 class="text-2xl font-bold">Hi there! 👋</h1>
			<p class="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
				I am <span class="font-bold text-slate-900 dark:text-white">Aditya Shankar</span>, a 
				<span class="font-bold text-slate-900 dark:text-white">Full-Stack Software Engineer</span> with around 7 years of experience based in Berlin. I work with TypeScript and Python across frontend, backend, and GPU/AI infrastructure, and I am currently in university studying 
				<span class="font-bold text-slate-900 dark:text-white">Artificial Intelligence</span>.
			</p>

			<!-- Vertically centered resumé callout with Deutsch ahead of English -->
			<div class="pt-1 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 text-sm">
				<span class="font-medium text-slate-600 dark:text-slate-400">I'm looking for work, here is my resumé:</span>
				
				<!-- Two-parter unified resume button with shared icon & diagonal cut -->
				<div class="inline-flex items-stretch rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90 shadow-xs overflow-hidden shrink-0 h-[34px] select-none">
					<!-- Shared PDF Icon on the left -->
					<div class="flex items-center justify-center px-2.5 bg-slate-200/90 dark:bg-slate-700/90 text-rose-500 border-r border-slate-300 dark:border-slate-700 z-20 shrink-0">
						<FontAwesomeIcon icon={faFilePdf} class="h-3.5 w-3.5" />
					</div>

					<!-- Split diagonal buttons container: Deutsch then English -->
					<div class="relative flex items-stretch">
						<!-- Deutsch Button (Left side, cut on right matching forward slash /) -->
						<a
							href="/Lebenslauf_Aditya_Shankar_DE-1.pdf"
							target="_blank"
							rel="noopener noreferrer"
							class="resume-btn resume-btn-left flex items-center text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-slate-700/80 active:bg-blue-200 dark:active:bg-slate-600 transition-colors font-bold z-10"
							title="Lebenslauf auf Deutsch herunterladen (PDF)"
						>
							<span>Deutsch</span>
						</a>

						<!-- Full-height diagonal dividing line -->
						<div class="diagonal-divider-line pointer-events-none select-none"></div>

						<!-- English Button (Right side, cut on left matching forward slash /) -->
						<a
							href="/CV_Aditya_Shankar_EN-4.pdf"
							target="_blank"
							rel="noopener noreferrer"
							class="resume-btn resume-btn-right flex items-center text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-slate-700/80 active:bg-blue-200 dark:active:bg-slate-600 transition-colors font-bold z-10"
							title="Download English Resumé (PDF)"
						>
							<span>English</span>
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Hire Me & Contact Callouts -->
<div class="flex flex-col sm:flex-row items-center justify-center gap-3 -mt-4">
	<p class="text-lg font-medium">Want to hire me?</p>
	<button
		on:click={scrollToContact}
		class="group flex items-center gap-3 px-5 py-2.5 bg-blue-600 dark:bg-transparent text-white dark:text-blue-400 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-900/50 hover:border-black dark:hover:text-white dark:hover:border-white border-0 dark:border dark:border-blue-400 transition-all duration-700 active:scale-95"
	>
		<span>Contact me</span>
		<FontAwesomeIcon icon={faPenToSquare} class="h-4 w-4" />
	</button>
	<a
		href="/meet"
		class="group flex items-center gap-3 px-5 py-2.5 bg-emerald-600 dark:bg-transparent text-white dark:text-emerald-400 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-900/50 hover:border-black dark:hover:text-white dark:hover:border-white border-0 dark:border dark:border-emerald-400 transition-all duration-700 no-underline active:scale-95"
	>
		<span>Book a meeting with me</span>
		<FontAwesomeIcon icon={faCalendarDays} class="h-4 w-4" />
	</a>
</div>

<style>
	.resume-btn {
		cursor: pointer;
		user-select: none;
	}

	.resume-btn:active {
		transform: scale(0.98);
	}

	.resume-btn-left {
		clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
		padding-left: 13px;
		padding-right: 17px;
		margin-right: -4px;
	}

	.resume-btn-right {
		clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%);
		padding-left: 17px;
		padding-right: 13px;
		margin-left: -4px;
	}

	.diagonal-divider-line {
		width: 1.5px;
		background-color: rgb(203 213 225); /* slate-300 */
		transform: skewX(-14deg);
		height: 100%;
		z-index: 20;
	}

	:global(.dark) .diagonal-divider-line {
		background-color: rgb(71 85 105); /* slate-600 */
	}
</style>
