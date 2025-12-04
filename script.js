/* ========== Three.js placeholder. Paste your graph inside initOntography() ========== */
let scene, camera, renderer, controls, clock;
let planetGroup, ringCarrier;
let animationId, resizeObs;

const TAGS = [
  "Human Identity","Subjectivity","Self / Self-Sense","Body / Embodiment","Personhood",
  "Visibility / Invisibility","Fragmentation","Ownership","Otherness","Authenticity",
  "Dataset","Label / Annotation","Token","Category","Class","Feature","Attribute",
  "Bird’s-eye Label","Visual Fragment","Statistical Category","Machine-Readable","Metadata",
  "Bias","Consent","Collection / Data Collection Method","Pattern Recognition","Prediction",
  "Algorithm","Deep Learning","Model","Training","Inference","Representation Learning",
  "Generalization","Visual Culture","Interface","Perception","Physicalization","Material System",
  "Sensor","Screen","Glitch / Distortion","Visibility / Invisibility","Representation","Ethics",
  "Consent","Power","Surveillance","Privacy","Identity Politics","Categorization & Exclusion",
  "Inequality","Normativity","Agency","Ecosystem","Network","Media Ecosystem","Hybrid Form",
  "Community of Practice","Production / Distribution","Environment (both physical & conceptual)",
  "System","Space (physical & interface)"
];

const PLANET_RADIUS = 3.6;
const RING_COUNT = 3;
const RING_SLOTS = [26, 22, 18];
const RING_RADII = [7.2, 6.0, 4.9];
const RING_TILT_DEG = 18;
const RING_SPEEDS = [0.8, -0.6, 0.4];
const CUBE_BASE = 0.18;
const CUBE_DEPTH = 0.18;
const LABEL_Y_OFFSET = 0.26;
const LABEL_FONT_SIZE = 10;
const LABEL_VISIBLE = true;
const ASCII_LEVELS = 6;
const USE_LIGHTING = false;

let _timeAcc = 0;

/**
 * Initialize the graph into a canvas or selector.
 * Example: initOntography('#ontographyCanvas') or initOntography(canvasEl)
 */
function initOntography(target = '#ontographyCanvas') {
  const canvas = (typeof target === 'string') ? document.querySelector(target) : target;
  if (!canvas) {
    console.warn('initOntography: canvas not found:', target);
    return;
  }

  // SCENE
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdcdcdc);

  // CAMERA (we’ll set aspect in sizeCanvas())
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.set(0, 0, 13);

  // RENDERER
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // CONTROLS
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 40;
  controls.target.set(0, 0.6, 0);

  if (USE_LIGHTING) addBasicLighting();

  // CONTENT
  createPlanet();
  createAsciiRings();

  // CLOCK
  clock = new THREE.Clock();

  // SIZE + RESIZE
  sizeCanvas(canvas);
  window.addEventListener('resize', () => sizeCanvas(canvas));
  if ('ResizeObserver' in window) {
    resizeObs = new ResizeObserver(() => sizeCanvas(canvas));
    resizeObs.observe(canvas.parentElement || canvas);
  }

  // GO
  animate();
}

function sizeCanvas(canvas) {
  // Use the canvas’ parent to size; fallback to its own client rect.
  const parent = canvas.parentElement || canvas;
  const w = Math.max(2, parent.clientWidth || 600);
  const h = Math.max(2, parent.clientHeight || 400);

  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function addBasicLighting() {
  const amb = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(6, 10, 8);
  scene.add(dir);
}

// --------------------------- Planet ---------------------------
function createPlanet() {
  planetGroup = new THREE.Group();
  scene.add(planetGroup);

  const planetGeo = new THREE.SphereGeometry(PLANET_RADIUS, 42, 28);
  const planetMat = USE_LIGHTING
    ? new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, metalness: 0.02 })
    : new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planetGroup.add(planet);

  const wf = new THREE.WireframeGeometry(new THREE.SphereGeometry(PLANET_RADIUS * 0.999, 16, 12));
  const wline = new THREE.LineSegments(
    wf,
    new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.35 })
  );
  planetGroup.add(wline);
}

