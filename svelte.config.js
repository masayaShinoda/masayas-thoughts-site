/** @type {import('@sveltejs/kit').Config} */
import sveltePreprocess from 'svelte-preprocess'
import adapter from '@sveltejs/adapter-static'
// import vercel from '@sveltejs/adapter-vercel';
import { mdsvex } from 'mdsvex'

const config = {
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter()
	},
	extensions: ['.svelte', '.md'],

	preprocess: [
	  sveltePreprocess(),
	  mdsvex({
		extensions: ['.md'],
		layout: {
			article: 'src/routes/_post.svelte'
		}
	  })
	]
};

export default config;
