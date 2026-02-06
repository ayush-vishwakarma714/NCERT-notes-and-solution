// script.js — optimized for performance and graceful missing-page handling

// small helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// update copyright year
const yEl = document.getElementById('y');
if (yEl) yEl.textContent = new Date().getFullYear();

// nav toggle for small screens
const nav = document.querySelector('.nav');
const navToggle = document.querySelector('.nav-toggle');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// simple search handler (keeps your original behaviour)
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    if (!q) { location.hash = '#notes'; return; }
    if (q.includes('class')) location.hash = '#classes';
    else location.hash = '#notes';
  });
}

/* ---------- Improved tilt effect (throttled) ---------- */
const tiltEls = $$('[class*="tilt"]');
tiltEls.forEach(el => {
  let rect = null;
  const M = 10; // max degrees
  let rafPending = false;

  function refreshRect() {
    rect = el.getBoundingClientRect();
    el.style.willChange = 'transform';
  }
  function resetTransform() {
    el.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
    el.style.willChange = 'auto';
  }

  function handleMove(event) {
    if (!rect) refreshRect();
    const clientX = event.clientX ?? (event.touches && event.touches[0] && event.touches[0].clientX) ?? 0;
    const clientY = event.clientY ?? (event.touches && event.touches[0] && event.touches[0].clientY) ?? 0;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const rx = (((y / rect.height) - 0.5) * -2 * M);
    const ry = (((x / rect.width) - 0.5) * 2 * M);

    // throttle with rAF
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(6px)`;
        rafPending = false;
      });
    }
  }

  el.addEventListener('mouseenter', refreshRect);
  el.addEventListener('mousemove', handleMove);
  el.addEventListener('mouseleave', resetTransform);

  // touch support — passive listeners for performance
  el.addEventListener('touchstart', refreshRect, { passive: true });
  el.addEventListener('touchmove', handleMove, { passive: true });
  el.addEventListener('touchend', resetTransform, { passive: true });
});


/* ---------- THREE.js scene: optimized and throttled ---------- */
(function initThreeScene() {
  const canvas = document.getElementById('scene');
  if (!canvas || typeof THREE === 'undefined') return;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Scene & Camera
  const scene = new THREE.Scene();
  const hero = document.querySelector('.hero');
  const getHeroHeight = () => Math.max(hero?.offsetHeight || 400, 320);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / getHeroHeight(), 0.1, 100);
  camera.position.set(4, 3, 7);
  camera.lookAt(0, 0.6, 0);

  // Lights (kept minimal)
  scene.add(new THREE.HemisphereLight(0xbddcff, 0x0b1221, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 8, 6);
  scene.add(dir);

  // Desk (simple)
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x0b1428, roughness: 0.8, metalness: 0.1 });
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), deskMat);
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.2;
  scene.add(desk);

  // helper to create book (lightweight geometry)
  function createBook(o = {}) {
    const g = new THREE.BoxGeometry(o.w || 1.2, o.h || 0.2, o.d || 0.9);
    const m = new THREE.MeshStandardMaterial({ color: o.color || 0x1e3a8a, roughness: 0.6 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(o.x || 0, o.y || 0, o.z || 0);
    mesh.rotation.y = o.ry || 0;

    // simple page plane (no heavy sub-geometry)
    const gp = new THREE.BoxGeometry((o.w || 1.2) * 0.94, (o.h || 0.2) * 0.6, (o.d || 0.9) * 0.92);
    const mp = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 1, metalness: 0 });
    const pages = new THREE.Mesh(gp, mp);
    pages.position.set(0, (o.h || 0.2) * 0.05, 0);
    mesh.add(pages);

    scene.add(mesh);
    return mesh;
  }

  // books and pencil group
  const books = [
    createBook({ color: 0x1e3a8a, y: 0, ry: 0.07 }),
    createBook({ color: 0x38bdf8, y: 0.22, ry: -0.05 }),
    createBook({ color: 0x16a34a, y: 0.44, ry: 0.03 }),
    createBook({ color: 0xffd166, y: 0.66, ry: -0.02 })
  ];

  const pencilGroup = new THREE.Group();
  const pencilBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }));
  pencilGroup.add(pencilBody);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x7f5539 }));
  tip.position.y = -0.9;
  pencilGroup.add(tip);
  pencilGroup.rotation.set(0.1, 0.6, -0.2);
  pencilGroup.position.set(1.6, 0.2, 0.6);
  scene.add(pencilGroup);

  // sizing & pixel ratio: adaptive cap
  function setSize() {
    const width = window.innerWidth;
    const height = getHeroHeight();

    // cap pixel ratio to avoid high GPU usage on mobile
    const deviceMem = navigator.deviceMemory || 2; // if undefined, assume 2GB
    const baseDPR = window.devicePixelRatio || 1;
    // if device has low memory or narrow width, reduce pixel ratio
    let cap = baseDPR;
    if (width < 900 || deviceMem < 2) cap = Math.min(baseDPR, 1.25);
    if (width < 600 || deviceMem < 1.5) cap = Math.min(baseDPR, 1);

    renderer.setPixelRatio(Math.min(cap, 2));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  setSize();

  // throttle / fps cap
  let lastFrame = performance.now();
  // choose fps cap: 60 desktop, 30 mobile
  const fpsCap = window.innerWidth < 800 ? 30 : 60;
  const frameInterval = 1000 / fpsCap;

  // animation loop using rAF but with fps cap
  let running = true;
  let t = 0;

  function animate(now) {
    if (!running) return;
    const delta = now - lastFrame;
    if (delta < frameInterval) {
      requestAnimationFrame(animate);
      return;
    }
    lastFrame = now;
    t += 0.01;

    // lightweight animations
    books.forEach((b, i) => {
      b.position.y = 0.22 * i + Math.sin(t + i) * 0.03;
      b.rotation.y += 0.0008 * (i % 2 === 0 ? 1 : -1);
    });
    pencilGroup.position.y = 0.2 + Math.sin(t * 1.2) * 0.05;
    pencilGroup.rotation.z += 0.002;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  // visibility handling: pause when not visible
  function handleVisibility() {
    if (document.hidden) {
      running = false;
    } else {
      if (!running) {
        running = true;
        lastFrame = performance.now();
        requestAnimationFrame(animate);
      }
    }
  }
  document.addEventListener('visibilitychange', handleVisibility);

  // pause when hero is off-screen (saves resources while user scrolls away)
  let heroObserver = null;
  try {
    heroObserver = new IntersectionObserver(entries => {
      const e = entries[0];
      if (!e.isIntersecting) running = false;
      else {
        if (!running) {
          running = true;
          lastFrame = performance.now();
          requestAnimationFrame(animate);
        }
      }
    }, { root: null, threshold: 0.25 });
    heroObserver.observe(hero);
  } catch (err) {
    // IntersectionObserver not supported — fallback to visibility only
  }

  // debounce resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => setSize(), 120);
  });

  // start loop
  requestAnimationFrame(animate);

  // cleanup helper (not necessary now, but useful if you later remove the canvas)
  window.__threeSceneCleanup = function () {
    running = false;
    document.removeEventListener('visibilitychange', handleVisibility);
    if (heroObserver) heroObserver.disconnect();
    renderer.dispose();
    // dispose geometries & materials (if required)
  };
})();


/* ---------- graceful missing-page overlay (lightweight) ---------- */
(function missingPageOverlay() {
  // create overlay once
  const overlayId = 'ncert-missing-overlay';
  if (document.getElementById(overlayId)) return;

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'none';
  overlay.style.zIndex = '99999';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(3,6,15,0.65)';
  overlay.innerHTML = `
    <div style="max-width:520px;background:linear-gradient(180deg,#071226,#071426);padding:20px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);color:#e6eefc;text-align:left">
      <h3 style="margin:0 0 8px 0">Content coming soon</h3>
      <p style="margin:0 0 12px 0;color:#cbd5ff">The page you requested isn't available yet. We're working to add full class/subject content soon. Meanwhile you can:</p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="${overlayId}-close" style="background:transparent;border:1px solid rgba(255,255,255,0.08);padding:8px 10px;border-radius:8px;color:#dbeafe;cursor:pointer">Close</button>
        <a id="${overlayId}-home" href="/index.html" style="background:var(--green);padding:8px 12px;border-radius:8px;color:#07120a;text-decoration:none;font-weight:700">Back to Home</a>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById(`${overlayId}-close`).addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  // intercept clicks on class/subject links that point to local files
  function tryNavigateOrOverlay(e) {
    const anchor = e.target.closest && e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    // only consider same-origin relative local links (avoid external)
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return;

    // allow normal links that are anchors on page
    if (href.startsWith('index.html') || href.startsWith(window.location.pathname)) return;

    // we try a HEAD request to check existence — fallback to overlay on failure
    e.preventDefault();
    const testUrl = href;

    fetch(testUrl, { method: 'HEAD', cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          // page exists, go there
          window.location.href = testUrl;
        } else {
          overlay.style.display = 'flex';
        }
      })
      .catch(() => {
        // network error or not found -> overlay
        overlay.style.display = 'flex';
      });
  }

  document.addEventListener('click', tryNavigateOrOverlay, { capture: true });
})();
