/* ==========================================================================
   L'Affiné — 로딩 페이지 (Grand Opening)
   달력 그리드 → 8일 도장 → 연필 글씨 → 메인 페이지 노출
   · 한 세션에 한 번만 재생 (sessionStorage)
   · 클릭 / Enter / Esc 로 건너뛰기
   · 끝나면 document 에 "loader:done" 이벤트를 보냅니다 (main.js 가 받아서 히어로 애니메이션 시작)
   ========================================================================== */
(() => {
  const loader = document.getElementById("loader");
  if (!loader) return;

  const KEY = "laffine-intro";
  const done = () => {
    loader.remove();
    document.documentElement.classList.add("no-intro");
    document.dispatchEvent(new CustomEvent("loader:done"));
  };

  // 이미 본 세션이면 바로 종료
  try {
    if (sessionStorage.getItem(KEY)) { done(); return; }
  } catch (e) {}

  /* ─── 설정 ─────────────────────────────────── */
  const CONFIG = {
    text: "Grand Opening",
    today: 8,
    firstCol: 1,          // 1일이 놓이는 열
    days: 30,
    holdAfterWrite: 900,  // 다 써진 뒤 머무는 시간(ms)
  };

  const $ = (s) => loader.querySelector(s);
  const plane = $("#plane"), grid = $("#grid");
  const stamp = $("#stamp"), write = $("#write");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ─── 1. 달력 그리드 + 날짜 ─────────────────── */
  const NS = "http://www.w3.org/2000/svg";
  const line = (x1, y1, x2, y2) => {
    const l = document.createElementNS(NS, "line");
    Object.entries({ x1, y1, x2, y2, stroke: "var(--l-grid)", "stroke-width": 0.17,
      "stroke-dasharray": "0.85 0.62" }).forEach(([k, v]) => l.setAttribute(k, v));
    grid.appendChild(l);
  };
  for (let c = 0; c <= 7; c++) line(c * 100, 0, c * 100, 600);
  for (let r = 0; r <= 6; r++) line(0, r * 100, 700, r * 100);

  const nums = [];
  for (let d = 1; d <= CONFIG.days; d++) {
    const i = d - 1 + CONFIG.firstCol, col = i % 7, row = Math.floor(i / 7);
    const el = document.createElement("span");
    el.className = "num" + (d === CONFIG.today ? " today" : "");
    el.textContent = d + ".";
    el.style.left = `calc(var(--cell) * ${col} + 3.1 * var(--u))`;
    el.style.top  = `calc(var(--cell) * ${row} + 1.6 * var(--u))`;
    plane.appendChild(el);
    nums.push(el);
  }

  /* ─── Grand Opening 글자 분리 ───────────────── */
  const chars = [...CONFIG.text].map((ch) => {
    const s = document.createElement("span");
    if (ch === " ") s.className = "sp";
    else { s.className = "ch"; s.textContent = ch; }
    write.appendChild(s);
    return s;
  });

  /* ─── 글씨가 8일 칸 밖으로 넘치지 않게 ───────── */
  function fitToCell() {
    write.style.fontSize = "";
    const cell = plane.offsetWidth / 7;
    const maxW = cell * 0.84;
    const w = write.scrollWidth;
    if (w > maxW) {
      const fs = parseFloat(getComputedStyle(write).fontSize);
      write.style.fontSize = (fs * maxW / w) + "px";
    }
  }
  addEventListener("resize", fitToCell);

  /* ─── 시퀀스 ───────────────────────────────── */
  let skipped = false;
  let finished = false;

  async function intro() {
    grid.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, fill: "forwards", easing: "ease-out" });
    nums.forEach((n, i) =>
      n.animate([{ opacity: 0, filter: "blur(2px)" }, { opacity: 1, filter: "blur(0)" }],
        { duration: 600, delay: 250 + (n.classList.contains("today") ? 120 : i * 8), fill: "forwards", easing: "ease-out" }));
    await wait(1100);
  }

  async function press() {
    const D = 420;
    stamp.animate([
      { opacity: 0, transform: "scale(1.12) translateY(-1%)", filter: "blur(2px)" },
      { opacity: .4, transform: "scale(1.05)", filter: "blur(1px)", offset: .55 },
      { opacity: 1, transform: "scale(.997)", filter: "blur(0)", offset: .86 },
      { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
    ], { duration: D + 120, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });

    stamp.querySelector(".shadow").animate([
      { opacity: 0, transform: "scale(1.08)" },
      { opacity: .5, transform: "scale(1.02)", offset: .85 },
      { opacity: 0, transform: "scale(1)" },
    ], { duration: D + 200, easing: "ease-in", fill: "forwards" });

    await wait(D);

    const tilt = getComputedStyle(document.documentElement).getPropertyValue("--tilt").trim() || "-16deg";
    plane.animate([
      { transform: `rotate(${tilt}) scale(1)` },
      { transform: `rotate(${tilt}) scale(.999) translate(0, .03%)` },
      { transform: `rotate(${tilt}) scale(1)` },
    ], { duration: 260, easing: "cubic-bezier(.2,.7,.3,1)" });

    stamp.querySelector(".bleed").animate([
      { opacity: .12, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.004)" },
    ], { duration: 700, easing: "ease-out" });

    await wait(450);
  }

  async function pencil() {
    const u = parseFloat(getComputedStyle(write).fontSize) / 6.6667;
    for (const s of chars) {
      if (skipped) break;
      if (s.className === "sp") { await wait(70); continue; }
      const w = s.getBoundingClientRect().width / u;
      const dur = Math.max(60, 25 + w * 20);
      await s.animate([
        { clipPath: "inset(-80% 140% -80% -40%)" },
        { clipPath: "inset(-80% -40% -80% -40%)" },
      ], { duration: dur, easing: "cubic-bezier(.3,.1,.6,.9)", fill: "forwards" }).finished;
      await wait(Math.random() * 18);
    }
  }

  async function finish() {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    await loader.animate([
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.03)" },
    ], { duration: 800, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" }).finished;
    removeEventListener("resize", fitToCell);
    done();
  }

  function showFinalState() {
    grid.style.opacity = 1; stamp.style.opacity = 1;
    nums.forEach((n) => (n.style.opacity = 1));
    chars.forEach((s) => (s.style.clipPath = "none"));
  }

  async function run() {
    try {
      await Promise.race([document.fonts.load('40px "Tritopani"').then(() => document.fonts.ready), wait(2000)]);
    } catch (e) {}

    fitToCell();
    if (reduce) { showFinalState(); await wait(1600); return finish(); }

    await intro();
    await press();
    await pencil();
    if (!skipped) await wait(CONFIG.holdAfterWrite);
    finish();
  }

  // 클릭 / 키 입력 → 최종 상태를 보여준 뒤 바로 닫기
  const skip = () => {
    if (skipped) return;
    skipped = true;
    loader.getAnimations({ subtree: true }).forEach((a) => a.finish());
    showFinalState();
    setTimeout(finish, 350);
  };
  loader.addEventListener("click", skip);
  addEventListener("keydown", (e) => (e.key === "Escape" || e.key === "Enter") && skip());

  run();
})();
