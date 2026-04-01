"use server";

/* ------------------------------------------------------------------ */
/*  Product image upload — Server Action                               */
/*                                                                     */
/*  Uploads a file to the Supabase Storage `product-images` bucket     */
/*  using the service-role (admin) client. Requires admin auth.        */
/* ------------------------------------------------------------------ */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/roles";

/** Allowed MIME types (must match bucket policy in migration 001). */
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Maximum file size in bytes (5 MB). */
const MAX_SIZE = 5 * 1024 * 1024;

/** Map MIME type to file extension. */
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type UploadResult = { success: true; url: string } | { success: false; error: string };
type DeleteResult = { success: true } | { success: false; error: string };

/**
 * Extract the storage file path from a Supabase Storage public URL.
 *
 * Returns the path relative to the bucket root (e.g. `products/abc.jpg`),
 * or `null` if the URL doesn't belong to our `product-images` bucket.
 */
function extractStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/public/product-images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  // Safety: reject empty paths or path traversal attempts
  if (!path || path.includes("..")) return null;
  return path;
}

/**
 * Upload a single product image to Supabase Storage.
 *
 * Expects a `FormData` with a single `file` field containing the image.
 * Returns the public URL on success.
 */
export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  // ── Auth guard ───────────────────────────────────────────────
  await requireAdmin();

  // ── Extract & validate file ──────────────────────────────────
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Nincs fájl csatolva." };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      success: false,
      error: "Nem támogatott fájlformátum. Engedélyezett: JPEG, PNG, WebP, AVIF.",
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: "A fájl mérete meghaladja az 5 MB-os limitet.",
    };
  }

  // ── Build storage path ───────────────────────────────────────
  const ext = EXT_MAP[file.type] ?? "jpg";
  const filePath = `products/${crypto.randomUUID()}.${ext}`;

  // ── Convert to Buffer (Node.js runtime) ──────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // ── Upload via service-role client ───────────────────────────
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "31536000", // 1 year
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadProductImage] Storage error:", uploadError);
    return {
      success: false,
      error: "Hiba a kép feltöltésekor. Kérjük, próbálja újra.",
    };
  }

  // ── Get public URL ───────────────────────────────────────────
  const {
    data: { publicUrl },
  } = admin.storage.from("product-images").getPublicUrl(filePath);

  return { success: true, url: publicUrl };
}

/* ------------------------------------------------------------------ */
/*  Delete product image from Supabase Storage                         */
/* ------------------------------------------------------------------ */

/**
 * Delete a product image from the `product-images` Supabase Storage bucket.
 *
 * If the URL does not point to our Supabase Storage bucket (e.g. an external
 * URL), this is a no-op and returns success — the caller can safely remove
 * it from its own state without side-effects.
 */
export async function deleteProductImage(url: string): Promise<DeleteResult> {
  await requireAdmin();

  const filePath = extractStoragePath(url);

  // External URL — nothing to delete from storage.
  if (!filePath) {
    return { success: true };
  }

  const admin = createAdminClient();

  const { error: removeError } = await admin.storage.from("product-images").remove([filePath]);

  if (removeError) {
    console.error("[deleteProductImage] Storage error:", removeError);
    return {
      success: false,
      error: "Hiba a kép törlésekor. Kérjük, próbálja újra.",
    };
  }

  return { success: true };
}
