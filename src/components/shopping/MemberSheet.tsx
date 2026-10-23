import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSession, type Member } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Avatar, Button, cx, Sheet, TextInput } from "../ui";
import { EmojiField } from "./EmojiField";

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
  const updateMember = useMutation(api.catalog.updateMember);
  const addMember = useMutation(api.catalog.addMember);
  const [name, setName] = useState(member?.name ?? "");
  const [emoji, setEmoji] = useState(member?.emoji ?? MEMBER_EMOJIS[3]);
  const [color, setColor] = useState(member?.color ?? MEMBER_COLORS[3]);

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
        <div className="flex justify-center pt-1">
          <Avatar member={{ name: name || "Profil", emoji, color }} size={88} />
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
      </div>
    </Sheet>
  );
}
