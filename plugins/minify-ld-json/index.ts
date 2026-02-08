import type {Plugin} from 'vite';

const LD_JSON_SCRIPT_REGEX =
  /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;

/**
 * Minifies JSON inside <script type="application/ld+json"> tags.
 * Parses and re-serializes with no whitespace to reduce HTML size.
 */
export function minifyLdJson(): Plugin {
  return {
    name: 'minify-ld-json',
    enforce: 'pre',

    transformIndexHtml(html) {
      return html.replace(LD_JSON_SCRIPT_REGEX, (_full, jsonContent) => {
        const trimmed = jsonContent.trim();
        if (!trimmed) return _full;

        try {
          const parsed = JSON.parse(trimmed);
          const minified = JSON.stringify(parsed);

          return `<script type="application/ld+json">${minified}</script>`;
        } catch {
          return _full;
        }
      });
    },
  };
}
