import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Heart } from "lucide-react";
import type { Member } from "../lib/session";
import { minutes } from "../lib/format";
import { Avatar, Card, cx } from "./ui";
import { pastelFor } from "./recipes/data";
import type { RecipeRow } from "../lib/queries";

/** Recipe emoji on its pastel tile. */
export function RecipeEmoji({
  name,
  emoji,
  size = "md",
  className,
}: {
  name: string;
  emoji: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex shrink-0 items-center justify-center",
        size === "sm" && "size-11 rounded-xl text-2xl",
        size === "md" && "size-14 rounded-2xl text-3xl",
        className,
      )}
      style={{ background: pastelFor(name) }}
    >
      {emoji}
    </span>
  );
}

/** Heart of the current member, with a small pop on each tap. */
export function HeartButton({
  liked,
  onToggle,
  disabled,
  className,
}: {
  liked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [taps, setTaps] = useState(0);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Je n'aime plus" : "J'aime"}
      disabled={disabled}
      onClick={() => {
        setTaps((n) => n + 1);
        onToggle();
      }}
      className={cx(
        "inline-flex size-11 items-center justify-center rounded-full bg-paper/95 shadow-sm transition active:scale-90 disabled:opacity-40",
        liked ? "text-berry" : "text-muted",
        className,
      )}
    >
      <Heart
        key={taps}
        size={22}
        strokeWidth={2.4}
        fill={liked ? "currentColor" : "none"}
        className={taps > 0 ? "animate-pop" : undefined}
      />
    </button>
  );
}

export function RecipeCard({
  recipe,
  members,
  cost,
  liked,
  onToggleLike,
}: {
  recipe: RecipeRow;
  members: Member[];
  cost: string | null;
  liked: boolean;
  onToggleLike?: () => void;
}) {
  const fans = members.filter((m) => recipe.likedBy.includes(m._id));
  return (
    <div className="relative">
      <Link to={`/recette/${recipe._id}`} className="block h-full">
        <Card className="flex h-full flex-col overflow-hidden transition active:scale-[0.98]">
          <div
            className="flex aspect-[4/3] items-center justify-center text-[64px] leading-none"
            style={{ background: pastelFor(recipe.name) }}
          >
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
            ) : (
              <span aria-hidden className="drop-shadow-sm">
                {recipe.emoji}
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <h3 className="line-clamp-2 text-[16px] leading-snug font-black">
              {recipe.name}
            </h3>
            <div className="flex items-center gap-1 text-[15px] font-bold text-muted">
              <Clock size={15} strokeWidth={2.6} aria-hidden />
              {minutes(recipe.prepMinutes)}
            </div>
            {cost && (
              <div className="text-[15px] font-extrabold text-herb">
                {cost}
                <span className="font-bold text-muted"> / pers.</span>
              </div>
            )}
            <div className="mt-auto flex min-h-8 items-center pt-1">
              {fans.length > 0 && (
                <div className="flex -space-x-2">
                  {fans.map((m) => (
                    <Avatar key={m._id} member={m} size={28} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>
      {onToggleLike && (
        <HeartButton
          liked={liked}
          onToggle={onToggleLike}
          className="absolute top-2 right-2"
        />
      )}
    </div>
  );
}
