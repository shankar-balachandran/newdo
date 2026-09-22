"use client";
import { useSyncExternalStore } from "react";
import { createMemoryStore } from "./memory";
import { createPersistentStore } from "./persist";
import { obligations, people, rules } from "./seed";
import type { Store, Snapshot } from "./store";

const seed = { obligations, people, rules, scratch: [] };
const serverSnapshot: Snapshot = { obligations: [], people: [], rules: [], scratch: [], hydrated: false };

let store: Store | null = null;
export function getStore(): Store {
  if (!store) {
    store =
      typeof window === "undefined" || typeof indexedDB === "undefined"
        ? createMemoryStore({ obligations, people, rules })
        : createPersistentStore(seed);
  }
  return store;
}

export function resetToSeed() {
  getStore().load(seed);
}

/** Empty everything. Keeps only "you"; people are learned from what you type. */
export function startFromScratch() {
  const me = people.find((p) => p.relation === "self")!;
  getStore().load({ obligations: [], people: [me], rules: [], scratch: [] });
}

export function useSnapshot() {
  const s = getStore();
  return useSyncExternalStore(s.subscribe, s.snapshot, () => serverSnapshot);
}
