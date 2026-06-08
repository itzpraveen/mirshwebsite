import * as THREE from "three";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const body = document.body;

/* ============================================================
   Entrance stagger
   ============================================================ */
requestAnimationFrame(() => body.classList.add("is-loaded"));

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

/* ============================================================
   Header: scrolled state + dark/light theme over hero
   ============================================================ */
const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");

const setHeaderScrolled = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};
setHeaderScrolled();
window.addEventListener("scroll", setHeaderScrolled, { passive: true });

// Switch header colour scheme when the dark hero leaves the top band.
const themeObserver = new IntersectionObserver(
  ([entry]) => {
    body.dataset.theme = entry.isIntersecting ? "dark" : "light";
  },
  { rootMargin: "-79px 0px -55% 0px", threshold: 0 }
);
if (hero) themeObserver.observe(hero);

/* ============================================================
   Mobile navigation
   ============================================================ */
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");

const closeNav = () => {
  nav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open navigation");
  body.classList.remove("nav-open");
};

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  body.classList.toggle("nav-open", isOpen);
});
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));

/* ============================================================
   Scroll reveals
   ============================================================ */
const revealItems = document.querySelectorAll("[data-reveal]");
if (prefersReducedMotion) {
  revealItems.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );
  revealItems.forEach((el) => {
    const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal")) : [el];
    el.style.transitionDelay = `${Math.min(siblings.indexOf(el) * 80, 280)}ms`;
    revealObserver.observe(el);
  });
}

/* ============================================================
   Magnetic buttons / links
   ============================================================ */
