import type {Plugin} from 'vite';

/**
 * Vite plugin to ensure stylesheet is requested before JS so CSS isn't delayed by script parsing.
 */
export function cssBeforeJS(): Plugin {
  return {
    name: 'css-before-js',
    enforce: 'post',

    transformIndexHtml(html) {
      const linkRegex = /<link\s+rel="stylesheet"[^>]*href="[^"]+"[^>]*>/i;
      const scriptRegex =
        /<script\s+type="module"[^>]*src="[^"]+"[^>]*><\/script>/i;

      const linkMatch = html.match(linkRegex);
      const scriptMatch = html.match(scriptRegex);
      if (!linkMatch || !scriptMatch) return html;

      const [linkTag] = linkMatch;
      const [scriptTag] = scriptMatch;

      return html
        .replace(linkTag, '')
        .replace(scriptTag, '')
        .replace('</head>', `${linkTag}\n${scriptTag}\n</head>`);
    },
  };
}
