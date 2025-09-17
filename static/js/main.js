/* =========================================================
   Small helpers / config
   ========================================================= */
const D = document;
const $id = (sel) => D.getElementById(sel);
const esc = (s) =>
  (s ?? "").toString().replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );

const bodyData = D.body?.dataset || {};
// Accept either data-api="<url>" OR data-api="on" + data-api-base="<url>"
const API_BASE =
  bodyData.api && bodyData.api !== "off"
    ? (bodyData.apiBase || bodyData.api).replace(/\/+$/, "")
    : "";

// Fallback values if you don't provide data-* attributes in HTML
const STATS_DEFAULTS = {
  projects: 27,   // <— change anytime
  certs: 12,      // <— change anytime
  startYear: 2024 // <— first year you started (used to compute years)
};

/* =========================================================
   Optional: auto-clean .../index.html → ...
   (Safe no-op for already clean URLs)
   ========================================================= */
if (/\/index\.html$/.test(location.pathname)) {
  location.replace(location.pathname.replace(/index\.html$/, ""));
}

/* =========================================================
   Mobile nav
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

// Close the mobile menu when tapping/clicking outside it (or pressing Esc)
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

  // Close on Esc
  D.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  // If a link inside the menu is tapped, close it immediately
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

/* =========================================================
   Footer year
   ========================================================= */
