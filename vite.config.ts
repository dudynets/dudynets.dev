import {defineConfig} from 'vite';
import {imageOptimizer} from './plugins/image-optimizer/index.js';
import htmlMinifier from 'vite-plugin-html-minifier';
import autoprefixer from 'autoprefixer';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  server: {allowedHosts: true},
  plugins: [injectHTML(), imageOptimizer(), htmlMinifier({minify: true})],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
});
