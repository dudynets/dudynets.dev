import type {ImageParams, ImageReference} from './types';

export const IMG_TAG_REGEX = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
export const IMAGE_ATTR_REGEX =
  /((?:src|href|content)\s*=\s*["'])([^"']+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^"']*)?)(['"])/gi;

export const OPTIMIZE_REGEX = /[?&]optimize=true/i;
export const PARAMS_REGEX = /[?&](?:w|width)=(\d+)|[?&](?:h|height)=(\d+)/gi;

export function parseImageParams(src: string): ImageParams {
  const params: ImageParams = {};

  PARAMS_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PARAMS_REGEX.exec(src)) !== null) {
    if (match[1]) params.width = parseInt(match[1], 10);
    if (match[2]) params.height = parseInt(match[2], 10);
  }

  params.optimize = OPTIMIZE_REGEX.test(src);

  return params;
}

export function hasOptimizeFlag(src: string): boolean {
  return OPTIMIZE_REGEX.test(src);
}

export function getCleanPath(src: string): string {
  const queryIndex = src.indexOf('?');
  return queryIndex === -1 ? src : src.substring(0, queryIndex);
}

export function generateVariantKey(
  cleanPath: string,
  params: ImageParams,
): string {
  const parts = [cleanPath];

  if (params.width) parts.push(`w${params.width}`);
  if (params.height) parts.push(`h${params.height}`);

  return parts.join('-');
}

export function isProcessableImage(
  path: string,
  extensions: string[],
): boolean {
  const cleanPath = getCleanPath(path).toLowerCase();
  return extensions.some((ext) => cleanPath.endsWith(`.${ext}`));
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http') || url.startsWith('//');
}

/**
 * Scan HTML for all image references with optimize=true flag.
 * Returns a Map to deduplicate images used multiple times with same params.
 */
export function scanHtmlForImages(
  html: string,
  extensions: string[],
): Map<string, ImageReference> {
  const references = new Map<string, ImageReference>();

  IMG_TAG_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = IMG_TAG_REGEX.exec(html)) !== null) {
    const originalSrc = match[1];

    if (isExternalUrl(originalSrc)) continue;
    if (!isProcessableImage(originalSrc, extensions)) continue;
    if (!hasOptimizeFlag(originalSrc)) continue;

    const cleanPath = getCleanPath(originalSrc);
    const params = parseImageParams(originalSrc);
    const variantKey = generateVariantKey(cleanPath, params);

    if (!references.has(variantKey)) {
      references.set(variantKey, {
        originalSrc,
        cleanPath,
        params,
        variantKey,
        isImgTag: true,
      });
    }
  }

  IMAGE_ATTR_REGEX.lastIndex = 0;

  while ((match = IMAGE_ATTR_REGEX.exec(html)) !== null) {
    const originalSrc = match[2];

    if (isExternalUrl(originalSrc)) continue;
    if (!isProcessableImage(originalSrc, extensions)) continue;
    if (!hasOptimizeFlag(originalSrc)) continue;

    const cleanPath = getCleanPath(originalSrc);
    const params = parseImageParams(originalSrc);
    const variantKey = generateVariantKey(cleanPath, params);

    if (!references.has(variantKey)) {
      references.set(variantKey, {
        originalSrc,
        cleanPath,
        params,
        variantKey,
        isImgTag: false,
      });
    }
  }

  return references;
}

export function getAllMatchingSrcs(
  html: string,
  variantKey: string,
  extensions: string[],
): string[] {
  const srcs: string[] = [];

  IMG_TAG_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = IMG_TAG_REGEX.exec(html)) !== null) {
    const originalSrc = match[1];
    const cleanPath = getCleanPath(originalSrc);

    if (!isProcessableImage(cleanPath, extensions)) continue;

    const params = parseImageParams(originalSrc);
    const key = generateVariantKey(cleanPath, params);

    if (key === variantKey && !srcs.includes(originalSrc)) {
      srcs.push(originalSrc);
    }
  }

  return srcs;
}
