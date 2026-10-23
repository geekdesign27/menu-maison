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

function relativeDay(createdAt: number, today: string) {
  const n = daysBetween(zurichToday(new Date(createdAt)), today);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "hier";
  if (n < 7) return `il y a ${n} jours`;
  const weeks = Math.round(n / 7);
  return weeks === 1 ? "il y a une semaine" : `il y a ${weeks} semaines`;
}

export function WishesPage() {
  const { token } = useSession();
  const wishes = useQuery(api.wishes.list, token ? { token } : "skip");
  const [showDone, setShowDone] = useState(false);
  const open = wishes?.filter((w) => !w.done) ?? [];
  const done = wishes?.filter((w) => w.done) ?? [];

  return (
    <Page
      title="Envies"
      subtitle="Ce qu'on a envie de manger bientôt"
      back={<BackButton fallback="/plus" />}
    >
      <AddWish />
      {wishes === undefined ? (
        <Loading label="Chargement des envies" />
      ) : (
        <>
          <SectionTitle>À planifier</SectionTitle>
          {open.length === 0 ? (
            <Card>
              <EmptyState
                emoji="💭"
                title="Aucune envie pour l'instant"
                text="Un plat qui fait envie ? Note-le ici, on y pensera en planifiant la semaine."
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
                Déjà mangées ({done.length})
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
  const me = useMe();
  const run = useRun();
  const add = useMutation(api.wishes.add);
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);

  const save = async (wish: { text?: string; recipeId?: Wish["recipeId"] }) => {
    if (!memberId) return;
    const id = await run(
      () => add({ token, memberId, ...wish }),
      "Envie notée",
    );
    if (id) setText("");
  };

  return (
    <Card className="mt-2 p-4">
      <div className="mb-3 flex items-center gap-2">
        {me && <Avatar member={me} size={32} />}
        <span className="font-extrabold">
          {me ? `${me.name} a envie de…` : "J'ai envie de…"}
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
          placeholder="Des crêpes, un curry…"
          aria-label="Ton envie"
          maxLength={80}
          className="min-h-12 min-w-0 flex-1 rounded-2xl bg-cream px-4 ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
        />
        <IconButton
          type="submit"
          label="Noter l'envie"
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
        Choisir une recette
      </Button>
      <RecipePicker
        open={picking}
        onClose={() => setPicking(false)}
        title="Une recette qui fait envie"
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
            {member?.name ?? "Quelqu'un"}, {relativeDay(wish.createdAt, today)}
          </div>
        </div>
        <IconButton
          label="Supprimer l'envie"
          className="text-muted"
          onClick={() =>
            run(() => remove({ token, id: wish._id }), "Envie supprimée")
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
            Remettre en envie
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
                Planifier
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() =>
                run(
                  () => setDone({ token, id: wish._id, done: true }),
                  "Envie cochée",
                )
              }
            >
              <Check size={18} />
              Fait
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
