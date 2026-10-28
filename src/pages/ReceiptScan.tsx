import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { AlertTriangle, Camera, Check } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import {
  CHAINS,
  needsPackContent,
  packContentProblem,
  type Chain,
} from "../../convex/domain/receipts";
import type { Lang } from "../../convex/domain/lang";
import { NBSP, type Unit } from "../../convex/domain/quantities";
import { useBase, useSession, type Base } from "../lib/session";
import { useStoreChoice, useWeek } from "../lib/week";
import { useRun, useToast } from "../lib/toast";
import { errorMessage, formatChf, plural } from "../lib/format";
import { photoToBase64 } from "../lib/image";
import { parseAmount, unitName } from "../lib/units";
import { BackButton } from "../components/Layout";
import { chainLabel } from "../components/shopping/chains";
import { useT } from "../i18n/useT";
import {
  Badge,
  Button,
  Card,
  cx,
  Loading,
  Page,
  Select,
  TextInput,
} from "../components/ui";

type ReadResult = FunctionReturnType<typeof api.receipts.read>;
type ReadLine = ReadResult["lines"][number];

/** What the family decided for one line: "" off the list, "new" new usual item, else i:<id> / s:<id>. */
interface Choice {
  target: string;
  packText: string;
  newName: string;
}

const encode = (t: ReadLine["target"]) =>
  t ? `${t.kind === "ingredient" ? "i" : "s"}:${t.id}` : "";

export function ReceiptScanPage() {
  const base = useBase();
  const { t } = useT();
  return (
    <Page title={t("shopping.receipt.title")} back={<BackButton fallback="/courses" />}>
      {base ? <ReceiptScan base={base} /> : <Loading />}
    </Page>
  );
}

