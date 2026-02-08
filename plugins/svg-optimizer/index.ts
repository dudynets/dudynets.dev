import type {Plugin, ResolvedConfig} from 'vite';
import {optimize} from 'svgo';
import fs from 'node:fs';
import path from 'node:path';

export interface SvgOptimizerOptions {
  /** Run only during production build. Default: true */
  buildOnly?: boolean;
  /** SVGO options (see https://github.com/svgo/svgo) */
  svgoOptions?: import('svgo').Config;
  /** Log progress and summary. Default: false */
  verbose?: boolean;
}

const DEFAULT_OPTIONS = {
  buildOnly: true,
  verbose: false,
};

function resolveOptions(userOptions: SvgOptimizerOptions = {}) {
  return {
    buildOnly: userOptions.buildOnly ?? DEFAULT_OPTIONS.buildOnly,
    svgoOptions: userOptions.svgoOptions ?? {},
    verbose: userOptions.verbose ?? DEFAULT_OPTIONS.verbose,
  };
}

/**
 * Vite plugin that minifies SVG files in the build output.
 *
 * - Minifies all .svg files in the output directory (including those copied from public).
 * - When SVG is imported with ?raw, minifies the in-bundle string.
 *
 * @example
 * ```ts
 * import { svgOptimizer } from './plugins/svg-optimizer';
 *
 * export default defineConfig({
 *   plugins: [
 *     svgOptimizer({ verbose: true }),
 *   ],
 * });
 * ```
 */
export function svgOptimizer(userOptions: SvgOptimizerOptions = {}): Plugin {
  const options = resolveOptions(userOptions);
  let config: ResolvedConfig;
  let outDir: string;

  const log = (message: string) => {
    if (options.verbose) {
      console.log(`[svg-optimizer] ${message}`);
    }
  };

  async function minifySvgInDir(dir: string): Promise<number> {
    let count = 0;
    const entries = await fs.promises.readdir(dir, {withFileTypes: true});

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        count += await minifySvgInDir(fullPath);
        continue;
      }

      if (!entry.name.endsWith('.svg')) continue;

      try {
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        const result = optimize(content, {
          path: fullPath,
          ...options.svgoOptions,
        });
        if (result.data !== content) {
          await fs.promises.writeFile(fullPath, result.data, 'utf-8');
          count++;
        }
      } catch (err) {
        if (options.verbose) {
          console.warn(`[svg-optimizer] Failed to minify ${fullPath}:`, err);
        }
      }
    }

    return count;
  }

  return {
    name: 'vite-plugin-svg-optimizer',
    enforce: 'post',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      const root = config.root;
      const out = config.build.outDir;
      outDir = path.isAbsolute(out) ? out : path.join(root, out);
    },

    transform(code, id) {
      if (options.buildOnly && config.command !== 'build') return null;
      if (!/\.svg(\?|$)/.test(id) || !id.includes('?raw')) return null;

      try {
        const result = optimize(code, {
          path: id,
          ...options.svgoOptions,
        });
        return {code: result.data, map: null};
      } catch {
        return null;
      }
    },

    async closeBundle() {
      if (options.buildOnly && config.command !== 'build') return;
      if (!outDir || !fs.existsSync(outDir)) return;

      const count = await minifySvgInDir(outDir);
      if (count > 0) {
        log(`Minified ${count} SVG file(s)`);
      }
    },
  };
}

export default svgOptimizer;
