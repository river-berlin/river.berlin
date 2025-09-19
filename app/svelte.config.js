import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import {getBlogs, getBookTakeaways, getProjects} from './src/lib/server/get-contents.js'

const currentDir = process.cwd();
const blogs = await getBlogs(false, path.join(currentDir, "/src/things"))
const blogUrls = blogs.map(blog => "/blog/" + blog.metadata.url)

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		alias: {
			'$things': 'src/things',
		},
		prerender: {
			entries : ["*", ...blogUrls]
		}
	}
};

export default config;
