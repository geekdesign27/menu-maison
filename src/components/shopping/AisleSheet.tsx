import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button, Sheet } from "../ui";
import { EmojiField } from "./EmojiField";
import { useT } from "../../i18n/useT";
import { frenchName, namesToSave } from "../../lib/catalogNames";
import { NameFields } from "./NameFields";

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
  const [name, setName] = useState(aisle ? frenchName(aisle) : "");
  const [nameDe, setNameDe] = useState(aisle?.nameDe ?? "");
  const [emoji, setEmoji] = useState(aisle?.emoji ?? "🛒");

  const save = (next: { name: string; nameDe: string; emoji: string }) => {
    if (!aisle) return;
    const names = namesToSave(next.name, next.nameDe);
    if (!names.name) {
      setName(frenchName(aisle));
      return;
    }
    if (names.name === frenchName(aisle) && names.nameDe === (aisle.nameDe ?? "") && next.emoji === aisle.emoji) return;
    run(() => renameAisle({ token, id: aisle._id, ...names, emoji: next.emoji }));
  };

  const create = async () => {
    const id = await run(
      () => addAisle({ token, ...namesToSave(name, nameDe), emoji }),
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
          <Button size="lg" onClick={create} disabled={!(name.trim() || nameDe.trim())}>
            <Plus size={22} /> {t("shopping.addAisle")}
          </Button>
        )
      }
    >
      <div className="grid gap-5">
        <NameFields
          name={name}
          nameDe={nameDe}
          onName={setName}
          onNameDe={setNameDe}
          onBlur={() => save({ name, nameDe, emoji })}
          placeholder={t("shopping.aislePlaceholder")}
          autoFocus={!aisle}
        />
        <EmojiField
          value={emoji}
          suggestions={AISLE_EMOJIS}
          onChange={(e) => {
            setEmoji(e);
            save({ name, nameDe, emoji: e });
          }}
        />
      </div>
    </Sheet>
  );
}
