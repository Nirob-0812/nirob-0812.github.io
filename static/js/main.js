/* =============================
   CONFIG: your Render API base
   ============================= */
const BASE_API = "https://portfolio-api-z616.onrender.com";

/* try a list of URLs until one works & returns JSON */
async function fetchJSONFrom(urls, init) {
  let lastErr;
  for (const u of urls) {
    try {
      const r = await fetch(u, init);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const ct = r.headers.get("content-type") || "";
      // Some endpoints may return empty body; handle that
      if (!ct.includes("json")) {
        try { await r.text(); return {}; } catch { return {}; }
      }
      return await r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All URLs failed");
}

/* Convenience */
async function getJSON(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const ct = r.headers.get("content-type") || "";
  return ct.includes("json") ? r.json() : {};
}

/* =============================
   Mobile nav
   ============================= */
function toggleNav() {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('open');
}

/* =============================
   Footer year
   ============================= */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =============================
   Theme toggle
   ============================= */
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

/* =============================
   Active nav item
   ============================= */
(function setActiveNav() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  document.querySelectorAll('.nav a[href]').forEach(a => {
    try {
      const href = new URL(a.href, location.origin).pathname.replace(/\/+$/, "") || "/";
      if (href === path) a.classList.add('active');
    } catch(_) {}
  });
})();

/* =============================
   Certificates (works already)
   ============================= */
async function renderCertificates() {
  const grid = document.getElementById('certGrid');
  if (!grid) return;

  try {
    const data = await fetchJSONFrom([
      `${BASE_API}/api/certificates/`,
      `${BASE_API}/api/certificates`
    ]);
    if (!Array.isArray(data) || data.length === 0) return; // keep fallback

    grid.innerHTML = data.map(c => `
      <article class="cert-card">
        <div class="cert-thumb">
          <img src="${c.image}" alt="${c.title}">
        </div>
        <div class="cert-body">
          <h3>${c.title}</h3>
          <div class="cert-meta">${c.issuer ?? ""}${c.date ? " · " + c.date : ""}</div>
          <div class="cert-actions">
            ${c.verify_url ? `<a class="btn verify" href="${c.verify_url}" target="_blank" rel="noopener">Verify</a>` : ""}
            <button class="btn ghost view" data-cert-view="${c.image}">View</button>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.warn("Cert API failed, keeping fallback:", err);
  }
}

/* =============================
   Projects (now tries both URL styles and shapes)
   ============================= */
async function renderProjects() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  try {
    const data = await fetchJSONFrom([
      `${BASE_API}/api/projects/`,
      `${BASE_API}/api/projects`
    ]);

    // Accept multiple shapes
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.items)) items = data.items;
    else if (Array.isArray(data.projects)) items = data.projects;
    else if (Array.isArray(data.sections)) {
      data.sections.forEach(s => {
        if (Array.isArray(s.projects)) items.push(...s.projects);
      });
    }

    if (!items.length) return; // keep fallback

    grid.innerHTML = items.map(p => {
      const tags = Array.isArray(p.tags) ? p.tags.map(t => `<span class="tag">${t}</span>`).join('') : '';
      const href = p.url || '#';
      return `
        <a class="project-card" href="${href}" ${p.url ? 'target="_blank" rel="noopener"' : ''}>
          <h3>${p.title ?? 'Untitled Project'}</h3>
          <p>${p.description ?? ''}</p>
          <div class="tags">${tags}</div>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.warn("Projects API failed, keeping fallback:", err);
  }
}

/* =============================
   Certificate modal
   ============================= */
(function setupCertModal() {
  const modal = document.getElementById('certModal');
  const imgEl  = document.getElementById('certImg');
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

/* =============================
   Contact form -> API (CORS-safe)
   With non-JS fallback (form action posts to Render).
   ============================= */
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const alertBox = document.getElementById('contactAlert');
  const setAlert = (msg, ok=false) => {
    if (!alertBox) return;
    alertBox.style.display = 'block';
    alertBox.className = `alert ${ok ? 'success' : ''}`;
    alertBox.textContent = msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      name: (fd.get('name') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      subject: (fd.get('subject') || '').toString().trim(),
      message: (fd.get('message') || '').toString().trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setAlert('Please fill name, email and message.');
      return;
    }

    try {
      const res = await fetch(`${BASE_API}/api/contact/`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
      }
      form.reset();
      setAlert('Thanks! Your message has been sent.', true);
    } catch (err) {
      console.error(err);
      setAlert('Sorry, failed to send your message. Please try again.');
    }
  });
}

/* =============================
   Stats animation
   ============================= */
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

/* =============================
   Init
   ============================= */
document.addEventListener('DOMContentLoaded', () => {
  renderCertificates();
  renderProjects();
  setupContactForm();
});
