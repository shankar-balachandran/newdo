/**
 * Core object model. See SPEC.md §3.
 * Deliberately absent as user fields: priority, project, tags, due_date.
 * Those are derived views (see src/lib/rank).
 */

export type Hardness = "hard" | "soft" | "none";
export type Effort = "minutes" | "hour" | "half_day" | "day" | "multi_day";
export type Status =
  | "proposed"
  | "active"
  | "waiting"
  | "done"
  | "dropped"
  | "delegated";
export type Channel =
  | "typed"
  | "voice"
  | "email"
  | "calendar"
  | "chat"
  | "notes"
  | "agent";
export type Relation =
  | "manager"
  | "report"
  | "peer"
  | "client"
  | "family"
  | "self"
  | "unknown";

export interface Person {
  id: string;
  kind: "human" | "agent";
  name: string;
  handles: string[];
  relation: Relation;
}

export interface Origin {
  channel: Channel;
  /** Opaque pointer back to the source: message id, event id, file+line. */
  ref: string;
  /** The span that triggered capture. Shown on expand. */
  excerpt: string;
  capturedAt: string; // ISO
}

export interface Deadline {
  at: string; // ISO
  hardness: Hardness;
  /** Where the deadline came from, in prose. Feeds the reason line. */
  source: string;
}

export type EventKind =
  | "captured"
  | "inferred"
  | "confirmed"
  | "corrected"
  | "skipped"
  | "surfaced"
  | "done"
  | "dropped"
  | "delegated"
  | "agent_result"
  | "note";

export interface Event {
  at: string; // ISO
  kind: EventKind;
  detail?: string;
  /** For LLM-produced events: traceability. */
  model?: string;
  promptHash?: string;
}

export interface Obligation {
  id: string;
  title: string;
  /** Why this exists. One sentence. Basis of the reason line. */
  intent: string;
  /** Observable completion condition. */
  doneWhen: string;
  /** Who is waiting on this. Empty = self. */
  forWhom: string[]; // Person ids
  owner: string; // Person id (human or agent)
  status: Status;
  blockedOn: { obligations: string[]; people: string[]; note?: string };
  deadline: Deadline | null;
  effort: Effort;
  origin: Origin;
  history: Event[];
  /** Freeform. Never inferred. */
  userNotes: string;
  /** Set when an agent has produced something awaiting review. */
  agentResult?: { summary: string; at: string };
}

export interface Rule {
  id: string;
  text: string;
  /** Structured form the ranker can apply. v0: a small predicate DSL. */
  predicate: RulePredicate;
  originEventDetail: string;
  hits: number;
  createdAt: string;
}

export type RulePredicate =
  | { kind: "never_hard_deadline_from"; personId: string }
  | { kind: "relation_weight"; relation: Relation; weight: number }
  | { kind: "defer_title_match"; pattern: string; days: number };

export interface ScratchLine {
  id: string;
  text: string;
  at: string;
}