// ---------------------- ASCII Rings ----------------------
function createAsciiRings() {
  ringCarrier = new THREE.Group();
  scene.add(ringCarrier);

  ringCarrier.rotation.x = THREE.MathUtils.degToRad(RING_TILT_DEG);

  const tagPool = TAGS.slice();
  const ringDefs = [];

  for (let i = 0; i < RING_COUNT; i++) {
    const slots = RING_SLOTS[i] || Math.ceil(TAGS.length / RING_COUNT);
    const radius = RING_RADII[i] || (PLANET_RADIUS + 1.8 + i * 1.1);
    const items = [];
    for (let s = 0; s < slots; s++) {
      const text = tagPool.length ? tagPool.shift() : '';
      items.push({ text });
    }
    ringDefs.push({ radius, items, speedDeg: RING_SPEEDS[i] || 0.05 * (i % 2 === 0 ? 1 : -1) });
  }

  ringDefs.forEach((def, ringIdx) => {
    const ringGroup = new THREE.Group();
    ringGroup.userData.angularSpeed = THREE.MathUtils.degToRad(def.speedDeg);
    ringCarrier.add(ringGroup);

    const slots = def.items.length;
    const positionsLocal = [];

    for (let i = 0; i < slots; i++) {
      const item = def.items[i];
      const t = i / slots;
      const theta = t * Math.PI * 2;

      const x = Math.cos(theta) * def.radius;
      const z = Math.sin(theta) * def.radius;
      const y = 0;
      positionsLocal.push(new THREE.Vector3(x, y, z));

      const qSize  = quantize01(hash(i + ringIdx * 131), 4);
      const cubeW  = CUBE_BASE * (0.75 + qSize * 1.25);
      const cubeH  = CUBE_BASE * (0.75 + qSize * 1.25);
      const cubeD  = CUBE_DEPTH;

      const qShade = quantize01(hash(i * 13 + ringIdx * 97), ASCII_LEVELS);
      const gray   = 0.25 + 0.65 * qShade;

      const geo = new THREE.BoxGeometry(cubeW, cubeH, cubeD);
      const mat = USE_LIGHTING
        ? new THREE.MeshStandardMaterial({ color: new THREE.Color(gray, gray, gray), roughness: 0.9, metalness: 0.02 })
        : new THREE.MeshBasicMaterial({ color: new THREE.Color(gray, gray, gray) });

      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(x, y, z);
      cube.rotation.set(0, theta + (Math.random() - 0.5) * 0.1, 0);
      ringGroup.add(cube);

      if (LABEL_VISIBLE && item.text) {
        const label = makeLabelSprite(item.text);
        label.position.set(x, y + cubeH * 0.5 + LABEL_Y_OFFSET, z);
        ringGroup.add(label);
      }
    }

    // Perimeter lines
    const segCount = slots;
    const segPositions = new Float32Array(segCount * 2 * 3);
    let w = 0;
    for (let i = 0; i < slots; i++) {
      const a = positionsLocal[i];
      const b = positionsLocal[(i + 1) % slots];
      segPositions[w++] = a.x; segPositions[w++] = a.y; segPositions[w++] = a.z;
      segPositions[w++] = b.x; segPositions[w++] = b.y; segPositions[w++] = b.z;
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(segPositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55 });
    const loopLines = new THREE.LineSegments(lineGeo, lineMat);
    ringGroup.add(loopLines);
    ringGroup.userData.lineMat = lineMat;

    // Chords (optional)
    const chordPositions = new Float32Array(segCount * 2 * 3);
    w = 0;
    for (let i = 0; i < slots; i++) {
      const a = positionsLocal[i];
      const b = positionsLocal[(i + 2) % slots];
      chordPositions[w++] = a.x; chordPositions[w++] = a.y; chordPositions[w++] = a.z;
      chordPositions[w++] = b.x; chordPositions[w++] = b.y; chordPositions[w++] = b.z;
    }
    const chordGeo = new THREE.BufferGeometry();
    chordGeo.setAttribute('position', new THREE.BufferAttribute(chordPositions, 3));
    const chordMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.28 });
    const chords = new THREE.LineSegments(chordGeo, chordMat);
    ringGroup.add(chords);
    ringGroup.userData.chordMat = chordMat;
  });
}

