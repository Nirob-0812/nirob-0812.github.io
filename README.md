
# Mehedi Hasan Nirob – Portfolio (Frontend)

Live site → **https://nirob-0812.github.io**  
API (production) → **https://raptezoyqrvjoxtwrkib.supabase.co/functions/v1/api**

This repository contains the **static frontend** for my personal portfolio. It’s a fast, no‑framework site powered by modern CSS and a tiny bit of vanilla JS. The UI fetches projects and certificates from the companion API and includes a polished light/dark theme toggle, animated counters, skeleton loaders, and a mobile‑first navigation.

> **Backend repo:** [`portfolio-api`](https://github.com/Nirob-0812/portfolio-api)  
> **You are here:** `nirob-0812.github.io` (GitHub Pages site)

---

## ✨ Features

- Responsive layout with **fixed, theme-aware header**.
- **Day/Night toggle** with smooth thumb animation and persisted preference.
- **Animated counters** (Projects / Experience / Certificates) that trigger on scroll.
- **Featured Projects** on home + **Projects** page grouped by category.
- **Certificates** grid with image modal, preload, and **skeleton loaders** that match real card size.
- **Contact form** that posts to the FastAPI backend.
- **Tablet swipe** left/right to move between pages.
- Graceful fallbacks if an API isn’t available.
- Clean code: **no frameworks**, just HTML + CSS + JS.

---

## 🗂 Structure

```
/
├─ index.html                # Home
├─ about/
│  └─ index.html             # About page
├─ certificates/
│  └─ index.html             # Certificates page
├─ contact/
│  └─ index.html             # Contact page
├─ projects/
│  └─ index.html             # Projects page
├─ resume/
│  └─ index.html             # Resume page
├─ static/
│  ├─ css/
│  │  └─ style.css           # Stylesheet
│  ├─ js/
│  │  └─ main.js             # JavaScript
│  └─ img/…                  # Images (portrait, favicon, etc.)
├─ LICENSE
└─ README.md

```

---

## 🚀 Run locally

Any static server works. Two simple options:

### Option A — Python
```bash
git clone https://github.com/Nirob-0812/nirob-0812.github.io.git
cd nirob-0812.github.io
python -m http.server 8080
# open http://localhost:8080
```

### Option B — VS Code Live Server
Open the folder in VS Code ⇒ right‑click `index.html` ⇒ “Open with Live Server”.

> The site is fully static; no build step is required.

---

## 🔌 Connect to the API

The frontend reads an API base URL from the `<body>` attribute:
```html
<body data-api="https://raptezoyqrvjoxtwrkib.supabase.co/functions/v1/api">
```
If you want to point to a **local API** while developing:

```html
<body data-api="http://127.0.0.1:8000">
```

### Stats configuration
Counter defaults live in `static/js/main.js` (`STATS_DEFAULTS`).  
You can also override the **experience start year** by adding `data-start-year` to the stats section:
```html
<section id="stats" class="highlights" data-start-year="2021">…</section>
```

---

## 🧩 Pages

- **Home**: hero, skills, animated counters, featured projects (“See all →” link to Projects).
- **Projects**: grouped by category, with tag chips.
- **Certificates**: responsive card grid, preloading + modal viewer.
- **Contact**: posts JSON to the API (`/api/contact/`).

---

## 🌐 Deploy

This repo is named **`nirob-0812.github.io`** so GitHub Pages serves it automatically:
1. Push to `main`.
2. Pages will be available at `https://nirob-0812.github.io`.

> Need pretty URLs (no `.html`)? Use a reverse proxy or a different host that supports SPA-style routing. GitHub Pages serves files as-is.

---

## 🛠 Troubleshooting

- **CORS errors** when hitting the API from Pages → ensure the API enables CORS for your origin. See the [API README](https://github.com/Nirob-0812/portfolio-api#enable-cors).
- **Images flash-in** on certificates → we already preload and size images; slow networks will still need a moment.

---

## 🔗 Related repositories

- Backend (FastAPI): **[`portfolio-api`](https://github.com/Nirob-0812/portfolio-api)**
- This site (GitHub Pages): **[`nirob-0812.github.io`](https://github.com/Nirob-0812/nirob-0812.github.io)**

---

## 👤 Author

**Mehedi Hasan Nirob**  

- [GitHub](https://github.com/Nirob-0812)  
- [X (Twitter)](https://x.com/mhnirob0812)  
- [Email](mailto:mehedihasannirobcsediu@gmail.com)  

---

## 📝 License

MIT — feel free to use parts of this repo for your own portfolio. A link back is appreciated.
