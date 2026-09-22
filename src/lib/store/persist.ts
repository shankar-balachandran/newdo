import { get, set } from "idb-keyval";
import { createMemoryStore } from "./memory";
import type { Store, Snapshot } from "./store";

const KEY = "newdo:v1";
type Persisted = Omit<Snapshot, "hydrated">;

/**
 * Browser store. Wraps the memory store, loads from IndexedDB on start,
 * and writes the whole snapshot (debounced) after every change.
 * Data volume is tiny, so whole-snapshot writes are fine for v0.
 * IndexedDB persists per origin, so a static deploy needs no backend.
 */
export function createPersistentStore(seed: Persisted): Store {
  const inner = createMemoryStore({ obligations: [], people: [], rules: [] }, false);
  let loading = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const save = () => {
    if (loading) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const { hydrated: _h, ...data } = inner.snapshot();
      void _h;
      set(KEY, data).catch((e) => console.warn("newdo: persist failed", e));
    }, 150);
  };

  inner.subscribe(save);

  get<Persisted>(KEY)
    .then((stored) => {
      loading = false;
      inner.load(stored ?? seed);
    })
    .catch((e) => {
      console.warn("newdo: load failed, using seed", e);
      loading = false;
      inner.load(seed);
    });

  return inner;
}
