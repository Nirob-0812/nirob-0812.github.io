/* =========================================================
   Small helpers / config
   ========================================================= */
const API_BASE = (document.body.dataset.api && document.body.dataset.api !== 'off')
  ? document.body.dataset.api.replace(/\/+$/, '')
  : '';

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
  const w = window.innerWidth || document.documentElement.clientWidth || 1024;
  if (w < 480)  return 4;   // phones
  if (w < 768)  return 6;   // small tablets
  if (w < 1024) return 8;   // tablets
  if (w < 1440) return 12;  // laptop
  return 16;                // wide desktop
}
function renderSkeletonGridInto(container, count) {
  container.innerHTML = `<div class="project-grid">${Array.from({length: count}).map(skeletonCard).join('')}</div>`;
}

/* =========================================================
   Certificates (API + skeleton)
   ========================================================= */
async function renderCertificates() {
  const grid = $id('certGrid');
  if (!grid || !API_BASE) return; // keep static fallback on GH Pages

  // simple card skeletons
  grid.innerHTML = Array.from({length: 6}).map(() => `
    <article class="cert-card skeleton-card">
      <div class="cert-thumb"><div class="skeleton skeleton-thumb"></div></div>
      <div class="cert-body">
        <div class="skeleton skeleton-line w-70"></div>
        <div class="skeleton skeleton-line w-40"></div>
      </div>
    </article>`).join('');

  try {
    const res = await fetch(`${API_BASE}/api/certificates/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    if (!Array.isArray(items) || !items.length) {
      grid.innerHTML = '<div class="info">No certificates yet.</div>';
      return;
    }

    grid.innerHTML = items.map(c => `
      <article class="cert-card">
        <div class="cert-thumb">
          <img src="${esc(c.image)}" alt="${esc(c.title)}">
        </div>
        <div class="cert-body">
          <h3>${esc(c.title)}</h3>
          <div class="cert-meta">${esc(c.issuer || '')}${c.date ? ' · ' + esc(c.date) : ''}</div>
          <div class="cert-actions">
            ${c.verify_url ? `<a class="btn verify" href="${esc(c.verify_url)}" target="_blank" rel="noopener">Verify</a>` : ''}
            <button class="btn ghost view" data-cert-view="${esc(c.image)}">View</button>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="info">Sorry, failed to load certificates.</div>';
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
   Projects page — skeleton like Featured (no headers while loading)
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

  if (!API_BASE) return; // keep static HTML fallback on GH Pages when no API

  // 1) show a Featured-style grid skeleton (no section names)
  const drawSkeleton = () => renderSkeletonGridInto(mount, skeletonCountForViewport());
  drawSkeleton();
  // keep it responsive while still loading
  projectSkeletonResizeHandler = () => drawSkeleton();
  window.addEventListener('resize', projectSkeletonResizeHandler, { passive: true });

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    // stop updating skeleton
    window.removeEventListener('resize', projectSkeletonResizeHandler);
    projectSkeletonResizeHandler = null;

    if (!Array.isArray(items) || !items.length) {
      mount.innerHTML = '<div class="info">No projects yet.</div>';
      return;
    }

    // 2) replace skeleton with real grouped sections
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
    // stop updating skeleton on error too
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

  // skeleton cards (6)
  grid.innerHTML = Array.from({length: 6}).map(skeletonCard).join('');

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    const featured = (Array.isArray(items) ? items.slice(0, 6) : []);
    if (!featured.length) {
      grid.innerHTML = '<div class="info">No featured projects yet.</div>';
      return;
    }

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
    grid.innerHTML = '<div class="info">Failed to load featured projects.</div>';
  }
}

/* =========================================================
   Contact — post to FastAPI when API_BASE present
   ========================================================= */
function setupContactForm() {
  const form = $id('contactForm');
  if (!form) return;

  const btn  = form.querySelector('button[type="submit"]');
  const okEl = $id('contactOk');
  const errEl= $id('contactErr');

  if (!API_BASE) return; // fallback Formspree action stays

  form.addEventListener('submit', async (e) => {
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
      const res = await fetch(`${API_BASE}/api/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
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
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  renderFeatured();
  renderProjects();
  renderCertificates();
  setupContactForm();
});
