"use client";

import { useEffect, useState } from "react";
import { useKonamiCode } from "@/hooks/useKonamiCode";

export default function KonamiEasterEgg() {
  const activated = useKonamiCode();
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!activated) return;

    document.body.classList.add("konami-shake");

    const shakeTimer = setTimeout(() => {
      document.body.classList.remove("konami-shake");
      setShowOverlay(true);
    }, 600);

    return () => clearTimeout(shakeTimer);
  }, [activated]);

  if (!showOverlay) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70"
      style={{ zIndex: 9998 }}
      onClick={() => setShowOverlay(false)}
    >
      <div className="konami-fade-in text-center">
        <div className="text-6xl mb-4">🏆</div>
        <div className="nes-container">
          <p className="font-pixel text-[#4a7c10] text-lg sm:text-2xl">
            +30 LIVES
          </p>
          <p className="font-body text-xs text-muted-foreground mt-2">
            You found the secret!
          </p>
        </div>
      </div>
    </div>
  );
}
