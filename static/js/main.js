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
   CERTIFICATES — load from API if available
   ========================================================= */
async function renderCertificates() {
  const grid = $id('certGrid');
  if (!grid) return;

  // If no API, leave the static fallback that's already in the HTML
  if (!API_BASE) return;

  grid.innerHTML = '<div class="info">Loading certificates…</div>';

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
   PROJECTS — grouped like localhost, with tech chips
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

  // If no API, keep whatever static markup you put in the HTML.
  if (!API_BASE) return;

  mount.innerHTML = '<div class="info">Loading projects…</div>';

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

    // build sections following the localhost order
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
   CONTACT — post to your FastAPI if API_BASE present.
   Falls back to Formspree if API_BASE is empty.
   ========================================================= */
function setupContactForm() {
  const form = $id('contactForm');
  if (!form) return;

  const btn  = form.querySelector('button[type="submit"]');
  const okEl = $id('contactOk');
  const errEl= $id('contactErr');

  // If no API configured, do nothing (let Formspree handle it).
  if (!API_BASE) return;

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
  renderCertificates();
  renderProjects();
  setupContactForm();
});

// expose toggleNav for the hamburger
window.toggleNav = toggleNav;
