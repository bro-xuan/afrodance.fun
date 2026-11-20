import type { CSSProperties } from "react";
import PixelSprite from "@/components/PixelSprite";
import { moraFlowerLav, moraFlowerPeach, moraPet, moraTree, type SpriteDef } from "@/data/sprites";
import s from "./home.module.css";

type Plant = { def: SpriteDef; left: string; width: string };

// Each phone's garden, the one Mora grows as you both show up each day.
const GARDEN_A: Plant[] = [
  { def: moraFlowerPeach, left: "0.7rem", width: "0.9rem" },
  { def: moraFlowerLav, left: "2.1rem", width: "0.75rem" },
  { def: moraTree, left: "6.3rem", width: "2.1rem" },
];
const GARDEN_B: Plant[] = [
  { def: moraTree, left: "0.4rem", width: "1.8rem" },
  { def: moraFlowerLav, left: "6.4rem", width: "0.9rem" },
  { def: moraFlowerPeach, left: "7.7rem", width: "0.75rem" },
];

function Garden({ plants, pet }: { plants: Plant[]; pet: string }) {
  return (
    <div className={s.garden}>
      {plants.map((p, i) => (
        <span key={i} className={s.plant} style={{ left: p.left } as CSSProperties}>
          <PixelSprite def={p.def} width={p.width} />
        </span>
      ))}
      <span className={`${s.pet} ${pet}`}>
        <PixelSprite def={moraPet} width="2.1rem" frameDur="0.3s" />
      </span>
    </div>
  );
}

// Mora, drawn in the site's pixels: two phones, one for each of you, in Mora's own colours,
// six hours and an ocean apart. The pet walks off the edge of one screen and onto the other,
// the way it lives on both phones in the app. It's an illustration, not a screenshot, so it's
// hidden from screen readers; the text beside it says what Mora does.
export default function MoraPhones() {
  return (
    <div className={s.phones} aria-hidden="true">
      <div className={s.phone}>
        <div className={s.notch} />
        <div className={s.screen}>
          <span className={s.screenTime}>9:41</span>
          <div className={`${s.mcard} ${s.mLav}`}>
            <p className={s.mBig}>Day 1,000</p>
            <p className={s.mSmall}>together</p>
          </div>
          <div className={`${s.mcard} ${s.mPeach}`}>
            <p className={s.mLabel}>Today&apos;s question</p>
            <p className={s.mSmall}>🔒 Opens when you&apos;ve both answered</p>
          </div>
          <Garden plants={GARDEN_A} pet={s.petA} />
        </div>
      </div>

      <div className={s.phone}>
        <div className={s.notch} />
        <div className={s.screen}>
          <span className={s.screenTime}>15:41</span>
          <div className={`${s.mcard} ${s.mPeri}`}>
            <p className={s.mBig}>5,860 km</p>
            <p className={s.mSmall}>apart, six hours ahead</p>
          </div>
          <div className={`${s.mcard} ${s.mRose}`}>
            <p className={s.mLabel}>Game night</p>
            <p className={s.mSmall}>Your turn, on your own phone</p>
          </div>
          <Garden plants={GARDEN_B} pet={s.petB} />
        </div>
      </div>
    </div>
  );
}
