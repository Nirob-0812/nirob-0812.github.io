/* =========================================================
   Mobile nav
   ========================================================= */
function toggleNav() {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('open');
}

/* =========================================================
   Footer year
   ========================================================= */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================================================
   Theme toggle (expects a button#themeToggle)
   ========================================================= */
(function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
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
   Certificate GRID (client-side render from /api/certificates)
   ========================================================= */
async function renderCertificates() {
  const grid = document.getElementById('certGrid');
  if (!grid) return; // not on the certificates page

  grid.innerHTML = '<div class="info">Loading certificates…</div>';

  try {
    const res = await fetch('/api/certificates/');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = '<div class="info">No certificates yet.</div>';
      return;
    }

    grid.innerHTML = items.map(c => `
      <article class="cert-card">
        <div class="cert-thumb">
          <img src="${c.image}" alt="${c.title}">
        </div>
        <div class="cert-body">
          <h3>${c.title}</h3>
          <div class="cert-meta">${c.issuer} · ${c.date}</div>
          <div class="cert-actions">
            <a class="btn verify" href="${c.verify_url}" target="_blank" rel="noopener">Verify</a>
            <button class="btn ghost view" data-cert-view="${c.image}">View</button>
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
   Certificate full-image MODAL (delegated handlers)
   ========================================================= */
(function setupCertModal() {
  const modal = document.getElementById('certModal');
  const imgEl  = document.getElementById('certImg');
  if (!modal || !imgEl) return;

  // Open (delegation so it works for dynamically injected cards)
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

  // Close on backdrop click or Close button
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-close')) {
      imgEl.src = '';
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }
  });

  // ESC to close
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
   Animate stats when visible
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

(function setupStatsCounter() {
  const container = document.getElementById('stats');
  if (!container) return;

  const run = () => {
    container.querySelectorAll('.h-num[data-count]').forEach(el => {
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      animateCount(el, target);
    });
  };

  // Animate once when stats enter the viewport
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        run();
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  io.observe(container);
})();

/* =========================================================
   Init
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  renderCertificates();
});


