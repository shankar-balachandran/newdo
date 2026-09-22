import { describe, it, expect } from "vitest";
import { rulesAdapter, learnPeople } from "../rules";
import { people, obligations } from "@/lib/store/seed";
import type { Context } from "../adapter";

const now = new Date("2026-09-22T10:00:00");
const ctx: Context = { people, obligations, now };
const origin = { channel: "typed" as const, ref: "t", excerpt: "", capturedAt: now.toISOString() };

describe("classify", () => {
  it("routes scratch, question, correction, capture", async () => {
    expect((await rulesAdapter.classify("- rethink pricing", ctx)).kind).toBe("scratch");
    expect((await rulesAdapter.classify("what am I waiting on from Priya?", ctx)).kind).toBe("question");
    const c = await rulesAdapter.classify("Arun's quote isn't urgent", ctx);
    expect(c.kind).toBe("correction");
    if (c.kind === "correction") expect(c.targetId).toBe("o1");
    expect((await rulesAdapter.classify("call the accountant about VAT", ctx)).kind).toBe("capture");
  });
});

describe("extract", () => {
  it("pulls person, hard deadline, effort, and cleans the title", async () => {
    const r = await rulesAdapter.extract("send Arun the revised quote by Thursday", origin, ctx);
    const o = r.obligations[0];
    expect(o.title).toBe("Send Arun the revised quote");
    expect(o.forWhom).toEqual(["arun"]);
    expect(o.deadline?.hardness).toBe("hard");
    expect(new Date(o.deadline!.at).getDay()).toBe(4);
    expect(o.effort).toBe("minutes");
    expect(o.doneWhen).toBe("Sent.");
  });

  it("treats loose dates as soft", async () => {
    const r = await rulesAdapter.extract("draft the Q4 plan sometime next week", origin, ctx);
    const o = r.obligations[0];
    expect(o.deadline?.hardness).toBe("soft");
    expect(o.effort).toBe("half_day");
  });

  it("handles no date and no person", async () => {
    const r = await rulesAdapter.extract("book dentist", origin, ctx);
    const o = r.obligations[0];
    expect(o.deadline).toBeNull();
    expect(o.forWhom).toEqual([]);
    expect(o.intent).toBe("You noted this yourself.");
  });
});

describe("correct", () => {
  it("softens a deadline and proposes a rule when generalised", async () => {
    const target = obligations.find((o) => o.id === "o1")!;
    const r = await rulesAdapter.correct("things from Arun are never urgent", target, ctx);
    expect(r.patch.deadline?.hardness).toBe("soft");
    expect(r.proposedRule?.predicate).toEqual({ kind: "never_hard_deadline_from", personId: "arun" });
  });

  it("pushes a date", async () => {
    const target = obligations.find((o) => o.id === "o2")!;
    const r = await rulesAdapter.correct("push Maya's draft to Friday", target, ctx);
    expect(r.patch.deadline?.source.toLowerCase()).toContain("friday");
  });

  it("drops", async () => {
    const target = obligations.find((o) => o.id === "o3")!;
    const r = await rulesAdapter.correct("drop the dentist thing", target, ctx);
    expect(r.patch.status).toBe("dropped");
  });
});

describe("answer", () => {
  it("answers waiting questions", async () => {
    const a = await rulesAdapter.answer("what am I waiting on from Priya?", ctx);
    expect(a).toContain("hiring plan");
  });
});

describe("learnPeople", () => {
  it("learns a new name from a verb pattern and skips known people and day names", () => {
    const learned = learnPeople("send Ravi the deck by Friday", people);
    expect(learned.map((p) => p.name)).toEqual(["Ravi"]);
    expect(learnPeople("send Arun the deck", people)).toEqual([]);
    expect(learnPeople("book dentist for Monday", people)).toEqual([]);
  });

  it("captures for a person the store has never seen", async () => {
    const r = await rulesAdapter.extract("ask Ravi about the invoice", origin, { ...ctx, people: [people[0]] });
    expect(r.newPeople.map((p) => p.name)).toEqual(["Ravi"]);
    expect(r.obligations[0].forWhom).toEqual([r.newPeople[0].id]);
  });
});
