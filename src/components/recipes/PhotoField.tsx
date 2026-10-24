import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSession } from "../../lib/session";
import { useToast } from "../../lib/toast";
import { errorMessage } from "../../lib/format";
import { Button, SectionTitle } from "../ui";

const MAX_SIDE = 1200;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Shrinks a phone photo to at most 1200 px and JPEG, so storage and data stay small. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
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

/** Recipe photo: take one or pick one from the phone, shown instead of the emoji. */
export function PhotoField({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (image: { id: Id<"_storage">; url: string } | null) => void;
}) {
  const { token } = useSession();
  const toast = useToast();
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await shrink(file);
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Photo trop lourde");
      const url = await generateUploadUrl({ token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!res.ok) throw new Error(`Envoi refusé (${res.status})`);
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      onChange({ id: storageId, url: URL.createObjectURL(blob) });
    } catch (e) {
      toast(
        e instanceof Error && e.message.startsWith("Photo")
          ? "Cette photo est trop lourde, essaie une autre."
          : errorMessage(e),
        "error",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <SectionTitle>Photo</SectionTitle>
      {imageUrl ? (
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-sm">
          <img
            src={imageUrl}
            alt="Photo de la recette"
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="flex gap-2 p-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => input.current?.click()}
              disabled={busy}
            >
              <Camera size={18} /> Changer
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <Trash2 size={18} /> Retirer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border-2 border-dashed border-line bg-paper px-4 text-muted active:bg-carrot-soft disabled:opacity-60"
        >
          <Camera size={28} />
          <span className="font-extrabold">
            {busy ? "Envoi de la photo…" : "Prendre ou choisir une photo"}
          </span>
          <span className="text-[13px]">Sinon, l'emoji reste affiché.</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </>
  );
}
