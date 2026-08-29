"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * `reducedMotion="user"` makes every animation in the app automatically
 * respect the OS-level "reduce motion" accessibility setting — Framer
 * Motion swaps transforms/opacity fades for instant changes without any
 * per-component logic. This is the one global motion policy for the app.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
