"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

export function useKonamiCode(): boolean {
  const [activated, setActivated] = useState(false);
  const progressRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activated) return;

      if (e.code === KONAMI_SEQUENCE[progressRef.current]) {
        progressRef.current += 1;
        if (progressRef.current === KONAMI_SEQUENCE.length) {
          setActivated(true);
        }
      } else {
        // Check if the wrong key starts a new sequence
        progressRef.current = e.code === KONAMI_SEQUENCE[0] ? 1 : 0;
      }
    },
    [activated]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return activated;
}
