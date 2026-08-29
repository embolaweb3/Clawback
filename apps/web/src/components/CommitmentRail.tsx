"use client";

import { motion } from "framer-motion";
import { CopyableValue } from "./CopyableValue";

export interface RailNode {
  readonly label: string;
  readonly hash?: string;
  readonly href?: string | null;
}

/**
 * The product's core visual metaphor — an evidence rail, not five generic
 * cards. Used in two places: a static illustration on the landing hero
 * (no hashes), and the live commitment chain on a real receipt (every
 * node carries its actual, independently-recomputable hash). Every
 * connector represents a real `chain(previous, artifact)` call in
 * packages/shared/src/commitment.ts — the fill animation illustrates that
 * dependency, it doesn't decorate an unrelated concept.
 */
export function CommitmentRail({ nodes }: { nodes: readonly RailNode[] }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-0" aria-label="Commitment chain">
      {nodes.map((node, i) => (
        <li key={node.label} className="flex flex-1 flex-col sm:flex-row sm:items-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex flex-1 flex-col items-start gap-2 rounded-lg border border-rule bg-paper-raised px-4 py-3.5 shadow-card sm:items-center sm:text-center"
          >
            <span className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold text-ink-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] text-signal">
              {node.label}
            </span>
            {node.hash ? (
              <CopyableValue value={node.hash} href={node.href} label={`${node.label.toLowerCase()} commitment`} />
            ) : (
              <span className="h-4 w-20 rounded-full bg-paper-sunken" aria-hidden="true" />
            )}
          </motion.div>
          {i < nodes.length - 1 && (
            <div
              className="relative my-1 h-6 w-px shrink-0 self-center overflow-hidden bg-rule sm:my-0 sm:h-px sm:w-6"
              aria-hidden="true"
            >
              <motion.div
                initial={{ scaleY: 0, scaleX: 0 }}
                whileInView={{ scaleY: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 + 0.25 }}
                style={{ transformOrigin: "top left" }}
                className="absolute inset-0 origin-top bg-signal sm:origin-left"
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
