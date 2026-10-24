import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSession } from "../../lib/session";
import { useToast } from "../../lib/toast";
import { errorMessage } from "../../lib/format";
import { Button, SectionTitle } from "../ui";
import { PhotoTooHeavy, uploadPhoto } from "../../lib/image";

const MAX_SIDE = 1200;

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
      const photo = await uploadPhoto(file, MAX_SIDE, () => generateUploadUrl({ token }));
      onChange({ id: photo.id, url: photo.previewUrl });
    } catch (e) {
      toast(
        e instanceof PhotoTooHeavy
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
