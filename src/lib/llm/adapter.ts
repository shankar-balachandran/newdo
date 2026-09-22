import type { Obligation, Origin, Person, Rule } from "@/lib/model/types";

/**
 * Provider-agnostic inference boundary. See SPEC.md §6.
 * Three narrow calls with structured output. The rules adapter (src/lib/llm/rules.ts)
 * implements all three with no network. A model-backed adapter can replace it
 * without touching the UI or the ranker.
 */

export interface Context {
  people: Person[];
  obligations: Obligation[];
  now: Date;
}

export type InputClass =
  | { kind: "capture"; text: string }
  | { kind: "correction"; text: string; targetId: string }
  | { kind: "question"; text: string }
  | { kind: "scratch"; text: string };

export type Extracted = Omit<Obligation, "id" | "history" | "origin" | "status" | "owner">;

export interface ExtractResult {
  obligations: Extracted[];
  /** People mentioned that the store doesn't know yet. Created on confirm. */
  newPeople: Person[];
  trace: { model: string; promptHash: string };
}

export interface CorrectionResult {
  patch: Partial<Obligation>;
  /** Plain-English summary of what changed, for the history event. */
  summary: string;
  proposedRule?: Omit<Rule, "id" | "hits" | "createdAt">;
  trace: { model: string; promptHash: string };
}

export interface Adapter {
  readonly name: string;
  classify(input: string, ctx: Context): Promise<InputClass>;
  extract(text: string, origin: Origin, ctx: Context): Promise<ExtractResult>;
  correct(text: string, target: Obligation, ctx: Context): Promise<CorrectionResult>;
  /** Answer a question about the user's own obligations. Prose. */
  answer(question: string, ctx: Context): Promise<string>;
}
