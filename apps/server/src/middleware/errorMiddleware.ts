import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Data tidak valid",
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details
    });
  }

  if (error?.code === "23505") {
    return res.status(409).json({ message: "Data duplikat" });
  }

  if (error?.code === "42P01" || error?.code === "42703") {
    return res.status(503).json({
      message: "Database belum sesuai versi aplikasi. Jalankan migration terlebih dahulu."
    });
  }

  if (error?.code === "42702") {
    return res.status(500).json({
      message: "Query data tidak valid. Silakan deploy versi backend terbaru."
    });
  }

  console.error(error);
  return res.status(500).json({
    message: "Terjadi kesalahan pada server"
  });
};
