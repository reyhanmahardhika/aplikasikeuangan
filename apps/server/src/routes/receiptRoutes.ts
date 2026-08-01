import path from "node:path";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { receiptUpload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { receiptConfirmSchema } from "../validators/schemas.js";
import { confirmReceipt, getReceiptFile, getReceiptResult, processReceipt, uploadReceipt } from "../services/receiptService.js";

export const receiptRoutes = Router();
receiptRoutes.use(requireAuth);

function contentTypeFromFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if ([".heic", ".heif"].includes(extension)) return "image/heic";
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

receiptRoutes.post(
  "/upload",
  receiptUpload.single("receipt"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await uploadReceipt(req.user!.id, req.file));
  })
);

receiptRoutes.post(
  "/:id/process",
  asyncHandler(async (req, res) => {
    res.json(await processReceipt(req.user!.id, req.params.id as string));
  })
);

receiptRoutes.get(
  "/:id/result",
  asyncHandler(async (req, res) => {
    res.json(await getReceiptResult(req.user!.id, req.params.id as string));
  })
);

receiptRoutes.get(
  "/:id/file",
  asyncHandler(async (req, res) => {
    const file = await getReceiptFile(req.user!.id, req.params.id as string);
    res.sendFile(path.resolve(file.file_url), {
      headers: {
        "Content-Type": contentTypeFromFileName(file.file_name),
        "Content-Disposition": `inline; filename="${file.file_name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=300"
      }
    });
  })
);

receiptRoutes.post(
  "/:id/confirm",
  asyncHandler(async (req, res) => {
    const payload = receiptConfirmSchema.parse(req.body);
    res.status(201).json(await confirmReceipt(req.user!.id, req.params.id as string, payload));
  })
);
