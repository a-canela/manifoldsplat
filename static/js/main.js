/* ManifoldSplat project page — interactions */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Favicon from the central CSS palette (--palette-1..4 in style.css) ---------- */
  (function paletteFavicon() {
    const css = getComputedStyle(document.documentElement);
    const stops = [1, 2, 3, 4].map((i) => css.getPropertyValue(`--palette-${i}`).trim());
    const link = $("link[rel='icon']");
    if (!link || stops.some((c) => !c)) return;
    const offs = [0, 0.35, 0.68, 1];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${
      stops.map((c, i) => `<stop offset="${offs[i]}" stop-color="${c}"/>`).join("")
    }</linearGradient></defs><rect width="64" height="64" rx="14" fill="#0f172a"/>` +
      `<ellipse cx="24" cy="26" rx="16" ry="8" transform="rotate(-25 24 26)" fill="url(#g)" opacity=".95"/>` +
      `<ellipse cx="40" cy="40" rx="15" ry="7" transform="rotate(30 40 40)" fill="url(#g)" opacity=".8"/>` +
      `<ellipse cx="38" cy="22" rx="7" ry="4" transform="rotate(10 38 22)" fill="#fff" opacity=".85"/></svg>`;
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  })();

  /* ---------- Sticky nav: shadow, brand and active section ---------- */
  const nav = $(".section-nav");
  const navScroller = nav ? $(".wrap", nav) : null;
  const navLinks = $$(".nav-link");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const toTop = $(".to-top");
  let lastActive = null;

  function onScroll() {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("scrolled", nav.getBoundingClientRect().top <= 0 && y > 10);
    if (toTop) toTop.classList.toggle("show", y > window.innerHeight * 0.8);

    const probe = y + window.innerHeight * 0.3;
    let current = null;
    for (const s of sections) if (s.offsetTop <= probe) current = s;
    if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1];
    navLinks.forEach((a) => {
      const active = current && a.getAttribute("href") === "#" + current.id;
      a.classList.toggle("active", Boolean(active));
      if (active) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
      // On narrow screens the pill bar scrolls horizontally: keep the active pill in view.
      if (active && a !== lastActive && navScroller && navScroller.scrollWidth > navScroller.clientWidth) {
        navScroller.scrollTo({ left: a.offsetLeft - (navScroller.clientWidth - a.offsetWidth) / 2, behavior: reducedMotion ? "auto" : "smooth" });
      }
      if (active) lastActive = a;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

  /* ---------- Conference note: hover/focus via CSS; tap toggle for touch screens ---------- */
  const confLine = $(".conf-line");
  if (confLine) {
    confLine.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      confLine.classList.toggle("open");
    });
    document.addEventListener("click", (e) => { if (!confLine.contains(e.target)) confLine.classList.remove("open"); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { confLine.classList.remove("open"); confLine.blur(); }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Tabs (WAI-ARIA tablist) ---------- */
  $$("[role='tablist']").forEach((list) => {
    const tabs = $$("[role='tab']", list);
    function select(tab, focus) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      list.dispatchEvent(new CustomEvent("tabchange", { detail: tab }));
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        let n = null;
        if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        if (n === null) return;
        e.preventDefault();
        select(tabs[n], true);
      });
    });
  });

  /* ---------- Copy buttons ---------- */
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* fall back below */ }
    }
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } finally { ta.remove(); }
    if (!ok) throw new Error("copy failed");
  }
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = $(btn.dataset.copy);
      if (!target) return;
      const label = btn.textContent;
      try {
        await copyText(target.innerText.replace(/\u00a0/g, " ").trimEnd() + "\n");
        btn.textContent = "Copied!"; btn.classList.add("copied");
      } catch {
        btn.textContent = "Press Ctrl+C";
      }
      setTimeout(() => { btn.textContent = label; btn.classList.remove("copied"); }, 1600);
    });
  });

  /* ---------- Synchronized before/after video comparison ----------
     Adapted from the swipe comparison of the GR3EN project page
     (https://gr3en-relight.github.io/): two muted videos stacked, the
     right one clipped by the slider position, kept in sync. */
  const compare = $("#compare");
  if (compare) {
    const videoA = $(".video-a", compare);
    const videoB = $(".video-b", compare);
    const labelB = $(".compare-label.right", compare);
    const progress = $(".compare-progress span", compare);
    const playBtn = $("#play-toggle");
    const identityBtns = $$(".identity-btn");
    const promptBtns = $$(".prompt-btn");

    const state = {
      identity: identityBtns.find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.identity || "malte",
      edit: promptBtns.find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.edit || "bigger lips",
      wantPlay: true,
      visible: false,
      started: false,
      dragging: false,
    };

    const base = (identity, edit) => `static/videos/${encodeURIComponent(identity)}/${encodeURIComponent(edit)}/`;

    function setLoading() {
      const ready = videoA.readyState >= 3 && videoB.readyState >= 3;
      compare.classList.toggle("loading", state.started && !ready);
    }
    ["canplay", "playing", "waiting", "loadstart", "seeking", "seeked"].forEach((ev) => {
      videoA.addEventListener(ev, setLoading);
      videoB.addEventListener(ev, setLoading);
    });

    function tryPlay() {
      if (!state.wantPlay || !state.visible || !state.started) return;
      videoA.play().catch(() => {});
      videoB.play().catch(() => {});
    }
    function pauseBoth() { videoA.pause(); videoB.pause(); }

    // If one stream stalls, hold the other so they don't drift apart.
    videoA.addEventListener("waiting", () => videoB.pause());
    videoB.addEventListener("waiting", () => videoA.pause());
    videoA.addEventListener("canplay", tryPlay);
    videoB.addEventListener("canplay", tryPlay);

    function loadIdentity() {
      const a = base(state.identity, "unedited");
      const b = base(state.identity, state.edit);
      videoA.poster = a + "poster.jpg";
      videoB.poster = b + "poster.jpg";
      if (!state.started) return;
      videoA.src = a + "render.mp4";
      videoB.src = b + "render.mp4";
      videoA.load(); videoB.load();
      setLoading();
    }

    function loadEdit() {
      const b = base(state.identity, state.edit);
      videoB.poster = b + "poster.jpg";
      if (!state.started) return;
      const t = videoA.currentTime || 0;
      videoB.src = b + "render.mp4";
      videoB.load();
      videoB.addEventListener("loadedmetadata", () => {
        try { videoB.currentTime = Math.min(videoA.currentTime || t, (videoB.duration || 1) - 0.05); } catch { /* ignore */ }
        tryPlay();
      }, { once: true });
      setLoading();
    }

    function start() {
      if (state.started) return;
      state.started = true;
      loadIdentity();
    }

    // Keep the right video locked to the left one (gentle rate nudging, hard seek on large drift).
    function syncLoop() {
      if (state.started && videoA.duration) {
        if (progress) progress.style.width = (100 * videoA.currentTime / videoA.duration).toFixed(2) + "%";
        if (!videoA.paused && !videoB.paused && videoB.readyState >= 2) {
          // Circular drift: both videos loop, so measure the shortest offset around the loop
          // (a large raw offset is not ignored as a "wrap", which broke short clips).
          const dur = videoA.duration;
          const raw = videoB.currentTime - videoA.currentTime;
          const drift = ((raw % dur) + dur * 1.5) % dur - dur / 2;
          if (Math.abs(drift) > 0.25) { videoB.currentTime = videoA.currentTime; videoB.playbackRate = 1; }
          else if (Math.abs(drift) > 0.03) videoB.playbackRate = drift > 0 ? 0.9 : 1.1;
          else videoB.playbackRate = 1;
        }
      }
      requestAnimationFrame(syncLoop);
    }
    requestAnimationFrame(syncLoop);

    // Lazy-load when near the viewport; pause when off-screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          state.visible = e.isIntersecting;
          if (state.visible) { start(); tryPlay(); }
          else pauseBoth();
        });
      }, { rootMargin: "300px 0px" }).observe(compare);
    } else {
      state.visible = true; start(); tryPlay();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseBoth(); else tryPlay();
    });

    function updatePlayBtn() {
      if (!playBtn) return;
      playBtn.setAttribute("aria-label", state.wantPlay ? "Pause videos" : "Play videos");
      $(".ico-play", playBtn).hidden = state.wantPlay;
      $(".ico-pause", playBtn).hidden = !state.wantPlay;
      $(".txt", playBtn).textContent = state.wantPlay ? "Pause" : "Play";
    }
    function togglePlay() {
      state.wantPlay = !state.wantPlay;
      if (state.wantPlay) tryPlay(); else pauseBoth();
      updatePlayBtn();
    }
    if (playBtn) playBtn.addEventListener("click", togglePlay);
    updatePlayBtn();

    const restartBtn = $("#restart");
    if (restartBtn) restartBtn.addEventListener("click", () => {
      videoA.currentTime = 0; videoB.currentTime = 0; tryPlay();
    });

    identityBtns.forEach((btn) => btn.addEventListener("click", () => {
      if (btn.dataset.identity === state.identity) return;
      identityBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      state.identity = btn.dataset.identity;
      start();
      loadIdentity();
    }));

    promptBtns.forEach((btn) => btn.addEventListener("click", () => {
      if (btn.dataset.edit === state.edit) return;
      promptBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      state.edit = btn.dataset.edit;
      if (labelB) labelB.textContent = "\u201C" + state.edit + "\u201D";
      start();
      loadEdit();
    }));

    // Slider: drag anywhere on the video (mouse, pen or touch), or use the keyboard.
    function setPos(pct) {
      pct = Math.max(0, Math.min(100, pct));
      compare.style.setProperty("--pos", pct + "%");
      compare.setAttribute("aria-valuenow", String(Math.round(pct)));
    }
    function posFromEvent(e) {
      const r = compare.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    }
    compare.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      state.dragging = true;
      compare.classList.add("dragging");
      compare.setPointerCapture(e.pointerId);
      setPos(posFromEvent(e));
    });
    compare.addEventListener("pointermove", (e) => { if (state.dragging) setPos(posFromEvent(e)); });
    const endDrag = () => { state.dragging = false; compare.classList.remove("dragging"); };
    compare.addEventListener("pointerup", endDrag);
    compare.addEventListener("pointercancel", endDrag);
    compare.addEventListener("keydown", (e) => {
      const cur = parseFloat(compare.getAttribute("aria-valuenow")) || 50;
      const step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") setPos(cur - step);
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") setPos(cur + step);
      else if (e.key === "Home") setPos(0);
      else if (e.key === "End") setPos(100);
      else if (e.key === " " || e.key === "k") togglePlay();
      else return;
      e.preventDefault();
    });
    setPos(50);
  }

  /* ---------- Quantitative charts (Table 1 of the paper) ---------- */
  const chartRoot = $("#metric-families");
  if (chartRoot) {
    const methods = [
      { name: "InstructPix2Pix", clip: 0.0432, arc: 0.5212, tv: 0.0210 },
      { name: "GaussianAvatar-Editor", clip: 0.0467, arc: 0.7600, tv: 0.0126 },
      { name: "ManifoldSplat (Ours)", clip: 0.0490, arc: 0.9319, tv: 0.0122, ours: true },
    ];
    const families = [
      { title: "Prompt alignment", sub: "directional CLIP similarity", key: "clip", label: "CLIP-D", up: true, ticks: [0, 0.01, 0.02, 0.03, 0.04, 0.05] },
      { title: "Identity preservation", sub: "ArcFace cosine similarity", key: "arc", label: "ArcFace", up: true, ticks: [0, 0.25, 0.5, 0.75, 1] },
      { title: "Visual cleanliness", sub: "anisotropic 2D total variation", key: "tv", label: "TV<sub>2D</sub>", up: false, ticks: [0, 0.005, 0.01, 0.015, 0.02, 0.025] },
    ];
    const fmtTick = (v) => (v === 0 ? "0" : String(+v.toFixed(3)));

    chartRoot.innerHTML = families.map((f) => {
      const max = f.ticks[f.ticks.length - 1];
      const step = (100 / (f.ticks.length - 1)).toFixed(4) + "%";
      const ours = methods.find((m) => m.ours);
      const baselines = methods.filter((m) => !m.ours);
      const best = baselines.reduce((a, b) => ((f.up ? b[f.key] > a[f.key] : b[f.key] < a[f.key]) ? b : a));
      const gain = f.up ? (ours[f.key] / best[f.key] - 1) * 100 : (1 - ours[f.key] / best[f.key]) * 100;
      const dirTxt = f.up ? "Higher is better" : "Lower is better";
      const rows = methods.map((m) => {
        const w = (100 * m[f.key] / max).toFixed(3);
        return `<li class="${m.ours ? "ours" : ""}">
            <span class="metric-method" title="${m.name}">${m.name}</span>
            <span class="metric-track"><span class="metric-fill" data-w="${w}%"></span></span>
            <span class="metric-value">${m[f.key].toFixed(4)}</span>
          </li>`;
      }).join("");
      const axis = f.ticks.map((t, i) => `<span style="left:${(100 * i / (f.ticks.length - 1)).toFixed(3)}%">${fmtTick(t)}</span>`).join("");
      return `<div class="metric-family">
          <div class="metric-family-head"><h4>${f.title}</h4><span>${f.sub}</span></div>
          <figure class="metric-chart">
            <figcaption><span>${f.label}</span><span class="metric-dir" title="${dirTxt}" aria-label="${dirTxt}">${f.up ? "↑" : "↓"} ${dirTxt.toLowerCase()}</span></figcaption>
            <ol class="metric-bars" style="--tick-step:${step}">${rows}</ol>
            <div class="metric-axis" aria-hidden="true">${axis}</div>
          </figure>
          <div class="metric-gain"><b>${f.up ? "+" : ""}${gain.toFixed(1)}%</b> ${f.up ? "higher" : "lower"} than the best baseline (${best.name})</div>
        </div>`;
    }).join("");

    const fills = $$(".metric-fill", chartRoot);
    const grow = () => fills.forEach((el) => { el.style.width = el.dataset.w; });
    if ("IntersectionObserver" in window && !reducedMotion) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { grow(); io.disconnect(); }
      }, { threshold: 0.25 });
      io.observe(chartRoot);
    } else {
      grow();
    }
  }
})();
