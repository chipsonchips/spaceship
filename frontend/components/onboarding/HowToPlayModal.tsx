"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WELCOME_SLIDES } from "@/lib/onboarding";

interface HowToPlayModalProps {
  isOpen: boolean;
  /** Close without starting the tour. */
  onClose: () => void;
  /** Close and launch the guided spotlight tour. */
  onStartTour: () => void;
}

export default function HowToPlayModal({
  isOpen,
  onClose,
  onStartTour,
}: HowToPlayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to the first slide every time the modal is (re)opened.
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const isLast = step === WELCOME_SLIDES.length - 1;
  const slide = WELCOME_SLIDES[step];

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md">
        {/* Outer glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 via-cyan-500/20 to-emerald-500/30 rounded-2xl blur-lg" />

        <div className="relative bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

          {/* Skip / close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors text-xs font-bold font-orbitron uppercase tracking-widest"
          >
            Skip ✕
          </button>

          <div className="text-center pt-2">
            <div className="text-5xl mb-3 select-none">{slide.icon}</div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-orbitron uppercase tracking-wider mb-3">
              {slide.title}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-inter min-h-[88px]">
              {slide.body}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 my-5">
            {WELCOME_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-emerald-400"
                    : "w-1.5 bg-slate-600 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-bold font-orbitron uppercase tracking-wider transition-colors"
              >
                Back
              </button>
            )}

            {!isLast ? (
              <button
                onClick={() => setStep((s) => Math.min(WELCOME_SLIDES.length - 1, s + 1))}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black font-orbitron uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                Next
              </button>
            ) : (
              <>
                <button
                  onClick={onStartTour}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-black font-orbitron uppercase tracking-wider transition-colors"
                >
                  Take the tour
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black font-orbitron uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  Start playing
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
