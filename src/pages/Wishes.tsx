import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  BookHeart,
  CalendarPlus,
  Check,
  ChevronDown,
  Send,
  Trash,
  Undo2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { daysBetween, zurichToday } from "../../convex/domain/dates";
import type { Lang } from "../../convex/domain/lang";
import { translate } from "../i18n";
import { useT } from "../i18n/useT";
import { useBase, useMe, useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { BackButton } from "../components/Layout";
import { RecipePicker } from "../components/RecipePicker";
import {
  Avatar,
  Button,
  Card,
  cx,
  EmptyState,
  IconButton,
  Loading,
  Page,
  SectionTitle,
} from "../components/ui";

type Wish = FunctionReturnType<typeof api.wishes.list>[number];

function relativeDay(createdAt: number, today: string, lang: Lang) {
  const n = daysBetween(zurichToday(new Date(createdAt)), today);
  if (n <= 0) return translate(lang, "week.relToday");
  if (n === 1) return translate(lang, "week.relYesterday");
  if (n < 7) return translate(lang, "week.relDaysAgo", { n });
  const weeks = Math.round(n / 7);
  return weeks === 1
    ? translate(lang, "week.relWeekAgo")
    : translate(lang, "week.relWeeksAgo", { n: weeks });
}

export function WishesPage() {
  const { token } = useSession();
  const { t } = useT();
  const wishes = useQuery(api.wishes.list, token ? { token } : "skip");
  const [showDone, setShowDone] = useState(false);
  const open = wishes?.filter((w) => !w.done) ?? [];
  const done = wishes?.filter((w) => w.done) ?? [];

  return (
    <Page
      title={t("week.wishes")}
      subtitle={t("week.wishesSubtitle")}
      back={<BackButton fallback="/plus" />}
    >
      <AddWish />
      {wishes === undefined ? (
        <Loading label={t("week.loadingWishes")} />
      ) : (
        <>
          <SectionTitle>{t("week.toPlan")}</SectionTitle>
          {open.length === 0 ? (
            <Card>
              <EmptyState
                emoji="💭"
                title={t("week.noWishTitle")}
                text={t("week.noWishText")}
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {open.map((w) => (
                <li key={w._id}>
                  <WishRow wish={w} />
                </li>
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((s) => !s)}
                className="flex min-h-11 w-full items-center justify-between gap-2 text-[13px] font-extrabold tracking-wider text-muted uppercase"
              >
                {t("week.alreadyEaten", { count: done.length })}
                <ChevronDown
                  size={20}
                  className={cx("transition", showDone && "rotate-180")}
                />
              </button>
              {showDone && (
                <ul className="mt-2 space-y-2">
                  {done.map((w) => (
                    <li key={w._id}>
                      <WishRow wish={w} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function AddWish() {
  const { token, memberId } = useSession();
  const { t } = useT();
  const me = useMe();
  const run = useRun();
  const add = useMutation(api.wishes.add);
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);

  const save = async (wish: { text?: string; recipeId?: Wish["recipeId"] }) => {
    if (!memberId) return;
    const id = await run(
      () => add({ token, memberId, ...wish }),
      t("week.wishNoted"),
    );
    if (id) setText("");
  };

  return (
    <Card className="mt-2 p-4">
      <div className="mb-3 flex items-center gap-2">
        {me && <Avatar member={me} size={32} />}
        <span className="font-extrabold">
          {me ? t("week.memberWants", { name: me.name }) : t("week.iWant")}
        </span>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void save({ text });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("week.wishPlaceholder")}
          aria-label={t("week.yourWish")}
          maxLength={80}
          className="min-h-12 min-w-0 flex-1 rounded-2xl bg-cream px-4 ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
        />
        <IconButton
          type="submit"
          label={t("week.noteWish")}
          disabled={!text.trim() || !memberId}
          className="size-12 bg-carrot text-white active:bg-carrot-dark"
        >
          <Send size={20} />
        </IconButton>
      </form>
      <Button
        variant="secondary"
        className="mt-2 w-full"
        disabled={!memberId}
        onClick={() => setPicking(true)}
      >
        <BookHeart size={20} />
        {t("week.chooseRecipe")}
      </Button>
      <RecipePicker
        open={picking}
        onClose={() => setPicking(false)}
        title={t("week.recipeWanted")}
        onPick={(choice) => {
          setPicking(false);
          if ("recipeId" in choice) void save({ recipeId: choice.recipeId });
        }}
      />
    </Card>
  );
}

function WishRow({ wish }: { wish: Wish }) {
  const { token } = useSession();
  const { t, lang } = useT();
  const base = useBase();
  const { today } = useWeek();
  const navigate = useNavigate();
  const run = useRun();
  const setDone = useMutation(api.wishes.setDone);
  const remove = useMutation(api.wishes.remove);
  const member = base?.members.find((m) => m._id === wish.memberId);

  return (
    <Card className={cx("p-3", wish.done && "opacity-70")}>
      <div className="flex items-center gap-3">
        {member && <Avatar member={member} size={40} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-black">
            {wish.recipe
              ? `${wish.recipe.emoji} ${wish.recipe.name}`
              : wish.text}
          </div>
          <div className="text-[15px] text-muted">
            {member?.name ?? t("week.someone")},{" "}
            {relativeDay(wish.createdAt, today, lang)}
          </div>
        </div>
        <IconButton
          label={t("week.deleteWish")}
          className="text-muted"
          onClick={() =>
            run(() => remove({ token, id: wish._id }), t("week.wishDeleted"))
          }
        >
          <Trash size={20} />
        </IconButton>
      </div>
      <div className="mt-2 flex gap-2">
        {wish.done ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() =>
              run(() => setDone({ token, id: wish._id, done: false }))
            }
          >
            <Undo2 size={18} />
            {t("week.wishAgain")}
          </Button>
        ) : (
          <>
            {wish.recipe && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/?plan=${wish.recipe!._id}`)}
              >
                <CalendarPlus size={18} />
                {t("week.plan")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() =>
                run(
                  () => setDone({ token, id: wish._id, done: true }),
                  t("week.wishTicked"),
                )
              }
            >
              <Check size={18} />
              {t("week.done")}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
