import { CopyableValue } from "./CopyableValue";

export interface RailNode {
  readonly label: string;
  readonly hash?: string;
  readonly href?: string | null;
}

/**
 * The product's core visual metaphor, used in two places: as a static
 * illustration on the landing hero (no hashes — just the concept), and as
 * the live commitment chain on a real receipt (every node carries its
 * actual, independently-recomputable hash). Never decorative on its own —
 * every connector represents a real `chain(previous, artifact)` call in
 * packages/shared/src/commitment.ts.
 */
export function CommitmentRail({ nodes }: { nodes: readonly RailNode[] }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-0" aria-label="Commitment chain">
      {nodes.map((node, i) => (
        <li key={node.label} className="flex flex-1 flex-col sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col items-start gap-2 rounded-lg border border-rule bg-paper-raised px-4 py-3.5 shadow-card sm:items-center sm:text-center">
            <span className="font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] text-signal">
              {node.label}
            </span>
            {node.hash ? (
              <CopyableValue value={node.hash} href={node.href} label={`${node.label.toLowerCase()} commitment`} />
            ) : (
              <span className="h-4 w-20 rounded-full bg-paper-sunken" aria-hidden="true" />
            )}
          </div>
          {i < nodes.length - 1 && (
            <div
              className="relative my-1 h-6 w-px shrink-0 self-center overflow-hidden bg-rule-strong sm:my-0 sm:h-px sm:w-6"
              aria-hidden="true"
            >
              <span className="absolute inset-0 bg-gradient-to-b from-transparent via-signal to-transparent opacity-50 sm:bg-gradient-to-r motion-safe:animate-soft-pulse" />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
