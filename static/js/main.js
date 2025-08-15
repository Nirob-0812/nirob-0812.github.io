/* =========================================================
   Small helpers / config
   ========================================================= */
(function establishApiBase() {
  // Accept data-api="https://..."  OR  data-api-base="https://..."
  const b = document.body || document.documentElement;
  const looksUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);
  let base = '';

  if (looksUrl(b.dataset.api)) base = b.dataset.api;
  else if (looksUrl(b.dataset.apiBase)) base = b.dataset.apiBase;

  window.API_BASE = base ? base.replace(/\/+$/, '') : '';
})();
const API_BASE = window.API_BASE;

const $id = (sel) => document.getElementById(sel);
const esc = (s) =>
  (s ?? '').toString().replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* =========================================================
   Mobile nav
   ========================================================= */
function toggleNav() {
  const nav = $id('nav');
  if (nav) nav.classList.toggle('open');
}
window.toggleNav = toggleNav;

/* =========================================================
   Footer year
   ========================================================= */
const yearEl = $id('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================================================
   Theme toggle
   ========================================================= */
(function initThemeToggle() {
  const btn = $id('themeToggle');
  if (!btn) return;

  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  if (saved) root.setAttribute('data-theme', saved);

  btn.addEventListener('click', () => {
    const curr = root.getAttribute('data-theme') || 'dark';
    const next = curr === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* =========================================================
   Active nav item
   ========================================================= */
(function setActiveNav() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.nav a[href]').forEach(a => {
    try {
      const href = new URL(a.href, location.origin).pathname.replace(/\/+$/, '') || '/';
      if (href === path) a.classList.add('active');
    } catch (_) {}
  });
})();

/* =========================================================
   Skeleton helpers (same look as Featured)
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
  const w = window.innerWidth || document.documentElement.clientWidth || 1024;
  if (w < 480)  return 4;
  if (w < 768)  return 6;
  if (w < 1024) return 8;
  if (w < 1440) return 12;
  return 16;
}
function renderSkeletonGridInto(container, count) {
  container.innerHTML = `<div class="project-grid">${Array.from({length: count}).map(skeletonCard).join('')}</div>`;
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
function setAndAnimateCount(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('data-count', String(value));
  animateCount(el, value);
}
async function loadAndAnimateStats() {
  const startYear = parseInt(document.body.dataset.expStartYear || '2021', 10);
  const years = Math.max(1, (new Date()).getFullYear() - startYear);

  if (!API_BASE) { setAndAnimateCount('#countYears', years); return; }

  try {
    const [prjRes, certRes] = await Promise.all([
      fetch(`${API_BASE}/api/projects/`, {cache:'no-store'}),
      fetch(`${API_BASE}/api/certificates/`, {cache:'no-store'})
    ]);
    const [projects, certs] = await Promise.all([prjRes.json(), certRes.json()]);
    setAndAnimateCount('#countProjects', Array.isArray(projects) ? projects.length : 0);
    setAndAnimateCount('#countCerts',    Array.isArray(certs)    ? certs.length    : 0);
    setAndAnimateCount('#countYears', years);
  } catch (err) {
    console.error('stats load failed', err);
    setAndAnimateCount('#countYears', years);
  }
}
(function setupStatsObserver() {
  const container = $id('stats');
  if (!container) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadAndAnimateStats();
        obs.disconnect();
      }
    });
  }, { threshold: 0.3 });
  io.observe(container);
})();

/* =========================================================
   Certificates (API + skeleton + wait for images)
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
  const waitOne = (url) => new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    const done = () => resolve();
    img.onload = img.onerror = done;
    img.src = url;
    if (img.decode) { img.decode().then(done).catch(done); }
  });
  const all = Promise.all(urls.map(waitOne));
  const timer = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([all, timer]);
}
async function renderCertificates() {
  const grid = document.getElementById('certGrid');
  if (!grid) return;

  if (!API_BASE) return; // keep static fallback when no API

  // Show skeletons and keep them if fetch fails (no error message)
  const count = Math.max(6, Math.min(12, skeletonCountForViewport()));
  grid.innerHTML = Array.from({ length: count }).map(certSkeletonCard).join('');

  try {
    const res = await fetch(`${API_BASE}/api/certificates/`, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return; // keep skeletons

    // Build final HTML
    const html = items.map(c => `
      <article class="cert-card">
        <div class="cert-thumb">
          <img src="${esc(c.image)}" alt="${esc(c.title)}">
        </div>
        <div class="cert-body">
          <h3>${esc(c.title)}</h3>
          <div class="cert-meta">
            ${esc(c.issuer || '')}${c.date ? ' · ' + esc(c.date) : ''}
          </div>
          <div class="cert-actions">
            ${c.verify_url ? `<a class="btn verify" href="${esc(c.verify_url)}" target="_blank" rel="noopener">Verify</a>` : ''}
            <button class="btn ghost view" data-cert-view="${esc(c.image)}">View</button>
          </div>
        </div>
      </article>
    `).join('');

    // Wait for images then swap
    await preloadImages(items.map(i => i.image));
    grid.innerHTML = html;
  } catch (err) {
    console.error('certificates load failed:', err);
    // leave skeletons on error
  }
}

/* =========================================================
   Projects page — skeleton like Featured
   ========================================================= */
const CATEGORY_TITLES = {
  dl: 'Deep Learning / CV',
  ml: 'Machine Learning',
  web: 'Web',
  app: 'Apps (Flutter)',
  algo: 'Programming & Algorithms',
  robotics: 'Robotics',
  notebook: 'Notebooks / Study',
  other: 'Other'
};
const CATEGORY_ORDER = ['dl', 'ml', 'web', 'app', 'algo', 'robotics', 'notebook', 'other'];
function getTechs(p) { return p.techs || p.tech || p.tags || p.stack || []; }

let projectSkeletonResizeHandler = null;

async function renderProjects() {
  const mount = $id('projectsApp');
  if (!mount) return;

  if (!API_BASE) return; // static fallback when no API

  const drawSkeleton = () => renderSkeletonGridInto(mount, skeletonCountForViewport());
  drawSkeleton();
  projectSkeletonResizeHandler = () => drawSkeleton();
  window.addEventListener('resize', projectSkeletonResizeHandler, { passive: true });

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    window.removeEventListener('resize', projectSkeletonResizeHandler);
    projectSkeletonResizeHandler = null;

    if (!Array.isArray(items) || !items.length) {
      mount.innerHTML = '<div class="info">No projects yet.</div>';
      return;
    }

    const grouped = {};
    for (const p of items) (grouped[p.category || 'other'] ||= []).push(p);

    let html = '';
    for (const key of CATEGORY_ORDER) {
      const list = grouped[key];
      if (!list || !list.length) continue;

      html += `<section class="project-section">
        <h2 class="section-title">${esc(CATEGORY_TITLES[key] || key)}</h2>
        <div class="project-grid">`;

      for (const p of list) {
        const techs = getTechs(p);
        const href  = p.url || p.href || '#';
        const desc  = p.summary || p.desc || p.description || '';
        html += `
          <a class="project-card" ${href && href !== '#' ? `href="${esc(href)}" target="_blank" rel="noopener"` : 'href="#"'}>
            <h3>${esc(p.title)}</h3>
            <p>${esc(desc)}</p>
            <div class="tags">
              ${(Array.isArray(techs) ? techs : []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
          </a>`;
      }

      html += `</div></section>`;
    }

    mount.innerHTML = html || '<div class="info">No projects available.</div>';
  } catch (err) {
    console.error(err);
    window.removeEventListener('resize', projectSkeletonResizeHandler);
    projectSkeletonResizeHandler = null;
    mount.innerHTML = '<div class="info">Failed to load projects.</div>';
  }
}

/* =========================================================
   Home — Featured (first 6) + skeleton
   ========================================================= */
async function renderFeatured() {
  const grid = $id('featuredGrid');
  if (!grid) return;

  if (!API_BASE) return; // keep any static featured

  grid.innerHTML = Array.from({length: 6}).map(skeletonCard).join('');

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    const featured = (Array.isArray(items) ? items.slice(0, 6) : []);
    if (!featured.length) return; // leave skeletons

    grid.innerHTML = featured.map(p => {
      const href  = p.url || p.href || '#';
      const desc  = p.summary || p.desc || p.description || '';
      const techs = getTechs(p);
      return `
        <a class="project-card" ${href && href !== '#' ? `href="${esc(href)}" target="_blank" rel="noopener"` : 'href="#"'}>
          <h3>${esc(p.title)}</h3>
          <p>${esc(desc)}</p>
          <div class="tags">
            ${(Array.isArray(techs) ? techs : []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
          </div>
        </a>`;
    }).join('');
  } catch (err) {
    console.error(err);
    // keep skeletons on error
  }
}

/* =========================================================
   Certificate Modal
   ========================================================= */
(function setupCertModal() {
  const modal = $id('certModal');
  const imgEl  = $id('certImg');
  if (!modal || !imgEl) return;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-cert-view]');
    if (!trigger) return;
    e.preventDefault();
    const src = trigger.getAttribute('data-cert-view');
    if (!src) return;

    imgEl.src = src;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-close')) {
      imgEl.src = '';
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      imgEl.src = '';
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }
  });
})();

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  renderFeatured();
  renderProjects();
  renderCertificates();
});
