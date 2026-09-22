import type { Obligation, Person, Rule, Relation } from "@/lib/model/types";

/**
 * Deterministic ranker. See SPEC.md §3.4 and §6.
 * Produces: Now, Waiting, Decaying, Review (agent results), Proposed.
 * Every Now item carries a reason line assembled from structured fields.
 * No LLM in this path.
 */

export interface Ranked {
  obligation: Obligation;
  score: number;
  reason: string;
  decaying: boolean;
}

export interface Views {
  now: Ranked[];
  review: Obligation[];
  waiting: Obligation[];
  decaying: Obligation[];
  proposed: Obligation[];
  backlog: Ranked[];
}

const RELATION_WEIGHT: Record<Relation, number> = {
  client: 3,
  manager: 3,
  report: 2.5,
  family: 2,
  peer: 1.5,
  self: 1,
  unknown: 1,
};

const EFFORT_HOURS = { minutes: 0.5, hour: 1, half_day: 4, day: 8, multi_day: 24 } as const;

export const NOW_CAP = 5;
const DECAY_SKIPS = 3;
const DECAY_DAYS = 14;

export function skipCount(o: Obligation) {
  return o.history.filter((e) => e.kind === "skipped").length;
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

function lastTouched(o: Obligation) {
  const last = o.history[o.history.length - 1];
  return last ? new Date(last.at) : new Date(o.origin.capturedAt);
}

export function isDecaying(o: Obligation, now: Date) {
  if (o.status !== "active") return false;
  return skipCount(o) >= DECAY_SKIPS || daysBetween(lastTouched(o), now) >= DECAY_DAYS;
}

function effectiveHardness(o: Obligation, rules: Rule[]) {
  if (!o.deadline) return "none" as const;
  for (const r of rules) {
    if (r.predicate.kind === "never_hard_deadline_from" && o.forWhom.includes(r.predicate.personId)) {
      return o.deadline.hardness === "hard" ? ("soft" as const) : o.deadline.hardness;
    }
  }
  return o.deadline.hardness;
}

function relationWeight(rel: Relation, rules: Rule[]) {
  for (const r of rules) {
    if (r.predicate.kind === "relation_weight" && r.predicate.relation === rel) return r.predicate.weight;
  }
  return RELATION_WEIGHT[rel];
}

export function score(o: Obligation, people: Person[], rules: Rule[], now: Date): number {
  let s = 0;

  // Deadline pressure. Hard deadlines dominate; soft ones matter half as much.
  if (o.deadline) {
    const d = daysBetween(now, new Date(o.deadline.at));
    const hard = effectiveHardness(o, rules);
    const pressure = d <= 0 ? 10 : Math.max(0, 8 - d); // 8 at 0 days, 0 at 8+ days
    s += hard === "hard" ? pressure * 1.0 : hard === "soft" ? pressure * 0.5 : 0;
  }

  // Someone is waiting on you. Weighted by who they are and how long they've waited.
  for (const pid of o.forWhom) {
    const p = people.find((x) => x.id === pid);
    const w = relationWeight(p?.relation ?? "unknown", rules);
    const waited = Math.min(5, daysBetween(new Date(o.origin.capturedAt), now));
    s += w + waited * 0.4;
  }

  // Avoidance. Skipped things creep up rather than vanish.
  s += skipCount(o) * 0.6;

  // Quick wins get a nudge so tiny things don't rot behind big ones.
  const hrs = EFFORT_HOURS[o.effort];
  s += hrs <= 0.5 ? 0.8 : hrs <= 1 ? 0.4 : 0;

  // Age. Old things very gently rise.
  s += Math.min(2, daysBetween(new Date(o.origin.capturedAt), now) * 0.1);

  return Math.round(s * 100) / 100;
}

function relDay(at: string, now: Date) {
  const d = Math.round(daysBetween(new Date(new Date(now).setHours(0, 0, 0, 0)), new Date(new Date(at).setHours(0, 0, 0, 0))));
  if (d < 0) return `${-d} day${d === -1 ? "" : "s"} overdue`;
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 7) return new Date(at).toLocaleDateString(undefined, { weekday: "long" });
  return `in ${d} days`;
}

