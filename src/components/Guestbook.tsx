"use client";

import { useEffect, useState } from "react";
import { seedGuestbookMessages } from "@/data/projects";
import type { GuestbookMessage } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/8bit/card";

type Status = "idle" | "submitting" | "success" | "error" | "rate_limited";

export default function Guestbook() {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/guestbook")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const remote: GuestbookMessage[] = data.messages ?? [];
        // Show real submissions on top, seed messages as the trailing "starter" entries.
        setMessages([...remote, ...seedGuestbookMessages]);
      })
      .catch(() => {
        if (!cancelled) setMessages(seedGuestbookMessages);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || status === "submitting") return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          message: message.trim(),
          website,
        }),
      });

      if (res.status === 429) {
        setStatus("rate_limited");
        setErrorMsg("Slow down — one message per minute.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Something went wrong. Try again?");
        return;
      }

      const data = await res.json();
      if (data.entry) {
        setMessages((prev) => [data.entry, ...prev]);
      }
      setName("");
      setMessage("");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Try again?");
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <h2 className="font-pixel text-[#4a7c10] text-lg sm:text-xl text-center mb-8">
        Guestbook
      </h2>
      <Card font="normal">
        <CardHeader font="normal">
          <CardTitle font="normal" className="font-pixel text-sm text-[#4a7c10]">
            Sign the Guestbook
          </CardTitle>
          <CardDescription font="normal" className="font-body text-[#b38600]">
            Leave a message!
          </CardDescription>
        </CardHeader>
        <CardContent font="normal">
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <input
                type="text"
                className="nes-input w-full font-body text-sm"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                disabled={status === "submitting"}
              />
            </div>
            <div>
              <textarea
                className="nes-textarea w-full font-body text-sm"
                placeholder="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={3}
                disabled={status === "submitting"}
              />
            </div>
            {/* Honeypot — hidden from users, bots fill it in */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
              <label>
                Website (leave empty)
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="nes-btn is-primary"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Sending..." : "Send"}
              </button>
              {status === "success" && (
                <span className="font-body text-xs text-[#3a6510]">Sent! Thanks 🎮</span>
              )}
              {(status === "error" || status === "rate_limited") && errorMsg && (
                <span className="font-body text-xs text-[#a93226]">{errorMsg}</span>
              )}
            </div>
          </form>

          <div className="max-h-80 overflow-y-auto pr-2 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="border-t border-muted pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-pixel text-xs text-[#1a7abb]">{msg.name}</span>
                  <span className="font-body text-xs text-muted-foreground">{msg.date}</span>
                </div>
                <p className="font-body text-sm text-muted-foreground">{msg.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
