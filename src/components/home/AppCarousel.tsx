"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import s from "./home.module.css";

export interface Slide {
  id: string;
  name: string;
  audience: string;
  content: ReactNode;
}

/**
 * The apps, one at a time, turning over on their own (a 走马灯), eight seconds each. The active tab fills up while its
 * app is showing, and the next one comes up when the fill ends, so the timer and the bar can't
 * drift apart. It holds still while the pointer or focus is on it, or while it's off screen, and
 * for good once someone picks an app themselves. Under reduced motion the fill (and so the turning)
 * is switched off in the CSS, and so it is on narrow screens, where the stage fits the slide showing. All the slides are
 * stacked in one grid cell, so the stage is as tall as the tallest one and nothing below it jumps.
 */
export default function AppCarousel({ slides, label }: { slides: Slide[]; label: string }) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [stopped, setStopped] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const count = slides.length;
  const go = (i: number, byHand: boolean) => {
    setActive(((i % count) + count) % count);
    if (byHand) setStopped(true);
  };

  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? count - 1 : active + step;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = ((to % count) + count) % count;
    go(next, true);
    tabs.current[next]?.focus();
  };

  const running = !stopped && onScreen;
  const state = [s.carousel, running ? s.running : "", held ? s.held : ""].filter(Boolean).join(" ");

  return (
    <div
      ref={root}
      className={state}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div className={s.carouselBar}>
        <div role="tablist" aria-label={label} className={s.tabs} onKeyDown={onTabKey}>
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${slide.id}-tab`}
              aria-controls={`${slide.id}-panel`}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={s.tab}
              onClick={() => go(i, true)}
            >
              <span className={s.tabNum}>{String(i + 1).padStart(2, "0")}</span>
              <span className={s.tabName}>{slide.name}</span>
              <span className={s.tabFor}>{slide.audience}</span>
              <span
                key={i === active ? `on-${active}` : "off"}
                aria-hidden="true"
                className={s.tabFill}
                onAnimationEnd={() => go(active + 1, false)}
              />
            </button>
          ))}
        </div>
        <div className={s.arrows}>
          <button type="button" className={s.arrow} aria-label="Previous app" onClick={() => go(active - 1, true)}>
            ←
          </button>
          <button type="button" className={s.arrow} aria-label="Next app" onClick={() => go(active + 1, true)}>
            →
          </button>
        </div>
      </div>

      <div
        className={s.stage}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const from = touchX.current;
          const to = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (from == null || to == null || Math.abs(to - from) < 50) return;
          go(active + (to < from ? 1 : -1), true);
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            id={`${slide.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${slide.id}-tab`}
            aria-roledescription="slide"
            aria-hidden={i !== active}
            data-active={i === active || undefined}
            className={s.slide}
          >
            {slide.content}
          </div>
        ))}
      </div>
    </div>
  );
}
