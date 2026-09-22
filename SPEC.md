# newdo — Core Spec v0.1

Working name: **newdo**. One-line pitch: *the list is an output, never an input.*

## 1. Thesis

A todo list today is a manually maintained cache of your obligations. The human does
capture, triage, scheduling, re-prioritizing, and pruning; the app is a dumb store.
newdo inverts this. The system maintains a model of your obligations. The human
confirms, corrects, and decides. The visible "list" is a derived view.

Radical in the model, conservative on the surface.

## 2. Principles (ranked, ties broken top-down)

1. **Never ask the user to fill a field.** Everything structured is inferred, then
   confirmable. If inference fails, ask one question in prose, not a form.
2. **Every surfaced item carries a reason.** "Why this, why now" is always visible
   and always correctable in one sentence.
3. **Corrections stick.** A correction updates the model (a rule or a fact), not just
   the item. The same mistake should not recur.
4. **The default screen is Now, not All.** Three to five items. The backlog exists
   but is a secondary view.
5. **Silence is a bug.** Skipped or decaying items get surfaced with a question, never
   silently rolled over.
6. **A dumb scratchpad always exists.** Thinking-out-loud mode does no inference
   until the user promotes a line.
7. **Agents are owners too.** An obligation can be owned by the user or by an agent.
   Agent work always has a review step before it counts as done.

## 3. Object model

### 3.1 Obligation (the core object)

Not a "task." A commitment with context.

| Field          | Type                              | Source            | Notes |
|----------------|-----------------------------------|-------------------|-------|
| id             | uuid                              | system            | |
| title          | text                              | inferred/edited   | Short imperative sentence. |
| intent         | text                              | inferred          | Why this exists, one sentence. Shown as the "reason". |
| done_when      | text                              | inferred/edited   | Observable completion condition. |
| for_whom       | Person[]                          | inferred          | Who is waiting on this. Empty = self. |
| owner          | Person \| Agent                   | inferred/edited   | Default: user. |
| status         | enum: proposed, active, waiting, done, dropped, delegated | system | `proposed` = captured but not yet confirmed. |
| blocked_on     | Obligation[] \| Person[] \| text  | inferred/edited   | |
| deadline       | { at: datetime, hardness: hard \| soft \| none, source: text } | inferred | Hardness matters more than the date. |
| effort         | enum: minutes, hour, half_day, day, multi_day | inferred | Coarse on purpose. |
| origin         | Origin                            | system            | Where it came from (see 3.3). |
| history        | Event[]                           | system            | Append-only. Every inference, correction, skip, surface. |
| user_notes     | text                              | user              | Freeform. Never inferred. |

Deliberately absent: `priority`, `project`, `tags`, `due_date` as user fields.
These are all **derived views** (see 3.4).

### 3.2 Person / Agent

| Field     | Notes |
|-----------|-------|
| id        | |
| kind      | `human` \| `agent` |
| name      | |
| handles   | email, slack id, etc. Used to match origins to people. |
| relation  | inferred: manager, report, peer, client, family, self, unknown. Feeds ranking. |

### 3.3 Origin

Where an obligation was captured from. Preserved verbatim so the reason is auditable.

| Field    | Notes |
|----------|-------|
| channel  | `typed` \| `voice` \| `email` \| `calendar` \| `chat` \| `notes` \| `agent` |
| ref      | Opaque pointer back to the source (message id, event id, file + line). |
| excerpt  | The span that triggered capture. Shown on hover/expand. |
| captured_at | |

### 3.4 Derived views (computed, never stored as user fields)

- **Urgency** = f(deadline.at, deadline.hardness, blocked_on, for_whom.relation, skip_count)
- **Now** = top N by urgency, filtered by `status = active`, with diversity rules
  (never five items for the same person; at most one multi_day item).
- **Waiting** = `status = waiting` or `blocked_on` non-empty, grouped by blocker.
- **Decaying** = active items skipped ≥ 3 times or untouched ≥ 14 days.
- **Groupings** ("projects") = clusters by shared for_whom, origin thread, or
  intent similarity. Named by the system, renamable by the user.

### 3.5 Rules (how corrections become durable)

A correction in prose produces a Rule, shown to the user for confirmation.

| Field      | Notes |
|------------|-------|
| id         | |
| text       | Human-readable, e.g. "Things from Priya's team are never hard-deadline unless she says so." |
| predicate  | Structured form the ranker can apply. |
| origin     | The correction that created it. |
| hits       | How often it has fired. Rules with zero hits in 90 days are surfaced for pruning. |

## 4. The Now screen

The only screen most users see most days.

