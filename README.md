# newdo

*The list is an output, never an input.*

An AI-first rethink of the todo list. The system maintains a model of your
obligations; you confirm, correct, and decide. Read `SPEC.md` first.

## Using it

The in-app guide at `/how` explains the Now screen, the single input, proposed
items, corrections that become rules, and where data lives. A GIF walkthrough is
in `docs/walkthrough.gif`.

## Run

```
npm install
npm run dev
```

## Layout

| Path | What |
|------|------|
| `SPEC.md` | The product spec. Source of truth for decisions. |
| `src/lib/model/types.ts` | Object model: Obligation, Person, Origin, Rule, Event. |
| `src/lib/store/` | Store interface, in-memory implementation, IndexedDB persistence, seed data. |
| `src/lib/rank/urgency.ts` | Deterministic ranker → Now / Waiting / Decaying / Proposed / Backlog, with reason lines. |
| `src/lib/llm/adapter.ts` | Provider-agnostic inference boundary: classify / extract / correct / answer. |
| `src/lib/llm/rules.ts` | Rules-based adapter. Dates via chrono-node, people by name match, effort and hardness from lexicons. No network. |
| `src/lib/actions.ts` | User actions: done, skip, drop, confirm, accept agent result, single-input routing. |
| `src/components/NowScreen.tsx` | The Now screen. |

## Test

```
npm test
```

## Deploy (Cloudflare Pages)

The app is a static export with browser-side persistence, so there is no server.

```
npm run deploy
```

That runs `next build` (writes `out/`) and `wrangler pages deploy out`. First time,
`npx wrangler login` and create the Pages project when prompted. Data lives in the
visitor's IndexedDB for that origin; nothing is stored on Cloudflare.

## Status

v0: object model, deterministic ranker, rules-based extraction and correction,
questions over your own items, corrections that become Rules, IndexedDB
persistence, static export. No model calls anywhere.

Known limits of the rules adapter: the "why" line restates rather than infers;
corrections are recognised by cue words plus a title match; questions cover
"waiting", "overdue", and a person's name only.
