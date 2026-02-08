export interface ImageParams {
  width?: number;
  height?: number;
  optimize?: boolean;
  /** When true, all instances of the same base image share the largest variant */
  shared?: boolean;
}

export interface ImageReference {
  originalSrc: string;
  cleanPath: string;
  params: ImageParams;
  variantKey: string;
  isImgTag: boolean;
}

export interface GeneratedVariant {
  format: 'webp' | 'avif' | 'original';
  mimeType: string;
  outputPath: string;
  width?: number;
  height?: number;
  size: number;
}

export interface ProcessedImage {
  reference: ImageReference;
  variants: GeneratedVariant[];
  bestVariant: GeneratedVariant;
}

export type ProcessedImageMap = Map<string, ProcessedImage>;

export interface ImageOptimizerOptions {
  /** Directory containing source images (relative to project root) */
  publicDir?: string;
  /** Output directory for optimized images (relative to build output) */
  outputDir?: string;
  /** Quality for WebP compression (0-100) */
  webpQuality?: number;
  /** Quality for AVIF compression (0-100) */
  avifQuality?: number;
  /** File extensions to process */
  extensions?: string[];
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface ResolvedOptions {
  publicDir: string;
  outputDir: string;
  webpQuality: number;
  avifQuality: number;
  extensions: string[];
  verbose: boolean;
}
