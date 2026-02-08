import {defineConfig} from 'vite';
import {imageOptimizer} from './plugins/image-optimizer';
import {minifyLdJson} from './plugins/minify-ld-json';
import {svgOptimizer} from './plugins/svg-optimizer';
import {cssBeforeJS} from './plugins/css-before-js';
import htmlMinifier from 'vite-plugin-html-minifier';
import autoprefixer from 'autoprefixer';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  server: {allowedHosts: true},
  plugins: [
    injectHTML(),
    imageOptimizer(),
    minifyLdJson(),
    svgOptimizer({svgoOptions: {multipass: true}}),
    cssBeforeJS(),
    htmlMinifier({minify: true}),
  ],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
});
