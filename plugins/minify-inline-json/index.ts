import type {Plugin} from 'vite';

const JSON_SCRIPT_REGEX =
  /<script\s+type="(application\/ld\+json|speculationrules)"\s*>([\s\S]*?)<\/script>/gi;

/**
 * Minifies JSON inside <script type="application/ld+json"> and
 * <script type="speculationrules"> tags.
 * Parses and re-serializes with no whitespace to reduce HTML size.
 */
export function minifyInlineJson(): Plugin {
  return {
    name: 'minify-inline-json',
    enforce: 'pre',

    transformIndexHtml(html) {
      return html.replace(JSON_SCRIPT_REGEX, (_full, type, jsonContent) => {
        const trimmed = jsonContent.trim();
        if (!trimmed) return _full;

        try {
          const parsed = JSON.parse(trimmed);
          const minified = JSON.stringify(parsed);

          return `<script type="${type}">${minified}</script>`;
        } catch {
          return _full;
        }
      });
    },
  };
}