const yearEl = $id("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================================================
   Animated theme switch logic
   ========================================================= */
(function initThemeToggle() {
  const btn = $id("themeToggle");
  if (!btn) return;

  const root = document.documentElement;

  // Default to DAY (light) if nothing saved
  let theme = localStorage.getItem("theme") || "light";
  apply(theme);

  // Enable animations after first paint (prevents initial jump)
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

/* =========================================================
   Active nav item
   ========================================================= */
(function setActiveNav() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  D.querySelectorAll(".nav a[href]").forEach((a) => {
    try {
      const href = new URL(a.href, location.origin).pathname.replace(/\/+$/, "") || "/";
      if (href === path) a.classList.add("active");
    } catch (_) {}
  });
})();

/* =========================================================
   Skeleton helpers (match Featured style)
   ========================================================= */
function skeletonCard() {
  return `
    <a class="project-card skeleton-card" href="#" aria-hidden="true" tabindex="-1">
      <div class="skeleton skeleton-line w-60"></div>
      <div class="skeleton skeleton-line w-90"></div>
      <div class="tags">
        <span class="tag skeleton-tag"></span>
        <span class="tag skeleton-tag"></span>
        <span class="tag skeleton-tag"></span>
      </div>
    </a>`;
}
function skeletonCountForViewport() {
  const w = window.innerWidth || D.documentElement.clientWidth || 1024;
  if (w < 480) return 4;   // phones
  if (w < 768) return 6;   // small tablets
  if (w < 1024) return 8;  // tablets
  if (w < 1440) return 12; // laptop
  return 16;               // wide desktop
}
function renderSkeletonGridInto(container, count) {
  container.innerHTML = `<div class="project-grid">${Array.from({ length: count })
    .map(skeletonCard)
    .join("")}</div>`;
}

/* =========================================================
   Certificates (API + skeleton)
   ========================================================= */
function certSkeletonCard() {
  return `
    <article class="cert-card skeleton-card">
      <div class="cert-thumb">
        <div class="skeleton skeleton-thumb"></div>
      </div>
      <div class="cert-body">
        <div class="skeleton skeleton-line w-70"></div>
        <div class="skeleton skeleton-line w-40"></div>
        <div class="cert-actions">
          <span class="btn skeleton-line w-30"></span>
          <span class="btn ghost skeleton-line w-20"></span>
        </div>
      </div>
    </article>`;
}

function preloadImages(urls, timeoutMs = 10000) {
  const waitOne = (url) =>
    new Promise((resolve) => {
      if (!url) return resolve();
      const img = new Image();
      const done = () => resolve();
      img.onload = img.onerror = done;
      img.src = url;
      if (img.decode) {
        img.decode().then(done).catch(done);
      }
    });

  const all = Promise.all(urls.map(waitOne));
  const timer = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([all, timer]);
}

async function renderCertificates() {
  const grid = $id("certGrid");
  if (!grid) return;
  if (!API_BASE) return; // keep any static fallback

  const count = Math.max(6, Math.min(12, skeletonCountForViewport()));
  grid.innerHTML = Array.from({ length: count }).map(certSkeletonCard).join("");

  try {
    const res = await fetch(`${API_BASE}/api/certificates/`, { credentials: "omit" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return;

    const html = items
      .map(
        (c) => `
      <article class="cert-card">
        <div class="cert-thumb">
          <img src="${esc(c.image)}" alt="${esc(c.title)}">
        </div>
        <div class="cert-body">
          <h3>${esc(c.title)}</h3>
          <div class="cert-meta">
            ${esc(c.issuer || "")}${c.date ? " · " + esc(c.date) : ""}
          </div>
          <div class="cert-actions">
            ${c.verify_url ? `<a class="btn verify" href="${esc(c.verify_url)}" target="_blank" rel="noopener">Verify</a>` : ""}
            <button class="btn ghost view" data-cert-view="${esc(c.image)}">View</button>
          </div>
        </div>
      </article>
    `
      )
      .join("");

    await preloadImages(items.map((i) => i.image));
    grid.innerHTML = html;
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="info">Sorry, failed to load certificates.</div>';
  }
}

/* =========================================================
   Certificate Modal
   ========================================================= */
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

/* =========================================================
   Projects page — skeleton like Featured (no headers while loading)
   ========================================================= */
const CATEGORY_TITLES = {
  deployed: "Deployed Projects",
  dl: "Deep Learning / CV",
  ml: "Machine Learning",
  web: "Web",
  app: "Apps (Flutter)",
  algo: "Programming & Algorithms",
  robotics: "Robotics",
  notebook: "Notebooks / Study",
  other: "Other",
};
const CATEGORY_ORDER = ["deployed","dl", "ml", "web", "app", "algo", "robotics", "notebook", "other"];
function getTechs(p) {
  return p.techs || p.tech || p.tags || p.stack || [];
}

let projectSkeletonResizeHandler = null;

async function renderProjects() {
  const mount = $id("projectsApp");
  if (!mount) return;
  if (!API_BASE) return;

  const drawSkeleton = () => renderSkeletonGridInto(mount, skeletonCountForViewport());
  drawSkeleton();
  projectSkeletonResizeHandler = () => drawSkeleton();
  window.addEventListener("resize", projectSkeletonResizeHandler, { passive: true });

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: "omit" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const items = await res.json();

    window.removeEventListener("resize", projectSkeletonResizeHandler);
    projectSkeletonResizeHandler = null;

    if (!Array.isArray(items) || !items.length) {
      mount.innerHTML = "<div class=\"info\">No projects yet.</div>";
      return;
    }

    const grouped = {};
    for (const p of items) (grouped[p.category || "other"] ||= []).push(p);

    let html = "";
    for (const key of CATEGORY_ORDER) {
      const list = grouped[key];
      if (!list || !list.length) continue;

      html += `<section class="project-section">
        <h2 class="section-title">${esc(CATEGORY_TITLES[key] || key)}</h2>
        <div class="project-grid">`;

      for (const p of list) {
        const techs = getTechs(p);
        const href = p.url || p.href || "#";
        const desc = p.summary || p.desc || p.description || "";
        html += `
          <a class="project-card" ${
            href && href !== "#"
              ? `href="${esc(href)}" target="_blank" rel="noopener"`
              : 'href="#"'
          }>
            <h3>${esc(p.title)}</h3>
            <p>${esc(desc)}</p>
            <div class="tags">
              ${(Array.isArray(techs) ? techs : [])
                .map((t) => `<span class="tag">${esc(t)}</span>`)
                .join("")}
            </div>
          </a>`;
      }

      html += `</div></section>`;
    }

    mount.innerHTML = html || '<div class="info">No projects available.</div>';
  } catch (err) {
    console.error(err);
    window.removeEventListener("resize", projectSkeletonResizeHandler);
    projectSkeletonResizeHandler = null;
    mount.innerHTML = '<div class="info">Failed to load projects.</div>';
  }
}

/* =========================================================
   Home — Featured (first 6) + skeleton
   ========================================================= */
async function renderFeatured() {
  const grid = $id("featuredGrid");
  if (!grid) return;
  if (!API_BASE) return;

  grid.innerHTML = Array.from({ length: 6 }).map(skeletonCard).join("");

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: "omit" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const items = await res.json();

    const featured = Array.isArray(items) ? items.slice(0, 6) : [];
    if (!featured.length) return;

    grid.innerHTML = featured
      .map((p) => {
        const href = p.url || p.href || "#";
        const desc = p.summary || p.desc || p.description || "";
        const techs = getTechs(p);
        return `
        <a class="project-card" ${
          href && href !== "#"
            ? `href="${esc(href)}" target="_blank" rel="noopener"`
            : 'href="#"'
        }>
          <h3>${esc(p.title)}</h3>
          <p>${esc(desc)}</p>
          <div class="tags">
            ${(Array.isArray(techs) ? techs : [])
              .map((t) => `<span class="tag">${esc(t)}</span>`)
              .join("")}
          </div>
        </a>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="info">Failed to load featured projects.</div>';
  }
}

/* =========================================================
   Contact — post to FastAPI when API_BASE present
   ========================================================= */
function setupContactForm() {
  const form = $id("contactForm");
  if (!form) return;

  const btn = form.querySelector('button[type="submit"]');
  const okEl = $id("contactOk");
  const errEl = $id("contactErr");

  if (!API_BASE) return; // fallback Formspree action stays

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    okEl && (okEl.hidden = true);
    errEl && (errEl.hidden = true);
    btn && (btn.disabled = true);

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
    };

    try {
    // The new URL goes directly into the fetch command
        const res = await fetch('https://raptezoyqrvjoxtwrkib.supabase.co/functions/v1/api', {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcHRlem95cXJ2am94dHdya2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzgzNTIsImV4cCI6MjA3MzYxNDM1Mn0.TOtb1VFYknfnwYqCPnOuP6dswNfV6MFgt45JIgJt3iQ",       // <-- Add this line

            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcHRlem95cXJ2am94dHdya2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzgzNTIsImV4cCI6MjA3MzYxNDM1Mn0.TOtb1VFYknfnwYqCPnOuP6dswNfV6MFgt45JIgJt3iQ" // <-- And this line

          },

          body: JSON.stringify(payload),

        });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.reset();
      okEl && (okEl.hidden = false);
    } catch (err) {
      console.error(err);
      errEl && (errEl.hidden = false);
    } finally {
      btn && (btn.disabled = false);
    }
  });
}

/* =========================================================
   Tablet swipe navigation (left/right) between pages
   ——— Updated for clean URLs (no .html)
   ========================================================= */
function enableSwipePageNav() {
  // Only for tablet-ish widths
  const isTabletWidth = () => {
    const w = window.innerWidth || D.documentElement.clientWidth || 1024;
    return w >= 600 && w <= 1100;
  };

  // Map page order (clean URLs, all with trailing slash)
  const pages = ["/", "/about/", "/projects/", "/resume/", "/certificates/"];

  // Normalize current path to this format
  const normalize = (p) => {
    if (!p || p === "/") return "/";
    return p.replace(/\/+$/, "") + "/";
  };

  let startX = 0,
    startY = 0,
    tracking = false;

  const ignoreTarget = (t) =>
    !!t.closest("a, button, input, textarea, select, label, .no-swipe, .nav");

  function onStart(e) {
    if (!isTabletWidth()) return;
    const t = (e.touches && e.touches[0]) || e;
    if (!t || ignoreTarget(e.target)) return;
    // Don’t start when menu is open
    const nav = $id("nav");
    if (nav && nav.classList.contains("open")) return;

    tracking = true;
    startX = t.clientX;
    startY = t.clientY;
  }

  function onMove(e) {
    if (!tracking) return;
    const t = (e.touches && e.touches[0]) || e;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    // Cancel if mostly vertical scroll
    if (Math.abs(dy) > 60) {
      tracking = false;
      return;
    }

    // Trigger on significant horizontal move
    const THRESH = 80;
    if (Math.abs(dx) > THRESH) {
      tracking = false;

      // Use clean normalized path
      const curr = normalize(location.pathname);
      let idx = pages.indexOf(curr);
      if (idx === -1) {
        // Fallback: if someone is on a subpath not in the list, treat as home
        idx = 0;
      }

      const targetIdx = dx < 0
        ? Math.min(idx + 1, pages.length - 1)  // swipe left -> next
        : Math.max(idx - 1, 0);                // swipe right -> prev

      if (targetIdx !== idx) location.href = pages[targetIdx];
    }
  }

  function onEnd() {
    tracking = false;
  }

  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd, { passive: true });

  // Pointer events fallback (stylus/trackpad)
  window.addEventListener("pointerdown", onStart, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onEnd, { passive: true });
}

/* =========================================================
   Stats counters (Projects / Years / Certificates)
   ========================================================= */
function animateCount(el, target, duration = 1200) {
  const startVal = 0;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = Math.floor(startVal + (target - startVal) * p);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = String(target);
  }
  requestAnimationFrame(tick);
}

function initStats() {
  const stats = document.getElementById("stats");
  if (!stats) return;

  // Use data-* if present, otherwise the defaults above
  const cfg = {
    projects: Number(stats.dataset.fallbackProjects || STATS_DEFAULTS.projects),
    certs: Number(stats.dataset.fallbackCerts || STATS_DEFAULTS.certs),
    startYear: Number(stats.dataset.startYear || STATS_DEFAULTS.startYear),
  };

  const years = Math.max(1, new Date().getFullYear() - cfg.startYear);

  const elP = document.getElementById("countProjects");
  const elY = document.getElementById("countYears");
  const elC = document.getElementById("countCerts");

  const run = () => {
    if (elP) animateCount(elP, cfg.projects);
    if (elY) animateCount(elY, years);
    if (elC) animateCount(elC, cfg.certs);
  };

  const io = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          run();
          o.unobserve(en.target);
        }
      });
    },
    { threshold: 0.3 }
  );

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
