import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "newdo · how it works",
  description: "How to use newdo, the todo list where the list is an output.",
};

export default function How() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">How newdo works</h1>
        <Link href="/" className="text-[13px] text-muted hover:text-ink">← back</Link>
      </header>

      <p className="mt-6 text-[15px] leading-relaxed">
        Most todo apps make you maintain the list: add fields, set priorities, sort, prune.
        newdo inverts that. You describe what you owe in plain words. It works out who it is
        for, when it is due, and how big it is. Then it shows you the few things that matter
        today, each with a reason. <strong>The list is an output, never an input.</strong>
      </p>

      <Section title="1. The Now screen">
        <p>
          The first screen shows at most five things, ranked by who is waiting on you, how firm
          the deadline is, and how long you have been avoiding it. Every item has a one-line
          reason underneath. Tap an item to see why it exists, where it came from, and its history.
        </p>
        <ul>
          <li>Click the dot on the left to mark it done.</li>
          <li>Hover and choose <em>not today</em> to skip it. Skips are remembered.</li>
          <li>Something you keep skipping gets a question: <em>drop</em> or <em>do</em>. It never silently rolls over.</li>
        </ul>
      </Section>

      <Section title="2. Type anything">
        <p>There is one input box. You never choose what kind of thing you are typing. It works that out.</p>
        <table className="mt-2 w-full text-[14px]">
          <tbody>
            <Row k="A new obligation" v="send Arun the revised quote by Thursday" note="Becomes a proposed item: for Arun, hard deadline Thursday, about 15 minutes." />
            <Row k="A correction" v="Arun's quote isn't urgent" note="Finds the item and softens its deadline." />
            <Row k="A generalisation" v="things from Arun are never urgent" note="Also creates a rule, so it never makes that mistake again." />
            <Row k="A move" v="push Maya's draft to Friday" note="Changes the date." />
            <Row k="A question" v="what am I waiting on from Priya?" note="Answers from your own items. Try “overdue?” or a person's name." />
            <Row k="A scratch line" v="- maybe rethink the pricing page" note="Goes to the scratchpad untouched. Nothing is inferred until you promote it." />
          </tbody>
        </table>
      </Section>

      <Section title="3. Proposed, then confirmed">
        <p>
          Anything captured lands in <em>Proposed</em>, not on your list. Open the count at the
          bottom, then confirm or dismiss each one. Only confirmed items are ranked. This is the
          one place the app asks you to decide.
        </p>
      </Section>

      <Section title="4. Corrections become rules">
        <p>
          When a correction is general (“things from Arun are never urgent”), newdo writes it
          down as a rule and applies it from then on. Open <em>rules</em> at the bottom to see
          what it has learned. Corrections that are specific to one item only change that item.
        </p>
      </Section>

      <Section title="5. The other views">
        <ul>
          <li><strong>Waiting</strong> (top right): things blocked on someone else, grouped by who.</li>
          <li><strong>Backlog</strong>: everything active that did not make the top five. Always one tap away, never the default.</li>
          <li><strong>Scratchpad</strong>: a dumb list for thinking. Promote a line when it becomes real.</li>
          <li><strong>Agent rows</strong> (hollow dot): work an assistant did on your behalf. You review before it counts as done.</li>
        </ul>
      </Section>

      <Section title="6. Your data">
        <p>
          Everything is stored in your browser only. Nothing is sent to a server, and there is no
          account. That also means it does not follow you to another device yet. The app opens
          with demo data so you can see how it behaves. <em>Reset to demo data</em> at the bottom
          brings it back.
        </p>
        <p className="mt-2">
          No AI model is involved in this version. Dates, people, and effort are inferred with
          rules, which is why it responds instantly and works offline.
        </p>
      </Section>

      <Section title="Feedback">
        <p>
          This is an early experiment. If any of it feels right or wrong, tell me:{" "}
          <a href="mailto:shankar@beaverminds.com?subject=newdo" className="underline underline-offset-2 hover:text-ink">
            shankar@beaverminds.com
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 text-[15px] leading-relaxed [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
      <h2 className="text-[13px] font-medium uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Row({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <tr className="border-t border-line align-top">
      <td className="py-2 pr-3 text-muted">{k}</td>
      <td className="py-2">
        <code className="text-[13px]">{v}</code>
        <div className="text-[13px] text-muted">{note}</div>
      </td>
    </tr>
  );
}
