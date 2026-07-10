import type { Preview } from '@storybook/web-components-vite';
import { html } from 'lit';

import '../src/globe-chart';

const THEME_BG: Record<string, string> = {
	light: '#f4f8fc',
	dark: '#060e18',
};

const preview: Preview = {
	parameters: {
		controls: { expanded: true },
		layout: 'fullscreen',
		backgrounds: { disable: true },
	},
	globalTypes: {
		theme: {
			description: 'globe-chart light / dark theme',
			toolbar: {
				title: 'Theme',
				icon: 'paintbrush',
				items: [
					{ value: 'light', title: 'Light', icon: 'sun' },
					{ value: 'dark', title: 'Dark', icon: 'moon' },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		theme: 'light',
	},
	decorators: [
		(story, context) => {
			// Drop any prior <globe-chart> nodes left in the preview document so
			// story switches do not accumulate WebGL contexts.
			for (const node of document.querySelectorAll('globe-chart')) {
				node.remove();
			}

			const theme = (context.globals.theme as string) === 'dark' ? 'dark' : 'light';
			const bg = THEME_BG[theme];

			document.body.style.background = bg;
			document.body.style.colorScheme = theme;
			const root = document.getElementById('storybook-root');
			if (root) {
				root.style.background = bg;
				root.style.minHeight = '100%';
			}

			return html`
				<div
					style="min-height:100vh;box-sizing:border-box;background:${bg};color-scheme:${theme}"
					data-theme=${theme}
				>
					${story()}
				</div>
			`;
		},
	],
};

export default preview;
