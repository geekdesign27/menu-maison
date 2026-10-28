import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, Check, Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSession, type Member } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { errorMessage } from "../../lib/format";
import { PhotoTooHeavy, uploadPhoto } from "../../lib/image";
import { Avatar, Button, cx, Sheet, TextInput } from "../ui";
import { EmojiField } from "./EmojiField";
import { MemberAccess } from "./MemberAccess";

const MEMBER_COLORS = [
  "#A8C8E8",
  "#F5C6A5",
  "#CDB8E6",
  "#B8DFC4",
  "#F4D58D",
  "#F2B8C6",
  "#A8DCD9",
  "#E0CDB5",
];

const MEMBER_EMOJIS = [
  "🐻",
  "🌻",
  "🦄",
  "🦊",
  "🐱",
  "🐶",
  "🐼",
  "🐸",
  "🦁",
  "🐰",
  "🌈",
  "⭐",
  "🍀",
  "🚀",
  "⚽",
  "🎸",
];

/** Edits a profile (saved on each change) or creates a new one. */
export function MemberSheet({
  member,
  onClose,
}: {
  member?: Member;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const toast = useToast();
  const updateMember = useMutation(api.catalog.updateMember);
  const addMember = useMutation(api.catalog.addMember);
  const [name, setName] = useState(member?.name ?? "");
  const [emoji, setEmoji] = useState(member?.emoji ?? MEMBER_EMOJIS[3]);
  const [color, setColor] = useState(member?.color ?? MEMBER_COLORS[3]);
  const setPhoto = useMutation(api.catalog.setMemberPhoto);
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(member?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);

  // Square-ish avatar: 400 px is plenty for a round picture
  const choosePhoto = async (file: File) => {
    if (!member) return;
    setUploading(true);
    try {
      const photo = await uploadPhoto(file, 400, () => generateUploadUrl({ token }));
      const ok = await run(() => setPhoto({ token, id: member._id, imageId: photo.id }), "Photo enregistrée");
      if (ok !== undefined) setPhotoUrl(photo.previewUrl);
    } catch (e) {
      toast(e instanceof PhotoTooHeavy ? "Cette photo est trop lourde, essaie une autre." : errorMessage(e), "error");
    } finally {
      setUploading(false);
    }
  };

  const save = (
    patch: Partial<{ name: string; emoji: string; color: string }>,
  ) => {
    if (!member) return;
    const next = { name, emoji, color, ...patch };
    if (!next.name.trim()) {
      setName(member.name);
      return;
    }
    run(() => updateMember({ token, id: member._id, ...next }));
  };

  const create = async () => {
    const id = await run(
      () => addMember({ token, name, emoji, color }),
      `Bienvenue, ${name.trim()} !`,
    );
    if (id) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={member ? "Modifier le profil" : "Nouveau profil"}
      footer={
        member ? undefined : (
          <Button size="lg" onClick={create} disabled={!name.trim()}>
            <Plus size={22} /> Ajouter le profil
          </Button>
        )
      }
    >
      <div className="grid gap-5">
        <div className="flex flex-col items-center gap-2 pt-1">
          <Avatar member={{ name: name || "Profil", emoji, color, imageUrl: photoUrl }} size={88} />
          {member && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => photoInput.current?.click()} disabled={uploading}>
                <Camera size={18} /> {uploading ? "Envoi…" : photoUrl ? "Changer la photo" : "Ajouter une photo"}
              </Button>
              {photoUrl && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if ((await run(() => setPhoto({ token, id: member._id, imageId: null }))) !== undefined) setPhotoUrl(null);
                  }}
                >
                  <Trash2 size={18} /> Retirer
                </Button>
              )}
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void choosePhoto(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
        <TextInput
          label="Prénom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => member && name.trim() !== member.name && save({})}
          autoFocus={!member}
        />
        <EmojiField
          value={emoji}
          suggestions={MEMBER_EMOJIS}
          onChange={(e) => {
            setEmoji(e);
            save({ emoji: e });
          }}
        />
        <div>
          <span className="mb-1 block text-[15px] font-bold">Couleur</span>
          <div className="flex flex-wrap gap-3">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Couleur ${c}`}
                aria-pressed={color === c}
                onClick={() => {
                  setColor(c);
                  save({ color: c });
                }}
                className={cx(
                  "flex size-12 items-center justify-center rounded-full transition",
                  color === c &&
                    "ring-[3px] ring-ink ring-offset-2 ring-offset-cream",
                )}
                style={{ background: c }}
              >
                {color === c && <Check size={22} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        {member && <MemberAccess member={member} />}
      </div>
    </Sheet>
  );
}