function effortText(e: Obligation["effort"]) {
  return { minutes: "~15 min", hour: "~1 hr", half_day: "half a day", day: "a day", multi_day: "several days" }[e];
}

export function reason(o: Obligation, people: Person[], now: Date, rules: Rule[] = []): string {
  const parts: string[] = [];
  const names = o.forWhom.map((id) => people.find((p) => p.id === id)?.name ?? "someone");
  const waitedDays = Math.floor(daysBetween(new Date(o.origin.capturedAt), now));

  if (names.length) {
    const who = names.join(" and ");
    if (o.blockedOn.people.length === 0 && o.intent.toLowerCase().includes("block")) {
      parts.push(`${who} is blocked on you since ${waitedDays <= 0 ? "today" : waitedDays === 1 ? "yesterday" : `${waitedDays} days ago`}.`);
    } else {
      parts.push(`${who} asked ${waitedDays <= 0 ? "today" : waitedDays === 1 ? "yesterday" : `${waitedDays} days ago`}.`);
    }
  }
  if (o.deadline) {
    const when = relDay(o.deadline.at, now);
    const hard = effectiveHardness(o, rules) === "hard";
    // Only show the source when it adds information beyond the day itself.
    const src = o.deadline.source.trim();
    const redundant = src.toLowerCase() === when.toLowerCase() || /^(next |this )?(mon|tues|wednes|thurs|fri|satur|sun)day$/i.test(src) || /^(today|tomorrow)$/i.test(src);
    parts.push(hard ? `Due ${when}${redundant ? "" : ` (${src})`}.` : `Ideally ${when}.`);
  }
  const skips = skipCount(o);
  if (skips >= DECAY_SKIPS) parts.push(`You've skipped this ${skips} times.`);
  if (!names.length && !o.deadline && skips < DECAY_SKIPS) parts.push(o.intent);
  parts.push(effortText(o.effort) + ".");
  return parts.join(" ");
}

export function rank(
  obligations: Obligation[],
  people: Person[],
  rules: Rule[],
  now: Date = new Date(),
): Views {
  const active = obligations.filter((o) => o.status === "active");
  const scored: Ranked[] = active
    .map((o) => ({
      obligation: o,
      score: score(o, people, rules, now),
      reason: reason(o, people, now, rules),
      decaying: isDecaying(o, now),
    }))
    .sort((a, b) => b.score - a.score);

  // Diversity rules: max 2 per person, max 1 multi_day, max 1 decaying question.
  const perPerson = new Map<string, number>();
  let multiDay = 0;
  let decayingShown = 0;
  const nowList: Ranked[] = [];
  const rest: Ranked[] = [];
  for (const r of scored) {
    const o = r.obligation;
    const personOk = o.forWhom.every((p) => (perPerson.get(p) ?? 0) < 2);
    const multiOk = o.effort !== "multi_day" || multiDay < 1;
    const decayOk = !r.decaying || decayingShown < 1;
    if (nowList.length < NOW_CAP && personOk && multiOk && decayOk) {
      nowList.push(r);
      o.forWhom.forEach((p) => perPerson.set(p, (perPerson.get(p) ?? 0) + 1));
      if (o.effort === "multi_day") multiDay++;
      if (r.decaying) decayingShown++;
    } else {
      rest.push(r);
    }
  }

  return {
    now: nowList,
    review: obligations.filter((o) => o.status === "delegated" && o.agentResult),
    waiting: obligations.filter((o) => o.status === "waiting" || (o.status === "active" && o.blockedOn.people.length > 0)),
    decaying: active.filter((o) => isDecaying(o, now)),
    proposed: obligations.filter((o) => o.status === "proposed"),
    backlog: rest,
  };
}
