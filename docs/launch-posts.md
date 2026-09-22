# Launch posts — Wednesday 23 September 2026

Product Hunt goes live 12:01am PT / 12:31pm IST. Post these in the same window.

---

## Show HN (Hacker News)

**Title** (80 char max):
Show HN: newdo – a todo list where the list is an output, not an input

**URL:** https://newdo.beaverminds.com

**First comment** (post immediately after submitting):

Hi HN. I built this because every todo app I've used makes me do the maintenance: fields, priorities, sorting, pruning. The app is a dumb store and I'm the scheduler.

newdo inverts that. You type what you owe in plain words ("send Arun the revised quote by Thursday"). It works out who it's for, when it's due, how firm the date is and how big the job is, then shows you at most five things for today, each with a one-line reason. When it's wrong you say so in a sentence ("things from Arun are never urgent") and it writes a rule so the mistake doesn't repeat.

Two deliberate decisions:

1. No model. Dates, people and effort are inferred with rules (chrono-node plus small lexicons). It's instant, works offline, and I wanted to see how far the idea gets before adding inference. The adapter boundary is there for a model later.

2. Local-first. Everything lives in your browser's IndexedDB. No account, no server, nothing leaves the machine. The deploy is static files on Cloudflare.

It opens with demo data so you can try it in thirty seconds. The spec that drove the design is in the repo as SPEC.md.

What I'd like to know: does the reason line under each item earn its place, or is it noise? And does "corrections become rules" hold up once you've made a few?

Next.js, TypeScript, ~1.5k lines. Built in a day with Claude Code, which is a slightly funny thing to say about a product that runs no model.

---

## X

Every todo app makes you do the maintenance. Fields, priorities, sorting, pruning.

newdo inverts it. Type what you owe in plain words. It works out who, when and how big, and shows five things that matter today, each with a reason. Correct it once and it writes a rule.

No model. No account. Runs in your browser.

newdo.beaverminds.com
Live on Product Hunt today: producthunt.com/products/newdo-2

[attach docs/walkthrough.gif]

---

## LinkedIn (personal)

I shipped a small experiment today: newdo, a todo list built on one idea.

The list is an output, never an input.

Every todo app I've used makes me maintain the list. I add the fields, set the priorities, sort, prune. The app just stores it. newdo does the opposite. You type what you owe in plain words, it works out who it's for, when it's due and how big it is, and it shows you the few things that matter today with a reason under each. When it's wrong, you tell it in a sentence and it turns that into a rule.

Two decisions I'm curious about:

No AI model. Everything is inferred with rules. It's instant and private, and I wanted to see how far the idea gets on its own before adding a model.

Local-first. Nothing leaves your browser. No account.

It opens with demo data. Try it in thirty seconds and tell me whether the "reason line" earns its place.

newdo.beaverminds.com
Launching on Product Hunt today: https://www.producthunt.com/products/newdo-2

---

## LinkedIn (Beaverminds company page)

New from Beaverminds: newdo, a rethink of the todo list for a world where software can do the maintenance for you.

Type what you owe. It works out who, when and how big. It shows you what matters today, with a reason. Correct it once and it remembers.

Local-first, no account, no model. Try it: newdo.beaverminds.com

Launching on Product Hunt today: https://www.producthunt.com/products/newdo-2

---

## Reddit r/SideProject

**Title:** I built a todo list where you never fill in a field. It works out who, when and how big from a sentence.

**Body:** same as the HN comment, minus the last paragraph.
