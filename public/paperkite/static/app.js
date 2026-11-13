// The little bit of browser code: approving and changing posts, scheduling, uploads, video
// play, carousel dots, copy buttons and confirmations. Pages read fine without it; acting on a
// post needs it.

(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const toast = (text) => {
    const t = $(".toast");
    if (!t) return;
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    t.append(document.createTextNode(text));
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
  };

  const post = async (url, body) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong" }));
    if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
    return data;
  };

  /** An element with a class and a text; what a page builds from an answer goes through here, never through markup. */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // ---------- review queue ----------
  const app = $(".app.portal");
  const ws = app?.dataset.ws;
  const tz = app?.dataset.tz;

  /** "Wed 18 Nov, 16:00" on the business's own clock. */
  const at = (iso) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch {
      return "";
    }
  };
  /**
   * A post that says something the business hasn't confirmed (a price, an offer, opening hours)
   * comes back with those things. The owner says whether they are right; "yes" sends the same
   * request again with them, and they go onto the list of confirmed facts.
   */
  const confirmed = async (send) => {
    let r = await send([]);
    if (r.state === "confirm" || r.status === "confirm") {
      const things = r.confirm.map((c) => `“${c}”`).join(", ");
      if (!confirm(`This post says ${things}. ${r.confirm.length > 1 ? "Those aren't" : "That isn't"} in your confirmed facts yet.\n\nIs it right? OK schedules the post and adds it to your facts.`)) return null;
      r = await send(r.confirm);
    }
    return r;
  };

  /** What to tell the owner after a post was approved, scheduled, parked or deleted. */
  const outcome = (r) => {
    if (r.state === "scheduled") return `Scheduled for ${at(r.at)}`;
    if (r.state === "paused") return "Saved as a draft";
    if (r.state === "suggested") return "Added as a suggestion. It waits for the owner's OK";
    if (r.state === "revised") return "Saved. It's back with the owner for their OK";
    if (r.state === "deleted") return "Deleted";
    if (r.state === "waiting") return r.reason ? `Approved. Not scheduled yet: ${r.reason}` : "Approved";
    return "Saved";
  };
  const progress = $("[data-progress]");
  const total = Number(progress?.dataset.total || 0);

  const setPending = (n) => {
    $$("[data-pending]").forEach((b) => {
      if (n > 0) b.textContent = String(n);
      else b.remove();
    });
    if (progress) {
      const done = Math.max(0, total - n);
      $(".bar i", progress).style.width = `${total ? Math.round((done / total) * 100) : 100}%`;
      $("[data-progress-text]", progress).textContent = `${done} of ${total} done`;
    }
    if (n === 0) {
      $("[data-done]")?.removeAttribute("hidden");
      $("[data-approve-all]")?.remove();
    }
  };

  const leave = (card) =>
    new Promise((resolve) => {
      card.classList.add("leaving");
      setTimeout(() => {
        card.remove();
        resolve();
      }, 320);
    });

  $$("[data-review]").forEach((card) => {
    const id = card.dataset.review;
    const box = $("[data-change]", card);
    const area = $("textarea", box);

    $("[data-approve]", card)?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        // A post that states something unconfirmed is held back and names it; the owner confirms, or not.
        let r = await post(`/api/portal/${ws}/review`, { id, decision: "approved" });
        const held = r.held?.[0];
        if (held) {
          const things = held.confirm.map((c) => `“${c}”`).join(", ");
          if (!confirm(`This post says ${things}. ${held.confirm.length > 1 ? "Those aren't" : "That isn't"} in your confirmed facts yet.\n\nIs it right? OK schedules the post and adds it to your facts.`)) {
            btn.disabled = false;
            return;
          }
          r = await post(`/api/portal/${ws}/review`, { id, decision: "approved", confirmed: held.confirm });
        }
        await leave(card);
        setPending(r.pending);
        toast(r.sent?.[0] ? outcome(r.sent[0]) : "Approved");
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    });

    $("[data-ask]", card)?.addEventListener("click", () => {
      card.classList.add("asking");
      area?.focus();
    });
    $("[data-cancel]", card)?.addEventListener("click", () => card.classList.remove("asking"));
    $$("[data-chip]", card).forEach((chip) =>
      chip.addEventListener("click", () => {
        chip.classList.toggle("on");
        const picked = $$("[data-chip].on", card).map((c) => c.dataset.chip);
        const typed = area.value.replace(/^\[[^\]]*\]\s*/, "");
        area.value = picked.length ? `[${picked.join(", ")}] ${typed}` : typed;
        area.focus();
      }),
    );
    box?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const note = area.value.trim();
      if (!note) return area.focus();
      const btn = $("button[type=submit]", box);
      btn.disabled = true;
      try {
        const r = await post(`/api/portal/${ws}/review`, { id, decision: "changes", note });
        await leave(card);
        setPending(r.pending);
        toast("Sent to the studio.");
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    });
  });

  $("[data-approve-all]")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const cards = $$("[data-review]:not(.asking)");
    if (!cards.length) return;
    btn.disabled = true;
    try {
      const r = await post(`/api/portal/${ws}/review`, { ids: cards.map((c) => c.dataset.review), decision: "approved" });
      // Posts that say something unconfirmed stay on the page: each is approved on its own, where it asks.
      const kept = new Set((r.held || []).map((h) => h.id));
      const done = cards.filter((c) => !kept.has(c.dataset.review));
      await Promise.all(done.map(leave));
      setPending(r.pending);
      const scheduled = (r.sent || []).filter((x) => x.state === "scheduled").length;
      const waits = (r.sent || []).find((x) => x.state === "waiting");
      const rest = kept.size ? ` ${kept.size} need${kept.size > 1 ? "" : "s"} a look first: approve ${kept.size > 1 ? "them" : "it"} one by one.` : "";
      toast((waits ? `Approved ${done.length} posts. ${scheduled} scheduled; the rest: ${waits.reason}.` : `Approved and scheduled ${done.length} posts.`) + rest);
      btn.disabled = false;
    } catch (err) {
      btn.disabled = false;
      toast(err.message);
    }
  });

  // ---------- video ----------
  $$("[data-play]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const frame = btn.closest(".frame");
      const video = $("video", frame);
      if (!video) return;
      if (video.paused) {
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          video.play();
        });
        frame.classList.add("playing");
      } else {
        video.pause();
        frame.classList.remove("playing");
      }
    }),
  );
  $$(".frame video").forEach((video) =>
    video.addEventListener("click", () => {
      video.pause();
      video.closest(".frame")?.classList.remove("playing");
    }),
  );

  // ---------- carousels ----------
  $$("[data-slides]").forEach((track) => {
    const frame = track.closest(".frame");
    const dots = $$(".dots i", frame);
    const count = $("[data-count]", frame);
    track.addEventListener(
      "scroll",
      () => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach((d, k) => d.classList.toggle("on", k === i));
        if (count) count.textContent = `${i + 1}/${dots.length}`;
      },
      { passive: true },
    );
    // A slideshow that plays by itself until someone touches it; tapping moves on one slide.
    const every = Number(track.dataset.autoplay || 0);
    if (!every) return;
    const next = () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      const to = i + 1 >= dots.length ? 0 : i + 1;
      track.scrollTo({ left: to * track.clientWidth, behavior: to ? "smooth" : "auto" });
    };
    let timer = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : setInterval(next, every);
    const stop = () => {
      clearInterval(timer);
      timer = 0;
    };
    track.addEventListener("pointerdown", stop, { passive: true });
    track.addEventListener("click", () => {
      stop();
      next();
    });
  });

  // ---------- inside the studio: the beats of a video light up as it plays; tapping one jumps there ----------
  $$("[data-beat-video]").forEach((video) => {
    const beats = $$("[data-beats] li[data-from]", video.closest("section"));
    if (!beats.length) return;
    video.addEventListener("timeupdate", () => {
      const t = video.currentTime;
      beats.forEach((b) => b.classList.toggle("on", t >= Number(b.dataset.from) && t < Number(b.dataset.to)));
    });
    const go = (b) => {
      video.currentTime = Number(b.dataset.from) + 0.05;
      video.play().catch(() => {});
    };
    beats.forEach((b) => {
      b.addEventListener("click", () => go(b));
      b.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go(b);
        }
      });
    });
  });

  // ---------- uploads ----------
  const drop = $("[data-upload]");
  if (drop) {
    const input = $("input[type=file]", drop);
    // A phone photo is several megabytes: it is redrawn at most 2560 px on its long side, upright
    // and as a JPEG, before it is sent. A browser that can't do that sends the photo as it is
    // and the server converts it.
    const shrink = async (file) => {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.type === "image/jpeg" && file.size < 2_500_000) return file;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((done) => canvas.toBlob(done, "image/jpeg", 0.9));
        return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
      } catch {
        return file;
      }
    };
    const send = async (files) => {
      if (!files.length) return;
      const body = new FormData();
      drop.classList.add("over");
      for (const f of files) body.append("photos", await shrink(f));
      try {
        const res = await fetch(drop.action, { method: "POST", body, headers: { accept: "application/json" } });
        const data = await res.json().catch(() => ({ ok: false, error: "Upload failed" }));
        if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");
        // The photo that completes the setup starts the first plan: Home shows it arriving.
        toast(data.planning ? "Got them. Your first posts are being planned" : `Sent ${data.files.length} photo${data.files.length > 1 ? "s" : ""}. Thank you!`);
        setTimeout(() => (data.planning ? (location.href = `/portal/${ws}`) : location.reload()), 1000);
      } catch (err) {
        toast(err.message);
      } finally {
        drop.classList.remove("over");
      }
    };
    drop.addEventListener("click", (e) => {
      if (e.target !== input) input.click();
    });
    input.addEventListener("change", () => send(input.files));
    ["dragenter", "dragover"].forEach((t) =>
      drop.addEventListener(t, (e) => {
        e.preventDefault();
        drop.classList.add("over");
      }),
    );
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("over")));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      send(e.dataTransfer.files);
    });
  }

  // ---------- when: the suggested time follows the day and the channels ----------
  const whenOf = (form, id) => {
    const box = $("[data-when]", form);
    if (!box || !ws) return;
    const date = $("input[name=date]", box);
    const time = $("input[name=time]", box);
    const use = $("[data-suggest-use]", box);
    const label = $("[data-suggest-label]", box);
    const reason = $("[data-suggest-reason]", box);
    let suggested = box.dataset.suggestTime;
    let touched = time.value !== suggested; // a post that already has its own time keeps it
    const show = () => (use.hidden = time.value === suggested);
    const refresh = async () => {
      const channels = $$("input[name=channels]:checked", form).map((c) => c.value);
      try {
        const res = await fetch(`/api/portal/${ws}/suggest?date=${date.value}&channels=${channels.join(",")}${id ? `&id=${id}` : ""}`, { headers: { accept: "application/json" } });
        const r = await res.json();
        if (!r.ok) return;
        suggested = r.time;
        label.textContent = r.day === date.value ? r.time : `${r.time} on ${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${r.day}T12:00:00Z`))}`;
        reason.textContent = r.reason;
        use.dataset.day = r.day;
        if (!touched) {
          time.value = r.time;
          date.value = r.day;
        }
        show();
      } catch {
        // the suggestion is a nicety: the fields still work
      }
    };
    time.addEventListener("input", () => {
      touched = true;
      show();
    });
    use.addEventListener("click", () => {
      time.value = suggested;
      if (use.dataset.day) date.value = use.dataset.day;
      touched = false;
      show();
    });
    date.addEventListener("change", refresh);
    $$("input[name=channels]", form).forEach((c) => c.addEventListener("change", refresh));
    show();
  };

  // ---------- create: drafts from the AI ----------
  const gen = $("[data-generate]");
  if (gen && ws) {
    whenOf(gen);
    const step = $("[data-gen-step]", gen);
    const note = $("[data-gen-note]");
    const out = $("[data-drafts]");
    const btn = $("[data-generate-btn]", gen);
    const prompt = $("textarea[name=prompt]", gen);
    const publishes = gen.dataset.publishes === "yes";
    const suggests = gen.dataset.publishes === "suggest"; // the studio in a client's portal
    $$("[data-idea]", gen).forEach((chip) =>
      chip.addEventListener("click", () => {
        prompt.value = chip.dataset.idea;
        prompt.focus();
      }),
    );
    const steps = ["Reading your brand kit", "Looking at this week's research", "Looking at your photos", "Writing in your voice", "Checking your facts"];
    gen.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(gen);
      const channels = form.getAll("channels");
      if (!prompt.value.trim()) return prompt.focus();
      if (!channels.length) return toast("Pick at least one channel");
      btn.disabled = true;
      out.replaceChildren();
      note.hidden = true;
      let k = 0;
      step.textContent = `${steps[0]}…`;
      const timer = setInterval(() => (step.textContent = `${steps[++k % steps.length]}…`), 900);
      try {
        const r = await post(`/api/portal/${ws}/generate`, { prompt: prompt.value, channels, photo: form.get("photo") || "" });
        step.textContent = r.engine === "claude" ? "Three drafts, written by Claude" : "Starting points from your best posts";
        if (r.note) {
          note.textContent = r.note;
          note.hidden = false;
        }
        r.drafts.forEach((d, i) => out.append(draftCard(d, i, channels)));
        out.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        step.textContent = "";
        toast(err.message);
      } finally {
        clearInterval(timer);
        btn.disabled = false;
      }
    });
    const draftCard = (d, i, channels) => {
      const card = el("article", "card draft");
      if (d.photoUrl) {
        const img = el("img");
        img.src = d.photoUrl;
        img.alt = "";
        card.append(img);
      }
      const body = el("div", "draft-body");
      body.append(el("span", "eyebrow", `Draft ${i + 1}`));
      const title = el("input", "input draft-title");
      title.value = d.title;
      title.maxLength = 80;
      title.setAttribute("aria-label", "Post name");
      const text = el("textarea", "textarea");
      text.value = d.caption;
      text.maxLength = 2200;
      text.rows = 5;
      text.setAttribute("aria-label", "Post text");
      body.append(title, text);
      if (d.why) body.append(el("p", "draft-why", d.why));
      const checks = el("div", "draft-checks");
      d.checks.forEach((c) => checks.append(el("span", c.ok ? "ok" : "warn", c.ok ? `✓ ${c.label}` : `! ${c.label}`)));
      body.append(checks);
      const buttons = [];
      const make = async (publish, button) => {
        if (!d.photo) return toast("Pick a photo first");
        const date = $("input[name=date]", gen).value;
        const time = $("input[name=time]", gen).value;
        buttons.forEach((b) => (b.disabled = true));
        try {
          const r = await confirmed((ok) => post(`/api/portal/${ws}/create`, { title: title.value, caption: text.value, why: d.why, channels, photos: [d.photo], date, time, publish, confirmed: ok }));
          if (!r) return buttons.forEach((b) => (b.disabled = false));
          toast(publishes || suggests ? outcome(r) : "Added to your calendar");
          // A post that went onto the schedule shows on the calendar; one that still needs something opens itself.
          setTimeout(() => (location.href = suggests ? `/portal/${ws}/approve` : r.state === "scheduled" || !publishes ? `/portal/${ws}/calendar#d-${date}` : `/portal/${ws}/post/${r.id}`), 900);
        } catch (err) {
          buttons.forEach((b) => (b.disabled = false));
          toast(err.message);
        }
      };
      const go = el("button", "btn btn-ink btn-block", publishes ? "Schedule" : suggests ? "Add as a suggestion" : "Add to calendar");
      go.type = "button";
      go.addEventListener("click", () => make(true, go));
      buttons.push(go);
      body.append(go);
      if (publishes) {
        const keep = el("button", "btn btn-ghost btn-block btn-sm", "Save as draft");
        keep.type = "button";
        keep.addEventListener("click", () => make(false, keep));
        buttons.push(keep);
        body.append(keep);
      }
      card.append(body);
      return card;
    };
  }

  // ---------- one post: change it, move it, pause it, try it again, delete it ----------
  $$("[data-post]").forEach((box) => {
    const id = box.dataset.post;
    const form = box.tagName === "FORM" ? box : null;
    if (form) whenOf(form, id);
    const noteLine = $("[data-post-note]", box);
    const run = async (action, button) => {
      if (button.dataset.ask && !confirm(button.dataset.ask)) return;
      const body = { action };
      if (form && (action === "schedule" || action === "save")) {
        const data = new FormData(form);
        Object.assign(body, { title: data.get("title"), caption: data.get("caption"), date: data.get("date"), time: data.get("time") });
        if ($("input[name=channels]", form)) body.channels = data.getAll("channels");
        if ($("input[name=photos]", form)) body.photos = data.getAll("photos");
        if (body.channels && !body.channels.length) return toast("Pick at least one channel");
        if (body.photos && !body.photos.length) return toast("Pick at least one photo");
      }
      const buttons = $$("[data-act]", box);
      buttons.forEach((b) => (b.disabled = true));
      if (noteLine) noteLine.textContent = action === "schedule" || action === "retry" ? "Scheduling…" : "";
      try {
        const r = await confirmed((ok) => post(`/api/portal/${ws}/post/${id}`, { ...body, confirmed: ok }));
        if (!r) {
          buttons.forEach((b) => (b.disabled = false));
          if (noteLine) noteLine.textContent = "";
          return;
        }
        toast(outcome(r));
        setTimeout(() => (r.state === "deleted" ? (location.href = `/portal/${ws}/calendar`) : location.reload()), 900);
      } catch (err) {
        buttons.forEach((b) => (b.disabled = false));
        if (noteLine) noteLine.textContent = "";
        toast(err.message);
      }
    };
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const main = $("button[type=submit]", form);
      run(main.dataset.act, main);
    });
    $$("[data-act]", box).forEach((b) => {
      if (b.type !== "submit") b.addEventListener("click", () => run(b.dataset.act, b));
    });
  });

  // ---------- brand kit: how the business sounds, and its facts ----------
  const brand = $("form[data-brand]");
  brand?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(brand);
    const btn = $("button[type=submit]", brand);
    btn.disabled = true;
    try {
      const r = await post(`/api/portal/${ws}/brand`, { oneLiner: data.get("oneLiner"), mood: data.get("mood"), voice: data.get("voice"), accent: data.get("accent"), background: data.get("background") });
      toast(r.planning ? "Saved. Your first posts are being planned" : "Saved");
      setTimeout(() => (r.planning ? (location.href = `/portal/${ws}`) : location.reload()), 800);
    } catch (err) {
      btn.disabled = false;
      toast(err.message);
    }
  });
  const fact = async (action, text) => {
    try {
      await post(`/api/portal/${ws}/facts`, { action, text });
      location.reload();
    } catch (err) {
      toast(err.message);
    }
  };
  $$("[data-fact]").forEach((b) => b.addEventListener("click", () => fact(b.dataset.fact, b.dataset.text)));
  $$("form[data-fact-add]").forEach((f) =>
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      fact(f.dataset.factAdd, $("input[name=text]", f).value);
    }),
  );

  // ---------- kick-off: the questions one at a time, then what was understood, to confirm ----------
  const kick = $("form[data-kickoff]");
  if (kick && ws) {
    const steps = $$(".kick-step", kick);
    const bar = $(".kick-progress i", kick);
    const review = $("[data-kick-review]");
    let at = 0;
    const show = (k) => {
      at = Math.max(0, Math.min(steps.length - 1, k));
      steps.forEach((s, i) => s.classList.toggle("on", i === at));
      bar.style.width = `${Math.round(((at + 1) / steps.length) * 100)}%`;
    };
    kick.classList.add("js");
    show(0);
    $$("[data-kick-next]", kick).forEach((b) => b.addEventListener("click", () => show(at + 1)));
    $$("[data-kick-back]", kick).forEach((b) => b.addEventListener("click", () => show(at - 1)));
    const answers = () => {
      const d = new FormData(kick);
      return { offer: d.get("offer"), customers: d.get("customers"), voice: d.get("voice"), tones: d.getAll("tones"), facts: d.get("facts"), offers: d.get("offers"), never: d.get("never"), goals: d.getAll("goals") };
    };

    /** One fact to tick: a box and its words, which the owner can still change. */
    const factRow = (text, ticked, placeholder) => {
      const row = el("label", "fact-row");
      const box = el("input");
      box.type = "checkbox";
      box.checked = ticked;
      const words = el("input", "input");
      words.type = "text";
      words.maxLength = 200;
      words.value = text;
      if (placeholder) words.placeholder = placeholder;
      // Typing an answer to something that was missing is saying it: the box follows.
      if (placeholder) words.addEventListener("input", () => (box.checked = words.value.trim().length > 2));
      row.append(box, words);
      return { row, box, words };
    };

    const buildReview = (p, goals) => {
      review.replaceChildren();
      review.append(el("span", "eyebrow", "What we understood"), el("h2", "", "Is this you?"), el("p", "muted", p.by === "claude" ? "Change whatever isn't right. Nothing is used until you confirm it." : "These are your own lines. Change whatever isn't right."));
      const field = (label, hint, input) => {
        const f = el("div", "field");
        const l = el("label", "", label);
        if (hint) l.append(" ", el("span", "hint", hint));
        f.append(l, input);
        return f;
      };
      const one = el("input", "input");
      one.maxLength = 160;
      one.value = p.oneLiner;
      const voice = el("textarea", "textarea");
      voice.rows = Math.max(3, p.voice.length);
      voice.value = p.voice.join("\n");
      const mood = el("input", "input");
      mood.maxLength = 240;
      mood.value = p.mood;
      review.append(field("What you are, in one line", "", one), field("How you talk", "one line each", voice), field("The look and mood of your place", "optional", mood));

      review.append(el("h3", "", "Facts a post may state"), el("p", "small muted", "Tick each one that is exactly right, and fix the words where it isn't. A post only ever states what you tick."));
      const list = el("div", "fact-rows");
      const rows = p.facts.map((f) => factRow(f, false));
      rows.forEach((r) => list.append(r.row));
      if (!rows.length) list.append(el("p", "small muted", "You didn't mention any facts, so posts won't state any yet. You can add them below or later in your brand kit."));
      review.append(list);
      if (p.missing.length) {
        review.append(el("p", "small muted", "Posts usually need these too. Answer the ones you'd like us to use:"));
        const more = el("div", "fact-rows");
        p.missing.forEach((q) => {
          const r = factRow("", false, q);
          rows.push(r);
          more.append(r.row);
        });
        review.append(more);
      }
      const add = el("button", "btn btn-sm btn-ghost", "+ Add a fact");
      add.type = "button";
      add.addEventListener("click", () => {
        const r = factRow("", false, "Another fact, as a short sentence");
        rows.push(r);
        list.append(r.row);
        r.words.focus();
      });
      review.append(add);

      const never = el("textarea", "textarea");
      never.rows = Math.max(2, p.never.length);
      never.value = p.never.join("\n");
      review.append(field("Never say or show", "one line each", never));

      const actions = el("div", "kick-nav");
      const back = el("button", "btn btn-ghost", "Back to my answers");
      back.type = "button";
      back.addEventListener("click", () => {
        review.hidden = true;
        kick.hidden = false;
      });
      const done = el("button", "btn btn-primary", "Confirm and finish");
      done.type = "button";
      done.addEventListener("click", async () => {
        const facts = rows.filter((r) => r.box.checked && r.words.value.trim()).map((r) => r.words.value.trim());
        const open = rows.filter((r) => !r.box.checked && r.words.value.trim()).length;
        if (open && !confirm(`${open} fact${open > 1 ? "s aren't" : " isn't"} ticked, so posts won't state ${open > 1 ? "them" : "it"}. Finish anyway?`)) return;
        done.disabled = true;
        try {
          const r = await post(`/api/portal/${ws}/kickoff/confirm`, { oneLiner: one.value, voice: voice.value, mood: mood.value, facts, never: never.value.split("\n"), goals });
          toast(r.planning ? "Thank you. Your first posts are being planned" : "Thank you. Your studio knows you now");
          setTimeout(() => (location.href = `/portal/${ws}`), 1100);
        } catch (err) {
          done.disabled = false;
          toast(err.message);
        }
      });
      actions.append(back, done);
      review.append(actions);
    };

    kick.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button[type=submit]", kick);
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Reading your answers…";
      try {
        const a = answers();
        const r = await post(`/api/portal/${ws}/kickoff`, a);
        buildReview(r.proposal, a.goals);
        kick.hidden = true;
        review.hidden = false;
        review.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        toast(err.message);
        // The two questions that can't be left empty: go back to the one that is.
        if (/what you sell/i.test(err.message)) show(0);
        else if (/how you talk/i.test(err.message)) show(2);
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  // ---------- home: a first plan that is being made shows up by itself ----------
  if ($("[data-planning]")) setTimeout(() => location.reload(), 7000);

  // ---------- weekly suggestions: on or off, and "plan next week now" ----------
  const weekly = $("[data-weekly]");
  if (weekly && ws) {
    const posts = $("[data-weekly-posts]", weekly);
    const save = async (enabled) => {
      try {
        await post(`/api/portal/${ws}/autopilot`, { enabled, posts: Number(posts.value) });
        location.reload();
      } catch (err) {
        toast(err.message);
      }
    };
    $("[data-weekly-toggle]", weekly)?.addEventListener("click", () => save(weekly.dataset.enabled !== "yes"));
    posts?.addEventListener("change", () => save(weekly.dataset.enabled === "yes"));
    const plan = $("[data-weekly-plan]", weekly);
    plan?.addEventListener("click", async () => {
      plan.disabled = true;
      plan.textContent = "Planning next week… about a minute";
      try {
        const r = await post(`/api/portal/${ws}/suggestions`, {});
        toast(r.made ? `${r.made} new post${r.made > 1 ? "s are" : " is"} waiting for your OK` : `Nothing was planned: ${r.skipped || "try again later"}`);
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        plan.disabled = false;
        plan.textContent = "Plan next week now";
        toast(err.message);
      }
    });
  }

  // ---------- channels: check what is connected ----------
  $$("form[data-connect]").forEach((form) =>
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button", form);
      btn.disabled = true;
      try {
        const r = await post(form.action, {});
        toast(r.connected.length ? `Connected: ${r.connected.join(", ")}${r.sent ? `. ${r.sent} waiting post${r.sent > 1 ? "s are" : " is"} now scheduled` : ""}` : "No account is connected yet");
        setTimeout(() => location.reload(), 1100);
      } catch (err) {
        btn.disabled = false;
        toast(err.message);
      }
    }),
  );

  // ---------- landing: the composer fills Wednesday ----------
  const loop = $("[data-demo-loop]");
  if (loop) {
    const typed = $("[data-type]", loop);
    const step = $("[data-step]", loop);
    const text = typed.dataset.type;
    const steps = ["Reading your brand kit", "Looking at this week's research", "Picking from your photos", "Writing in your voice", "Checking your facts"];
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const say = (s, spin) => {
      step.replaceChildren();
      if (spin) step.append(document.createElement("i"));
      step.append(document.createTextNode(s));
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      typed.textContent = text;
      say("3 drafts ready");
      loop.classList.add("result", "added");
    } else {
      (async () => {
        for (;;) {
          loop.classList.remove("result", "added");
          typed.textContent = "";
          say("");
          await sleep(900);
          for (const c of text) {
            typed.textContent += c;
            await sleep(34);
          }
          for (const s of steps) {
            say(`${s}…`, true);
            await sleep(560);
          }
          say("3 drafts ready · showing the best one");
          loop.classList.add("result");
          await sleep(2000);
          loop.classList.add("added");
          say("Added to Wednesday, 16:00");
          await sleep(4200);
        }
      })();
    }
  }

  // ---------- sign-up: the visitor's time zone, so their studio starts on their own clock ----------
  $$("input[data-timezone]").forEach((field) => {
    try {
      if (!field.value) field.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      // the studio then starts on the default zone
    }
  });

  // ---------- studio helpers ----------
  $$("[data-copy]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1400);
      } catch {
        toast("Couldn't copy");
      }
    }),
  );
  $$("form[data-confirm]").forEach((form) =>
    form.addEventListener("submit", (e) => {
      if (!confirm(form.dataset.confirm)) e.preventDefault();
    }),
  );
})();
