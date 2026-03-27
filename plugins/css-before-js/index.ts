import type {Plugin} from 'vite';

/**
 * Vite plugin to ensure stylesheet is requested before JS so CSS isn't delayed
 * by script parsing, and to add modulepreload hints that eliminate the
 * critical request chain (HTML → JS).
 */
export function cssBeforeJS(): Plugin {
  return {
    name: 'css-before-js',
    enforce: 'post',

    transformIndexHtml(html) {
      const linkRegex = /<link\s+rel="stylesheet"[^>]*href="[^"]+"[^>]*>/i;
      const scriptRegex =
        /<script\s+type="module"[^>]*src="[^"]+"[^>]*><\/script>/i;
      const srcRegex = /src="([^"]+)"/;

      const linkMatch = html.match(linkRegex);
      const scriptMatch = html.match(scriptRegex);
      if (!scriptMatch) return html;

      const linkTag = linkMatch?.[0];
      const [scriptTag] = scriptMatch;

      const srcMatch = scriptTag.match(srcRegex);
      const modulePreloadTag = srcMatch
        ? `<link rel="modulepreload" href="${srcMatch[1]}">`
        : '';

      let result = html;

      if (linkTag) result = result.replace(linkTag, '');
      result = result.replace(scriptTag, '');

      const headInsert = [modulePreloadTag, linkTag, scriptTag]
        .filter(Boolean)
        .join('\n');

      return result.replace('</head>', `${headInsert}\n</head>`);
    },
  };
}
