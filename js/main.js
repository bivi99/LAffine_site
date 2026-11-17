/* ==========================================================================
   L'Affiné — 공통 스크립트
   --------------------------------------------------------------------------
   01. Utilities
   02. 오늘 날짜 표시
   03. 헤더 (sticky 상태 · 모바일 메뉴 · 언어 토글)
   04. 스크롤 진행 표시 · 맨 위로 버튼 · 스크롤 큐 · 패럴랙스
   05. Reveal (스크롤 등장 애니메이션 · 단어 분리)
   06. 숙성 기간 필터 + 도감(Products) 필터 · 정렬 · 보기 전환
   07. Journal 칩 필터 · 페이지네이션
   08. News 탭 · 검색
   09. Shop info (오늘 영업 요일 · 시음 달력 · 주소 복사)
   10. Contact (폼 검증 · FAQ 아코디언)
   11. Newsletter
   ========================================================================== */
(() => {
  "use strict";

  /* 01. Utilities ------------------------------------------------------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const toastEl = $(".toast");
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) return;
    $(".msg", toastEl).textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 2800);
  };

  /* 02. 오늘 날짜 ------------------------------------------------------- */
  const d = new Date();
  const today = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  $$("[data-today]").forEach((el) => (el.textContent = today));

  /* 03. 헤더 ------------------------------------------------------------ */
  const nav = $(".nav");
  const mbar = $(".mbar");
  const burger = $(".burger");
  const drawer = $("#drawer");

  const setMenu = (open) => {
    document.body.classList.toggle("is-menu-open", open);
    document.body.classList.toggle("is-locked", open);
    burger?.setAttribute("aria-expanded", String(open));
    burger?.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    drawer?.setAttribute("aria-hidden", String(!open));
  };
  burger?.addEventListener("click", () => setMenu(!document.body.classList.contains("is-menu-open")));
  addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));
  $$("#drawer a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  matchMedia("(min-width: 1025px)").addEventListener("change", (e) => e.matches && setMenu(false));

  $$(".lang button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".lang button").forEach((x) => x.classList.toggle("is-active", x === b));
      if (b.dataset.lang === "fr") toast("Version française — bientôt disponible.");
    })
  );

  /* 04. 스크롤 UI ------------------------------------------------------- */
  const progress = $(".progress");
  const toTop = $(".to-top");
  const cue = $(".scroll-cue");
  const parallax = $$("[data-parallax]");

  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    progress?.style.setProperty("--p", p.toFixed(4));
    toTop?.style.setProperty("--p", p.toFixed(4));
    toTop?.classList.toggle("is-show", y > innerHeight * 0.8);
    cue?.classList.toggle("is-hide", y > 80);

    if (nav) nav.classList.toggle("is-stuck", nav.getBoundingClientRect().top <= 0 && y > 200);
    if (mbar) mbar.classList.toggle("is-stuck", y > 44);

    if (!reduce) {
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const k = parseFloat(el.dataset.parallax) || 0.1;
        el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - innerHeight / 2) * -k).toFixed(1)}px, 0)`;
      });
    }
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  toTop?.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));

  /* 05. Reveal ---------------------------------------------------------- */
  // 제목을 단어 단위로 분리 (줄바꿈·내부 span 유지)
  $$(".split-words").forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement("span");
            w.className = "word";
            w.style.transitionDelay = `${(i++ * 0.07).toFixed(2)}s`;
            w.textContent = part;
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          wrap(n);
        }
      });
    };
    wrap(el);
  });

  const startReveal = () => {
    const targets = $$(".reveal, .reveal-mask, .split-words");
    if (!("IntersectionObserver" in window) || reduce) {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    // 등장이 끝나면 reveal 클래스를 걷어내 hover 트랜지션이 지연 없이 동작하게 함
    const cleanup = (el) => {
      if (!el.classList.contains("reveal") || el.classList.contains("reveal--keep")) return;
      const end = (e) => {
        if (e.target !== el || e.propertyName !== "opacity") return;
        el.removeEventListener("transitionend", end);
        el.classList.remove("reveal", "reveal--left", "reveal--right", "reveal--fade", "is-in");
      };
      el.addEventListener("transitionend", end);
    };
    // clip-path 로 가려진 요소는 IO 가 감지하지 못하므로 부모를 대신 관찰
    const proxy = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = proxy.get(en.target) || en.target;
        cleanup(el);
        el.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    targets.forEach((t) => {
      if (t.classList.contains("reveal-mask") && t.parentElement) {
        proxy.set(t.parentElement, t);
        io.observe(t.parentElement);
      } else io.observe(t);
    });
  };

  // 메인의 로딩 화면이 있으면 끝난 뒤에 등장 애니메이션 시작
  if (document.getElementById("loader") && !document.documentElement.classList.contains("no-intro")) {
    document.addEventListener("loader:done", startReveal, { once: true });
  } else {
    startReveal();
  }

  /* 06. 숙성 기간 필터 + 도감 ------------------------------------------- */
  const RANGES = { all: [0, 100], jeune: [0, 20], affine: [20, 60], vieux: [60, 100] };

  const animateIn = (cards) => {
    cards.forEach((c, i) => {
      c.classList.remove("is-entering");
      void c.offsetWidth;
      c.style.animationDelay = `${i * 0.06}s`;
      c.classList.add("is-entering", "is-in");
    });
  };

  const countUp = (el, to) => {
    if (!el) return;
    const from = parseInt(el.textContent, 10) || 0;
    if (reduce || from === to) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 500;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    el.animate?.([{ transform: "translateY(-6px)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "ease-out" });
  };

  $$("[data-age-filter]").forEach((box) => {
    const scope = box.closest("[data-catalog]") || box.closest("section") || document;
    const tabs = $$(".age-tab", box);
    const timeline = $(".timeline", box);
    const labels = timeline ? $$(".timeline__labels span", timeline) : [];
    const grid = $("[data-cards]", scope);
    const cards = grid ? $$(".specimen", grid) : [];
    const countEl = $("[data-count]", scope);
    const isCatalog = !!box.closest("[data-catalog]");

    // Products 전용 요소
    const checks = isCatalog ? $$(".filters input[type=checkbox]", scope) : [];
    const sortSel = $("[data-sort]", scope);
    const empty = $(".catalog__empty", scope);
    let age = box.dataset.default || "all";

    const setTimeline = (key) => {
      const [from, to] = RANGES[key] || RANGES.all;
      timeline?.style.setProperty("--from", from + "%");
      timeline?.style.setProperty("--to", to + "%");
      labels.forEach((l) => {
        const at = +l.dataset.at;
        l.classList.toggle("is-on", at >= from && at <= to);
      });
    };

    const apply = (animate = true) => {
      const groups = {};
      checks.forEach((c) => {
        if (c.checked) (groups[c.name] ||= []).push(c.value);
      });
      const shown = [];
      cards.forEach((c) => {
        let ok = age === "all" || c.dataset.age === age;
        if (ok) {
          for (const [name, vals] of Object.entries(groups)) {
            if (!vals.includes(c.dataset[name])) { ok = false; break; }
          }
        }
        c.classList.toggle("is-hidden", !ok);
        if (ok) shown.push(c);
      });

      // 정렬
      if (sortSel && grid) {
        const mode = sortSel.value;
        const sorted = [...cards].sort((a, b) => {
          if (mode === "name") return $(".specimen__name", a).textContent.localeCompare($(".specimen__name", b).textContent);
          const diff = +a.dataset.days - +b.dataset.days;
          return mode === "desc" ? -diff : diff;
        });
        sorted.forEach((c) => grid.appendChild(c));
      }

      countUp(countEl, shown.length);
      empty?.classList.toggle("is-show", shown.length === 0);
      if (animate) animateIn(shown);
    };

    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        age = tab.dataset.age;
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        setTimeline(age);
        apply();
      })
    );

    // 탭 키보드 이동 (← →)
    box.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); next.click();
    });

    checks.forEach((c) => c.addEventListener("change", () => apply()));
    sortSel?.addEventListener("change", () => apply());
    $("[data-reset]", scope)?.addEventListener("click", () => {
      checks.forEach((c) => (c.checked = false));
      tabs.find((t) => t.dataset.age === "all")?.click();
      if (sortSel) sortSel.value = "asc";
      apply();
    });

    // 보기 전환 (그리드 / 리스트)
    const viewBtns = $$("[data-view]", scope);
    viewBtns.forEach((b) =>
      b.addEventListener("click", () => {
        viewBtns.forEach((x) => x.classList.toggle("is-active", x === b));
        grid?.classList.toggle("is-list", b.dataset.view === "list");
        animateIn(cards.filter((c) => !c.classList.contains("is-hidden")));
      })
    );

    // 모바일 필터 접기/펼치기
    const ftoggle = $(".filters__toggle", scope);
    ftoggle?.addEventListener("click", () => {
      const f = ftoggle.closest(".filters");
      const open = !f.classList.contains("is-open");
      f.classList.toggle("is-open", open);
      ftoggle.setAttribute("aria-expanded", String(open));
    });

    setTimeline(age);
    apply(false);
    // 메인: 첫 화면의 카드는 스크롤 시 차례로 등장
    if (!isCatalog && "IntersectionObserver" in window && !reduce) {
      const io = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) { animateIn(cards.filter((c) => !c.classList.contains("is-hidden"))); io.disconnect(); }
      }, { threshold: 0.15 });
      grid.style.minHeight = "1px";
      cards.forEach((c) => c.classList.contains("is-hidden") || (c.style.opacity = "0"));
      io.observe(grid);
      grid.addEventListener("animationstart", (e) => (e.target.style.opacity = ""), true);
    }
  });

  /* 07. Journal --------------------------------------------------------- */
  const chips = $("[data-chips]");
  if (chips) {
    const arts = $$("[data-articles] .article");
    $$(".chip", chips).forEach((chip) =>
      chip.addEventListener("click", () => {
        $$(".chip", chips).forEach((c) => c.classList.toggle("is-active", c === chip));
        const f = chip.dataset.filter;
        const shown = [];
        arts.forEach((a) => {
          const ok = f === "all" || a.dataset.cat === f;
          a.classList.toggle("is-hidden", !ok);
          if (ok) shown.push(a);
        });
        arts.forEach((a) => a.classList.toggle("is-first", a === shown[0]));
        shown.forEach((a, i) => {
          a.animate?.([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: i * 70, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
        });
      })
    );
  }

  // 페이지네이션 (데모: 번호 전환 + 리스트 재등장 애니메이션)
  $$(".pager").forEach((pager) => {
    const nums = $$(".pager__nums button", pager);
    const list = pager.previousElementSibling?.querySelector(".ledger") || $(".ledger");
    let cur = 0;
    const go = (i) => {
      cur = (i + nums.length) % nums.length;
      nums.forEach((n, k) => n.classList.toggle("is-active", k === cur));
      if (list) {
        $$("li", list).forEach((li, k) =>
          li.animate?.([{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: k * 40, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" })
        );
      }
    };
    nums.forEach((n, i) => n.addEventListener("click", () => go(i)));
    $$(".pager__nav", pager).forEach((b) => b.addEventListener("click", () => go(cur + (b.dataset.dir === "next" ? 1 : -1))));
  });

  /* 08. News ------------------------------------------------------------ */
  // 행사 D-day : data-dday="YYYY-MM-DD" 기준으로 오늘부터 남은 날을 계산
  $$("[data-dday]").forEach((el) => {
    const [y, m, dd] = el.dataset.dday.split("-").map(Number);
    const now = new Date();
    const diff = Math.round((new Date(y, m - 1, dd) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    el.textContent = diff > 0 ? `D-${diff}` : diff === 0 ? "D-Day" : "Terminé";
    el.setAttribute("aria-label", diff > 0 ? `행사까지 ${diff}일 남음` : diff === 0 ? "오늘 행사" : "종료된 행사");
  });

  const seg = $("[data-seg]");
  if (seg) {
    const items = $$("[data-notices] .notice");
    const emptyN = $(".notices__empty");
    const search = $("[data-search]");
    let cat = "all";
    const applyN = () => {
      const q = (search?.value || "").trim().toLowerCase();
      let n = 0;
      items.forEach((it, i) => {
        const ok = (cat === "all" || it.dataset.cat === cat) && (!q || it.textContent.toLowerCase().includes(q));
        it.classList.toggle("is-hidden", !ok);
        if (ok) {
          it.animate?.([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 550, delay: n * 60, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
          n++;
        }
      });
      emptyN?.classList.toggle("is-show", n === 0);
    };
    $$("button", seg).forEach((b) =>
      b.addEventListener("click", () => {
        $$("button", seg).forEach((x) => {
          x.classList.toggle("is-active", x === b);
          x.setAttribute("aria-selected", String(x === b));
        });
        cat = b.dataset.filter;
        applyN();
      })
    );
    let st;
    search?.addEventListener("input", () => { clearTimeout(st); st = setTimeout(applyN, 180); });
  }

  /* 09. Shop info ------------------------------------------------------- */
  const hours = $("[data-hours]");
  if (hours) {
    const dow = new Date().getDay();
    $$("li[data-days]", hours).forEach((li) => li.classList.toggle("is-today", li.dataset.days.split(",").includes(String(dow))));
  }

  const cal = $(".cal__days");
  if (cal) {
    cal.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      $$("button", cal).forEach((x) => {
        x.classList.toggle("is-active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      b.animate?.([{ transform: "scale(.85)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 380, easing: "ease-out" });
      toast(`${b.textContent}일 시음을 선택했습니다.`);
    });
  }

  $("[data-copy-address]")?.addEventListener("click", async () => {
    const text = $("[data-address]")?.textContent.trim() || "";
    try {
      await navigator.clipboard.writeText(text);
      toast("주소를 복사했습니다.");
    } catch (e) {
      toast(text);
    }
  });

  /* 10. Contact --------------------------------------------------------- */
  const form = $("[data-contact]");
  if (form) {
    const stamp = $(".stamp", form);
    const io = "IntersectionObserver" in window && new IntersectionObserver((en) => {
      if (en[0].isIntersecting) { stamp.classList.add("is-pressed"); io.disconnect(); }
    }, { threshold: 0.4 });
    if (io && !reduce) io.observe(form);

    const setErr = (input, msg) => {
      input.classList.toggle("is-error", !!msg);
      const e = input.parentElement.querySelector(".err");
      if (e) e.textContent = msg || "";
    };
    const validate = () => {
      let ok = true;
      const name = form.elements.name, mail = form.elements.email, msg = form.elements.message, agree = form.elements.agree;
      if (!name.value.trim()) { setErr(name, "성함을 적어주세요."); ok = false; } else setErr(name);
      if (!/^\S+@\S+\.\S+$/.test(mail.value.trim())) { setErr(mail, "이메일 형식을 확인해주세요."); ok = false; } else setErr(mail);
      if (msg.value.trim().length < 5) { setErr(msg, "내용을 조금 더 적어주세요."); ok = false; } else setErr(msg);
      if (!agree.checked) { ok = false; agree.closest(".check").animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 360 }); }
      return ok;
    };
    $$(".u-input", form).forEach((i) => i.addEventListener("input", () => i.classList.contains("is-error") && validate()));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate()) { toast("빠진 항목을 확인해주세요."); return; }
      const btn = $("button[type=submit]", form);
      btn.disabled = true;
      btn.firstChild.textContent = "봉투에 넣는 중… ";
      stamp.classList.remove("is-pressed"); void stamp.offsetWidth; stamp.classList.add("is-pressed");
      setTimeout(() => {
        form.reset();
        btn.disabled = false;
        btn.firstChild.textContent = "편지 보내기 ";
        toast("편지가 잘 도착했습니다. Merci !");
      }, 900);
    });
  }

  const faq = $("[data-faq]");
  if (faq) {
    $$(".faq__q", faq).forEach((q) =>
      q.addEventListener("click", () => {
        const item = q.closest(".faq__item");
        const open = !item.classList.contains("is-open");
        $$(".faq__item", faq).forEach((it) => {
          it.classList.remove("is-open");
          $(".faq__q", it).setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("is-open", open);
        q.setAttribute("aria-expanded", String(open));
      })
    );
  }

  /* 11. Newsletter ------------------------------------------------------ */
  $$("[data-newsletter]").forEach((f) =>
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input[type=email]", f);
      if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) {
        input.classList.add("is-error");
        input.focus();
        toast("이메일 주소를 확인해주세요.");
        return;
      }
      input.classList.remove("is-error");
      f.reset();
      toast("La Lettre 구독이 완료되었습니다.");
    })
  );
})();