// ---------------------- Animate ----------------------
function animate() {
  animationId = requestAnimationFrame(animate);

  const dt = clock ? clock.getDelta() : 1 / 60;
  _timeAcc += dt;

  if (controls) controls.update();

  if (ringCarrier) {
    for (let i = 0; i < ringCarrier.children.length; i++) {
      const g = ringCarrier.children[i];
      const w = g.userData.angularSpeed || 3;
      g.rotation.y += w * dt;

      // soft opacity pulse for lines
      if (g.userData.lineMat)  g.userData.lineMat.opacity  = 0.45 + 0.15 * (0.5 + 0.5 * Math.sin(_timeAcc * 1.2 + i));
      if (g.userData.chordMat) g.userData.chordMat.opacity = 0.22 + 0.10 * (0.5 + 0.5 * Math.cos(_timeAcc * 0.9 + i));
    }
  }

  renderer.render(scene, camera);
}

// ---------------------- Helpers ----------------------
function makeLabelSprite(text) {
  const pad = 2, fs = LABEL_FONT_SIZE;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = fs + 'px "Roboto Mono", Menlo, Consolas, monospace';
  const tw = Math.ceil(ctx.measureText(text).width);
  canvas.width = tw + pad * 2;
  canvas.height = fs + pad * 2;

  ctx.font = fs + 'px "Roboto Mono", Menlo, Consolas, monospace';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';
  ctx.fillText(text, pad, pad);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sp = new THREE.Sprite(mat);

  const s = 0.0026 * canvas.height; // scale down for world units
  sp.scale.set(canvas.width * s, canvas.height * s, 10);
  return sp;
}

// simple hash 0..1
function hash(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// quantize 0..1 to steps
function quantize01(v, steps) {
  const s = Math.max(1, steps | 0);
  return Math.round(v * (s - 1)) / (s - 1);
}

/** Optional cleanup if you ever remove the canvas dynamically */
function disposeOntography() {
  if (animationId) cancelAnimationFrame(animationId);
  if (resizeObs) resizeObs.disconnect();

  if (scene) {
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
        else obj.material?.dispose?.();
      }
    });
  }
  renderer?.dispose?.();
  controls?.dispose?.();
  window.removeEventListener('resize', sizeCanvas);
}

  
  /* ========== Minimal lightbox for zoomable images (white placeholders) ========== */
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');
  
  
    document.querySelectorAll('a.zoomable').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        // When you replace placeholders, set data-src on anchors; fallback to white
        const src = a.dataset.src;
        lightboxImg.src = src;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });
  
    function closeLB(){
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.src = '';
    }
  
    lightboxClose.addEventListener('click', closeLB);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLB();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLB();
    });
  }
  
  /* Init */
  document.addEventListener('DOMContentLoaded', () => {
    initOntography();
    initLightbox();
  });

  /* ========== NEW: Generic Slideshow Logic for Final Page ========== 
   This function allows any container with specific classes to act as a slideshow
   without hardcoding the ID inside the logic.
*/

function initGenericSlideshow(selector) {
  const root = document.querySelector(selector);
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.ss-slide'));
  const prevBtn = root.querySelector('.ss-prev');
  const nextBtn = root.querySelector('.ss-next');
  
  // Find currently active or default to 0
  let currentIndex = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));

  function updateSlide(newIndex) {
    // Remove active class from all
    slides.forEach(s => s.classList.remove('is-active'));
    
    // Wrap around logic
    currentIndex = (newIndex + slides.length) % slides.length;
    
    // Add active class to new
    slides[currentIndex].classList.add('is-active');
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => updateSlide(currentIndex - 1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => updateSlide(currentIndex + 1));
  }

  // Optional: Connect to existing Lightbox logic if slide is clicked
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  
  slides.forEach(slide => {
    slide.addEventListener('click', () => {
      // Check if it's an image or text div
      const img = slide.querySelector('img');
      const src = img ? img.src : null; // If your placeholder is a DIV with text, this might be null
      
      // If you are using IMG tags inside slides:
      if (src && lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      }
    });
  });
}

