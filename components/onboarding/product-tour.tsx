'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
  onStepChange?: (stepIndex: number) => void;
}

interface StepConfig {
  stepNumber: string;
  titleKey: string;
  descKey: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type TooltipPlacement = 'bottom' | 'top' | 'right' | 'left';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: StepConfig[] = [
  { stepNumber: '1', titleKey: 'tour_step1_title', descKey: 'tour_step1_desc' },
  { stepNumber: '2', titleKey: 'tour_step2_title', descKey: 'tour_step2_desc' },
  { stepNumber: '3', titleKey: 'tour_step3_title', descKey: 'tour_step3_desc' },
  { stepNumber: '4', titleKey: 'tour_step4_title', descKey: 'tour_step4_desc' },
  { stepNumber: '5', titleKey: 'tour_step5_title', descKey: 'tour_step5_desc' },
];

const SPOTLIGHT_PADDING = 10;
const SPOTLIGHT_RADIUS = 14;
const TOOLTIP_GAP = 20;
const TOOLTIP_MAX_WIDTH = 360;
const MOBILE_BREAKPOINT = 768;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTargetElement(step: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour-step="${step}"]`);
}

function getRect(el: HTMLElement): TargetRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductTour({ isOpen, onClose, t, onStepChange }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>('bottom');
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // -----------------------------------------------------------------------
  // Measure the current target element & decide tooltip placement
  // -----------------------------------------------------------------------

  const measure = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step) return;

    const el = getTargetElement(step.stepNumber);
    if (!el) {
      // Target not found – skip forward or close if last
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        onClose();
      }
      return;
    }

    const rect = getRect(el);
    setTargetRect(rect);

    // Decide best placement
    const spaceBelow = window.innerHeight - (rect.top + rect.height + SPOTLIGHT_PADDING);
    const spaceRight = window.innerWidth - (rect.left + rect.width + SPOTLIGHT_PADDING);
    const spaceAbove = rect.top - SPOTLIGHT_PADDING;

    if (spaceBelow > 240) {
      setPlacement('bottom');
    } else if (spaceRight > TOOLTIP_MAX_WIDTH + 32) {
      setPlacement('right');
    } else if (spaceAbove > 240) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  }, [currentStep, onClose]);

  // -----------------------------------------------------------------------
  // Open / close lifecycle
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setMounted(true);
      // Small delay so the overlay renders before we measure
      const id = requestAnimationFrame(() => {
        setTimeout(() => measure(), 50);
      });
      return () => cancelAnimationFrame(id);
    } else {
      // Immediately unmount — this fixes the "dark overlay stays" bug
      setMounted(false);
      setTargetRect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // -----------------------------------------------------------------------
  // Re-measure when step changes or on resize / scroll
  // -----------------------------------------------------------------------

  // Notify parent on step changes
  useEffect(() => {
    if (mounted) {
      onStepChange?.(currentStep);
    }
  }, [currentStep, mounted, onStepChange]);

  useEffect(() => {
    if (!mounted) return;

    // Trigger transition animation
    setIsAnimating(true);
    const animTimer = setTimeout(() => setIsAnimating(false), 300);

    // Watch target element for size changes
    const step = STEPS[currentStep];
    const el = step ? getTargetElement(step.stepNumber) : null;

    if (el) {
      // Scroll into view smoothly once when step changes
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {}

      observerRef.current?.disconnect();
      observerRef.current = new ResizeObserver(() => measure());
      observerRef.current.observe(el);
    }

    // Small delay to allow layout/scroll to settle
    const measureTimer = setTimeout(() => measure(), 120);

    const handleResize = () => measure();
    const handleScroll = () => measure();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(measureTimer);
      observerRef.current?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [currentStep, mounted, measure]);

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!mounted) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, currentStep]);

  // -----------------------------------------------------------------------
  // Navigation helpers
  // -----------------------------------------------------------------------

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  // -----------------------------------------------------------------------
  // Guard: don't render when tour is not open or not mounted
  // -----------------------------------------------------------------------

  if (!isOpen || !mounted) return null;

  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  // -----------------------------------------------------------------------
  // Spotlight geometry — use box-shadow trick for the "cutout" effect
  // The box-shadow color is rgba(0,0,0,0.45) — lighter than before
  // -----------------------------------------------------------------------

  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
        borderRadius: SPOTLIGHT_RADIUS,
        // Lighter overlay: 0.20 instead of 0.45 — surrounding UI stays visible
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.20)',
        // Subtle amber glow ring on the highlighted element
        outline: '2px solid rgba(245, 158, 11, 0.8)',
        outlineOffset: '2px',
        pointerEvents: 'none' as const,
        transition: 'top 0.35s cubic-bezier(.4,0,.2,1), left 0.35s cubic-bezier(.4,0,.2,1), width 0.35s cubic-bezier(.4,0,.2,1), height 0.35s cubic-bezier(.4,0,.2,1)',
        zIndex: 10000,
      }
    : { display: 'none' };

  // -----------------------------------------------------------------------
  // Tooltip position
  // -----------------------------------------------------------------------

  const tooltipStyle: React.CSSProperties = (() => {
    if (isMobile()) {
      return {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: '100%',
        zIndex: 10002,
      };
    }

    if (!targetRect) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: TOOLTIP_MAX_WIDTH,
        zIndex: 10002,
      };
    }

    const centerX = targetRect.left + targetRect.width / 2;
    let tooltipLeft = centerX - TOOLTIP_MAX_WIDTH / 2;

    // Clamp within viewport with margin
    if (tooltipLeft < 16) tooltipLeft = 16;
    if (tooltipLeft + TOOLTIP_MAX_WIDTH > window.innerWidth - 16) {
      tooltipLeft = window.innerWidth - 16 - TOOLTIP_MAX_WIDTH;
    }

    const estimatedHeight = 220; // safe estimation of tooltip height
    let tooltipTop = 0;

    if (placement === 'bottom') {
      tooltipTop = targetRect.top + targetRect.height + SPOTLIGHT_PADDING + TOOLTIP_GAP;
    } else if (placement === 'right') {
      tooltipTop = targetRect.top + targetRect.height / 2 - 100;
    } else { // 'top'
      tooltipTop = targetRect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP - estimatedHeight;
    }

    // Clamp vertical position within viewport
    if (tooltipTop < 16) tooltipTop = 16;
    if (tooltipTop + estimatedHeight > window.innerHeight - 16) {
      tooltipTop = window.innerHeight - 16 - estimatedHeight;
    }

    return {
      position: 'fixed' as const,
      top: tooltipTop,
      left: tooltipLeft,
      width: TOOLTIP_MAX_WIDTH,
      zIndex: 10002,
    };
  })();

  // Arrow pointing toward the target
  const arrowStyle: React.CSSProperties = (() => {
    if (isMobile() || !targetRect) return { display: 'none' };

    const centerX = targetRect.left + targetRect.width / 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tooltipLeft = (tooltipStyle as Record<string, any>).left ?? 0;
    const relX = Math.min(Math.max(centerX - tooltipLeft, 20), TOOLTIP_MAX_WIDTH - 20);

    if (placement === 'right') {
      return {
        position: 'absolute' as const,
        top: 32,
        left: -6,
        transform: 'rotate(45deg)',
        width: 12,
        height: 12,
        borderRadius: 2,
      };
    }

    if (placement === 'bottom') {
      return {
        position: 'absolute' as const,
        top: -7,
        left: relX,
        transform: 'translateX(-50%) rotate(45deg)',
        width: 12,
        height: 12,
        borderRadius: 2,
      };
    }

    return {
      position: 'absolute' as const,
      bottom: -7,
      left: relX,
      transform: 'translateX(-50%) rotate(45deg)',
      width: 12,
      height: 12,
      borderRadius: 2,
    };
  })();

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* ── Backdrop overlay — lighter to keep app visible behind ── */}
      {/* backdrop-blur-[1.5px]: subtle blur, not full blackout */}
      <div
        className="fixed inset-0 z-[9999] backdrop-blur-[1.5px] bg-black/10"
        aria-hidden
      />

      {/* ── Spotlight cutout (creates the visible-element effect) ─── */}
      <div style={spotlightStyle} />

      {/* ── Skip button (top-right, above overlay) ──────────────── */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[10003] flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white transition-all hover:bg-black/50"
        aria-label={t('tour_skip')}
      >
        <span>{t('tour_skip')}</span>
        <X className="h-4 w-4" />
      </button>

      {/* ── Tooltip card ─────────────────────────────────────────── */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className={[
          isMobile() ? 'rounded-t-2xl p-5 pb-8' : 'rounded-2xl p-5',
          'relative',
          'bg-white dark:bg-zinc-900',
          'border border-zinc-200 dark:border-zinc-700',
          'shadow-2xl',
          'transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]',
          isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
        ].join(' ')}
      >
        {/* Arrow */}
        {!isMobile() && targetRect && (
          <div
            style={arrowStyle}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            aria-hidden
          />
        )}

        {/* Step counter */}
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          {`${currentStep + 1} / ${STEPS.length}`}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
          {t(step.titleKey)}
        </h3>

        {/* Description */}
        <p className="mb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t(step.descKey)}
        </p>

        {/* Footer: progress dots + navigation buttons */}
        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={[
                  'block rounded-full transition-all duration-300',
                  idx === currentStep
                    ? 'h-2 w-5 bg-amber-500'
                    : idx < currentStep
                      ? 'h-2 w-2 bg-amber-400/60'
                      : 'h-2 w-2 bg-zinc-300 dark:bg-zinc-600',
                ].join(' ')}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {/* Previous */}
            {!isFirst && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-600 px-3.5 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('tour_prev')}
              </button>
            )}

            {/* Next / Finish */}
            {isLast ? (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.97]"
              >
                <CheckCircle className="h-4 w-4" />
                {t('tour_finish')}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.97]"
              >
                {t('tour_next')}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
