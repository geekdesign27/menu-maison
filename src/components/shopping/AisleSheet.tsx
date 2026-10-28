import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button, Sheet, TextInput } from "../ui";
import { EmojiField } from "./EmojiField";
import { useT } from "../../i18n/useT";

const AISLE_EMOJIS = [
  "🥦",
  "🍎",
  "🥖",
  "🥛",
  "🧀",
  "🥩",
  "🐟",
  "🍝",
  "🥫",
  "🫒",
  "🧂",
  "🥣",
  "🧊",
  "🥤",
  "🍫",
  "🍷",
  "🧻",
  "🧴",
  "🌿",
  "🛒",
];

/** Renames an aisle (saved on each change) or creates a new one. */
export function AisleSheet({
  aisle,
  onClose,
}: {
  aisle?: Doc<"aisles">;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const { t } = useT();
  const renameAisle = useMutation(api.catalog.renameAisle);
  const addAisle = useMutation(api.catalog.addAisle);
  const [name, setName] = useState(aisle?.name ?? "");
  const [emoji, setEmoji] = useState(aisle?.emoji ?? "🛒");

  const save = (next: { name: string; emoji: string }) => {
    if (!aisle) return;
    if (!next.name.trim()) {
      setName(aisle.name);
      return;
    }
    if (next.name.trim() === aisle.name && next.emoji === aisle.emoji) return;
    run(() => renameAisle({ token, id: aisle._id, ...next }));
  };

  const create = async () => {
    const id = await run(
      () => addAisle({ token, name, emoji }),
      t("shopping.aisleAdded"),
    );
    if (id) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={aisle ? t("shopping.editAisle") : t("shopping.newAisle")}
      footer={
        aisle ? undefined : (
          <Button size="lg" onClick={create} disabled={!name.trim()}>
            <Plus size={22} /> {t("shopping.addAisle")}
          </Button>
        )
      }
    >
      <div className="grid gap-5">
        <TextInput
          label={t("shopping.aisleName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => save({ name, emoji })}
          placeholder={t("shopping.aislePlaceholder")}
          autoFocus={!aisle}
        />
        <EmojiField
          value={emoji}
          suggestions={AISLE_EMOJIS}
          onChange={(e) => {
            setEmoji(e);
            save({ name, emoji: e });
          }}
        />
      </div>
    </Sheet>
  );
}
