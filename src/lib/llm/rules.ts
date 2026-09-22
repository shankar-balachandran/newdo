import * as chrono from "chrono-node";
import type { Obligation, Person, Deadline, Effort, Hardness } from "@/lib/model/types";
import type { Adapter, CorrectionResult, Extracted, InputClass } from "./adapter";

/**
 * Rules-based adapter. No network, no model. Deterministic and fast.
 * Good enough for typed input and forwarded email subjects. Its known weakness
 * is the "intent" line, which restates rather than infers.
 */

const TRACE = { model: "rules/1", promptHash: "0" };

// --- lexicons ---------------------------------------------------------------

const HARD_CUES = /\b(must|deadline|due|by|before|no later than|expires?|expiry|latest)\b/i;
const SOFT_CUES = /\b(ideally|sometime|when you can|when you get a chance|would be nice|around|roughly|this week|next week|soon|eventually)\b/i;

const EFFORT_MINUTES = /\b(call|ring|phone|text|ping|reply|respond|answer|send|email|forward|book|confirm|rsvp|pay|renew|cancel|approve|sign|order|ask|remind|check|tell|share)\b/i;
const EFFORT_HOUR = /\b(review|read|edit|fix|update|clean|tidy|prep|prepare|meet|chase|follow up|summari[sz]e|outline)\b/i;
const EFFORT_HALF_DAY = /\b(draft|write|plan|design|research|analy[sz]e|investigate|audit|migrate)\b/i;
const EFFORT_MULTI = /\b(build|launch|ship|implement|overhaul|rewrite|deliver|complete the|finish the)\b/i;

const DONE_WHEN: Array<[RegExp, string]> = [
  [/\b(send|email|forward|share)\b/i, "Sent."],
  [/\b(reply|respond|answer)\b/i, "Reply sent."],
  [/\b(call|ring|phone)\b/i, "Call made."],
  [/\b(book|schedule)\b/i, "Appointment in calendar."],
  [/\b(review)\b/i, "Feedback returned."],
  [/\b(read)\b/i, "Read."],
  [/\b(pay|renew)\b/i, "Confirmation received."],
  [/\b(confirm|rsvp)\b/i, "Confirmed."],
  [/\b(draft|write|prepare)\b/i, "Draft shared."],
];

// --- helpers ----------------------------------------------------------------

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findPeople(text: string, people: Person[]): Person[] {
  const found: Person[] = [];
  for (const p of people) {
    if (p.relation === "self" || p.kind === "agent") continue;
    const needles = [p.name, ...p.handles].filter(Boolean);
    if (needles.some((n) => new RegExp(`(^|[^\\w])${escapeRe(n)}('s)?([^\\w]|$)`, "i").test(text))) {
      found.push(p);
    }
  }
  return found;
}

export function inferEffort(text: string): Effort {
  if (EFFORT_MULTI.test(text)) return "multi_day";
  if (EFFORT_HALF_DAY.test(text)) return "half_day";
  if (EFFORT_HOUR.test(text)) return "hour";
  if (EFFORT_MINUTES.test(text)) return "minutes";
  return "hour";
}

export function inferDeadline(text: string, now: Date): { deadline: Deadline | null; matched: string | null } {
  const results = chrono.parse(text, now, { forwardDate: true });
  if (!results.length) return { deadline: null, matched: null };
  const r = results[0];
  const at = r.start.date();
  // If no explicit time, treat as end of working day so "Thursday" isn't 00:00.
  if (!r.start.isCertain("hour")) at.setHours(17, 0, 0, 0);
  // Look at the few words before the date phrase for hardness cues.
  const before = text.slice(Math.max(0, r.index - 24), r.index);
  let hardness: Hardness = "soft";
  if (HARD_CUES.test(before) || HARD_CUES.test(r.text)) hardness = "hard";
  if (SOFT_CUES.test(before) || SOFT_CUES.test(r.text)) hardness = "soft";
  return { deadline: { at: at.toISOString(), hardness, source: r.text }, matched: r.text };
}

