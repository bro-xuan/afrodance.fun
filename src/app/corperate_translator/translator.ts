import { corporateDictionary, type CorporatePhrase } from "./corporate-dictionary";

export type TranslationSegment =
  | { type: "text"; content: string }
  | { type: "translation"; content: string; original: string };

export interface TranslationResult {
  translatedText: string;
  matches: Array<{
    start: number;
    end: number;
    originalText: string;
    translation: string;
    entry: CorporatePhrase;
  }>;
  jargonScore: number;
  jargonLevel: string;
  segments: TranslationSegment[];
}

// ── Helpers ───────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getJargonLevel(score: number): string {
  if (score === 0) return "Congrats, you speak like a real person! 🎉";
  if (score <= 20) return "Light corporate seasoning 🧂";
  if (score <= 40) return "Getting corporate-y... too many meetings 📊";
  if (score <= 60) return "Peak middle management energy 📅";
  if (score <= 80) return "LinkedIn influencer detected 💼";
  return "You ARE the corporate machine. Touch grass immediately 🌱";
}

// ── Pre-compiled patterns (runs once on import) ──────────

interface CompiledEntry {
  entry: CorporatePhrase;
  regex: RegExp;
  maxLen: number;
}

function buildCompiledEntries(): CompiledEntry[] {
  return corporateDictionary
    .map((entry) => {
      const allPhrases = [entry.phrase, ...(entry.variations ?? [])];
      // Sort by length descending so longest variation matches first within the alternation
      allPhrases.sort((a, b) => b.length - a.length);
      const pattern = allPhrases.map(escapeRegex).join("|");
      const regex = new RegExp(`\\b(${pattern})\\b`, "gi");
      const maxLen = allPhrases[0].length;
      return { entry, regex, maxLen };
    })
    // Sort all entries by longest matchable phrase first
    .sort((a, b) => b.maxLen - a.maxLen);
}

const compiledEntries = buildCompiledEntries();

// ── Main translate function ──────────────────────────────

export function translate(input: string): TranslationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      translatedText: "",
      matches: [],
      jargonScore: 0,
      jargonLevel: getJargonLevel(0),
      segments: [],
    };
  }

  // Track occupied character ranges to prevent overlap
  const occupied: Array<[number, number]> = [];

  const matches: TranslationResult["matches"] = [];

  for (const { entry, regex } of compiledEntries) {
    // Reset regex state for each scan
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Check for overlap with existing matches
      const overlaps = occupied.some(
        ([oStart, oEnd]) => start < oEnd && end > oStart
      );

      if (!overlaps) {
        // Deterministic translation pick based on position + text
        const hash = simpleHash(match[0].toLowerCase() + String(start));
        const translation =
          entry.translations[hash % entry.translations.length];

        matches.push({
          start,
          end,
          originalText: match[0],
          translation,
          entry,
        });

        occupied.push([start, end]);
      }
    }
  }

  // Sort matches by position for segment building
  matches.sort((a, b) => a.start - b.start);

  // Build segments and translated text
  const segments: TranslationSegment[] = [];
  let translatedText = "";
  let cursor = 0;

  for (const m of matches) {
    // Add unmatched text before this match
    if (cursor < m.start) {
      const text = input.slice(cursor, m.start);
      segments.push({ type: "text", content: text });
      translatedText += text;
    }

    // Add the translation
    segments.push({
      type: "translation",
      content: m.translation,
      original: m.originalText,
    });
    translatedText += m.translation;

    cursor = m.end;
  }

  // Add remaining text after last match
  if (cursor < input.length) {
    const text = input.slice(cursor);
    segments.push({ type: "text", content: text });
    translatedText += text;
  }

  // Calculate jargon score
  const totalMatchedChars = matches.reduce(
    (sum, m) => sum + (m.end - m.start),
    0
  );
  const jargonScore =
    trimmed.length > 0
      ? Math.min(100, Math.round((totalMatchedChars / trimmed.length) * 250))
      : 0;

  return {
    translatedText,
    matches,
    jargonScore,
    jargonLevel: getJargonLevel(jargonScore),
    segments,
  };
}
