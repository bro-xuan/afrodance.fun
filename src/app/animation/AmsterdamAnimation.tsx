"use client";

// The page around the drawing: a full-window canvas, a hand-lettered title,
// the caption for wherever the camera is, and three small controls. The
// drawing itself is in amsterdam.ts and knows nothing about React.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Amsterdam, type Caption, createAmsterdam } from "./amsterdam";
import styles from "./animation.module.css";
import { BLOCKS, CLOSEUP, ISLETS, TOUR } from "./scene/blocks";

export function AmsterdamAnimation() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<Amsterdam | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [shown, setShown] = useState<Caption | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [night, setNight] = useState(false);
  const [wide, setWide] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const q = new URLSearchParams(window.location.search);
    // For recording the drawing: ?clean hides all the page furniture, ?rec hides
    // just the controls and hands the animation to the recorder as window.amsterdam.
    if (q.has("clean")) stage.setAttribute("data-clean", "");
    if (q.has("rec")) stage.setAttribute("data-rec", "");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let api: Amsterdam;
    try {
      api = createAmsterdam(
        canvas,
        { blocks: BLOCKS, islets: ISLETS, tour: TOUR, closeup: CLOSEUP },
        {
          still,
          freeze: q.has("t") ? Number(q.get("t")) : null,
          onCaption: (c) => {
            setCaption(c);
            if (c) setShown(c);
          },
          onReady: () => setReady(true),
          onExplore: setExploring,
          onNight: setNight,
          onWide: setWide,
        },
      );
    } catch {
      // no WebGL2: the fallback message is shown instead
      queueMicrotask(() => setFailed(true));
      return;
    }
    apiRef.current = api;
    if (q.has("rec")) (window as unknown as { amsterdam?: Amsterdam }).amsterdam = api;

    // the controls step back when the pointer rests
    let idle = 0;
    const wake = () => {
      stage.removeAttribute("data-idle");
      window.clearTimeout(idle);
      idle = window.setTimeout(() => stage.setAttribute("data-idle", ""), 3200);
    };
    wake();
    const onKey = (e: KeyboardEvent) => {
      // leave browser shortcuts alone, and let a focused button or link answer its own keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " && e.target instanceof Element && e.target.closest("button, a")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (api.paused) api.play();
        else api.pause();
        setPaused(api.paused);
      } else if (e.key === "r" || e.key === "R") {
        api.restart();
        setPaused(false);
      } else if (e.key === "Escape") api.resume();
      wake();
    };
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", onKey);
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (api.paused) api.play();
    else api.pause();
    setPaused(api.paused);
  }, []);

  const restart = useCallback(() => {
    apiRef.current?.restart();
    setPaused(false);
  }, []);

  const resume = useCallback(() => apiRef.current?.resume(), []);

  const visible = caption !== null && !exploring;

  return (
    <div ref={stageRef} className={styles.stage} data-night={night ? "" : undefined} data-ready={ready ? "" : undefined}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="An isometric drawing of Amsterdam that sketches itself in: canals, bridges, canal houses, Centraal Station, the Rijksmuseum, a windmill, boats and bicycles."
      />

      {failed && (
        <p className={styles.fallback}>
          This drawing needs WebGL2, which this browser does not have switched on. Any recent Chrome, Safari, Firefox or Edge will show it.
        </p>
      )}

      <div className={styles.ui}>
        <header className={styles.title} data-show={wide}>
          <h1>Amsterdam</h1>
          <p>drawn in code</p>
        </header>

        <Link href="/" className={styles.home}>
          afrodance.fun
        </Link>

        <div className={styles.caption} data-show={visible} aria-live="polite">
          <strong>{shown?.name}</strong>
          <span>{shown?.note}</span>
        </div>

        {/* nothing to control when the drawing could not start */}
        <div className={styles.controls} hidden={failed}>
          {!exploring && <span className={styles.hint}>drag to look around, scroll to zoom</span>}
          {exploring && (
            <button type="button" className={styles.pill} onClick={resume}>
              back to the tour
            </button>
          )}
          <button type="button" className={styles.button} onClick={toggle} aria-label={paused ? "Play" : "Pause"} title={paused ? "Play (space)" : "Pause (space)"}>
            {paused ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.5 5.5 18.5 12 8.5 18.5Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.5 5.5v13M15.5 5.5v13" />
              </svg>
            )}
          </button>
          <button type="button" className={styles.button} onClick={restart} aria-label="Draw it again" title="Draw it again (R)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5.5 12a6.5 6.5 0 1 0 2.2-4.9M5 4.5v3.4h3.4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
