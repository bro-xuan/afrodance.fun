# TODOS

## Portfolio (home page)

- **Restore the Date Scoring project card**
  **Priority:** P2
  The card linked to `/date-scoring` but no such route exists (visitors got a 404), so it's commented out in `src/data/projects.ts`. Build the page or point the card at a live deployment, then un-comment it.

- **Re-audit subpages at large viewports after fluid root font-size**
  **Priority:** P2
  `html { font-size: clamp(16px, 1.15vw, 24px) }` is global. Dense subpages (china-migration, NLHousebuying) mix fixed `text-[10px]` labels with rem-based sizes — at 1920/2880px widths the hierarchy can invert. Do a visual pass and normalize to rem where it looks off.

- **Render stack tags on project cards**
  **Priority:** P3
  `projects.ts` has a `stack` field per project (Next.js, Vapi, etc.) that is never displayed. Small muted chips under the description would add credibility.

- **Hero "PRESS START" typed-text effect**
  **Priority:** P4
  Type the tagline character-by-character on load (respecting prefers-reduced-motion) to push the retro feel further.

## Writing

- **Add more Substack posts**
  **Priority:** P3
  The Writing section has 2 articles; it will feel fuller with 3-4.

## Completed
