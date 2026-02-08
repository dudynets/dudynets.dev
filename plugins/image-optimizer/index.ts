import type {Plugin, ResolvedConfig} from 'vite';
import path from 'node:path';
import type {ImageOptimizerOptions, ResolvedOptions} from './types';
import {scanHtmlForImages, consolidateSharedReferences} from './scanner';
import {processImages} from './processor';
import {transformHtml} from './transformer';

const DEFAULT_OPTIONS: ResolvedOptions = {
  publicDir: 'public',
  outputDir: '',
  webpQuality: 80,
  avifQuality: 65,
  extensions: ['png', 'jpg', 'jpeg'],
  verbose: false,
};

function resolveOptions(options: ImageOptimizerOptions = {}): ResolvedOptions {
  return {
    publicDir: options.publicDir ?? DEFAULT_OPTIONS.publicDir,
    outputDir: options.outputDir ?? DEFAULT_OPTIONS.outputDir,
    webpQuality: options.webpQuality ?? DEFAULT_OPTIONS.webpQuality,
    avifQuality: options.avifQuality ?? DEFAULT_OPTIONS.avifQuality,
    extensions: options.extensions ?? DEFAULT_OPTIONS.extensions,
    verbose: options.verbose ?? DEFAULT_OPTIONS.verbose,
  };
}

/**
 * Vite plugin for optimizing images.
 *
 * Features:
 * - Scans HTML for image tags with sizing query parameters (?w=X&h=Y)
 * - Resizes images to specified dimensions
 * - Generates WebP and AVIF variants for modern browsers
 * - Replaces img tags with picture elements for format fallback
 * - Handles same image at different sizes (unique output files)
 *
 * @example
 * ```ts
 * import {imageOptimizer} from './plugins/image-optimizer';
 *
 * export default defineConfig({
 *   plugins: [
 *     imageOptimizer({
 *       webpQuality: 85,
 *       avifQuality: 70,
 *     }),
 *   ],
 * });
 * ```
 */
export function imageOptimizer(
  userOptions: ImageOptimizerOptions = {},
): Plugin {
  const options = resolveOptions(userOptions);
  let config: ResolvedConfig;
  let projectRoot: string;

  const log = (message: string) => {
    if (options.verbose) {
      console.log(`[image-optimizer] ${message}`);
    }
  };

  return {
    name: 'vite-plugin-image-optimizer',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      projectRoot = config.root;
      log(`Project root: ${projectRoot}`);
    },

    async transformIndexHtml(html, ctx) {
      if (config.command !== 'build') return html;

      log('Scanning HTML for images...');
      const references = scanHtmlForImages(html, options.extensions);

      if (references.size === 0) {
        log('No processable images found');
        return html;
      }

      log(`Found ${references.size} unique image variants to process`);

      const sharedKeyMap = consolidateSharedReferences(references);
      if (sharedKeyMap.size > 0) {
        log(
          `Consolidated ${sharedKeyMap.size} shared references → ${references.size} variants to process`,
        );
      }

      const outputRoot = config.build.outDir
        ? path.isAbsolute(config.build.outDir)
          ? config.build.outDir
          : path.join(projectRoot, config.build.outDir)
        : path.join(projectRoot, 'dist');

      const processedImages = await processImages(
        references,
        options,
        projectRoot,
        outputRoot,
        log,
      );
      log(`Successfully processed ${processedImages.size} image variants`);

      const transformedHtml = transformHtml(
        html,
        processedImages,
        options,
        sharedKeyMap,
      );
      log('HTML transformation complete');

      return transformedHtml;
    },
  };
}

export type {ImageOptimizerOptions};
export default imageOptimizer;