// Capitalised word(s) in a position where a person's name usually sits.
// "send Arun the quote", "ask Maya", "for Priya", "Dev asked", "to Arun".
const NAME = "([A-Z][a-z]+(?:\\s[A-Z][a-z]+)?)";
const NAME_PATTERNS = [
  new RegExp(`\\b(?:send|ask|tell|email|call|ring|ping|text|remind|chase|meet|thank|pay|follow up with|reply to|write to)\\s+${NAME}\\b`),
  new RegExp(`\\b(?:for|to|with|from)\\s+${NAME}\\b`),
  new RegExp(`^${NAME}\\s+(?:asked|wants|needs|requested|is waiting|said)\\b`),
  new RegExp(`\\b${NAME}'s\\b`),
];
const NOT_NAMES = new Set(["I", "The", "A", "An", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Today", "Tomorrow", "Next", "This", "Q1", "Q2", "Q3", "Q4"]);

/** Names in the text that no known person matches. */
export function learnPeople(text: string, known: Person[]): Person[] {
  const found = new Map<string, Person>();
  for (const re of NAME_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const name = m[1].trim();
    if (NOT_NAMES.has(name) || NOT_NAMES.has(name.split(" ")[0])) continue;
    if (known.some((p) => p.name.toLowerCase() === name.toLowerCase())) continue;
    const id = "p_" + name.toLowerCase().replace(/[^a-z]+/g, "_");
    if (!found.has(id)) found.set(id, { id, kind: "human", name, handles: [], relation: "unknown" });
  }
  return [...found.values()];
}

function cleanTitle(text: string, matchedDate: string | null) {
  let t = text.trim().replace(/[.!]+$/, "");
  if (matchedDate) {
    // Remove the date phrase and a leading connector ("by", "before", "on", "due").
    t = t.replace(new RegExp(`\\s*(by|before|on|due|until|around|ideally)?\\s*${escapeRe(matchedDate)}\\s*,?`, "i"), " ");
  }
  t = t.replace(/\s{2,}/g, " ").trim().replace(/[,;:\s]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function intentFor(text: string, people: Person[], deadline: Deadline | null): string {
  const asked = /\b(asked|wants|needs|requested|is waiting)\b/i.test(text);
  if (people.length) {
    const who = people.map((p) => p.name).join(" and ");
    const base = asked ? `${who} asked for this.` : `This is for ${who}.`;
    return deadline ? `${base} ${deadline.hardness === "hard" ? "Firm" : "Loose"} date: ${deadline.source}.` : base;
  }
  if (deadline) return `You set a ${deadline.hardness === "hard" ? "firm" : "loose"} date: ${deadline.source}.`;
  return "You noted this yourself.";
}

const STOP = new Set(["the", "and", "for", "with", "about", "from", "that", "this", "thing", "things", "are", "not", "isn't"]);

function tokens(s: string) {
  return (s.toLowerCase().match(/[a-z0-9']+/g) ?? [])
    .map((w) => w.replace(/'s$/, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function findTarget(text: string, obligations: Obligation[], people: Person[]): Obligation | undefined {
  const open = obligations.filter((o) => o.status === "active" || o.status === "waiting" || o.status === "proposed");
  const words = new Set(tokens(text));
  const mentioned = findPeople(text, people).map((p) => p.id);
  let best: { o: Obligation; score: number } | undefined;
  for (const o of open) {
    const tw = new Set(tokens(o.title));
    let hits = [...words].filter((w) => tw.has(w)).length;
    // A named person who this obligation is for counts as a strong hit.
    if (mentioned.some((id) => o.forWhom.includes(id))) hits += 1;
    const score = hits / Math.max(1, tw.size);
    if (hits >= 2 || score >= 0.5) {
      if (!best || score > best.score) best = { o, score };
    }
  }
  return best?.o;
}

const CORRECTION_CUES = /\b(isn't|is not|not|no rush|can wait|urgent|asap|drop|forget|push|move|postpone|defer|actually|instead|it's for|is for|hard deadline|firm)\b/i;

// --- adapter ----------------------------------------------------------------

export const rulesAdapter: Adapter = {
  name: "rules",

  async classify(input, ctx): Promise<InputClass> {
    const t = input.trim();
    if (t.startsWith("-")) return { kind: "scratch", text: t.replace(/^-\s*/, "") };
    if (t.endsWith("?")) return { kind: "question", text: t };
    if (CORRECTION_CUES.test(t)) {
      const target = findTarget(t, ctx.obligations, ctx.people);
      if (target) return { kind: "correction", text: t, targetId: target.id };
    }
    return { kind: "capture", text: t };
  },

  async extract(text, _origin, ctx) {
    const { deadline, matched } = inferDeadline(text, ctx.now);
    const newPeople = learnPeople(text, ctx.people);
    const people = findPeople(text, [...ctx.people, ...newPeople]);
    const effort = inferEffort(text);
    const doneWhen = DONE_WHEN.find(([re]) => re.test(text))?.[1] ?? "";
    const o: Extracted = {
      title: cleanTitle(text, matched),
      intent: intentFor(text, people, deadline),
      doneWhen,
      forWhom: people.map((p) => p.id),
      blockedOn: { obligations: [], people: [] },
      deadline,
      effort,
      userNotes: "",
    };
    return { obligations: [o], newPeople, trace: TRACE };
  },

  async correct(text, target, ctx): Promise<CorrectionResult> {
    const t = text.toLowerCase();
    const patch: Partial<Obligation> = {};
    const changes: string[] = [];
    let proposedRule: CorrectionResult["proposedRule"];

    if (/\b(drop|forget|never mind|cancel)\b/.test(t)) {
      patch.status = "dropped";
      changes.push("dropped");
    }

    const negated = /\b(not|never|isn't|is not|no)\b/.test(t);
    if (/\b(not urgent|isn't urgent|is not urgent|never urgent|no rush|can wait|not a hard deadline|never a hard deadline|soft)\b/.test(t)) {
      if (target.deadline) {
        patch.deadline = { ...target.deadline, hardness: "soft" };
        changes.push("deadline is now soft");
      }
      const person = findPeople(text, ctx.people)[0] ?? ctx.people.find((p) => target.forWhom.includes(p.id));
      if (person && /\b(things|stuff|anything|requests?|asks?)\b.*\bfrom\b|\bfrom\b.*\b(never|always)\b/.test(t)) {
        proposedRule = {
          text: `Things from ${person.name} are never hard-deadline unless they say so.`,
          predicate: { kind: "never_hard_deadline_from", personId: person.id },
          originEventDetail: text,
        };
      }
    }

    if (/\b(urgent|asap|today|hard deadline|firm)\b/.test(t) && !negated) {
      const { deadline } = inferDeadline(text, ctx.now);
      const at = deadline?.at ?? new Date(new Date(ctx.now).setHours(17, 0, 0, 0)).toISOString();
      patch.deadline = { at, hardness: "hard", source: deadline?.source ?? "you said it's urgent" };
      changes.push("deadline is now hard");
    }

    if (/\b(push|move|postpone|defer)\b/.test(t)) {
      const { deadline } = inferDeadline(text, ctx.now);
      if (deadline) {
        patch.deadline = { ...deadline, hardness: target.deadline?.hardness ?? "soft" };
        changes.push(`moved to ${deadline.source}`);
      }
    }

    if (/\b(it's for|is for|for)\b/.test(t)) {
      const people = findPeople(text, ctx.people);
      if (people.length) {
        patch.forWhom = people.map((p) => p.id);
        changes.push(`for ${people.map((p) => p.name).join(", ")}`);
      }
    }

    if (!changes.length) {
      patch.userNotes = target.userNotes ? `${target.userNotes}\n${text}` : text;
      changes.push("noted");
    }

    return { patch, summary: changes.join("; "), proposedRule, trace: TRACE };
  },

  async answer(question, ctx) {
    const q = question.toLowerCase();
    const name = (id: string) => ctx.people.find((p) => p.id === id)?.name ?? id;
    const people = findPeople(question, ctx.people);
    const open = ctx.obligations.filter((o) => o.status === "active" || o.status === "waiting");

    if (/\bwaiting\b/.test(q)) {
      const list = open.filter((o) => o.status === "waiting" || o.blockedOn.people.length);
      const filtered = people.length ? list.filter((o) => o.blockedOn.people.some((p) => people.some((x) => x.id === p))) : list;
      if (!filtered.length) return "You're not waiting on anything" + (people.length ? ` from ${people.map((p) => p.name).join(", ")}.` : ".");
      return filtered.map((o) => `${o.title} (${o.blockedOn.people.map(name).join(", ")})`).join("; ");
    }
    if (people.length) {
      const list = open.filter((o) => o.forWhom.some((p) => people.some((x) => x.id === p)));
      if (!list.length) return `Nothing open for ${people.map((p) => p.name).join(", ")}.`;
      return `For ${people.map((p) => p.name).join(", ")}: ` + list.map((o) => o.title).join("; ");
    }
    if (/\b(overdue|late|due)\b/.test(q)) {
      const list = open.filter((o) => o.deadline && new Date(o.deadline.at) < ctx.now);
      return list.length ? "Overdue: " + list.map((o) => o.title).join("; ") : "Nothing overdue.";
    }
    return `${open.length} open. Ask about a person, "waiting", or "overdue".`;
  },
};
