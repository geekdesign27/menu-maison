import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";

/** Heart toggle for the current member, applied instantly on screen. */
export function useToggleLike() {
  const { token, memberId } = useSession();
  const run = useRun();
  const toggle = useMutation(api.recipes.toggleLike).withOptimisticUpdate(
    (store, args) => {
      const list = store.getQuery(api.recipes.list, { token: args.token });
      if (!list) return;
      store.setQuery(
        api.recipes.list,
        { token: args.token },
        list.map((r) => {
          if (r._id !== args.recipeId) return r;
          const liked = r.likedBy.includes(args.memberId);
          return {
            ...r,
            saved: liked ? r.saved : true,
            likedBy: liked
              ? r.likedBy.filter((m) => m !== args.memberId)
              : [...r.likedBy, args.memberId],
          };
        }),
      );
    },
  );
  return (recipeId: Id<"recipes">) => {
    if (!memberId) return;
    void run(() => toggle({ token, recipeId, memberId }));
  };
}

const PASTELS = [
  "#fde9da", // carrot
  "#def3e6", // herb
  "#fbe2e8", // berry
  "#fdf1cf", // sun
  "#e2eefa", // sky
  "#ece6fb", // lilac
  "#d9f2ec", // mint
  "#ffe3cc", // peach
];

/** Soft background colour derived from the recipe name, stable across renders. */
export function pastelFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return PASTELS[hash % PASTELS.length];
}
