import type { Obligation, Person, Rule, ScratchLine, Event } from "@/lib/model/types";

/**
 * Store boundary. Two implementations:
 *  - memory:   in-RAM, for tests and SSR.
 *  - persist:  memory + IndexedDB, for the browser. Survives reloads and
 *              static deploys (Cloudflare Pages) with no backend.
 * Later: a synced implementation (Cloudflare D1 / Durable Objects) behind
 * this same interface for multi-device.
 */
export interface Snapshot {
  obligations: Obligation[];
  people: Person[];
  rules: Rule[];
  scratch: ScratchLine[];
  /** false until persisted state has been loaded (browser only). */
  hydrated: boolean;
}

export interface Store {
  snapshot(): Snapshot;
  subscribe(listener: () => void): () => void;

  putObligation(o: Obligation): void;
  appendEvent(obligationId: string, ev: Event): void;
  putRule(r: Rule): void;
  addScratch(text: string): void;
  promoteScratch(id: string): ScratchLine | undefined;
  /** Replace all state. Used by persistence on load and by reset. */
  load(s: Omit<Snapshot, "hydrated">): void;
}
