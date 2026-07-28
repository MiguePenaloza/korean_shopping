"use client";

export type ProductImageMetadata = {
  storage_path: string;
  thumbnail_storage_path: string;
  alt_text: string;
  sort_order: number;
  width: number;
  height: number;
  thumbnail_width: number;
  thumbnail_height: number;
  is_thumbnail: boolean;
};

export type ProcessedProductImage = {
  full: { path: string; blob: Blob; contentType: string };
  thumbnail: { path: string; blob: Blob; contentType: string };
  metadata: ProductImageMetadata;
};

const maxInputBytes = 20 * 1024 * 1024;
const maxOutputBytes = 6 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function fitWithin(width: number, height: number, maxDimension: number) {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    throw new Error("INVALID_IMAGE_DIMENSIONS");
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function extensionFor(type: string) {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  return "jpg";
}

async function canvasBlob(canvas: HTMLCanvasElement, sourceType: string) {
  const createBlob = (type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await createBlob("image/webp", 0.84);
  if (webp?.type === "image/webp") return webp;

  const fallbackType = sourceType === "image/png" ? "image/png" : "image/jpeg";
  const fallback = await createBlob(
    fallbackType,
    fallbackType === "image/jpeg" ? 0.88 : undefined,
  );
  if (!fallback) throw new Error("IMAGE_ENCODING_FAILED");
  return fallback;
}

async function decodeImage(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return {
    source: image as CanvasImageSource,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(url),
  };
}

async function resize(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  sourceType: string,
) {
  const dimensions = fitWithin(sourceWidth, sourceHeight, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { alpha: sourceType === "image/png" });
  if (!context) throw new Error("IMAGE_CANVAS_UNAVAILABLE");
  context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
  const blob = await canvasBlob(canvas, sourceType);
  if (blob.size > maxOutputBytes) throw new Error("IMAGE_OUTPUT_TOO_LARGE");
  return { blob, ...dimensions };
}

export function validateProductImageFiles(files: readonly File[]) {
  if (files.length > 3) throw new Error("TOO_MANY_IMAGES");
  for (const file of files) {
    if (!allowedTypes.has(file.type)) throw new Error("INVALID_IMAGE_TYPE");
    if (file.size > maxInputBytes) throw new Error("IMAGE_INPUT_TOO_LARGE");
  }
}

export async function processProductImages(
  files: readonly File[],
  productId: string,
  productName: string,
): Promise<ProcessedProductImage[]> {
  validateProductImageFiles(files);
  const output: ProcessedProductImage[] = [];

  for (const [index, file] of files.entries()) {
    const decoded = await decodeImage(file);
    try {
      if (decoded.width * decoded.height > 100_000_000) {
        throw new Error("IMAGE_DIMENSIONS_TOO_LARGE");
      }

      const [full, thumbnail] = await Promise.all([
        resize(decoded.source, decoded.width, decoded.height, 1200, file.type),
        resize(decoded.source, decoded.width, decoded.height, 480, file.type),
      ]);
      const fullExtension = extensionFor(full.blob.type);
      const thumbnailExtension = extensionFor(thumbnail.blob.type);
      const base = `products/${productId}/${index}`;
      const fullPath = `${base}-full.${fullExtension}`;
      const thumbnailPath = `${base}-thumb.${thumbnailExtension}`;

      output.push({
        full: {
          path: fullPath,
          blob: full.blob,
          contentType: full.blob.type,
        },
        thumbnail: {
          path: thumbnailPath,
          blob: thumbnail.blob,
          contentType: thumbnail.blob.type,
        },
        metadata: {
          storage_path: fullPath,
          thumbnail_storage_path: thumbnailPath,
          alt_text: `${productName}, imagen ${index + 1}`,
          sort_order: index,
          width: full.width,
          height: full.height,
          thumbnail_width: thumbnail.width,
          thumbnail_height: thumbnail.height,
          is_thumbnail: index === 0,
        },
      });
    } finally {
      decoded.close();
    }
  }

  return output;
}