/* ========== NEW: Bouncing "DVD" Element Logic ========== */

function initBouncingElement() {
  const el = document.getElementById('bouncing-element');
  const sidebar = document.querySelector('.right'); // The sidebar
  
  if (!el || !sidebar) return;

  // Initial Position and Velocity
  let x = 20;
  let y = 100;
  let dx = 1.5; // Speed X
  let dy = 1.5; // Speed Y
  let width = el.offsetWidth;
  let height = el.offsetHeight;

  function animate() {
    // Get current dimensions
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const sidebarWidth = sidebar.offsetWidth || 300; // Fallback if sidebar hidden
    
    // Calculate the Boundary
    // The visual "Right" edge for the bouncer is the Window Width minus Sidebar Width
    // We add a small buffer (-20px) so it doesn't touch the sidebar line exactly
    const maxX = winWidth - sidebarWidth - width - 20;
    const maxY = winHeight - height;

    // Update position
    x += dx;
    y += dy;

    // Collision Detection (Left/Right)
    if (x <= 0) {
      x = 0;
      dx = -dx;
      triggerGlitch(el); // Optional: Glitch when hitting wall
    } else if (x >= maxX) {
      x = maxX;
      dx = -dx;
      triggerGlitch(el);
    }

    // Collision Detection (Top/Bottom)
    if (y <= 0) {
      y = 0;
      dy = -dy;
      triggerGlitch(el);
    } else if (y >= maxY) {
      y = maxY;
      dy = -dy;
      triggerGlitch(el);
    }

    // Apply Logic
    el.style.transform = `translate(${x}px, ${y}px)`;

    requestAnimationFrame(animate);
  }

  // Helper: Briefly invert colors on hit
  function triggerGlitch(element) {
    const inner = element.querySelector('.bouncer-inner');
    if(inner) {
      inner.style.background = '#fff';
      inner.style.filter = 'invert(1)';
      setTimeout(() => {
        inner.style.background = 'rgba(0,0,0,0.8)';
        inner.style.filter = 'none';
      }, 100);
    }
  }

  // Start
  animate();
  
  // Recalculate dimensions on resize
  window.addEventListener('resize', () => {
    width = el.offsetWidth;
    height = el.offsetHeight;
  });
}
  
document.addEventListener("DOMContentLoaded", function() {
    
    // Configuration
    const imagePath = 'Final_File/long_diagram.png';
    const numberOfGlitches = 15; // How many scattered images you want
    const container = document.getElementById('glitch-container');
    const lightbox = document.getElementById('manifestation-lightbox');
    const closeBtn = document.getElementById('close-lightbox');

    // 1. Generate Scattered Images
    for (let i = 0; i < numberOfGlitches; i++) {
        const img = document.createElement('img');
        img.src = imagePath;
        img.className = 'glitch-thumb';
        
        // Randomize Size (between 100px and 250px width)
        const randomWidth = Math.floor(Math.random() * 150) + 100;
        img.style.width = randomWidth + 'px';
        img.style.height = 'auto';

        // Randomize Position (Keep within container bounds)
        // We use percentages to make it responsive
        const randomTop = Math.floor(Math.random() * 80); // 0% to 80%
        const randomLeft = Math.floor(Math.random() * 80); // 0% to 80%
        
        img.style.top = randomTop + '%';
        img.style.left = randomLeft + '%';
        
        // Randomize Z-Index so they stack differently
        img.style.zIndex = Math.floor(Math.random() * 10);

        // Click Event: Open Lightbox
        img.addEventListener('click', () => {
            lightbox.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Stop background scrolling
        });

        container.appendChild(img);
    }

    // 2. Lightbox Controls
    function closeLightbox() {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }

    closeBtn.addEventListener('click', closeLightbox);

    // Close if clicking outside the image (on the dark background)
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && lightbox.style.display === 'block') {
            closeLightbox();
        }
    });
});