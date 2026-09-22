import type { Obligation, Rule, Event, ScratchLine, Person } from "@/lib/model/types";
import type { Store, Snapshot } from "./store";

export function createMemoryStore(seed: Omit<Snapshot, "scratch" | "hydrated">, hydrated = true): Store {
  let snap: Snapshot = { ...seed, scratch: [], hydrated };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const replace = (id: string, fn: (o: Obligation) => Obligation) => {
    snap = { ...snap, obligations: snap.obligations.map((o) => (o.id === id ? fn(o) : o)) };
    emit();
  };

  return {
    snapshot: () => snap,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    putObligation(o: Obligation) {
      const exists = snap.obligations.some((x) => x.id === o.id);
      snap = {
        ...snap,
        obligations: exists ? snap.obligations.map((x) => (x.id === o.id ? o : x)) : [...snap.obligations, o],
      };
      emit();
    },
    appendEvent(id: string, ev: Event) {
      replace(id, (o) => ({ ...o, history: [...o.history, ev] }));
    },
    putPerson(p: Person) {
      snap = { ...snap, people: [...snap.people.filter((x) => x.id !== p.id), p] };
      emit();
    },
    putRule(r: Rule) {
      snap = { ...snap, rules: [...snap.rules.filter((x) => x.id !== r.id), r] };
      emit();
    },
    addScratch(text: string) {
      const line: ScratchLine = { id: crypto.randomUUID(), text, at: new Date().toISOString() };
      snap = { ...snap, scratch: [...snap.scratch, line] };
      emit();
    },
    promoteScratch(id: string) {
      const line = snap.scratch.find((s) => s.id === id);
      if (!line) return undefined;
      snap = { ...snap, scratch: snap.scratch.filter((s) => s.id !== id) };
      emit();
      return line;
    },
    load(s) {
      snap = { ...s, hydrated: true };
      emit();
    },
  };
}
