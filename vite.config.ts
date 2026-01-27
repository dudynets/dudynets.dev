import {defineConfig} from 'vite';
import {imageOptimizer} from './plugins/image-optimizer/index.js';
import htmlMinifier from 'vite-plugin-html-minifier';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  server: {allowedHosts: true},
  plugins: [imageOptimizer(), htmlMinifier({minify: true})],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
});
