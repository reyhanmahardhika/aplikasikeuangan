import path from "node:path";
import sharp from "sharp";
import { config } from "../config.js";

type CompressedAttachment = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  originalSize: number;
  storedSize: number;
  compressed: boolean;
};

function isImageAttachment(fileName: string, contentType: string) {
  const extension = path.extname(fileName).toLowerCase();
  return contentType.startsWith("image/") || [".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension);
}

function compressedFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const safeBase = (parsed.name || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safeBase}.jpg`;
}

export async function compressAttachment(fileName: string, contentType: string, buffer: Buffer): Promise<CompressedAttachment> {
  if (!isImageAttachment(fileName, contentType)) {
    return {
      buffer,
      fileName,
      contentType,
      originalSize: buffer.length,
      storedSize: buffer.length,
      compressed: false
    };
  }

  try {
    const compressed = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: config.attachmentImageMaxDimension,
        height: config.attachmentImageMaxDimension,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({
        quality: config.attachmentImageQuality,
        mozjpeg: true,
        chromaSubsampling: "4:2:0"
      })
      .toBuffer();

    return {
      buffer: compressed,
      fileName: compressedFileName(fileName),
      contentType: "image/jpeg",
      originalSize: buffer.length,
      storedSize: compressed.length,
      compressed: true
    };
  } catch {
    return {
      buffer,
      fileName,
      contentType,
      originalSize: buffer.length,
      storedSize: buffer.length,
      compressed: false
    };
  }
}
