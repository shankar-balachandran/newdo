import type { Obligation, Person, Rule } from "@/lib/model/types";

const days = (n: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const people: Person[] = [
  { id: "me", kind: "human", name: "You", handles: [], relation: "self" },
  { id: "arun", kind: "human", name: "Arun", handles: ["arun@client.example"], relation: "client" },
  { id: "maya", kind: "human", name: "Maya", handles: ["maya@team.example"], relation: "report" },
  { id: "priya", kind: "human", name: "Priya", handles: ["priya@team.example"], relation: "manager" },
  { id: "dev", kind: "human", name: "Dev", handles: ["dev@team.example"], relation: "peer" },
  { id: "agent", kind: "agent", name: "newdo agent", handles: [], relation: "unknown" },
];

const ob = (
  partial: Partial<Obligation> & Pick<Obligation, "id" | "title" | "intent">,
): Obligation => ({
  doneWhen: "",
  forWhom: [],
  owner: "me",
  status: "active",
  blockedOn: { obligations: [], people: [] },
  deadline: null,
  effort: "hour",
  origin: { channel: "typed", ref: "seed", excerpt: partial.title, capturedAt: days(-1) },
  history: [{ at: days(-1), kind: "captured" }],
  userNotes: "",
  ...partial,
});

export const obligations: Obligation[] = [
  ob({
    id: "o1",
    title: "Send revised quote to Arun",
    intent: "Arun asked for a revised quote on Friday; his board meets Thursday.",
    doneWhen: "Revised PDF is in Arun's inbox.",
    forWhom: ["arun"],
    effort: "minutes",
    deadline: { at: days(2, 17), hardness: "hard", source: "board meets Thursday" },
    origin: {
      channel: "email",
      ref: "msg:arun:4412",
      excerpt: "Could you send the revised numbers before our board meets Thursday?",
      capturedAt: days(-4),
    },
  }),
  ob({
    id: "o2",
    title: "Review Maya's draft",
    intent: "Maya cannot ship the proposal until you've reviewed it.",
    doneWhen: "Comments returned to Maya.",
    forWhom: ["maya"],
    effort: "hour",
    deadline: { at: days(1), hardness: "soft", source: "she'd like to send it this week" },
    origin: {
      channel: "chat",
      ref: "slack:maya:8812",
      excerpt: "Draft is ready whenever you have a moment, I'm blocked on it.",
      capturedAt: days(-1, 15),
    },
  }),
  ob({
    id: "o3",
    title: "Book dentist",
    intent: "Six-monthly check-up is overdue.",
    doneWhen: "Appointment in calendar.",
    effort: "minutes",
    history: [
      { at: days(-20), kind: "captured" },
      { at: days(-14), kind: "skipped" },
      { at: days(-9), kind: "skipped" },
      { at: days(-5), kind: "skipped" },
      { at: days(-2), kind: "skipped" },
    ],
    origin: { channel: "typed", ref: "seed", excerpt: "book dentist", capturedAt: days(-20) },
  }),
  ob({
    id: "o4",
    title: "Chase vendor for September invoice",
    intent: "Finance closes the month on the 30th and needs the invoice.",
    doneWhen: "Invoice received and forwarded to finance.",
    forWhom: ["priya"],
    owner: "agent",
    status: "delegated",
    effort: "minutes",
    deadline: { at: days(6), hardness: "hard", source: "month-end close" },
    agentResult: { summary: "Vendor replied with the invoice attached. Draft forward to finance is ready.", at: days(0, 8) },
    history: [
      { at: days(-3), kind: "captured" },
      { at: days(-3), kind: "delegated", detail: "Draft chaser email; send after review." },
      { at: days(0, 8), kind: "agent_result" },
    ],
    origin: { channel: "email", ref: "msg:priya:1201", excerpt: "Can you get the vendor invoice in before close?", capturedAt: days(-3) },
  }),
  ob({
    id: "o5",
    title: "Prepare Q4 planning doc",
    intent: "Priya wants a first draft before the offsite.",
    doneWhen: "Doc shared with Priya.",
    forWhom: ["priya"],
    effort: "multi_day",
    deadline: { at: days(9), hardness: "soft", source: "offsite is in two weeks" },
    origin: { channel: "notes", ref: "meeting:2026-09-15", excerpt: "Shankar to draft Q4 plan before offsite.", capturedAt: days(-7) },
  }),
  ob({
    id: "o6",
    title: "Reply to Dev about the API change",
    intent: "Dev asked whether we're keeping the v1 endpoint.",
    doneWhen: "Answer sent.",
    forWhom: ["dev"],
    effort: "minutes",
    origin: { channel: "chat", ref: "slack:dev:552", excerpt: "Are we keeping /v1/tasks or killing it this sprint?", capturedAt: days(-2) },
  }),
  ob({
    id: "o7",
    title: "Get sign-off from Priya on the hiring plan",
    intent: "Can't open the req until Priya approves.",
    doneWhen: "Priya replies yes.",
    status: "waiting",
    blockedOn: { obligations: [], people: ["priya"], note: "Sent Monday, no reply yet." },
    effort: "minutes",
    origin: { channel: "email", ref: "msg:me:9901", excerpt: "Priya, can you approve the hiring plan?", capturedAt: days(-3) },
  }),
  ob({
    id: "o8",
    title: "Renew domain",
    intent: "Domain expires next month.",
    doneWhen: "Renewal confirmation email received.",
    effort: "minutes",
    deadline: { at: days(24), hardness: "hard", source: "registrar expiry notice" },
    origin: { channel: "email", ref: "msg:registrar:77", excerpt: "Your domain will expire in 30 days.", capturedAt: days(-6) },
  }),
  ob({
    id: "o9",
    title: "Read the competitor teardown",
    intent: "Dev shared it; useful context for the Q4 doc.",
    doneWhen: "Read.",
    effort: "hour",
    origin: { channel: "chat", ref: "slack:dev:560", excerpt: "Worth a read before planning: [link]", capturedAt: days(-5) },
  }),
  ob({
    id: "o10",
    title: "Confirm attendance at Arun's launch event",
    intent: "Arun's team sent an invite; RSVP needed.",
    forWhom: ["arun"],
    status: "proposed",
    effort: "minutes",
    deadline: { at: days(3), hardness: "soft", source: "RSVP by Friday" },
    origin: { channel: "email", ref: "msg:arun:4420", excerpt: "Please RSVP by Friday for the launch.", capturedAt: days(0, 7) },
    history: [{ at: days(0, 7), kind: "captured" }, { at: days(0, 7), kind: "inferred", detail: "extractor v0 stub" }],
  }),
  ob({
    id: "o11",
    title: "Send Maya the onboarding checklist",
    intent: "She asked in this morning's standup.",
    forWhom: ["maya"],
    status: "proposed",
    effort: "minutes",
    origin: { channel: "notes", ref: "standup:2026-09-22", excerpt: "Maya: can I get the onboarding checklist?", capturedAt: days(0, 9) },
    history: [{ at: days(0, 9), kind: "captured" }, { at: days(0, 9), kind: "inferred", detail: "extractor v0 stub" }],
  }),
];

export const rules: Rule[] = [];

export const seedIds = new Set(obligations.map((o) => o.id));
