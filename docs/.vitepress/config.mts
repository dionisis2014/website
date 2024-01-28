import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "dionisis.xyz",
	description: "Projects of a random guy on the interwebs",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Projects', link: '/projects/' }
		],

		sidebar: {
			'/projects/': [
				{
					text: 'Projects',
					items: [
						{ text: 'Arch Linux on Radxa Zero', link: '/projects/arch-on-radxa/' },
						{ text: 'Notifier', link: '/projects/notifier/' }
					]
				}
			]
		},

		search: {
			provider: 'local'
		},

		lastUpdated: true
	},
	sitemap: {
		hostname: 'https://www.dionisis.xyz'
	}
})
