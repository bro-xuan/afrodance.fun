"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { translate, type TranslationResult } from "./translator";

const examplePhrases = [
  "Let's circle back on this and align our stakeholders before EOD.",
  "We need to leverage our synergies to move the needle on this initiative.",
  "Per my last email, I wanted to follow up on the action items from our deep dive.",
  "Let's take this offline and ideate on some low-hanging fruit.",
  "We need more bandwidth to boil the ocean on this paradigm shift.",
  "Hope this email finds you well. Just wanted to touch base regarding our north star metrics and KPIs.",
];

function getProgressColor(score: number): string {
  if (score <= 20) return "is-success";
  if (score <= 50) return "is-warning";
  return "is-error";
}

export default function CorporateTranslatorPage() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inputText.trim()) {
      setResult(null);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setResult(translate(inputText));
      setIsTyping(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputText]);

  const handleCopy = async () => {
    if (!result || result.matches.length === 0) return;
    try {
      await navigator.clipboard.writeText(result.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text if clipboard API fails
    }
  };

  const hasInput = inputText.trim().length > 0;
  const noJargonFound = result && result.matches.length === 0 && hasInput;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <Link
        href="/"
        className="font-pixel text-xs mb-8 inline-block hover:underline"
      >
        &larr; back to afrodance.fun
      </Link>

      {/* Hero / Title */}
      <div className="nes-container with-title mb-8">
        <p className="title font-pixel">Corporate Translator</p>
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="text-5xl sm:text-6xl">💼 → 🗣️</div>
          <p className="font-body text-base sm:text-lg text-center max-w-2xl">
            Because &quot;let&apos;s circle back on the synergies&quot; means
            absolutely nothing. Paste your corporate email and get the real
            translation.
          </p>
        </div>
      </div>

      {/* Translator panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-stretch">
        {/* Left panel - Input */}
        <div className="nes-container with-title flex flex-col">
          <p className="title font-pixel text-[10px] sm:text-xs">
            Corporate BS 💼
          </p>
          <div className="flex flex-col flex-1 gap-2 p-2">
            <textarea
              className="nes-textarea font-body w-full flex-1"
              style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", lineHeight: "1.5", minHeight: "240px", resize: "none", overflowY: "auto" }}
              placeholder="Paste your corporate email here and watch the magic happen..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex justify-between items-center mt-auto">
              <span className="font-body text-xs text-gray-500">
                {inputText.length} characters
              </span>
              {hasInput && (
                <button
                  className="nes-btn is-error font-pixel text-[10px]"
                  onClick={() => setInputText("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Output */}
        <div className="nes-container with-title flex flex-col">
          <p className="title font-pixel text-[10px] sm:text-xs">
            Human Translation 🗣️
          </p>
          <div className="flex flex-col flex-1 gap-2 p-2">
            <div
              className="nes-textarea font-body w-full text-sm overflow-y-auto flex-1"
              style={{ minHeight: "240px" }}
            >
              {isTyping ? (
                <span className="text-gray-400 italic font-body">
                  Translating...
                </span>
              ) : noJargonFound ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <span className="text-4xl">🎉</span>
                  <p className="font-body text-center font-bold">
                    This is already human!
                  </p>
                  <p className="font-body text-sm text-gray-500 text-center">
                    No corporate BS detected. You&apos;re one of the good ones.
                  </p>
                </div>
              ) : result && result.matches.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {/* Original text with corporate phrases struck through */}
                  <div className="whitespace-pre-wrap text-gray-400 text-xs">
                    {result.segments.map((seg, i) =>
                      seg.type === "translation" ? (
                        <span
                          key={i}
                          className="bg-[#fadbd8] text-[#a93226] line-through decoration-2"
                        >
                          {seg.original}
                        </span>
                      ) : (
                        <span key={i}>{seg.content}</span>
                      )
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t-2 border-dashed border-gray-300" />

                  {/* Rewritten sentence with translations inlined */}
                  <div className="whitespace-pre-wrap">
                    {result.segments.map((seg, i) =>
                      seg.type === "translation" ? (
                        <span
                          key={i}
                          className="bg-[#e8f5d4] text-[#3a6510] font-bold rounded-sm px-0.5"
                          title={`Was: "${seg.original}"`}
                        >
                          {seg.content}
                        </span>
                      ) : (
                        <span key={i}>{seg.content}</span>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 italic font-body">
                  Translation will appear here... no more BS ✨
                </span>
              )}
            </div>
            <div className="flex justify-between items-center mt-auto">
              <span className="font-body text-xs text-gray-500">&nbsp;</span>
              {result && result.matches.length > 0 ? (
                <button
                  className="nes-btn is-primary font-pixel text-[10px]"
                  onClick={handleCopy}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              ) : <span />}
            </div>
          </div>
        </div>
      </div>

      {/* Jargon Score */}
      {result && hasInput && (
        <div className="nes-container with-title mb-8">
          <p className="title font-pixel text-[10px] sm:text-xs">
            BS Score
          </p>
          <div className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <progress
                className={`nes-progress flex-1 ${getProgressColor(result.jargonScore)}`}
                value={result.jargonScore}
                max={100}
              />
              <span className="font-pixel text-xs sm:text-sm whitespace-nowrap">
                {result.jargonScore}%
              </span>
            </div>
            <p className="font-body text-sm text-center">
              {result.jargonLevel}
            </p>
            {result.matches.length > 0 && (
              <p className="font-body text-xs text-gray-500 text-center mt-2">
                {result.matches.length} corporate phrase
                {result.matches.length === 1 ? "" : "s"} detected
              </p>
            )}
          </div>
        </div>
      )}

      {/* Example phrases */}
      <div className="nes-container with-title">
        <p className="title font-pixel text-[10px] sm:text-xs">
          Try these 🎯
        </p>
        <div className="flex flex-col gap-3 p-4">
          {examplePhrases.map((phrase, i) => (
            <button
              key={i}
              className="nes-btn font-body text-xs text-left"
              onClick={() => setInputText(phrase)}
            >
              &quot;{phrase}&quot;
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
