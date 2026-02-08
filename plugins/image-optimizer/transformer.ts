import type {GeneratedVariant, ProcessedImage, ResolvedOptions} from './types';
import {
  generateVariantKey,
  getCleanPath,
  parseImageParams,
  isProcessableImage,
  hasOptimizeFlag,
  IMAGE_ATTR_REGEX,
  IMG_TAG_REGEX,
} from './scanner';

function parseAttributes(attrString: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const attrRegex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? '';
    attrs.set(name, value);
  }

  return attrs;
}

function serializeAttributes(
  attrs: Map<string, string>,
  exclude: string[] = [],
): string {
  const parts: string[] = [];

  for (const [name, value] of attrs) {
    if (exclude.includes(name)) continue;

    if (value === '') {
      parts.push(name);
    } else {
      parts.push(`${name}="${value}"`);
    }
  }

  return parts.join(' ');
}

function normalizePath(outputPath: string): string {
  let normalized = outputPath;
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  return normalized.replace(/\/+/g, '/');
}

function generatePictureElement(
  variants: GeneratedVariant[],
  attrs: Map<string, string>,
  isShared: boolean = false,
): string {
  const lines: string[] = ['<picture>'];
  const actualWidth = variants[0]?.width;

  for (const variant of variants) {
    if (variant.format === 'original') continue;

    const srcPath = normalizePath(variant.outputPath);

    // Skip width descriptors for shared images — the file dimensions differ
    // from the display size, so width descriptors would confuse the browser.
    const srcsetValue =
      !isShared && actualWidth ? `${srcPath} ${actualWidth}w` : srcPath;

    lines.push(`  <source srcset="${srcsetValue}" type="${variant.mimeType}">`);
  }

  const fallback =
    variants.find((v) => v.format === 'original') ||
    variants[variants.length - 1];

  const fallbackPath = normalizePath(fallback.outputPath);

  const imgAttrs = new Map(attrs);
  imgAttrs.set('src', fallbackPath);

  // For non-shared images, set dimensions from variants if not already specified.
  // For shared images, the tag's own width/height (or the URL params) are the
  // correct display size — don't override with the (larger) variant dimensions.
  if (!isShared) {
    if (!attrs.has('width') && actualWidth)
      imgAttrs.set('width', String(actualWidth));

    if (!attrs.has('height') && variants[0]?.height)
      imgAttrs.set('height', String(variants[0].height));
  }

  const imgAttrString = serializeAttributes(imgAttrs);

  lines.push(`  <img ${imgAttrString}>`);
  lines.push('</picture>');

  return lines.join('\n');
}

export function transformHtml(
  html: string,
  processedImages: Map<string, ProcessedImage>,
  options: ResolvedOptions,
  sharedKeyMap: Map<string, string> = new Map(),
): string {
  IMG_TAG_REGEX.lastIndex = 0;

  let result = html.replace(IMG_TAG_REGEX, (fullMatch, attrString) => {
    const attrs = parseAttributes(attrString);
    const src = attrs.get('src');

    if (!src) return fullMatch;
    if (src.startsWith('http') || src.startsWith('//')) return fullMatch;
    if (!isProcessableImage(src, options.extensions)) return fullMatch;
    if (!hasOptimizeFlag(src)) return fullMatch;

    const cleanPath = getCleanPath(src);
    const params = parseImageParams(src);
    const variantKey = generateVariantKey(cleanPath, params);

    // Look up directly, then fall back via sharedKeyMap
    let processed = processedImages.get(variantKey);
    const sharedKey = sharedKeyMap.get(variantKey);
    const isShared = !!sharedKey && sharedKey !== variantKey;

    if (!processed && sharedKey) {
      processed = processedImages.get(sharedKey);
    }
    if (!processed) return fullMatch;

    // For shared images without explicit width/height on the tag, use the
    // requested dimensions from the URL params so the browser renders at the
    // correct display size (not the larger shared file size).
    if (isShared) {
      if (!attrs.has('width') && params.width)
        attrs.set('width', String(params.width));
      if (!attrs.has('height') && params.height)
        attrs.set('height', String(params.height));
    }

    return generatePictureElement(processed.variants, attrs, isShared);
  });

  IMAGE_ATTR_REGEX.lastIndex = 0;

  result = result.replace(
    IMAGE_ATTR_REGEX,
    (fullMatch, prefix, url, suffix) => {
      // Skip already-optimized files from the first pass
      if (/--optimized/.test(url)) return fullMatch;

      if (url.startsWith('http') || url.startsWith('//')) return fullMatch;
      if (!isProcessableImage(url, options.extensions)) return fullMatch;
      if (!hasOptimizeFlag(url)) return fullMatch;

      const cleanPath = getCleanPath(url);
      const params = parseImageParams(url);
      const variantKey = generateVariantKey(cleanPath, params);

      // Look up directly, then fall back via sharedKeyMap
      let processed = processedImages.get(variantKey);
      if (!processed) {
        const sharedKey = sharedKeyMap.get(variantKey);
        if (sharedKey) processed = processedImages.get(sharedKey);
      }
      if (!processed) return fullMatch;

      const bestPath = normalizePath(processed.bestVariant.outputPath);
      return `${prefix}${bestPath}${suffix}`;
    },
  );

  return result;
}
