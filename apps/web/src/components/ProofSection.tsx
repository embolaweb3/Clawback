import type { ReactNode } from "react";

export interface ProofItem {
  readonly proven: boolean;
  readonly text: ReactNode;
}

function ProofList({ items }: { items: readonly ProofItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
              item.proven ? "bg-signal-soft text-signal" : "bg-ember-soft text-ember"
            }`}
            aria-hidden="true"
          >
            {item.proven ? "✓" : "✕"}
          </span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The product's honesty differentiator, given real visual weight rather
 * than being softened or buried (build brief §15: "make the honesty part
 * of the product design"). `proven`/`notProven` are supplied by the
 * caller from real data — this component never decides what's true.
 */
export function ProofSection({
  proven,
  notProven,
}: {
  proven: readonly ProofItem[];
  notProven: readonly ProofItem[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-signal/25 bg-signal-soft/40 p-6">
        <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-signal">Proven</h3>
        <ProofList items={proven} />
      </div>
      <div className="rounded-xl border border-ember/25 bg-ember-soft/40 p-6">
        <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-ember">Not proven</h3>
        <ProofList items={notProven} />
      </div>
    </div>
  );
}
