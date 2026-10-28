// « Revoir le guide » in Plus asks the gate to play the tour again. A tiny
// store instead of a context: the gate and Plus are far apart in the tree.
import { useSyncExternalStore } from "react";

let requests = 0;
const listeners = new Set<() => void>();

export function requestTour() {
  requests++;
  for (const listener of listeners) listener();
}

/** Number of « Revoir le guide » since the app opened (0 = never asked). */
export function useTourRequests() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => requests,
  );
}
