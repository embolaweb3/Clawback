"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades + lifts a section in once it enters the viewport. A single
 * IntersectionObserver-driven class toggle — no animation library. The
 * global `prefers-reduced-motion: reduce` rule in globals.css collapses
 * the animation to effectively instant, so this never fights that
 * preference.
 */
export function Reveal({ children, delayMs = 0 }: { children: ReactNode; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={visible ? "animate-reveal" : "opacity-0"} style={{ animationDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}
