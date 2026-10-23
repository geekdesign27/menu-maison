import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/** catalog.updateStore with the change applied at once to the cached catalog. */
export function useUpdateStore() {
  return useMutation(api.catalog.updateStore).withOptimisticUpdate(
    (localStore, { token, id, ...patch }) => {
      const base = localStore.getQuery(api.catalog.base, { token });
      if (!base) return;
      const stores = base.stores
        .map((s) => (s._id === id ? { ...s, ...patch } : s))
        .filter((s) => !s.archived);
      localStore.setQuery(api.catalog.base, { token }, { ...base, stores });
    },
  );
}