function ReceiptScan({ base }: { base: Base }) {
  const { token } = useSession();
  const week = useWeek();
  const { store } = useStoreChoice();
  const navigate = useNavigate();
  const run = useRun();
  const toast = useToast();
  const { t, lang } = useT();
  const read = useAction(api.receipts.read);
  const save = useMutation(api.receipts.save);
  const list = useQuery(
    api.shopping.list,
    token ? { token, start: week.start, storeId: store?._id } : "skip",
  );
  const staples = useQuery(
    api.products.list,
    token ? { token } : "skip",
  )?.staples;
  const input = useRef<HTMLInputElement>(null);

  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [chain, setChain] = useState<Chain>("Autre");
  const [date, setDate] = useState(week.today);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [saving, setSaving] = useState(false);

  // Products on this week's list come first in the choices and in what Claude prefers
  const inList = useMemo(() => {
    const ids = new Set<string>();
    for (const section of [
      ...(list?.sections ?? []).flatMap((s) => s.items),
      ...(list?.skipped ?? []),
    ]) {
      if (section.ingredientId) ids.add(section.ingredientId);
      if (section.stapleId) ids.add(section.stapleId);
    }
    return ids;
  }, [list]);

  const choose = async (file: File) => {
    setError(null);
    setReading(true);
    try {
      // 2000 px keeps the small print of a long receipt readable
      const image = await photoToBase64(file, 2000);
      const res = await read({ token, image, inList: [...inList] });
      setResult(res);
      setChain(res.chain);
      if (res.date) setDate(res.date);
      setChoices(
        res.lines.map((l) => ({
          target: encode(l.target),
          packText: l.packQty !== null ? String(l.packQty) : "",
          newName: l.label,
        })),
      );
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally {
      setReading(false);
    }
  };

  const ingredientUnit = (id: string): Unit | undefined =>
    base.ingredients.find((i) => i._id === id)?.unit;

  const submit = async () => {
    if (!result) return;
    const lines: Parameters<typeof save>[0]["lines"] = [];
    for (const [n, line] of result.lines.entries()) {
      if (line.kind !== "product") continue;
      const c = choices[n];
      const [kind, id] = c.target.split(":");
      const packQty = parseAmount(c.packText);
      if (Number.isNaN(packQty)) {
        toast(
          t("shopping.receipt.packNotNumber", { label: line.label }),
          "error",
        );
        return;
      }
      const unit = kind === "i" ? ingredientUnit(id) : undefined;
      const problem = unit && packQty !== undefined ? packContentProblem(unit, packQty) : null;
      if (problem) {
        // The domain only detects the problem; its wording comes from the dictionary
        toast(
          t("shopping.receipt.lineProblem", {
            label: line.label,
            problem: t(
              unit === "g"
                ? "shopping.receipt.packInGrams"
                : "shopping.receipt.packInMl",
            ),
          }),
          "error",
        );
        return;
      }
      lines.push({
        label: line.label,
        unitPrice: line.unitPrice,
        weightKg: line.weightKg,
        pricePerKg: line.pricePerKg,
        target:
          kind === "i"
            ? { kind: "ingredient" as const, id: id as Id<"ingredients"> }
            : kind === "s"
              ? { kind: "staple" as const, id: id as Id<"staples"> }
              : null,
        packQty: kind === "i" ? (packQty ?? null) : null,
        newStapleName: c.target === "new" ? c.newName : null,
      });
    }
    setSaving(true);
    const done = await run(() => save({ token, chain, date, lines }));
    setSaving(false);
    if (done) {
      const prices = plural(
        done.prices,
        t("shopping.receipt.priceOne"),
        t("shopping.receipt.priceMany"),
      );
      const chainName = chainLabel(chain, lang);
      toast(
        done.staples
          ? t("shopping.receipt.savedWithStaples", {
              prices,
              chain: chainName,
              staples: plural(
                done.staples,
                t("shopping.receipt.stapleOne"),
                t("shopping.receipt.stapleMany"),
              ),
            })
          : t("shopping.receipt.saved", { prices, chain: chainName }),
      );
      navigate("/courses");
    }
  };

  if (!result) {
    return (
      <div className="grid gap-4">
        <p className="text-[17px]">{t("shopping.receipt.intro")}</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void choose(file);
          }}
        />
        <Button
          size="lg"
          onClick={() => input.current?.click()}
          disabled={reading}
        >
          <Camera size={22} />{" "}
          {reading
            ? t("shopping.receipt.reading")
            : t("shopping.receipt.takePhoto")}
        </Button>
        {reading && (
          <p className="text-center text-[15px] text-muted" role="status">
            {t("shopping.receipt.wait")}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-berry-soft p-3 font-semibold text-berry"
          >
            {error}
          </p>
        )}
        <p className="text-[13px] text-muted">
          {t("shopping.receipt.privacy")}
        </p>
      </div>
    );
  }

  const products = result.lines.filter((l) => l.kind === "product").length;
  return (
    <div className="grid gap-4">
      <Card className="grid gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("shopping.chain")}
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain)}
          >
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {chainLabel(c, lang)}
              </option>
            ))}
          </Select>
          <TextInput
            label={t("shopping.receipt.date")}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <p className="text-[15px]">
          {t("shopping.receipt.summary", {
            items: plural(
              products,
              t("shopping.receipt.readOne"),
              t("shopping.receipt.readMany"),
            ),
            total: formatChf(result.total),
          })}
        </p>
        {!result.totalMatches && (
          <p className="flex gap-2 rounded-xl bg-sun-soft p-3 text-[15px] font-semibold text-[#6b4d00]">
            <AlertTriangle size={20} className="shrink-0" />
            {t("shopping.receipt.mismatch", { sum: formatChf(result.sum) })}
          </p>
        )}
      </Card>

      <ul className="grid gap-2">
        {result.lines.map((line, n) => (
          <li key={n}>
            <LineCard
              line={line}
              choice={choices[n]}
              base={base}
              staples={staples ?? []}
              inList={inList}
              unitOf={ingredientUnit}
              onChange={(c) =>
                setChoices((all) => all.map((x, i) => (i === n ? c : x)))
              }
            />
          </li>
        ))}
      </ul>

      <Button
        size="lg"
        onClick={submit}
        disabled={saving || !/^\d{4}-\d{2}-\d{2}$/.test(date)}
      >
        <Check size={22} />{" "}
        {saving
          ? t("shopping.receipt.saving")
          : t("shopping.receipt.savePrices")}
      </Button>
      <Button variant="ghost" onClick={() => setResult(null)}>
        {t("shopping.receipt.retry")}
      </Button>
    </div>
  );
}

