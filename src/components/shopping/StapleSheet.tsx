import { useState } from "react";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatNumber } from "../../../convex/domain/quantities";
import { useBase, useSession } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { parseAmount } from "../../lib/units";
import { Button, Select, Sheet, TextInput } from "../ui";
import { ChainsPicker, type Chain } from "./chains";
import { ProductPhotoField } from "./ProductPhotoField";
import type { Staple } from "./StaplesSheet";
import { useT } from "../../i18n/useT";
import { frenchName, namesToSave } from "../../lib/catalogNames";
import { NameFields } from "./NameFields";

export type EditableStaple = Pick<
  Staple,
  "_id" | "name" | "nameDe" | "nameFr" | "aisleId" | "priceChf" | "qty" | "onlyChains" | "imageId" | "imageUrl"
>;

/** Full card of a usual item: name, aisle, price of one item, chains, usual quantity. */
export function StapleSheet({
  staple,
  onDelete,
  onClose,
}: {
  staple: EditableStaple;
  /** Shown as a « Supprimer » button when given. */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const toast = useToast();
  const { t, lang } = useT();
  const update = useMutation(api.staples.update);
  const [name, setName] = useState(frenchName(staple));
  const [nameDe, setNameDe] = useState(staple.nameDe ?? "");
  const [aisleId, setAisleId] = useState<Id<"aisles"> | "">(
    staple.aisleId ?? "",
  );
  const [priceText, setPriceText] = useState(
    staple.priceChf !== undefined ? staple.priceChf.toFixed(2) : "",
  );
  const [qtyText, setQtyText] = useState(
    staple.qty !== undefined ? formatNumber(staple.qty, 2, lang) : "",
  );
  const [onlyChains, setOnlyChains] = useState<Chain[]>(
    staple.onlyChains ?? [],
  );
  const [image, setImage] = useState<{ id: Id<"_storage"> | null; url: string | null }>({
    id: staple.imageId ?? null,
    url: staple.imageUrl ?? null,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    const price = parseAmount(priceText);
    const qty = parseAmount(qtyText);
    if (Number.isNaN(price) || Number.isNaN(qty)) {
      toast(t("shopping.priceQtyNotNumber"), "error");
      return;
    }
    setBusy(true);
    const ok = await run(
      () =>
        update({
          token,
          id: staple._id,
          ...namesToSave(name, nameDe),
          aisleId: aisleId || null,
          priceChf: price ?? null,
          onlyChains,
          qty: qty ?? null,
          imageId: image.id,
        }),
      t("shopping.itemSaved"),
    );
    setBusy(false);
    if (ok !== undefined) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={staple.name}
      footer={
        <Button size="lg" onClick={save} disabled={busy || !(name.trim() || nameDe.trim())}>
          {t("shopping.save")}
        </Button>
      }
    >
      <div className="grid gap-4">
        <NameFields name={name} nameDe={nameDe} onName={setName} onNameDe={setNameDe} />
        <Select
          label={t("shopping.aisle")}
          value={aisleId}
          onChange={(e) => setAisleId(e.target.value as Id<"aisles"> | "")}
        >
          <option value="">🛒 {t("shopping.misc")}</option>
          {base?.aisles.map((a) => (
            <option key={a._id} value={a._id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label={t("shopping.pricePerItem")}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            inputMode="decimal"
            placeholder={t("shopping.examplePrice")}
          />
          <TextInput
            label={t("shopping.usualQty")}
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value)}
            inputMode="numeric"
            placeholder={t("shopping.exampleTwo")}
          />
        </div>
        <ProductPhotoField imageUrl={image.url} onChange={(img) => setImage(img ? { id: img.id, url: img.url } : { id: null, url: null })} />
        <ChainsPicker value={onlyChains} onChange={setOnlyChains} />
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={18} /> {t("shopping.deleteItem")}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
