/* =========================================================
   Small helpers
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
   Skeleton helpers
   ========================================================= */
function skeletonProjectCards(count = 6) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `
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
  return out;
}
function skeletonCertCards(count = 6) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `
      <article class="cert-card skeleton-card">
        <div class="cert-thumb"><div class="skeleton skeleton-thumb"></div></div>
        <div class="cert-body">
          <div class="skeleton skeleton-line w-70"></div>
          <div class="skeleton skeleton-line w-40"></div>
        </div>
      </article>`;
  }
  return out;
}

/* =========================================================
   CERTIFICATES — load from API if available
   ========================================================= */
async function renderCertificates() {
  const grid = $id('certGrid');
  if (!grid) return;

  if (!API_BASE) return; // keep your static fallback

  grid.innerHTML = skeletonCertCards(6);

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
   CERTIFICATE MODAL
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
   PROJECTS page — grouped sections + skeleton
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

function getTechs(p) {
  return p.techs || p.tech || p.tags || p.stack || [];
}

async function renderProjects() {
  const mount = $id('projectsApp');
  if (!mount) return;

  if (!API_BASE) return; // leave any static fallback

  mount.innerHTML = skeletonProjectCards(9);

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    if (!Array.isArray(items) || !items.length) {
      mount.innerHTML = '<div class="info">No projects yet.</div>';
      return;
    }

    // group by category
    const grouped = {};
    for (const p of items) {
      const key = p.category || 'other';
      (grouped[key] ||= []).push(p);
    }

    // sections by order
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
    mount.innerHTML = '<div class="info">Failed to load projects.</div>';
  }
}

/* =========================================================
   HOME page — Featured (first 6) + skeleton
   ========================================================= */
async function renderFeatured() {
  const grid = $id('featuredGrid');
  if (!grid) return;

  if (!API_BASE) return; // keep any static featured you put in HTML

  // skeleton
  grid.innerHTML = skeletonProjectCards(6);

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    // first 6 like your FastAPI home view
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
   CONTACT — post to FastAPI if API_BASE is present
   ========================================================= */
function setupContactForm() {
  const form = $id('contactForm');
  if (!form) return;

  const btn  = form.querySelector('button[type="submit"]');
  const okEl = $id('contactOk');
  const errEl= $id('contactErr');

  if (!API_BASE) return; // fallback Formspree

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

// expose for hamburger
window.toggleNav = toggleNav;