function priceDetail(line: ReadLine, lang: Lang) {
  if (line.weightKg > 0 && line.pricePerKg > 0) {
    // Decimal comma in French, decimal point in Swiss German
    const kg = lang === "de" ? String(line.weightKg) : String(line.weightKg).replace(".", ",");
    return `${kg}${NBSP}kg × ${formatChf(line.pricePerKg)}/kg`;
  }
  if (line.quantity > 1)
    return `${line.quantity} × ${formatChf(line.unitPrice)}`;
  return "";
}

const IGNORED = {
  bag: "shopping.receipt.bag",
  discount: "shopping.receipt.discount",
  deposit: "shopping.receipt.deposit",
} as const;

function LineCard({
  line,
  choice,
  base,
  staples,
  inList,
  unitOf,
  onChange,
}: {
  line: ReadLine;
  choice: Choice;
  base: Base;
  staples: { _id: string; name: string }[];
  inList: Set<string>;
  unitOf: (id: string) => Unit | undefined;
  onChange: (c: Choice) => void;
}) {
  const { t, lang } = useT();
  const detail = priceDetail(line, lang);
  const header = (
    <div className="flex items-baseline gap-2">
      <span className="min-w-0 flex-1 font-extrabold">{line.label}</span>
      <span className="shrink-0 font-bold tabular-nums">
        {formatChf(line.total)}
      </span>
    </div>
  );
  if (line.kind !== "product") {
    return (
      <Card className="p-3 opacity-60">
        {header}
        <span className="text-[13px] text-muted">
          {t("shopping.receipt.ignored", { kind: t(IGNORED[line.kind]) })}
        </span>
      </Card>
    );
  }

  const [kind, id] = choice.target.split(":");
  const unit = kind === "i" ? unitOf(id) : undefined;
  const askPack = unit !== undefined && needsPackContent(line, unit, undefined);
  const listed = (x: { _id: string }) => inList.has(x._id);
  const off = choice.target === "" || choice.target === "new";

  return (
    <Card className={cx("grid gap-2 p-3", off && "bg-cream")}>
      {header}
      {(detail || line.known) && (
        <div className="flex items-center gap-2 text-[13px] text-muted">
          {detail}
          {line.known && <Badge tone="herb">{t("shopping.receipt.known")}</Badge>}
        </div>
      )}
      <Select
        aria-label={t("shopping.receipt.productFor", { label: line.label })}
        value={choice.target}
        onChange={(e) => onChange({ ...choice, target: e.target.value })}
      >
        <option value="">{t("shopping.receipt.offList")}</option>
        <option value="new">{t("shopping.receipt.addStaple")}</option>
        <optgroup label={t("shopping.receipt.groupWeek")}>
          {base.ingredients.filter(listed).map((i) => (
            <option key={i._id} value={`i:${i._id}`}>
              {i.name}
            </option>
          ))}
          {staples.filter(listed).map((s) => (
            <option key={s._id} value={`s:${s._id}`}>
              {s.name}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("shopping.receipt.groupIngredients")}>
          {base.ingredients
            .filter((i) => !listed(i))
            .map((i) => (
              <option key={i._id} value={`i:${i._id}`}>
                {i.name}
              </option>
            ))}
        </optgroup>
        <optgroup label={t("shopping.receipt.groupNoRecipe")}>
          {staples
            .filter((s) => !listed(s))
            .sort((a, b) => a.name.localeCompare(b.name, "fr"))
            .map((s) => (
              <option key={s._id} value={`s:${s._id}`}>
                {s.name}
              </option>
            ))}
        </optgroup>
      </Select>
      {choice.target === "new" && (
        <TextInput
          label={t("shopping.receipt.stapleName")}
          value={choice.newName}
          onChange={(e) => onChange({ ...choice, newName: e.target.value })}
        />
      )}
      {askPack && unit && (
        <div>
          <TextInput
            label={t("shopping.receipt.packContent", {
              unit: unitName(unit, 2, lang),
            })}
            value={choice.packText}
            inputMode="decimal"
            placeholder={
              unit === "pc"
                ? t("shopping.receipt.packExamplePc")
                : t("shopping.receipt.packExample")
            }
            onChange={(e) => onChange({ ...choice, packText: e.target.value })}
          />
          {!choice.packText.trim() && (
            <p className="mt-1 text-[13px] text-muted">
              {t("shopping.receipt.packHint")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
