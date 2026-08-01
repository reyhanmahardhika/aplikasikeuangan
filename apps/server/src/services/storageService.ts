import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseStorageConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseStorageBucket);
}

function getSupabaseClient() {
  if (!isSupabaseStorageConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseClient;
}

export async function uploadReceiptObject(path: string, buffer: Buffer, contentType: string) {
  const client = getSupabaseClient();
  if (!client) return null;
  const { error } = await client.storage
    .from(config.supabaseStorageBucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
      cacheControl: "300"
    });
  if (error) throw new Error(`Supabase upload gagal: ${error.message}`);
  return path;
}

export async function downloadReceiptObject(path: string) {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(config.supabaseStorageBucket).download(path);
  if (error) throw new Error(`Supabase download gagal: ${error.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
