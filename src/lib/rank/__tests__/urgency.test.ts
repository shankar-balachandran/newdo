import { describe, it, expect } from "vitest";
import { rank, reason, NOW_CAP } from "../urgency";
import { people, obligations } from "@/lib/store/seed";
import type { Rule } from "@/lib/model/types";

const now = new Date();

describe("rank", () => {
  it("caps Now and never shows proposed items there", () => {
    const v = rank(obligations, people, [], now);
    expect(v.now.length).toBeLessThanOrEqual(NOW_CAP);
    expect(v.now.every((r) => r.obligation.status === "active")).toBe(true);
    expect(v.proposed.length).toBe(2);
  });

  it("puts the hard client deadline first", () => {
    const v = rank(obligations, people, [], now);
    expect(v.now[0].obligation.id).toBe("o1");
  });

  it("applies a never-hard-deadline rule", () => {
    const rule: Rule = {
      id: "r1",
      text: "",
      predicate: { kind: "never_hard_deadline_from", personId: "arun" },
      originEventDetail: "",
      hits: 0,
      createdAt: now.toISOString(),
    };
    const before = rank(obligations, people, [], now).now.find((r) => r.obligation.id === "o1")!.score;
    const after = rank(obligations, people, [rule], now).now.find((r) => r.obligation.id === "o1")!.score;
    expect(after).toBeLessThan(before);
  });
});

describe("reason", () => {
  const base = obligations.find((o) => o.id === "o1")!;
  it("omits a redundant deadline source", () => {
    const o = { ...base, deadline: { at: base.deadline!.at, hardness: "hard" as const, source: "Thursday" } };
    const r = reason(o, people, now);
    expect(r).not.toContain("(Thursday)");
    expect(r).toContain("Due");
  });
  it("respects a never-hard-deadline rule", () => {
    const rule: Rule = {
      id: "r1", text: "", predicate: { kind: "never_hard_deadline_from", personId: "arun" },
      originEventDetail: "", hits: 0, createdAt: now.toISOString(),
    };
    expect(reason(base, people, now, [rule])).toContain("Ideally");
  });
});
