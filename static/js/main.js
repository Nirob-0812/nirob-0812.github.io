/* =========================================================
   Small helpers / config
   ========================================================= */
const D = document;
const $id = (sel) => D.getElementById(sel);
const esc = (s) =>
  (s ?? '').toString().replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const bodyData = D.body?.dataset || {};
// Accept either data-api="<url>" OR data-api="on" + data-api-base="<url>"
const API_BASE = (bodyData.api && bodyData.api !== 'off')
  ? (bodyData.apiBase || bodyData.api).replace(/\/+$/, '')
  : '';

/* =========================================================
   Mobile nav
   ========================================================= */
function toggleNav() {
  const nav = $id('nav');
  const btn = D.querySelector('.hamburger');
  if (!nav) return;
  nav.classList.toggle('open');
  if (btn) btn.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
}
window.toggleNav = toggleNav;

// Close the mobile menu when tapping/clicking outside it (or pressing Esc)
function setupNavOutsideClose() {
  const nav = $id('nav');
  const btn = D.querySelector('.hamburger');
  if (!nav || !btn) return;

  const isOutside = (t) => !nav.contains(t) && !btn.contains(t);

  const onAnyPointer = (e) => {
    if (!nav.classList.contains('open')) return;
    const target = e.target;
    if (isOutside(target)) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  };

  D.addEventListener('click', onAnyPointer, { capture: true });
  D.addEventListener('touchstart', onAnyPointer, { passive: true, capture: true });

  // Close on Esc
  D.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // If a link inside the menu is tapped, close it immediately
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
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

  const root = D.documentElement;
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
  D.querySelectorAll('.nav a[href]').forEach(a => {
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
  const w = window.innerWidth || D.documentElement.clientWidth || 1024;
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
  const grid = $id('certGrid');
  if (!grid) return;
  if (!API_BASE) return; // keep any static fallback

  const count = Math.max(6, Math.min(12, skeletonCountForViewport()));
  grid.innerHTML = Array.from({ length: count }).map(certSkeletonCard).join('');

  try {
    const res = await fetch(`${API_BASE}/api/certificates/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return;

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

    await preloadImages(items.map(i => i.image));
    grid.innerHTML = html;
  } catch (err) {
    console.error(err);
    // keep skeleton if you prefer; otherwise show a message:
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

  D.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-cert-view]');
    if (!trigger) return;
    e.preventDefault();
    const src = trigger.getAttribute('data-cert-view');
    if (!src) return;

    imgEl.src = src;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    D.body.classList.add('no-scroll');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-close')) {
      imgEl.src = '';
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      D.body.classList.remove('no-scroll');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      imgEl.src = '';
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      D.body.classList.remove('no-scroll');
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
  if (!API_BASE) return;

  const drawSkeleton = () => renderSkeletonGridInto(mount, skeletonCountForViewport());
  drawSkeleton();
  projectSkeletonResizeHandler = () => drawSkeleton();
  window.addEventListener('resize', projectSkeletonResizeHandler, { passive: true });

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: 'omit' });
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
  if (!API_BASE) return;

  grid.innerHTML = Array.from({length: 6}).map(skeletonCard).join('');

  try {
    const res = await fetch(`${API_BASE}/api/projects/`, { credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    const featured = (Array.isArray(items) ? items.slice(0, 6) : []);
    if (!featured.length) return;

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
   Tablet swipe navigation (left/right) between pages
   ========================================================= */
function enableSwipePageNav() {
  // Only for tablet-ish widths
  const isTabletWidth = () => {
    const w = window.innerWidth || D.documentElement.clientWidth || 1024;
    return w >= 600 && w <= 1100;
  };

  // Map page order
  const pages = ['/index.html', '/about.html', '/projects.html', '/resume.html', '/certificates.html'];
  const normalize = (p) => (p === '/' ? '/index.html' : p);

  let startX = 0, startY = 0, tracking = false;

  const ignoreTarget = (t) => !!t.closest('a, button, input, textarea, select, label, .no-swipe, .nav');

  function onStart(e) {
    if (!isTabletWidth()) return;
    const t = (e.touches && e.touches[0]) || e;
    if (!t || ignoreTarget(e.target)) return;
    // Don’t start when menu is open
    const nav = $id('nav');
    if (nav && nav.classList.contains('open')) return;

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
      const curr = normalize(location.pathname.replace(/\/+$/, '') || '/index.html');
      const idx = pages.indexOf(curr);
      if (idx === -1) return;
      const targetIdx = dx < 0 ? Math.min(idx + 1, pages.length - 1)  // swipe left → next
                               : Math.max(idx - 1, 0);                // swipe right → prev
      if (targetIdx !== idx) location.href = pages[targetIdx];
    }
  }

  function onEnd() { tracking = false; }

  window.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove',  onMove,  { passive: true });
  window.addEventListener('touchend',   onEnd,   { passive: true });

  // Pointer events fallback (stylus/trackpad)
  window.addEventListener('pointerdown', onStart, { passive: true });
  window.addEventListener('pointermove', onMove,  { passive: true });
  window.addEventListener('pointerup',   onEnd,   { passive: true });
}

/* =========================================================
   Stats counters (Projects / Years / Certificates)
   ========================================================= */
function animateCount(el, target, duration = 1200) {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  const to = Number(target) || 0;
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = Math.floor(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = String(to);
  }
  requestAnimationFrame(tick);
}

async function updateAndAnimateStats() {
  const box = document.getElementById('stats');
  if (!box) return;

  const elProjects = document.getElementById('countProjects');
  const elYears    = document.getElementById('countYears');
  const elCerts    = document.getElementById('countCerts');

  // Fallbacks from HTML
  let projects = parseInt(box.dataset.fallbackProjects || '0', 10);
  let certs    = parseInt(box.dataset.fallbackCerts || '0', 10);
  const startY = parseInt(box.dataset.startYear || '2021', 10);
  let years    = Math.max(1, new Date().getFullYear() - startY);

  // Try API counts
  if (API_BASE) {
    try {
      const [pr, cr] = await Promise.all([
        fetch(`${API_BASE}/api/projects/`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/api/certificates/`).then(r => r.ok ? r.json() : []),
      ]);
      if (Array.isArray(pr)) projects = pr.length;
      if (Array.isArray(cr)) certs    = cr.length;
    } catch (_) { /* keep fallbacks */ }
  }

  const run = () => {
    animateCount(elProjects, projects);
    animateCount(elYears, years);
    animateCount(elCerts, certs);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          run();
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    io.observe(box);
  } else {
    // very old browsers: run immediately
    run();
  }
}


/* =========================================================
   
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  setupNavOutsideClose();
  enableSwipePageNav();

  renderFeatured();
  renderProjects();
  renderCertificates();
  setupContactForm();

  updateAndAnimateStats();   // <-- ensure this line exists
});

