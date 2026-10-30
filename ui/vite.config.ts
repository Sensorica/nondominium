import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import extractorSvelte from '@unocss/extractor-svelte';

const uiRoot = path.dirname(fileURLToPath(import.meta.url));
/** Pin to the sibling design-system `release-prototype` checkout (not master). */
const ndoUiPkg = path.resolve(uiRoot, '../../nondominium-design-system/packages/ndo-ui');
const ndoUiSrc = path.resolve(ndoUiPkg, 'src');
const ndoUiStyles = path.resolve(ndoUiPkg, 'styles');

export default defineConfig({
  plugins: [
    UnoCSS({ extractors: [extractorSvelte()] }),
    sveltekit()
  ],
  resolve: {
    alias: [
      // More specific first: CSS `@import '@nondominium/ndo-ui/styles/tokens.css'`
      // must not resolve under the JS entry file path.
      { find: '@nondominium/ndo-ui/styles', replacement: ndoUiStyles },
      { find: '@nondominium/ndo-ui', replacement: ndoUiSrc }
    ]
  },
  server: {
    fs: {
      allow: [path.resolve(uiRoot, '../..'), path.resolve(uiRoot, '../../nondominium-design-system')]
    }
  }
});
