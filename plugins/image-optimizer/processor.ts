import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import type {
  GeneratedVariant,
  ImageReference,
  ProcessedImage,
  ResolvedOptions,
} from './types';

function generateOutputFilename(
  cleanPath: string,
  params: {width?: number; height?: number},
  format: 'webp' | 'avif' | 'original',
  originalExt: string,
): string {
  const dir = path.dirname(cleanPath);
  const baseName = path.basename(cleanPath, path.extname(cleanPath));

  let sizeSuffix = '';
  if (params.width || params.height) {
    const parts: string[] = [];

    if (params.width) parts.push(`${params.width}w`);
    if (params.height) parts.push(`${params.height}h`);

    sizeSuffix = `-${parts.join('-')}`;
  }

  const ext = format === 'original' ? originalExt : `.${format}`;

  return path.join(dir, `${baseName}--optimized${sizeSuffix}${ext}`);
}

function getMimeType(
  format: 'webp' | 'avif' | 'original',
  originalExt: string,
): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    default:
      const ext = originalExt.toLowerCase().replace('.', '');
      const mimeTypes = new Map<string, string>([
        ['png', 'image/png'],
        ['jpg', 'image/jpeg'],
        ['jpeg', 'image/jpeg'],
        ['gif', 'image/gif'],
        ['svg', 'image/svg+xml'],
      ]);

      return mimeTypes.get(ext) || 'image/png';
  }
}

async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

export async function processImage(
  reference: ImageReference,
  options: ResolvedOptions,
  projectRoot: string,
  outputRoot: string,
  log: (message: string) => void,
): Promise<ProcessedImage> {
  const {cleanPath, params} = reference;
  const originalExt = path.extname(cleanPath);

  const sourcePath = path.join(projectRoot, options.publicDir, cleanPath);

  try {
    await fs.access(sourcePath);
  } catch {
    throw new Error(`Source image not found: ${sourcePath}`);
  }

  const sourceSize = await getFileSize(sourcePath);
  let image = sharp(sourcePath);
  const metadata = await image.metadata();

  if (params.width || params.height)
    image = image.resize({
      width: params.width,
      height: params.height,
      fit: 'cover',
      withoutEnlargement: true,
    });

  const variants: GeneratedVariant[] = [];
  const finalWidth = params.width || metadata.width;
  const finalHeight = params.height || metadata.height;

  if (reference.isImgTag) {
    const avifPath = generateOutputFilename(
      cleanPath,
      params,
      'avif',
      originalExt,
    );
    const avifOutputPath = path.join(outputRoot, options.outputDir, avifPath);

    await fs.mkdir(path.dirname(avifOutputPath), {recursive: true});
    await image
      .clone()
      .avif({quality: options.avifQuality, effort: 4})
      .toFile(avifOutputPath);

    const avifSize = await getFileSize(avifOutputPath);

    variants.push({
      format: 'avif',
      mimeType: 'image/avif',
      outputPath: path.join(options.outputDir, avifPath),
      width: finalWidth,
      height: finalHeight,
      size: avifSize,
    });

    const webpPath = generateOutputFilename(
      cleanPath,
      params,
      'webp',
      originalExt,
    );
    const webpOutputPath = path.join(outputRoot, options.outputDir, webpPath);

    await fs.mkdir(path.dirname(webpOutputPath), {recursive: true});
    await image
      .clone()
      .webp({quality: options.webpQuality, effort: 4})
      .toFile(webpOutputPath);

    const webpSize = await getFileSize(webpOutputPath);

    variants.push({
      format: 'webp',
      mimeType: 'image/webp',
      outputPath: path.join(options.outputDir, webpPath),
      width: finalWidth,
      height: finalHeight,
      size: webpSize,
    });
  }

  const originalPath = generateOutputFilename(
    cleanPath,
    params,
    'original',
    originalExt,
  );
  const originalOutputPath = path.join(
    outputRoot,
    options.outputDir,
    originalPath,
  );

  await fs.mkdir(path.dirname(originalOutputPath), {recursive: true});

  const extLower = originalExt.toLowerCase();
  if (extLower === '.png') {
    await image.clone().png({compressionLevel: 9}).toFile(originalOutputPath);
  } else if (extLower === '.jpg' || extLower === '.jpeg') {
    await image
      .clone()
      .jpeg({quality: 85, mozjpeg: true})
      .toFile(originalOutputPath);
  } else {
    await image.clone().toFile(originalOutputPath);
  }

  const optimizedOriginalSize = await getFileSize(originalOutputPath);

  variants.push({
    format: 'original',
    mimeType: getMimeType('original', originalExt),
    outputPath: path.join(options.outputDir, originalPath),
    width: finalWidth,
    height: finalHeight,
    size: optimizedOriginalSize,
  });

  const finalVariants: GeneratedVariant[] = [];

  for (const variant of variants) {
    const variantPath = path.join(outputRoot, variant.outputPath);

    if (variant.size > sourceSize && !params.width && !params.height) {
      await fs.unlink(variantPath);
      log(
        `  Skipped ${variant.format}: ${variant.size}B > source ${sourceSize}B`,
      );
    } else {
      finalVariants.push(variant);
    }
  }

  if (finalVariants.length === 0) {
    const fallbackPath = generateOutputFilename(
      cleanPath,
      params,
      'original',
      originalExt,
    );
    const fallbackOutputPath = path.join(
      outputRoot,
      options.outputDir,
      fallbackPath,
    );

    await fs.mkdir(path.dirname(fallbackOutputPath), {recursive: true});
    await fs.copyFile(sourcePath, fallbackOutputPath);

    finalVariants.push({
      format: 'original',
      mimeType: getMimeType('original', originalExt),
      outputPath: path.join(options.outputDir, fallbackPath),
      width: finalWidth,
      height: finalHeight,
      size: sourceSize,
    });
  }

  const bestVariant = finalVariants.reduce((best, current) =>
    current.size < best.size ? current : best,
  );

  return {
    reference,
    variants: finalVariants,
    bestVariant,
  };
}

export async function processImages(
  references: Map<string, ImageReference>,
  options: ResolvedOptions,
  projectRoot: string,
  outputRoot: string,
  log: (message: string) => void,
): Promise<Map<string, ProcessedImage>> {
  const results = new Map<string, ProcessedImage>();
  const entries = Array.from(references.entries());

  const CONCURRENCY = 4;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async ([key, reference]) => {
        try {
          log(
            `Processing: ${reference.cleanPath} (${reference.params.width || 'auto'}x${reference.params.height || 'auto'})`,
          );
          const result = await processImage(
            reference,
            options,
            projectRoot,
            outputRoot,
            log,
          );
          return {key, result, error: null};
        } catch (error) {
          return {key, result: null, error: error as Error};
        }
      }),
    );

    for (const {key, result, error} of batchResults) {
      if (error) {
        console.error(`Failed to process image ${key}:`, error.message);
      } else if (result) {
        results.set(key, result);
      }
    }
  }

  return results;
}
