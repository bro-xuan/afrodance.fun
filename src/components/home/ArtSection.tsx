import Image from "next/image";
import { drawnInCode, museum } from "@/data/projects";
import type { ArtPiece } from "@/types";
import { linkProps } from "./links";
import SectionHead from "./SectionHead";
import s from "./home.module.css";

// A nail and the two runs of picture wire down to the frame, as stepped pixels (48×15).
const WIRE = Array.from({ length: 12 }, (_, r) => ({
  y: 3 + r,
  left: Math.round(21 - r * 1.6),
  right: Math.round(25 + r * 1.6),
}));

function Wire() {
  return (
    <svg className={s.wire} viewBox="0 0 48 15" shapeRendering="crispEdges" aria-hidden="true">
      <g fill="oklch(26% 0.012 75 / 0.55)">
        {WIRE.map(({ y, left, right }) => (
          <g key={y}>
            <rect x={left} y={y} width="2" height="1" />
            <rect x={right} y={y} width="2" height="1" />
          </g>
        ))}
      </g>
      <rect x="22" y="0" width="4" height="4" fill="oklch(26% 0.012 75)" />
      <rect x="22" y="0" width="2" height="1" fill="oklch(60% 0.01 75)" />
    </svg>
  );
}

function Framed({ piece, black, sizes }: { piece: ArtPiece; black?: boolean; sizes: string }) {
  const { src, alt, width, height } = piece.image;
  return (
    <div className={s.hang}>
      <Wire />
      <div className={`${s.frame}${black ? ` ${s.frameBlack}` : ""}`}>
        <div className={s.mat}>
          <Image src={src} alt={alt} width={width} height={height} sizes={sizes} unoptimized />
        </div>
      </div>
    </div>
  );
}

// The art hangs on a gallery wall: the three cities as a series, each with its museum label,
// and the camera museum on its own below them, with its wall text beside it.
export default function ArtSection() {
  return (
    <section id="art" aria-labelledby="art-title" className={`${s.wall} ${s.art}`}>
      <div className={s.column}>
        <SectionHead
          titleId="art-title"
          n="03"
          label="Art"
          title="Drawn in code, and a museum"
          sub="Three cities that draw themselves in your browser, line by line, and a museum of every analog camera ever made."
        />
      </div>

      <div className={s.wide}>
        <div className={`${s.seriesLabel} pixel-reveal`}>
          <h3 className={s.seriesName}>Drawn in code</h3>
          <p className={s.seriesNote}>A series, 2026. Nothing in them is an image: the page works out every line as it loads.</p>
        </div>
        <ul className={s.triptych}>
          {drawnInCode.map((piece) => (
            <li key={piece.url} className="pixel-reveal">
              <a href={piece.url} {...linkProps(piece.url)} className={s.piece}>
                <Framed piece={piece} sizes="(min-width: 62rem) 20rem, (min-width: 40rem) 45vw, 90vw" />
                <div className={s.label}>
                  <h4 className={s.labelTitle}>{piece.title}</h4>
                  <p className={s.labelCaption}>{piece.caption}</p>
                  <p className={s.labelDetails}>{piece.details}</p>
                  <span className={s.labelCta}>Watch it draw itself →</span>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className={`${s.museum} pixel-reveal`}>
          {/* Out of the tab order: the button in the wall text goes to the same place. */}
          <a href={museum.url} {...linkProps(museum.url)} tabIndex={-1} aria-hidden="true" className={s.piece}>
            <Framed piece={museum} black sizes="(min-width: 52rem) 36rem, 90vw" />
          </a>
          <div>
            <h3 className={s.museumTitle}>{museum.title}</h3>
            <p className={s.prose}>{museum.caption}</p>
            <p className={s.labelDetails}>{museum.details}</p>
            <div className={s.ctaRow}>
              <a href={museum.url} {...linkProps(museum.url)} className={s.button}>
                Visit the museum
                <span aria-hidden="true" className={s.buttonArrow}>
                  →
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
