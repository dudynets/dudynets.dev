import type {ImageParams, ImageReference} from './types';

export const IMG_TAG_REGEX = /<img\s+([^>]*)>/gi;
const SRC_FROM_ATTRS_REGEX = /src\s*=\s*["']([^"']+)["']/i;
export const IMAGE_ATTR_REGEX =
  /((?:src|href|content)\s*=\s*["'])([^"']+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^"']*)?)(['"])/gi;

export const OPTIMIZE_REGEX = /[?&]optimize=true/i;
export const SHARED_REGEX = /[?&]shared=true/i;
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
  params.shared = SHARED_REGEX.test(src);

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
    const attrString = match[1];
    const srcMatch = SRC_FROM_ATTRS_REGEX.exec(attrString);
    const originalSrc = srcMatch ? srcMatch[1] : '';

    if (!originalSrc || isExternalUrl(originalSrc)) continue;
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

/**
 * Consolidate shared references: group by cleanPath, keep only the largest
 * dimensions, and return a mapping from each original variant key to the
 * shared (largest) variant key.
 */
export function consolidateSharedReferences(
  references: Map<string, ImageReference>,
): Map<string, string> {
  const sharedKeyMap = new Map<string, string>();

  // Group shared references by base image path
  const sharedGroups = new Map<string, ImageReference[]>();

  for (const [, ref] of references) {
    if (!ref.params.shared) continue;

    const group = sharedGroups.get(ref.cleanPath) || [];
    group.push(ref);
    sharedGroups.set(ref.cleanPath, group);
  }

  for (const [cleanPath, group] of sharedGroups) {
    // Find the largest dimensions across all usages
    let maxWidth = 0;
    let maxHeight = 0;

    for (const ref of group) {
      if (ref.params.width && ref.params.width > maxWidth)
        maxWidth = ref.params.width;
      if (ref.params.height && ref.params.height > maxHeight)
        maxHeight = ref.params.height;
    }

    const sharedParams: ImageParams = {
      width: maxWidth || undefined,
      height: maxHeight || undefined,
      optimize: true,
      shared: true,
    };
    const sharedKey = generateVariantKey(cleanPath, sharedParams);

    // Ensure the shared (largest) reference exists in the map
    if (!references.has(sharedKey)) {
      references.set(sharedKey, {
        originalSrc: group[0].originalSrc,
        cleanPath,
        params: sharedParams,
        variantKey: sharedKey,
        isImgTag: group.some((r) => r.isImgTag),
      });
    }

    // Map every group member to the shared key and remove smaller variants
    for (const ref of group) {
      sharedKeyMap.set(ref.variantKey, sharedKey);

      if (ref.variantKey !== sharedKey) {
        references.delete(ref.variantKey);
      }
    }
  }

  return sharedKeyMap;
}
