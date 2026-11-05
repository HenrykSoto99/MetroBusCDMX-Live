"use client";

import { useEffect, useRef, useState } from "react";

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  "aria-label"?: string;
}

export function AnimatedCounter({ value, duration = 350, className, "aria-label": ariaLabel }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startValue = displayRef.current;
    const targetValue = Math.max(0, Math.round(value));

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    if (reducedMotion || startValue === targetValue) {
      displayRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (targetValue - startValue) * eased);
      displayRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frameRef.current = window.requestAnimationFrame(tick);
      else frameRef.current = null;
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [duration, value]);

  return <strong className={className} aria-label={ariaLabel}>{displayValue}</strong>;
}
