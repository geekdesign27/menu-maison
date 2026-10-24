import type { Id } from "../../convex/_generated/dataModel";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Shrinks a phone photo to at most `maxSide` px and JPEG, so storage and data stay small. */
async function shrink(file: File, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image illisible"))),
      "image/jpeg",
      0.82,
    ),
  );
}

export class PhotoTooHeavy extends Error {}

/**
 * Shrinks then uploads a photo to Convex storage. Returns the storage id and a
 * local preview URL to show right away.
 */
export async function uploadPhoto(
  file: File,
  maxSide: number,
  generateUploadUrl: () => Promise<string>,
): Promise<{ id: Id<"_storage">; previewUrl: string }> {
  const blob = await shrink(file, maxSide);
  if (blob.size > MAX_UPLOAD_BYTES) throw new PhotoTooHeavy();
  const url = await generateUploadUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!res.ok) throw new Error(`Envoi refusé (${res.status})`);
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return { id: storageId, previewUrl: URL.createObjectURL(blob) };
}

/** Shrinks a photo and returns its JPEG data as base64 (no data: prefix), to send to an action. */
export async function photoToBase64(file: File, maxSide: number): Promise<string> {
  const blob = await shrink(file, maxSide);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // Chunks keep String.fromCharCode below the argument limit
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
