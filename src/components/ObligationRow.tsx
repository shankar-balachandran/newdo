"use client";
import { useState } from "react";
import type { Obligation, Person } from "@/lib/model/types";
import { correctItem, drop, markDone, skip } from "@/lib/actions";

export function ObligationRow({
  o,
  reason,
  people,
  decaying,
}: {
  o: Obligation;
  reason: string;
  people: Person[];
  decaying: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <li className="group border-b border-line py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <button
          aria-label="Done"
          onClick={() => markDone(o)}
          className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-ink transition hover:scale-125"
        />
        <div className="min-w-0 flex-1">
          <button onClick={() => setOpen((v) => !v)} className="text-left">
            <div className="text-[15px] font-medium leading-snug">{o.title}</div>
            <div className="mt-0.5 text-[13px] leading-snug text-muted">{reason}</div>
          </button>

          {decaying ? (
            <div className="mt-2 flex gap-2">
              <button onClick={() => drop(o)} className="btn">drop</button>
              <button onClick={() => markDone(o)} className="btn">do</button>
            </div>
          ) : (
            <div className="mt-2 hidden gap-2 group-hover:flex">
              <button onClick={() => skip(o)} className="btn">not today</button>
            </div>
          )}

          {open && (
            <div className="mt-3 space-y-2 rounded-md bg-panel p-3 text-[13px]">
              <Row k="Why">{o.intent}</Row>
              {o.doneWhen && <Row k="Done when">{o.doneWhen}</Row>}
              {o.forWhom.length > 0 && (
                <Row k="For">{o.forWhom.map((id) => people.find((p) => p.id === id)?.name).join(", ")}</Row>
              )}
              <Row k="From">
                <span className="text-muted">{o.origin.channel}</span> · “{o.origin.excerpt}”
              </Row>
              {o.userNotes && <Row k="Notes"><pre className="whitespace-pre-wrap font-sans">{o.userNotes}</pre></Row>}
              <Row k="History">
                <ul className="text-muted">
                  {o.history.map((e, i) => (
                    <li key={i}>
                      {new Date(e.at).toLocaleDateString()} · {e.kind}
                      {e.detail ? ` · ${e.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </Row>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  const r = await correctItem(o, note.trim());
                  setNote("");
                  setResult(r);
                }}
              >
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="correct it in plain words: “not urgent”, “push to Friday”, “it's for Maya”…"
                  className="w-full rounded border border-line bg-transparent px-2 py-1 outline-none"
                />
                {result && <div className="mt-1 text-muted">{result}</div>}
              </form>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <div className="text-muted">{k}</div>
      <div>{children}</div>
    </div>
  );
}