if (!prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = 0.32;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });

  /* Card tilt */
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${py * -4}deg) rotateY(${px * 5}deg) translateY(-3px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

/* ============================================================
   Contact form → mailto
   ============================================================ */
const contactForm = document.querySelector("[data-contact-form]");
contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const data = new FormData(contactForm);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const focus = String(data.get("focus") || "").trim();
  const message = String(data.get("message") || "").trim();
  const status = contactForm.querySelector("[data-form-status]");

  const subject = encodeURIComponent(`Project brief from ${name}`);
  const bodyText = encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nProject focus: ${focus}\n\n${message}`
  );

  status.textContent = "Opening your email app…";
  window.location.href = `mailto:hello@mirsh.tech?subject=${subject}&body=${bodyText}`;
});

/* ============================================================
   Three.js — flow field with luminous trails
   ------------------------------------------------------------
   Thousands of particles are advected along an evolving
   curl-noise vector field, leaving fading light-threads
   (feedback trails via ping-pong render targets). The flow
   swirls around the cursor. Reads as "currents of intelligence".
   ============================================================ */
const canvas = document.querySelector("[data-webgl]");

/* ---- compact 3D value noise (for a divergence-free curl field) ---- */
function hash3(i, j, k) {
  let n = (i | 0) * 374761393 + (j | 0) * 668265263 + (k | 0) * 1274126177;
  n = (n ^ (n >> 13)) >>> 0;
  n = (n * 1274126177) >>> 0;
  n = (n ^ (n >> 16)) >>> 0;
  return n / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smooth(xf), v = smooth(yf), w = smooth(zf);
  const c000 = hash3(xi, yi, zi),     c100 = hash3(xi + 1, yi, zi);
  const c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
  const c001 = hash3(xi, yi, zi + 1),     c101 = hash3(xi + 1, yi, zi + 1);
  const c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

function initFlowField() {
  if (!canvas || prefersReducedMotion) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: false });
  } catch (e) {
    return; // WebGL unavailable — CSS gradient fallback stays.
  }
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);

  const isSmall = window.innerWidth < 760;
  const COUNT = isSmall ? 1400 : 3400;

  /* ---- particle state (field space is [0,1] x [0,1]) ---- */
  const px = new Float32Array(COUNT);
  const py = new Float32Array(COUNT);
  const life = new Float32Array(COUNT);
  const maxLife = new Float32Array(COUNT);

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);

  const warm = new THREE.Color(0xe79a4d);
  const cool = new THREE.Color(0x6f8dff);
  const pale = new THREE.Color(0xcdd6e6);
  const tmp = new THREE.Color();

  function spawn(i) {
    px[i] = Math.random();
    py[i] = Math.random();
    maxLife[i] = 1.4 + Math.random() * 3.2;
    life[i] = Math.random() * maxLife[i];
    const r = Math.random();
    if (r > 0.86) tmp.copy(warm);
    else if (r > 0.5) tmp.copy(cool);
    else tmp.copy(pale);
    const b = 0.32 + Math.random() * 0.5; // per-particle brightness
    colors[i * 3] = tmp.r * b;
    colors[i * 3 + 1] = tmp.g * b;
    colors[i * 3 + 2] = tmp.b * b;
  }
  for (let i = 0; i < COUNT; i++) spawn(i);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // soft round sprite
  const sprite = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const pMat = new THREE.PointsMaterial({
    size: isSmall ? 4.5 : 5.5,
    sizeAttenuation: false,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pointsScene = new THREE.Scene();
  const points = new THREE.Points(geo, pMat);
  pointsScene.add(points);
  const pointsCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);

  /* ---- ping-pong render targets for the trail feedback ---- */
  const makeRT = () => {
    const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
  };
  let rtA = makeRT();
  let rtB = makeRT();

  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  // fade pass: previous frame, dimmed → leaves trails
  const fadeScene = new THREE.Scene();
  const fadeMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, fade: { value: 0.94 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tDiffuse; uniform float fade;
      void main(){ gl_FragColor = texture2D(tDiffuse, vUv) * fade; }`,
    depthTest: false, depthWrite: false,
  });
  fadeScene.add(new THREE.Mesh(quad, fadeMat));

  // present pass: composite trails over the page, black → transparent
  const presentScene = new THREE.Scene();
  const presentMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tDiffuse;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = c / (c + vec3(0.55));            // soft tone-map for glow
        float a = clamp(max(c.r, max(c.g, c.b)) * 1.5, 0.0, 1.0);
        gl_FragColor = vec4(c, a);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
  });
  presentScene.add(new THREE.Mesh(quad, presentMat));

  /* ---- pointer ---- */
  const mouse = { x: 0.5, y: 0.5, active: false };
  if (window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
      mouse.active = mouse.x >= 0 && mouse.x <= 1 && mouse.y >= 0 && mouse.y <= 1;
    }, { passive: true });
    window.addEventListener("pointerleave", () => { mouse.active = false; });
  }

  /* ---- curl-noise flow grid (rebuilt each frame, evolves with time) ---- */
  const GW = 110, GH = 64;
  const fieldX = new Float32Array(GW * GH);
  const fieldY = new Float32Array(GW * GH);
  const NOISE_SCALE = 3.0;
  const EPS = 0.012;

  function buildField(t) {
    const psi = (a, b) => valueNoise(a, b, t) + 0.5 * valueNoise(a * 2.1 + 11.3, b * 2.1 - 4.7, t * 1.3);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const a = (gx / GW) * NOISE_SCALE;
        const b = (gy / GH) * NOISE_SCALE;
        const vx = (psi(a, b + EPS) - psi(a, b - EPS)) / (2 * EPS);
        const vy = -(psi(a + EPS, b) - psi(a - EPS, b)) / (2 * EPS);
        const idx = gy * GW + gx;
        fieldX[idx] = vx;
        fieldY[idx] = vy;
      }
    }
  }

  function sampleField(fx, fy, out) {
    let gx = fx * (GW - 1), gy = fy * (GH - 1);
    gx = gx < 0 ? 0 : gx > GW - 1 ? GW - 1 : gx;
    gy = gy < 0 ? 0 : gy > GH - 1 ? GH - 1 : gy;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, GW - 1), y1 = Math.min(y0 + 1, GH - 1);
    const tx = gx - x0, ty = gy - y0;
    const i00 = y0 * GW + x0, i10 = y0 * GW + x1, i01 = y1 * GW + x0, i11 = y1 * GW + x1;
    const xa = fieldX[i00] + (fieldX[i10] - fieldX[i00]) * tx;
    const xb = fieldX[i01] + (fieldX[i11] - fieldX[i01]) * tx;
    out.x = xa + (xb - xa) * ty;
    const ya = fieldY[i00] + (fieldY[i10] - fieldY[i00]) * tx;
    const yb = fieldY[i01] + (fieldY[i11] - fieldY[i01]) * tx;
    out.y = ya + (yb - ya) * ty;
  }

  /* ---- sizing ---- */
  let aspect = 1;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    aspect = w / h;
    renderer.setSize(w, h, false);
    rtA.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
    rtB.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
  }
  resize();
  window.addEventListener("resize", resize);

  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  /* ---- loop ---- */
  const SPEED = 0.16;
  const v = { x: 0, y: 0 };
  const clock = new THREE.Clock();
  let firstFrames = 3; // clear both RTs initially

  function step(dt) {
    for (let i = 0; i < COUNT; i++) {
      sampleField(px[i], py[i], v);
      // aspect-correct so motion looks isotropic on screen
      px[i] += (v.x * SPEED * dt);
      py[i] += (v.y * SPEED * dt) * aspect;

      // cursor vortex — threads swirl around the pointer
      if (mouse.active) {
        const dx = px[i] - mouse.x;
        const dy = (py[i] - mouse.y);
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.04) {
          const f = (1 - d2 / 0.04) * 0.9 * dt;
          px[i] += -dy * f;       // tangential swirl
          py[i] += dx * f;
        }
      }

      life[i] += dt;
      if (life[i] > maxLife[i] || px[i] < -0.02 || px[i] > 1.02 || py[i] < -0.02 || py[i] > 1.02) {
        spawn(i);
      }
      positions[i * 3] = px[i];
      positions[i * 3 + 1] = py[i];
      positions[i * 3 + 2] = 0;
    }
    geo.attributes.position.needsUpdate = true;
  }

  function render() {
    // 1) fade previous frame into the new target
    renderer.setRenderTarget(rtB);
    if (firstFrames > 0) { renderer.setClearColor(0x000000, 1); renderer.clear(); }
    fadeMat.uniforms.tDiffuse.value = rtA.texture;
    renderer.render(fadeScene, fsCam);
    // 2) draw glowing points on top (additive, no clear)
    renderer.render(pointsScene, pointsCam);
    // 3) present to screen, composited over the page
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    presentMat.uniforms.tDiffuse.value = rtB.texture;
    renderer.render(presentScene, fsCam);
    // swap
    const t = rtA; rtA = rtB; rtB = t;
    if (firstFrames > 0) firstFrames--;
  }

  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (heroVisible && !document.hidden) {
      buildField(clock.elapsedTime * 0.05);
      step(dt);
      render();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

initFlowField();
