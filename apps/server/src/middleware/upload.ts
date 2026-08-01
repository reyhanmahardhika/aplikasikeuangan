import path from "node:path";
import multer from "multer";
import { config } from "../config.js";
import { badRequest } from "../utils/errors.js";

export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isHeic = extension === ".heic" || extension === ".heif";
    if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/") && !isHeic) {
      cb(badRequest("Format file tidak didukung. Gunakan file gambar atau video."));
      return;
    }
    cb(null, true);
  }
});

export const mutationImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = [".csv", ".xlsx", ".pdf", ".txt"];
    if (!allowed.includes(extension) && file.mimetype !== "application/pdf") {
      cb(badRequest("Format file tidak didukung. Gunakan CSV, XLSX, PDF, atau TXT."));
      return;
    }
    cb(null, true);
  }
});
