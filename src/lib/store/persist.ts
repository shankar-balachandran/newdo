import { get, set } from "idb-keyval";
import { createMemoryStore } from "./memory";
import type { Store, Snapshot } from "./store";

const KEY = "newdo:v1";
const LOAD_TIMEOUT_MS = 2500;
type Persisted = Omit<Snapshot, "hydrated">;

/**
 * Browser store. Wraps the memory store, loads from IndexedDB on start,
 * and writes the whole snapshot (debounced) after every change.
 * Data volume is tiny, so whole-snapshot writes are fine for v0.
 * IndexedDB persists per origin, so a static deploy needs no backend.
 *
 * If IndexedDB is slow or wedged (private mode, a blocked delete, a stuck
 * connection) the page shows the seed after a short timeout rather than
 * "Loading…" forever. Saves stay suppressed until the real load settles, so
 * stored data is never overwritten by the seed.
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

  const fallback = setTimeout(() => {
    if (loading) {
      console.warn("newdo: IndexedDB slow, showing seed while waiting");
      inner.load(seed);
    }
  }, LOAD_TIMEOUT_MS);

  get<Persisted>(KEY)
    .then((stored) => {
      clearTimeout(fallback);
      loading = false;
      if (stored) inner.load(stored);
      else if (!inner.snapshot().hydrated) inner.load(seed);
    })
    .catch((e) => {
      clearTimeout(fallback);
      console.warn("newdo: load failed, using seed", e);
      loading = false;
      if (!inner.snapshot().hydrated) inner.load(seed);
    });

  return inner;
}
