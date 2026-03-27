import {defineConfig} from 'vite';
import {execSync} from 'child_process';
import {imageOptimizer} from './plugins/image-optimizer';
import {minifyInlineJson} from './plugins/minify-inline-json';
import {svgOptimizer} from './plugins/svg-optimizer';
import {cssBeforeJS} from './plugins/css-before-js';
import {absoluteOgUrls} from './plugins/absolute-og-urls';
import htmlMinifier from 'vite-plugin-html-minifier';
import autoprefixer from 'autoprefixer';
import injectHTML from 'vite-plugin-html-inject';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash),
  },
  server: {allowedHosts: true},
  plugins: [
    injectHTML(),
    imageOptimizer(),
    minifyInlineJson(),
    svgOptimizer({svgoOptions: {multipass: true}}),
    cssBeforeJS(),
    absoluteOgUrls(),
    htmlMinifier({minify: true}),
  ],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
});
