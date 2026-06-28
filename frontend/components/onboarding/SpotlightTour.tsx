"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getActiveTourSteps,
  type TourContext,
  type TourStep,
} from "@/lib/onboarding";

interface SpotlightTourProps {
  isActive: boolean;
  onFinish: () => void;
  ctx: TourContext;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // spotlight breathing room around the target
const TOOLTIP_WIDTH = 300;

export default function SpotlightTour({
  isActive,
  onFinish,
  ctx,
}: SpotlightTourProps) {
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => setMounted(true), []);

  // Keep the latest context in a ref so the tour can read it on activation
  // without re-initializing every time the balance poll updates `ctx`.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // Freeze the step list for the duration of one tour run (set on activation).
  const [steps, setSteps] = useState<TourStep[]>([]);
  useEffect(() => {
    if (isActive) {
      setSteps(getActiveTourSteps(ctxRef.current));
      setIndex(0);
    }
  }, [isActive]);

  const step = steps[index];

  // Measure (and keep in sync with) the current target element.
  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-onboarding="${step.target}"]`,
    );
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (!isActive || !step) return;

    const el = step.target
      ? document.querySelector<HTMLElement>(`[data-onboarding="${step.target}"]`)
      : null;

    // Bring the target into view, then measure on the next frames.
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const raf1 = requestAnimationFrame(measure);
    const t = setTimeout(measure, 320);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isActive, step, measure]);

  const goNext = useCallback(() => {
    if (index >= steps.length - 1) {
      onFinish();
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, steps.length, onFinish]);

  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard controls.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
      else if (e.key === "ArrowRight" || e.key === "Enter") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, goNext, goBack, onFinish]);

  if (!mounted || !isActive || !step) return null;

  const isLast = index === steps.length - 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;

  // Tooltip placement: below the target if there's room, else above; centered
  // when there's no target.
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const placeBelow = rect.top + rect.height + 180 < vh;
    const top = placeBelow
      ? rect.top + rect.height + PADDING + 12
      : rect.top - PADDING - 12;
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));
    tooltipStyle = {
      position: "fixed",
      top,
      left,
      width: TOOLTIP_WIDTH,
      transform: placeBelow ? "none" : "translateY(-100%)",
    };
  } else {
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: Math.min(TOOLTIP_WIDTH, vw - 24),
      transform: "translate(-50%, -50%)",
    };
  }

  const overlay = (
    <div className="fixed inset-0 z-[9998] pointer-events-auto">
      {rect ? (
        // Spotlight cutout via a massive box-shadow ring.
        <div
          className="absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow:
              "0 0 0 9999px rgba(2,6,23,0.82), 0 0 0 2px rgba(16,185,129,0.9), 0 0 22px 4px rgba(16,185,129,0.45)",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/82" />
      )}

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-courier text-emerald-500/80 font-bold tracking-widest uppercase">
            Step {index + 1} / {steps.length}
          </span>
          <button
            onClick={onFinish}
            className="text-slate-500 hover:text-white transition-colors text-[10px] font-bold font-orbitron uppercase tracking-widest"
          >
            Skip ✕
          </button>
        </div>

        <h3 className="text-sm font-black text-white font-orbitron uppercase tracking-wide mb-1.5">
          {step.title}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed font-inter mb-4">
          {step.body}
        </p>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              onClick={goBack}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 text-[11px] font-bold font-orbitron uppercase tracking-wider transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={goNext}
            className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black font-orbitron uppercase tracking-wider transition-colors shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
