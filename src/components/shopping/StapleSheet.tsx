import { useState } from "react";
import { useMutation } from "convex/react";
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

/** Full card of a usual item: name, aisle, price of one item, chains, usual quantity. */
export function StapleSheet({
  staple,
  onClose,
}: {
  staple: Staple;
  onClose: () => void;
}) {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const toast = useToast();
  const update = useMutation(api.staples.update);
  const [name, setName] = useState(staple.name);
  const [aisleId, setAisleId] = useState<Id<"aisles"> | "">(
    staple.aisleId ?? "",
  );
  const [priceText, setPriceText] = useState(
    staple.priceChf !== undefined ? staple.priceChf.toFixed(2) : "",
  );
  const [qtyText, setQtyText] = useState(
    staple.qty !== undefined ? formatNumber(staple.qty) : "",
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
      toast(
        "Le prix et la quantité doivent être des nombres positifs.",
        "error",
      );
      return;
    }
    setBusy(true);
    const ok = await run(
      () =>
        update({
          token,
          id: staple._id,
          name,
          aisleId: aisleId || null,
          priceChf: price ?? null,
          onlyChains,
          qty: qty ?? null,
          imageId: image.id,
        }),
      "Article enregistré",
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
        <Button size="lg" onClick={save} disabled={busy || !name.trim()}>
          Enregistrer
        </Button>
      }
    >
      <div className="grid gap-4">
        <TextInput
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Rayon"
          value={aisleId}
          onChange={(e) => setAisleId(e.target.value as Id<"aisles"> | "")}
        >
          <option value="">🛒 Divers</option>
          {base?.aisles.map((a) => (
            <option key={a._id} value={a._id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Prix d'un article (CHF)"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            inputMode="decimal"
            placeholder="Ex. 4.50"
          />
          <TextInput
            label="Quantité habituelle"
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value)}
            inputMode="numeric"
            placeholder="Ex. 2"
          />
        </div>
        <ProductPhotoField imageUrl={image.url} onChange={(img) => setImage(img ? { id: img.id, url: img.url } : { id: null, url: null })} />
        <ChainsPicker value={onlyChains} onChange={setOnlyChains} />
      </div>
    </Sheet>
  );
}
