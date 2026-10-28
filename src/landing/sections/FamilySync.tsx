import { useEffect, useRef, useState } from "react";
import { Check, Wifi } from "lucide-react";
import { Avatar, cx } from "../../components/ui";
import { DemoTag, Heading, Note, Phone, Reveal, Section } from "../parts";
import { useL } from "../lang";
import type { LandingKey } from "../i18n";
import { typo } from "../typo";

const JULIE = { name: "Julie", emoji: "👩‍🍳", color: "#A8C8E8" };
const MARC = { name: "Marc", emoji: "🧔", color: "#F5C6A5" };
type Who = typeof JULIE;

// `key` doubles as the item's id in the example's state
const ITEMS: { key: LandingKey; qty: string }[] = [
  { key: "sync.item.carrots", qty: "540 g" },
  { key: "sync.item.milk", qty: "900 ml" },
  { key: "sync.item.parmesan", qty: "120 g" },
  { key: "sync.item.tresse", qty: "" },
];

const POINTS: LandingKey[] = ["sync.point1", "sync.point2", "sync.point3", "sync.point4", "sync.point5"];

/** Delay of the example « network »: the other phone follows a moment later. */
const LAG_MS = 450;

function MiniPhone({
  owner,
  checks,
  pending,
  onToggle,
}: {
  owner: Who;
  checks: Record<string, Who | undefined>;
  pending: LandingKey | null;
  onToggle: (key: LandingKey) => void;
}) {
  const { l } = useL();
  return (
    <div className="lp-phone w-[min(40vw,210px)] !rounded-[2rem] !p-1.5">
      <div className="rounded-[1.6rem] bg-cream px-2 pt-4 pb-4 sm:px-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[15px] font-black">{l("sync.screen")}</p>
          <Avatar member={owner} size={24} />
        </div>
        <p className="px-1 text-[11px] font-bold text-muted">{l("sync.phoneOf", { name: owner.name })}</p>
        <ul className="mt-3 overflow-hidden rounded-2xl bg-paper">
          {ITEMS.map((it) => {
            const label = l(it.key);
            const by = checks[it.key];
            const arriving = pending === it.key && !by;
            return (
              <li key={it.key} className="border-b border-line last:border-0">
                <button
                  type="button"
                  aria-pressed={!!by}
                  aria-label={
                    by
                      ? l("sync.itemCheckedAria", { item: label, by: by.name, name: owner.name })
                      : l("sync.itemAria", { item: label, name: owner.name })
                  }
                  onClick={() => onToggle(it.key)}
                  className="flex min-h-11 w-full items-center gap-2 px-2 py-2 text-left"
                >
                  <span
                    className={cx(
                      "flex size-5 shrink-0 items-center justify-center rounded-full transition",
                      by ? "bg-herb text-white" : "ring-2 ring-line",
                      arriving && "animate-pulse ring-herb/60",
                    )}
                  >
                    {by && <Check size={13} strokeWidth={3.4} aria-hidden />}
                  </span>
                  <span className={cx("min-w-0 flex-1 text-[13px] leading-tight font-bold", by && "text-muted line-through")}>
                    {label}
                  </span>
                  {by ? (
                    <Avatar member={by} size={18} className="animate-pop" />
                  ) : (
                    it.qty && <span className="hidden text-[11px] font-extrabold text-carrot-dark sm:inline">{typo(it.qty)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SyncDemo() {
  const { l } = useL();
  // What each phone shows: the one tapped at once, the other after the lag
  const [shown, setShown] = useState<Record<string, Record<string, Who | undefined>>>({ Julie: {}, Marc: {} });
  const [pending, setPending] = useState<{ phone: string; key: LandingKey } | null>(null);
  const [said, setSaid] = useState("");
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function toggle(by: Who, key: LandingKey) {
    const other = by === JULIE ? MARC : JULIE;
    const next = shown[by.name][key] ? undefined : by;
    setShown((s) => ({ ...s, [by.name]: { ...s[by.name], [key]: next } }));
    setPending({ phone: other.name, key });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setShown((s) => ({ ...s, [other.name]: { ...s[other.name], [key]: next } }));
      setPending(null);
      const item = l(key);
      setSaid(
        next
          ? l("sync.saidChecked", { item, by: by.name, other: other.name })
          : l("sync.saidUnchecked", { item, other: other.name }),
      );
    }, LAG_MS);
  }

  return (
    <div className="rounded-[2rem] bg-carrot-soft/60 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-extrabold text-muted">{l("sync.tryIt")}</p>
        <DemoTag />
      </div>
      <div className="mt-6 flex items-center justify-center gap-1.5 sm:gap-6">
        <MiniPhone
          owner={JULIE}
          checks={shown.Julie}
          pending={pending?.phone === "Julie" ? pending.key : null}
          onToggle={(l) => toggle(JULIE, l)}
        />
        <Wifi aria-hidden className={cx("size-6 shrink-0 sm:size-7 text-carrot transition", pending && "scale-125 text-herb")} />
        <MiniPhone
          owner={MARC}
          checks={shown.Marc}
          pending={pending?.phone === "Marc" ? pending.key : null}
          onToggle={(l) => toggle(MARC, l)}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

export function FamilySync() {
  const { l } = useL();
  return (
    <Section id="famille" tone="paper">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <Reveal>
            <Heading id="famille">{l("sync.title")}</Heading>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {l("sync.lead")}
            </p>
          </Reveal>
          <Reveal className="mt-9 flex items-start gap-6">
            <Phone
              src="profil"
              size="w-[140px] sm:w-[170px]"
              className="hidden rotate-[-3deg] sm:block"
              alt={l("sync.profileAlt")}
            />
            <ul className="space-y-3">
              {POINTS.map((p) => (
                <li key={p} className="flex gap-3 text-[16px] leading-snug font-semibold">
                  <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-carrot" />
                  {l(p)}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <SyncDemo />
          <Note className="mt-8 text-center text-[19px]" tilt={-1.5}>
            {l("sync.note")}
          </Note>
        </Reveal>
      </div>
    </Section>
  );
}
