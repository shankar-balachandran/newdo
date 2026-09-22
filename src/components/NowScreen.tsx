"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { resetToSeed, useSnapshot } from "@/lib/store/useStore";
import { rank } from "@/lib/rank/urgency";
import { ObligationRow } from "./ObligationRow";
import { acceptAgentResult, confirm, drop, promoteScratch, submitInput } from "@/lib/actions";

type Panel = "none" | "proposed" | "backlog" | "waiting" | "scratch" | "rules";

export function NowScreen() {
  const snap = useSnapshot();
  const views = useMemo(() => rank(snap.obligations, snap.people, snap.rules), [snap]);
  const [panel, setPanel] = useState<Panel>("none");
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  const name = (id: string) => snap.people.find((p) => p.id === id)?.name ?? id;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const r = await submitInput(input);
    setInput("");
    setFlash(r.message);
    if (r.kind === "capture") setPanel("proposed");
    setTimeout(() => setFlash(null), r.kind === "question" ? 8000 : 4000);
  }

  if (!snap.hydrated) {
    return <main className="mx-auto w-full max-w-xl px-4 py-12 text-muted">Loading…</main>;
  }

  // Untouched demo data: nothing captured by the user yet, no rules learned.
  const isDemo = snap.obligations.every((o) => o.origin.ref === "seed") && snap.rules.length === 0 && snap.scratch.length === 0;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">{today}</h1>
        <div className="flex gap-4 text-[13px] text-muted">
          <Link href="/how" className="hover:text-ink">how it works</Link>
          <button onClick={() => setPanel(panel === "waiting" ? "none" : "waiting")} className="hover:text-ink">
            ▪ {views.waiting.length} waiting
          </button>
        </div>
      </header>

      {isDemo && (
        <p className="mt-4 rounded-md bg-panel px-3 py-2 text-[13px] leading-snug text-muted">
          <span className="text-ink">This is demo data.</span> Type what you owe in the box at the bottom. newdo works out
          who it&apos;s for, when it&apos;s due and how big it is, then shows the few things that matter today, each with a reason.{" "}
          <Link href="/how" className="underline underline-offset-2 hover:text-ink">How it works</Link>
        </p>
      )}

      <ul className="mt-6">
        {views.now.map((r) => (
          <ObligationRow key={r.obligation.id} o={r.obligation} reason={r.reason} people={snap.people} decaying={r.decaying} />
        ))}
        {views.now.length === 0 && <li className="py-8 text-center text-muted">Nothing for now. Good.</li>}

        {views.review.map((o) => (
          <li key={o.id} className="border-t border-line py-4">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-ink" />
              <div className="flex-1">
                <div className="text-[15px] font-medium leading-snug">
                  <span className="text-muted">Agent:</span> {o.title.charAt(0).toLowerCase() + o.title.slice(1)}
                </div>
                <div className="mt-0.5 text-[13px] text-muted">{o.agentResult?.summary} Review?</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => acceptAgentResult(o)} className="btn">accept</button>
                  <button onClick={() => drop(o)} className="btn">discard</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-[13px] text-muted">
        <Toggle active={panel === "proposed"} onClick={() => setPanel(panel === "proposed" ? "none" : "proposed")}>
          {views.proposed.length} proposed
        </Toggle>
        <span>·</span>
        <Toggle active={panel === "backlog"} onClick={() => setPanel(panel === "backlog" ? "none" : "backlog")}>
          {views.backlog.length} in backlog
        </Toggle>
        <span>·</span>
        <Toggle active={panel === "scratch"} onClick={() => setPanel(panel === "scratch" ? "none" : "scratch")}>
          scratchpad{snap.scratch.length ? ` (${snap.scratch.length})` : ""}
        </Toggle>
        {snap.rules.length > 0 && (
          <>
            <span>·</span>
            <Toggle active={panel === "rules"} onClick={() => setPanel(panel === "rules" ? "none" : "rules")}>
              {snap.rules.length} rule{snap.rules.length === 1 ? "" : "s"}
            </Toggle>
          </>
        )}
      </div>

      {panel === "rules" && (
        <Panel title="Rules — what your corrections taught it">
          {snap.rules.map((r) => (
            <div key={r.id} className="py-2">
              <div className="text-[15px]">{r.text}</div>
              <div className="text-[13px] text-muted">from “{r.originEventDetail}”</div>
            </div>
          ))}
        </Panel>
      )}

      {panel === "proposed" && (
        <Panel title="Proposed — confirm or dismiss">
          {views.proposed.length === 0 && <p className="text-muted">Nothing proposed.</p>}
          {views.proposed.map((o) => (
            <div key={o.id} className="py-3">
              <div className="text-[15px]">{o.title}</div>
              <div className="text-[13px] text-muted">
                {o.origin.channel} · “{o.origin.excerpt}”
                {o.forWhom.length ? ` · for ${o.forWhom.map(name).join(", ")}` : ""}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => confirm(o)} className="btn">confirm</button>
                <button onClick={() => drop(o)} className="btn">dismiss</button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {panel === "backlog" && (
        <Panel title="Backlog — everything active that didn't make Now">
          {views.backlog.length === 0 && <p className="text-muted">Empty.</p>}
          <ul>
            {views.backlog.map((r) => (
              <ObligationRow key={r.obligation.id} o={r.obligation} reason={r.reason} people={snap.people} decaying={r.decaying} />
            ))}
          </ul>
        </Panel>
      )}

      {panel === "waiting" && (
        <Panel title="Waiting on others">
          {views.waiting.length === 0 && <p className="text-muted">Nothing.</p>}
          {views.waiting.map((o) => (
            <div key={o.id} className="py-3">
              <div className="text-[15px]">{o.title}</div>
              <div className="text-[13px] text-muted">
                Waiting on {o.blockedOn.people.map(name).join(", ") || "someone"}
                {o.blockedOn.note ? ` · ${o.blockedOn.note}` : ""}
              </div>
            </div>
          ))}
        </Panel>
      )}

      {panel === "scratch" && (
        <Panel title="Scratchpad — nothing here is inferred until you promote it">
          {snap.scratch.length === 0 && <p className="text-muted">Empty. Type a line starting with “-” below.</p>}
          {snap.scratch.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-2">
              <span>{l.text}</span>
              <button onClick={() => promoteScratch(l)} className="btn">promote</button>
            </div>
          ))}
        </Panel>
      )}

      <form onSubmit={onSubmit} className="mt-8">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="type anything…"
          className="w-full border-b border-line bg-transparent py-2 text-[15px] outline-none placeholder:text-muted focus:border-ink"
        />
        <div className="mt-1 min-h-4 text-[12px] text-muted">
          {flash ?? "an obligation, a correction, a question, or “- a scratch line”"}
        </div>
      </form>

      <footer className="mt-12 text-[11px] text-muted">
        <button onClick={() => { if (window.confirm("Replace everything with the demo data?")) resetToSeed(); }} className="hover:text-ink">
          reset to demo data
        </button>
        <span className="mx-2">·</span>
        <span>stored in this browser only</span>
        <span className="mx-2">·</span>
        <a href="mailto:shankar@beaverminds.com?subject=newdo" className="hover:text-ink">
          shankar@beaverminds.com
        </a>
      </footer>
    </main>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`hover:text-ink ${active ? "text-ink underline underline-offset-4" : ""}`}>
      {children}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-md bg-panel p-4">
      <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}
