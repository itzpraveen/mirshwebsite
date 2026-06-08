import * as THREE from "three";

/* ============================================================
   Hero centerpiece — morphing wireframe sphere
   A fine clay/ink wireframe icosphere that slowly breathes,
   rotates, and tilts toward the cursor. Glowing node points
   sit on its surface. Light, minimal, futuristic.
   ============================================================ */

const canvas = document.querySelector("[data-webgl]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* compact 3D value noise */
function hash(i, j, k) {
  let n = (i | 0) * 374761393 + (j | 0) * 668265263 + (k | 0) * 1274126177;
  n = (n ^ (n >> 13)) >>> 0;
  n = (n * 1274126177) >>> 0;
  n = (n ^ (n >> 16)) >>> 0;
  return n / 4294967295;
}
const sm = (t) => t * t * (3 - 2 * t);
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = sm(xf), v = sm(yf), w = sm(zf);
  const c000 = hash(xi, yi, zi), c100 = hash(xi + 1, yi, zi);
  const c010 = hash(xi, yi + 1, zi), c110 = hash(xi + 1, yi + 1, zi);
  const c001 = hash(xi, yi, zi + 1), c101 = hash(xi + 1, yi, zi + 1);
  const c011 = hash(xi, yi + 1, zi + 1), c111 = hash(xi + 1, yi + 1, zi + 1);
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

if (canvas) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch (e) {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.3);

  const group = new THREE.Group();
  group.rotation.x = 0.2;
  scene.add(group);

  const R = 1.36;
  const AMP = 0.24;
  const FREQ = 1.5;

  /* ---- wireframe lines ---- */
  const wire = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R, 3));
  const wpos = wire.attributes.position;
  const WN = wpos.count;
  const wdir = new Float32Array(WN * 3);
  for (let i = 0; i < WN; i++) {
    const x = wpos.getX(i), y = wpos.getY(i), z = wpos.getZ(i);
    const r = Math.hypot(x, y, z) || 1;
    wdir[i * 3] = x / r; wdir[i * 3 + 1] = y / r; wdir[i * 3 + 2] = z / r;
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0x1a1814, transparent: true, opacity: 0.4 });
  const lines = new THREE.LineSegments(wire, lineMat);
  lines.frustumCulled = false;
  group.add(lines);

  /* ---- node points on the surface ---- */
  const dotSrc = new THREE.IcosahedronGeometry(R, 2);
  const dpos = dotSrc.attributes.position;
  const DN = dpos.count;
  const ddir = new Float32Array(DN * 3);
  const dotPositions = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    const x = dpos.getX(i), y = dpos.getY(i), z = dpos.getZ(i);
    const r = Math.hypot(x, y, z) || 1;
    ddir[i * 3] = x / r; ddir[i * 3 + 1] = y / r; ddir[i * 3 + 2] = z / r;
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));

  const dotTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const dotMat = new THREE.PointsMaterial({
    color: 0xbf7a3f,
    map: dotTex,
    size: 0.07,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    opacity: 0.95,
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  group.add(dots);

  function displace(t) {
    for (let i = 0; i < WN; i++) {
      const dx = wdir[i * 3], dy = wdir[i * 3 + 1], dz = wdir[i * 3 + 2];
      const n = noise3(dx * FREQ + t * 0.16, dy * FREQ - t * 0.05, dz * FREQ + t * 0.1);
      const r = R + (n - 0.5) * AMP;
      wpos.setXYZ(i, dx * r, dy * r, dz * r);
    }
    wpos.needsUpdate = true;
    for (let i = 0; i < DN; i++) {
      const dx = ddir[i * 3], dy = ddir[i * 3 + 1], dz = ddir[i * 3 + 2];
      const n = noise3(dx * FREQ + t * 0.16, dy * FREQ - t * 0.05, dz * FREQ + t * 0.1);
      const r = R + (n - 0.5) * AMP;
      dotPositions[i * 3] = dx * r;
      dotPositions[i * 3 + 1] = dy * r;
      dotPositions[i * 3 + 2] = dz * r;
    }
    dotGeo.attributes.position.needsUpdate = true;
  }

  /* ---- pointer parallax ---- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("pointermove", (e) => {
      ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);

  const clock = new THREE.Clock();

  // Draw an initial frame immediately so the form is visible right away,
  // even before the animation loop ramps up.
  displace(0);
  renderer.render(scene, camera);

  if (reduce) return;

  function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    displace(t);
    ptr.x += (ptr.tx - ptr.x) * 0.05;
    ptr.y += (ptr.ty - ptr.y) * 0.05;
    group.rotation.y += 0.0016;
    group.rotation.x = 0.2 + ptr.y * 0.28;
    group.rotation.z = ptr.x * 0.05;
    group.position.x = ptr.x * 0.12;
    const s = 1 + Math.sin(t * 0.6) * 0.014;
    group.scale.setScalar(s);
    renderer.render(scene, camera);
  }
  loop();
}