```
┌──────────────────────────────────────────────────────────────┐
│  Tuesday 22 Sep                                    ▪ 3 waiting │
│                                                                │
│  ● Send revised quote to Arun                                  │
│    He asked Friday, board meets Thursday. ~30 min.             │
│                                                                │
│  ● Review Maya's draft                                         │
│    She's blocked on you since yesterday. ~1 hr.                │
│                                                                │
│  ● Book dentist                                                │
│    You've skipped this 4 times. Drop it, or do it?  [drop] [do]│
│                                                                │
│  ○ Agent: chased vendor for invoice — reply came in. Review?   │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│  2 proposed from this morning's email · 11 in backlog          │
│                                                                │
│  ▸ type anything…                                              │
└──────────────────────────────────────────────────────────────┘
```

Rules:

- **Max 5 items.** Hard cap. If the ranker wants six, it drops the weakest.
- **Every item has a reason line** derived from `intent` + `for_whom` + `deadline` +
  `effort`. Reason is one sentence, plain English, no field names.
- **Decaying items get a question,** not a nag. Two buttons max.
- **Agent items are visually distinct** (hollow marker) and always say "Review?".
- **One input.** "type anything…" accepts: a new obligation, a correction ("Arun's
  thing isn't urgent"), a question ("what am I waiting on from Maya?"), or a
  scratchpad line (prefix `-` or open scratchpad mode). Classification is the
  system's job, not the user's.
- **Proposed items are counted, not shown.** Tapping the count opens a confirm/
  dismiss review, one item at a time, swipe-speed.
- **Backlog is one tap away, always.** Never hidden, never default.

### 4.1 Interactions on an item

| Gesture / command       | Effect |
|-------------------------|--------|
| Tap                     | Expand: full reason, origin excerpt, done_when, history. |
| Done                    | `status = done`. If `for_whom` non-empty, offer a one-line "tell them" draft. |
| "Not today"             | Skip. Increments skip_count. Ranker re-runs. |
| Prose correction        | Creates a Rule proposal + updates item. Both shown for confirm. |
| Hand to agent           | `owner = agent`, `status = delegated`. Agent plan shown before it acts. |

## 5. Capture

Capture is ambient by default, typed by exception.

| Channel  | v0 | Later |
|----------|----|-------|
| Typed / pasted text | yes | |
| Voice               | yes (transcribe → same path as typed) | |
| Email forward       | yes (forward to an address) | full mailbox read |
| Calendar            | read-only: deadlines + who's waiting | |
| Chat (Slack etc.)   | no | yes |
| Meeting notes       | paste | integration |

Every capture path produces `status = proposed` obligations with `origin` filled.
The user confirms in the Proposed review. Confirm rate is the primary quality metric.

## 6. The planning loop (not a chat loop)

The LLM is **not** in the hot path for rendering. Architecture:

1. **Store** holds Obligations, People, Rules, Events. Structured, durable, cheap.
2. **Extractor** (LLM) runs on each capture: text → proposed Obligation(s) + Origin.
3. **Ranker** (mostly deterministic, LLM-assisted for ties and reason text) produces
   Now/Waiting/Decaying. Re-runs on: new item, correction, done, skip, clock tick
   (morning), calendar change.
4. **Interpreter** (LLM) classifies the "type anything" input into: capture,
   correction, question, scratchpad, and routes it.
5. **Agent runner** executes delegated obligations with a visible plan and a review
   gate.

Every LLM output is stored as an Event with the prompt hash and model id, so any
reason line can be traced.

## 7. Non-goals for v0

- Teams / shared lists. Single user. `for_whom` models other people, but they don't
  have accounts.
- Full mailbox or Slack ingestion. Forward-to-address only.
- Mobile native. Web first, responsive.
- Recurring tasks as a first-class feature. Handled by Rules + Decay initially.

## 8. Open decisions

| # | Decision | Leaning |
|---|----------|---------|
| 1 | Local-first vs. cloud store | **Decided:** local-first, IndexedDB behind the Store interface. Sync later via a second implementation. SQLite-wasm deferred: it needs cross-origin isolation headers and a worker, for no v0 benefit. |
| 2 | Ranker: rules-only vs. learned | **Decided:** rules + explicit user Rules for v0. |
| 3 | Agent actions in v0 | Drafting only (emails, messages). No sending, no booking. |
| 5 | Inference provider | **Decided:** rules-based adapter first, no model. A model adapter (local in-browser or API) only where rules visibly fall short. |
| 4 | Name | newdo (placeholder) |

## 9. Success criteria for v0

- Confirm rate on proposed items ≥ 70% after week one for a single test user.
- Correction recurrence: the same class of mistake after a Rule is created < 10%.
- The user opens Backlog fewer than once a day on average.
