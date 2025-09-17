/* =========================================================
   Small helpers / config
   ========================================================= */
const D = document;
const $id = (sel) => D.getElementById(sel);
const esc = (s) =>
  (s ?? "").toString().replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
const API_BASE = "";
const STATS_DEFAULTS = {
  projects: 27,
  certs: 12,
  startYear: 2024
};

// NOTE: PROJECTS and CERTIFICATES data arrays have been REMOVED from this file.
// They now live in their respective HTML pages.

/* =========================================================
   Optional: auto-clean .../index.html → ...
   ========================================================= */
if (/\/index\.html$/.test(location.pathname)) {
  location.replace(location.pathname.replace(/index\.html$/, ""));
}

/* =========================================================
   Mobile nav and other functions...
   (All your other functions are here, untouched)
   ========================================================= */
function toggleNav() {
  const nav = $id("nav");
  const btn = D.querySelector(".hamburger");
  if (!nav) return;
  nav.classList.toggle("open");
  if (btn)
    btn.setAttribute(
      "aria-expanded",
      nav.classList.contains("open") ? "true" : "false"
    );
}
window.toggleNav = toggleNav;

function setupNavOutsideClose() {
  const nav = $id("nav");
  const btn = D.querySelector(".hamburger");
  if (!nav || !btn) return;
  const isOutside = (t) => !nav.contains(t) && !btn.contains(t);
  const onAnyPointer = (e) => {
    if (!nav.classList.contains("open")) return;
    const target = e.target;
    if (isOutside(target)) {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  };
  D.addEventListener("click", onAnyPointer, { capture: true });
  D.addEventListener("touchstart", onAnyPointer, { passive: true, capture: true });
  D.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

const yearEl = $id("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

(function initThemeToggle() {
  const btn = $id("themeToggle");
  if (!btn) return;
  const root = document.documentElement;
  let theme = localStorage.getItem("theme") || "light";
  apply(theme);
  requestAnimationFrame(() => btn.classList.add("enable-anim"));
  function apply(t) {
    const dark = t === "dark";
    root.setAttribute("data-theme", t);
    btn.classList.toggle("is-dark", dark);
    btn.setAttribute("aria-checked", dark ? "true" : "false");
    btn.setAttribute("aria-label", dark ? "Switch to day mode" : "Switch to night mode");
  }
  function toggle() {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", theme);
    apply(theme);
  }
  btn.addEventListener("click", toggle);
  btn.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  });
})();

(function setActiveNav() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  D.querySelectorAll(".nav a[href]").forEach((a) => {
    try {
      const href = new URL(a.href, location.origin).pathname.replace(/\/+$/, "") || "/";
      if (href === path) a.classList.add("active");
    } catch (_) {}
  });
})();

function renderCertificates() {
  const grid = $id("certGrid");
  if (!grid) return;
  if (typeof CERTIFICATES === 'undefined' || !CERTIFICATES.length) {
    return;
  }
  const html = CERTIFICATES.map(c => `
    <article class="cert-card">
      <div class="cert-thumb"><a href="${esc(c.verify_url)}" target="_blank" rel="noopener"><img src="${esc(c.image)}" alt="${esc(c.title)}"></a></div>
      <div class="cert-body"><h3>${esc(c.title)}</h3><div class="cert-meta">${esc(c.issuer||"")}${c.date?" · "+esc(c.date):""}</div>
        <div class="cert-actions">${c.verify_url?`<a class="btn verify" href="${esc(c.verify_url)}" target="_blank" rel="noopener">Verify</a>`:""}<button class="btn ghost view" data-cert-view="${esc(c.image)}">View</button></div>
      </div>
    </article>`).join("");
  grid.innerHTML = html;
}

(function setupCertModal() {
  const modal = $id("certModal");
  const imgEl = $id("certImg");
  if (!modal || !imgEl) return;
  D.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-cert-view]");
    if (!trigger) return;
    e.preventDefault();
    const src = trigger.getAttribute("data-cert-view");
    if (!src) return;
    imgEl.src = src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    D.body.classList.add("no-scroll");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal-close")) {
      imgEl.src = "";
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      D.body.classList.remove("no-scroll");
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      imgEl.src = "";
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      D.body.classList.remove("no-scroll");
    }
  });
})();

const CATEGORY_TITLES = { deployed: "Deployed Projects", dl: "Deep Learning / CV", ml: "Machine Learning", web: "Web", app: "Apps (Flutter)", algo: "Programming & Algorithms", robotics: "Robotics", notebook: "Notebooks / Study", other: "Other" };
const CATEGORY_ORDER = ["deployed", "dl", "ml", "web", "app", "algo", "robotics", "notebook", "other"];
function getTechs(p) { return p.techs || p.tech || p.tags || p.stack || []; }

function renderProjects() {
  const mount = $id("projectsApp");
  if (!mount) return;
  if (typeof PROJECTS === 'undefined' || !PROJECTS.length) {
    return;
  }
  const items = PROJECTS;
  const grouped = {};
  for (const p of items)(grouped[p.category || "other"] ||= []).push(p);
  let html = "";
  for (const key of CATEGORY_ORDER) {
    const list = grouped[key];
    if (!list || !list.length) continue;
    html += `<section class="project-section"><h2 class="section-title">${esc(CATEGORY_TITLES[key]||key)}</h2><div class="project-grid">`;
    for (const p of list) {
      const techs = getTechs(p);
      const href = p.url || p.href || "#";
      const desc = p.summary || p.desc || p.description || "";
      html += `<a class="project-card" href="${esc(href)}" target="_blank" rel="noopener"><h3>${esc(p.title)}</h3><p>${esc(desc)}</p><div class="tags">${(Array.isArray(techs)?techs:[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div></a>`;
    }
    html += `</div></section>`;
  }
  mount.innerHTML = html || '<div class="info">No projects available.</div>';
}

