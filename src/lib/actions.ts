"use client";
import type { Obligation, Rule, ScratchLine } from "@/lib/model/types";
import { getStore } from "@/lib/store/useStore";
import { rulesAdapter } from "@/lib/llm/rules";
import type { Adapter, Context } from "@/lib/llm/adapter";

const adapter: Adapter = rulesAdapter;
const now = () => new Date().toISOString();

function ctx(): Context {
  const s = getStore().snapshot();
  return { people: s.people, obligations: s.obligations, now: new Date() };
}

export function markDone(o: Obligation) {
  getStore().putObligation({ ...o, status: "done", history: [...o.history, { at: now(), kind: "done" }] });
}

export function skip(o: Obligation) {
  getStore().appendEvent(o.id, { at: now(), kind: "skipped" });
}

export function drop(o: Obligation) {
  getStore().putObligation({ ...o, status: "dropped", history: [...o.history, { at: now(), kind: "dropped" }] });
}

export function confirm(o: Obligation) {
  getStore().putObligation({ ...o, status: "active", history: [...o.history, { at: now(), kind: "confirmed" }] });
}

export function acceptAgentResult(o: Obligation) {
  getStore().putObligation({
    ...o,
    status: "done",
    agentResult: undefined,
    history: [...o.history, { at: now(), kind: "done", detail: "agent result accepted" }],
  });
}

/** A correction typed on a specific item. Runs the adapter's correct() against it. */
export async function correctItem(o: Obligation, text: string): Promise<string> {
  const s = getStore();
  const res = await adapter.correct(text, o, ctx());
  s.putObligation({
    ...o,
    ...res.patch,
    history: [...o.history, { at: now(), kind: "corrected", detail: `${text} → ${res.summary}`, model: res.trace.model }],
  });
  if (res.proposedRule) {
    const rule: Rule = { ...res.proposedRule, id: crypto.randomUUID(), hits: 0, createdAt: now() };
    s.putRule(rule);
    return `${res.summary}. New rule: ${rule.text}`;
  }
  return res.summary;
}

export type InputOutcome = { kind: "capture" | "correction" | "question" | "scratch"; message: string };

/** The single input. Classification is the system's job. */
export async function submitInput(raw: string): Promise<InputOutcome> {
  const s = getStore();
  const c = ctx();
  const cls = await adapter.classify(raw, c);
  switch (cls.kind) {
    case "scratch":
      s.addScratch(cls.text);
      return { kind: "scratch", message: "Added to scratchpad." };
    case "question":
      return { kind: "question", message: await adapter.answer(cls.text, c) };
    case "correction": {
      const target = c.obligations.find((o) => o.id === cls.targetId);
      if (!target) return { kind: "correction", message: "Couldn't find what that refers to." };
      const summary = await correctItem(target, cls.text);
      return { kind: "correction", message: `${target.title}: ${summary}` };
    }
    case "capture": {
      const origin = { channel: "typed" as const, ref: "input", excerpt: cls.text, capturedAt: now() };
      const res = await adapter.extract(cls.text, origin, c);
      for (const x of res.obligations) {
        s.putObligation({
          ...x,
          id: crypto.randomUUID(),
          owner: "me",
          status: "proposed",
          origin,
          history: [
            { at: now(), kind: "captured" },
            { at: now(), kind: "inferred", model: res.trace.model, promptHash: res.trace.promptHash },
          ],
        });
      }
      const first = res.obligations[0];
      const bits = [first?.forWhom.length ? "for someone" : null, first?.deadline ? `due ${first.deadline.source}` : null].filter(Boolean);
      return { kind: "capture", message: `Proposed: ${first?.title}${bits.length ? ` (${bits.join(", ")})` : ""}. Confirm it below.` };
    }
  }
}

export async function promoteScratch(line: ScratchLine) {
  getStore().promoteScratch(line.id);
  return submitInput(line.text);
}
