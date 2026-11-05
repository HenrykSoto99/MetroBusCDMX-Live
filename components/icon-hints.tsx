"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./icon-hints.module.css";

type TooltipState = {
  id: string;
  label: string;
  description?: string;
  left: number;
  top: number;
  above: boolean;
};

function findTrigger(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const explicit = target.closest<HTMLElement>("[data-icon-hint]");
  if (explicit) return explicit;
  const action = target.closest<HTMLElement>("button, a");
  return action?.querySelector("svg") && (action.getAttribute("aria-label") || action.textContent?.trim()) ? action : null;
}

function getPosition(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const above = rect.top > 96 && window.innerHeight - rect.bottom < 96;
  return {
    left: Math.min(Math.max(rect.left + rect.width / 2, 12), window.innerWidth - 12),
    top: above ? rect.top - 10 : rect.bottom + 10,
    above,
  };
}

/** One delegated tooltip layer: no layout wrappers or action-blocking handlers. */
export function IconHints() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const previousDescribedByRef = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const size = tooltipRef.current.getBoundingClientRect();
    const trigger = activeTriggerRef.current;
    const anchor = trigger?.isConnected ? trigger.getBoundingClientRect() : null;
    const left = Math.max(size.width / 2 + 8, Math.min(tooltip.left, window.innerWidth - size.width / 2 - 8));
    const above = anchor
      ? anchor.bottom + size.height + 10 > window.innerHeight - 8 && anchor.top > size.height + 10
      : tooltip.above;
    const requestedTop = anchor ? (above ? anchor.top - 10 : anchor.bottom + 10) : tooltip.top;
    const top = above
      ? Math.max(size.height + 8, Math.min(requestedTop, window.innerHeight - 8))
      : Math.max(8, Math.min(requestedTop, window.innerHeight - size.height - 8));
    setTooltip((current) => current?.id === tooltip.id ? { ...current, left, top, above } : current);
  }, [tooltip?.id]);

  useEffect(() => {
    let dismissTimer: number | undefined;
    let pinnedUntil = 0;

    const clearTimer = () => {
      if (dismissTimer !== undefined) window.clearTimeout(dismissTimer);
      dismissTimer = undefined;
    };
    const restoreDescribedBy = () => {
      const trigger = activeTriggerRef.current;
      if (!trigger) return;
      if (previousDescribedByRef.current) trigger.setAttribute("aria-describedby", previousDescribedByRef.current);
      else trigger.removeAttribute("aria-describedby");
    };
    const dismiss = () => {
      clearTimer();
      pinnedUntil = 0;
      restoreDescribedBy();
      activeTriggerRef.current = null;
      previousDescribedByRef.current = null;
      setTooltip(null);
    };
    const show = (trigger: HTMLElement, timed: boolean) => {
      const label = trigger.dataset.iconHint?.trim() || trigger.getAttribute("aria-label")?.trim() || trigger.textContent?.trim();
      if (!label || !trigger.isConnected) return;
      clearTimer();
      pinnedUntil = timed ? Date.now() + 2500 : 0;
      restoreDescribedBy();
      activeTriggerRef.current = trigger;
      previousDescribedByRef.current = trigger.getAttribute("aria-describedby");
      const id = `icon-hint-${++idRef.current}`;
      const previous = previousDescribedByRef.current;
      trigger.setAttribute("aria-describedby", previous ? `${previous} ${id}` : id);
      setTooltip({ id, label, description: trigger.dataset.iconHintDescription?.trim() || undefined, ...getPosition(trigger) });
      if (timed) dismissTimer = window.setTimeout(dismiss, 2500);
    };
    const onPointerOver = (event: PointerEvent) => {
      const trigger = findTrigger(event.target);
      if (!trigger || (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))) return;
      show(trigger, false);
    };
    const onPointerOut = (event: PointerEvent) => {
      const trigger = findTrigger(event.target);
      if (!trigger || activeTriggerRef.current !== trigger || pinnedUntil > Date.now()) return;
      if (!(event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))) dismiss();
    };
    const onFocusIn = (event: FocusEvent) => {
      const trigger = findTrigger(event.target);
      if (trigger) show(trigger, false);
    };
    const onFocusOut = (event: FocusEvent) => {
      const trigger = findTrigger(event.target);
      if (!trigger || activeTriggerRef.current !== trigger || pinnedUntil > Date.now()) return;
      if (!(event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))) dismiss();
    };
    const onClick = (event: MouseEvent) => {
      const trigger = findTrigger(event.target);
      if (trigger) show(trigger, true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const active = activeTriggerRef.current;
      if (active && event.target instanceof Node && !active.contains(event.target)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    // Capture before React closes/unmounts a panel, preserving one-click actions.
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);

    return () => {
      clearTimer();
      restoreDescribedBy();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, []);

  if (!tooltip || typeof document === "undefined") return null;
  return createPortal(
    <div ref={tooltipRef} id={tooltip.id} role="tooltip" className={`${styles.tooltip} ${tooltip.above ? styles.above : ""}`} style={{ left: tooltip.left, top: tooltip.top }}>
      <span className={styles.label}>{tooltip.label}</span>
      {tooltip.description ? <span className={styles.description}>{" "}{tooltip.description}</span> : null}
    </div>,
    document.body,
  );
}