function renderFeatured() {
  const grid = $id("featuredGrid");
  if (!grid) return;
  if (typeof PROJECTS === 'undefined' || !PROJECTS.length) {
    return;
  }
  const featured = PROJECTS.slice(0, 6);
  grid.innerHTML = featured.map(p => {
    const href = p.url || p.href || "#";
    const desc = p.summary || p.desc || p.description || "";
    const techs = getTechs(p);
    return `<a class="project-card" href="${esc(href)}" target="_blank" rel="noopener"><h3>${esc(p.title)}</h3><p>${esc(desc)}</p><div class="tags">${(Array.isArray(techs)?techs:[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div></a>`;
  }).join("");
}

/* =========================================================
   UPDATED: Contact Form now submits with JavaScript
   ========================================================= */
function setupContactForm() {
    const form = $id("contactForm");
    if (!form) return;

    const btn = form.querySelector('button[type="submit"]');
    const okEl = $id("contactOk");
    const errEl = $id("contactErr");

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // This stops the browser from redirecting

        // Show loading state
        okEl && (okEl.hidden = true);
        errEl && (errEl.hidden = true);
        btn && (btn.disabled = true);

        const formData = new FormData(form);

        try {
            // IMPORTANT: Get your endpoint URL from formspree.io
            const formspreeURL = 'https://formspree.io/f/your_unique_id'; // <--- PASTE YOUR URL HERE

            const response = await fetch(formspreeURL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json' // This header is required for AJAX requests
                }
            });

            if (response.ok) {
                // Success!
                form.reset();
                okEl && (okEl.hidden = false);
            } else {
                // Error
                errEl && (errEl.hidden = false);
            }
        } catch (error) {
            // Network error
            console.error('Form submission error:', error);
            errEl && (errEl.hidden = false);
        } finally {
            // Re-enable the button
            btn && (btn.disabled = false);
        }
    });
}


function enableSwipePageNav() {
  const isTabletWidth = () => { const w = window.innerWidth || D.documentElement.clientWidth || 1024; return w >= 600 && w <= 1100; };
  const pages = ["/", "/about/", "/projects/", "/resume/", "/certificates/"];
  const normalize = (p) => { if (!p || p === "/") return "/"; return p.replace(/\/+$/, "") + "/"; };
  let startX = 0, startY = 0, tracking = false;
  const ignoreTarget = (t) => !!t.closest("a, button, input, textarea, select, label, .no-swipe, .nav");
  function onStart(e) { if (!isTabletWidth()) return; const t = (e.touches && e.touches[0]) || e; if (!t || ignoreTarget(e.target)) return; const nav = $id("nav"); if (nav && nav.classList.contains("open")) return; tracking = true; startX = t.clientX; startY = t.clientY; }
  function onMove(e) { if (!tracking) return; const t = (e.touches && e.touches[0]) || e; const dx = t.clientX - startX; const dy = t.clientY - startY; if (Math.abs(dy) > 60) { tracking = false; return; } if (Math.abs(dx) > 80) { tracking = false; const curr = normalize(location.pathname); let idx = pages.indexOf(curr); if (idx === -1) idx = 0; const targetIdx = dx < 0 ? Math.min(idx + 1, pages.length - 1) : Math.max(idx - 1, 0); if (targetIdx !== idx) location.href = pages[targetIdx]; } }
  function onEnd() { tracking = false; }
  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd, { passive: true });
  window.addEventListener("pointerdown", onStart, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onEnd, { passive: true });
}

function animateCount(el, target, duration = 1200) {
  const startVal = 0;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = String(Math.floor(startVal + (target - startVal) * p));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = String(target);
  }
  requestAnimationFrame(tick);
}

function initStats() {
  const stats = document.getElementById("stats");
  if (!stats) return;
  const cfg = { projects: Number(stats.dataset.fallbackProjects || STATS_DEFAULTS.projects), certs: Number(stats.dataset.fallbackCerts || STATS_DEFAULTS.certs), startYear: Number(stats.dataset.startYear || STATS_DEFAULTS.startYear), };
  const years = Math.max(1, new Date().getFullYear() - cfg.startYear);
  const elP = document.getElementById("countProjects");
  const elY = document.getElementById("countYears");
  const elC = document.getElementById("countCerts");
  const run = () => { if (elP) animateCount(elP, cfg.projects); if (elY) animateCount(elY, years); if (elC) animateCount(elC, cfg.certs); };
  const io = new IntersectionObserver((entries, o) => { entries.forEach((en) => { if (en.isIntersecting) { run(); o.unobserve(en.target); } }); }, { threshold: 0.3 });
  io.observe(stats);
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  setupNavOutsideClose();
  enableSwipePageNav();
  renderFeatured();
  renderProjects();
  renderCertificates();
  setupContactForm();
  initStats();
});