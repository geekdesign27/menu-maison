import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSession } from "../../lib/session";
import { useToast } from "../../lib/toast";
import { errorMessage } from "../../lib/format";
import { PhotoTooHeavy, uploadPhoto } from "../../lib/image";
import { Button } from "../ui";
import { useT } from "../../i18n/useT";

/** Photo of the exact product (brand, size) to recognise it on the shelf. */
export function ProductPhotoField({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (image: { id: Id<"_storage">; url: string } | null) => void;
}) {
  const { token } = useSession();
  const toast = useToast();
  const { t, lang } = useT();
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function choose(file: File) {
    setBusy(true);
    try {
      // 800 px: enough to read a label, light on the phone
      const photo = await uploadPhoto(file, 800, () =>
        generateUploadUrl({ token }),
      );
      onChange({ id: photo.id, url: photo.previewUrl });
    } catch (e) {
      toast(
        e instanceof PhotoTooHeavy
          ? t("recipes.photoTooHeavy")
          : errorMessage(e, lang),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-[15px] font-bold">
        {t("recipes.productPhoto")}
      </span>
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="size-20 shrink-0 rounded-2xl object-cover ring-1 ring-line"
          />
        ) : (
          <span
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-paper text-muted ring-1 ring-line"
            aria-hidden
          >
            <Camera size={26} />
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Camera size={18} />{" "}
            {t(
              busy
                ? "recipes.sending"
                : imageUrl
                  ? "recipes.photoChange"
                  : "recipes.takeOrPick",
            )}
          </Button>
          {imageUrl && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <Trash2 size={18} /> {t("recipes.photoRemove")}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-[13px] text-muted">
        {t("recipes.productPhotoHint")}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void choose(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
