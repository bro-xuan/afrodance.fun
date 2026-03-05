"use client";

import { useState } from "react";
import { seedGuestbookMessages } from "@/data/projects";
import type { GuestbookMessage } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/8bit/card";

export default function Guestbook() {
  const [messages, setMessages] = useState<GuestbookMessage[]>(seedGuestbookMessages);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    const newMessage: GuestbookMessage = {
      id: Date.now(),
      name: name.trim(),
      message: message.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    setMessages((prev) => [newMessage, ...prev]);
    setName("");
    setMessage("");
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
              />
            </div>
            <button type="submit" className="nes-btn is-primary">
              Send
            </button>
          </form>

          <div className="space-y-4">
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
