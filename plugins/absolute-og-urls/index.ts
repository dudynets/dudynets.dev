import type {Plugin} from 'vite';

const SITE_URL = 'https://dudynets.dev';

const OG_META_REGEX =
  /<meta\s+(?=[^>]*(?:property="og:image"|name="twitter:image"))[^>]*content="(\/[^"]+)"[^>]*>/g;

export function absoluteOgUrls(): Plugin {
  return {
    name: 'absolute-og-urls',
    enforce: 'post',

    transformIndexHtml(html) {
      return html.replace(OG_META_REGEX, (match, path) =>
        match.replace(path, `${SITE_URL}${path}`),
      );
    },
  };
}
