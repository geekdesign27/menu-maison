// Loaded on demand: three questions before the tour of a new admin, so the
// family arriving alone starts with its own shopping day, store and servings.
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { dayName } from "../../convex/domain/dates";
import { useBase, useMe, useSession } from "../lib/session";
import { useRun } from "../lib/toast";
import { dayButtonClass, dayButtonLabel, WEEKDAYS } from "../lib/weekdays";
import { Button, Chip, Sheet, Stepper } from "../components/ui";
import { ChainMark } from "../components/shopping/chains";
import { useT } from "../i18n/useT";

export function FamilySetup({
  onDone,
  onLater,
}: {
  /** Settings saved: the tour follows. */
  onDone: () => void;
  onLater: () => void;
}) {
  const { token } = useSession();
  const base = useBase();
  const me = useMe();
  const { t, lang } = useT();
  const run = useRun();
  const updateSettings = useMutation(api.catalog.updateSettings);
  // Starts from the family's current settings: a second admin keeps them as they are
  const [day, setDay] = useState(base?.settings.shoppingDay ?? 6);
  const [storeId, setStoreId] = useState<Id<"stores"> | undefined>(
    base?.settings.defaultStoreId,
  );
  const [persons, setPersons] = useState(base?.settings.defaultPersons ?? 3);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    const saved = await run(async () => {
      await updateSettings({
        token,
        shoppingDay: day,
        defaultPersons: persons,
        ...(storeId ? { defaultStoreId: storeId } : {}),
      });
      return true;
    });
    setSaving(false);
    if (saved) onDone();
  };

  const question = "text-lg font-black";
  const help = "mt-1 text-[15px] text-muted";
  return (
    <Sheet
      open
      onClose={onLater}
      title={t("common.welcome.title")}
      footer={
        <div className="grid gap-2 pb-3">
          <Button size="lg" onClick={save} disabled={saving}>
            {t("common.setup.save")}
          </Button>
          <Button variant="ghost" onClick={onLater}>
            {t("common.welcome.later")}
          </Button>
        </div>
      }
    >
      <p className="text-[17px]">
        {t("common.setup.intro", { name: me?.name ?? "" })}
      </p>

      <section className="mt-5">
        <h3 className={question}>{t("common.setup.day")}</h3>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={day === d}
              aria-label={dayName(d, lang)}
              onClick={() => setDay(d)}
              className={dayButtonClass(day === d)}
            >
              {dayButtonLabel(d, lang)}
            </button>
          ))}
        </div>
        <p className={help}>{t("common.setup.dayHelp")}</p>
      </section>

      {base && base.stores.length > 0 && (
        <section className="mt-5">
          <h3 className={question}>{t("common.setup.store")}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {base.stores.map((s) => (
              <Chip
                key={s._id}
                selected={storeId === s._id}
                onClick={() => setStoreId(s._id)}
                className="min-h-11 pl-1.5"
              >
                <ChainMark chain={s.chain} size={30} />
                {s.name}
              </Chip>
            ))}
          </div>
          <p className={help}>{t("common.setup.storeHelp")}</p>
        </section>
      )}

      <section className="mt-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={question}>{t("common.setup.persons")}</h3>
          <p className={help}>{t("common.setup.personsHelp")}</p>
        </div>
        <Stepper
          label={t("common.setup.persons")}
          value={persons}
          min={1}
          max={12}
          onChange={setPersons}
        />
      </section>
    </Sheet>
  );
}
