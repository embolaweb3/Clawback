"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fades + lifts a section in once it enters the viewport. Reduced-motion
 * handling comes from the app-wide `MotionConfig reducedMotion="user"` in
 * MotionProvider — this component doesn't need its own media-query logic.
 */
export function Reveal({ children, delayMs = 0 }: { children: ReactNode; delayMs?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: delayMs / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
