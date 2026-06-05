(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (value) => value * value * (3 - 2 * value);

  const darkRoom = document.querySelector('.dark-room');
  const sphereApproach = document.querySelector('.sphere-approach');
  const waitlistForm = document.getElementById('finalWaitlistForm');
  const waitlistEmail = document.getElementById('finalWaitlistEmail');
  const waitlistButton = document.getElementById('finalWaitlistButton');
  const waitlistMessage = document.getElementById('finalWaitlistMessage');
  const waitlistModal = document.getElementById('waitlistSuccessModal');
  const hero = document.querySelector('.hero');
  const howCarousel = document.querySelector('[data-how-carousel]');
  const howSlides = Array.from(document.querySelectorAll('[data-how-slide]'));
  const howCopies = Array.from(document.querySelectorAll('[data-how-copy]'));
  const howPrevButtons = Array.from(document.querySelectorAll('[data-how-prev]'));
  const howNextButtons = Array.from(document.querySelectorAll('[data-how-next]'));
  const howNine = document.querySelector('.how-nine');
  const whatSphere = document.querySelector('.what-sphere-video');
  const whatSphereCanvas = whatSphere ? whatSphere.querySelector('.what-sphere-canvas') : null;
  const heroScoreValue = document.querySelector('[data-hero-score-value]');
  const heroScoreCaption = document.querySelector('[data-hero-score-caption]');
  const heroClock = document.querySelector('[data-hero-clock]');
  const heroClockCanvas = document.querySelector('[data-hero-clock-canvas]');
  const heroTimeValue = document.querySelector('[data-hero-time-value]');
  const heroTimeCaption = document.querySelector('[data-hero-time-caption]');
  const heroWaitlistBtn = document.getElementById('heroWaitlistBtn');
  const heroBtnWrap = document.getElementById('heroBtnWrap');
  const whatSections = [
    document.querySelector('.what-kindred'),
    document.querySelector('.what-chemistry'),
    document.querySelector('.what-journal'),
  ].filter(Boolean);

  let latestProgress = 0;
  let rafPending = false;
  let isNightActive = false;
  let prevNightActive = false;
  let activeHowSlide = 0;
  let howMobileEl = null;
  let howCarouselIsBound = false;
  let heroClock3D = null;
  let darkRoomClockTransiting = false;
  let orbitRings3D = null;
  let whatSphereState = null; // shared state for orbit-rings-clock section phase
  let whatSphere3D = null;
  let whatSphereRenderRaf = null;

  const WAITLIST_ENDPOINT = 'https://aboutnine.ai/api/subscribe';
  const WAITLIST_RATE_LIMIT_MS = 3000;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ORBIT_FRAME_RADIUS_X = 1.84;
  const ORBIT_SPACER_WIDTH = 1.72;
  const HERO_SCORE_CAPTIONS = [
    {
      id: 'low',
      max: 60,
      lines: ['Probably not the one.', 'Whether to continue is up to you.'],
    },
    {
      id: 'maybe',
      max: 85,
      lines: ['Not sure yet.', 'Could be shyness, could be chemistry.', 'Talk a little more.'],
    },
    {
      id: 'match',
      max: Infinity,
      lines: ['Perfect match.', 'Don’t overthink it.', 'Keep the talk going.'],
    },
  ];
  const HERO_PROGRESS_HOLDS = [
    { at: 0.2, radius: 0.075, strength: 0.62 },
    { at: 0.7, radius: 0.075, strength: 0.62 },
    { at: 0.98, radius: 0.055, strength: 0.48 },
  ];
  const whatSphereDefault = {
    opacity: 0,
    left: 50,
    top: 51,
    scale: 1,
    depth: 1,
    fitAmount: 0,
    focusX: 0,
    focusY: 0,
    focusZ: 0,
    rotationX: -0.14,
    rotationY: 0,
    rotationZ: 0.05,
    cameraZ: 4.8,
    dotProgress: 0,
    chemProgress: 0,
    centerGlow: 0,
    orbitGlow: 0,
    kindredProgress: 0,
    journalProgress: 0,
    ringAppearProgress: 0,
    orbitProgress: 0,
  };
  let whatSphereTarget = { ...whatSphereDefault };
  let whatSphereCurrent = { ...whatSphereDefault };
  let lastWaitlistSubmission = 0;
  let heroScoreCaptionId = '';
  let heroScoreCaptionTimer = null;
  let odometerSlots = [];
  const heroClockBaseTime = new Date();
  const heroClockStartedActive = (() => { const h = heroClockBaseTime.getHours(); return h >= 21 || h < 2; })();
  const HERO_CLOCK_SCROLL_MINUTES = (() => {
    const baseMin = heroClockBaseTime.getHours() * 60 + heroClockBaseTime.getMinutes() + heroClockBaseTime.getSeconds() / 60;
    const h = heroClockBaseTime.getHours();
    const BUFFER = 10;
    if (h >= 21 || h < 2) {
      let mins = 2 * 60 - baseMin;
      if (mins <= 0) mins += 24 * 60;
      return Math.min(480, Math.max(90, mins + BUFFER));
    }
    let mins = 21 * 60 - baseMin;
    if (mins <= 0) mins += 24 * 60;
    return Math.min(720, Math.max(120, mins + BUFFER));
  })();
  const HERO_NIGHT_HOLDS = (() => {
    const baseMin = heroClockBaseTime.getHours() * 60 + heroClockBaseTime.getMinutes() + heroClockBaseTime.getSeconds() / 60;
    const holds = [];
    const addHold = (targetMin) => {
      let diff = targetMin - baseMin;
      if (diff <= 0) diff += 24 * 60;
      const at = diff / HERO_CLOCK_SCROLL_MINUTES;
      if (at > 0.01 && at < 0.99) holds.push({ at, radius: 0.06, strength: 0.96 });
    };
    addHold(21 * 60);
    addHold(2 * 60);
    return holds;
  })();
  let heroLastTimeText = '';
  let heroNightLockProgress = null;
  const heroClockState = {
    progress: 0,
    hourAngle: -Math.PI / 2,
    minuteAngle: -Math.PI / 2,
    textLocked: false,
  };

  function setHeroScoreCaption(caption, immediate = false) {
    if (!heroScoreCaption || heroScoreCaptionId === caption.id) return;
    heroScoreCaptionId = caption.id;

    if (heroScoreCaptionTimer) {
      window.clearTimeout(heroScoreCaptionTimer);
      heroScoreCaptionTimer = null;
    }

    heroScoreCaption.classList.remove('is-changing');
    heroScoreCaption.replaceChildren(...caption.lines.flatMap((line, index) => (
      index === 0
        ? [document.createTextNode(line)]
        : [document.createElement('br'), document.createTextNode(line)]
    )));

    if (immediate || reduceMotion) {
      return;
    }

    void heroScoreCaption.offsetWidth;
    heroScoreCaption.classList.add('is-changing');
    heroScoreCaptionTimer = window.setTimeout(() => {
      heroScoreCaptionTimer = null;
      heroScoreCaption.classList.remove('is-changing');
    }, 260);
  }

  function initOdometer() {
    if (!heroScoreValue) return;
    heroScoreValue.classList.add('odometer');
    heroScoreValue.innerHTML = '';
    odometerSlots = [];
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('span');
      slot.className = 'odometer-digit';
      const inner = document.createElement('span');
      inner.className = 'odometer-digit-inner';
      for (let d = 0; d <= 9; d++) {
        const numEl = document.createElement('span');
        numEl.textContent = String(d);
        inner.appendChild(numEl);
      }
      slot.appendChild(inner);
      heroScoreValue.appendChild(slot);
      odometerSlots.push({ slot, inner });
    }
  }

  function setOdometer(value, immediate) {
    if (!heroScoreValue || !odometerSlots.length) {
      if (heroScoreValue) heroScoreValue.textContent = String(value);
      return;
    }
    const str = String(value).padStart(3, ' ');
    str.split('').forEach((d, i) => {
      const { slot, inner } = odometerSlots[i];
      if (d === ' ') {
        slot.classList.add('hidden');
      } else {
        slot.classList.remove('hidden');
        const digitNum = parseInt(d, 10);
        if (parseInt(inner.dataset.digit ?? '-1', 10) === digitNum) return;
        inner.dataset.digit = String(digitNum);
        const target = `translateY(${-digitNum}em)`;
        if (immediate) {
          inner.style.transition = 'none';
          inner.style.transform = target;
          void inner.offsetHeight;
          inner.style.transition = '';
        } else {
          inner.style.transform = target;
        }
      }
    });
  }

  function getHeroScoreProgress(scrollTop = null) {
    const scroller = document.scrollingElement || document.documentElement;
    const currentScrollTop = scrollTop ?? scroller.scrollTop ?? 0;
    const viewportHeight = window.innerHeight || 1;
    const heroHeight = hero?.offsetHeight || viewportHeight;
    const scoreRange = Math.max(1, heroHeight - viewportHeight);
    return clamp((currentScrollTop - (hero?.offsetTop || 0)) / scoreRange);
  }

  function applyProgressHolds(progress, holds) {
    if (reduceMotion) return progress;

    return clamp(holds.reduce((heldProgress, hold) => {
      const distance = Math.abs(progress - hold.at);
      if (distance >= hold.radius) return heldProgress;

      const proximity = 1 - distance / hold.radius;
      const holdAmount = smoothstep(proximity) * hold.strength;
      return lerp(heldProgress, hold.at, holdAmount);
    }, progress));
  }

  function applyNightActiveState() {
    const justActivated = isNightActive && !prevNightActive;
    prevNightActive = isNightActive;

    if (hero) {
      if (isNightActive) {
        if (justActivated && !reduceMotion) {
          hero.classList.remove('is-night-instant');
          hero.classList.add('is-night-active');
          // Show button after sub-text animation starts
          if (heroBtnWrap) {
            heroBtnWrap.style.display = '';
            window.setTimeout(() => {
              if (isNightActive) heroBtnWrap.classList.add('is-visible');
            }, 220);
          }
        } else {
          hero.classList.add('is-night-active', 'is-night-instant');
          if (heroBtnWrap) {
            heroBtnWrap.style.display = '';
            heroBtnWrap.classList.add('is-visible');
          }
        }
      } else {
        hero.classList.remove('is-night-active', 'is-night-instant');
        if (heroBtnWrap) {
          heroBtnWrap.style.display = 'none';
          heroBtnWrap.classList.remove('is-visible');
        }
      }
    }
    // Update WebGL sphere text for night/day state
    if (heroClock3D?.refreshHeroText) heroClock3D.refreshHeroText();
  }

  function initHeroTimeGate() {
    const h = new Date().getHours();
    isNightActive = h >= 21 || h < 2;
    prevNightActive = isNightActive; // no animation on initial load
    applyNightActiveState();
    if (heroClockStartedActive && hero) {
      hero.style.setProperty('--hero-score-scroll', '0px');
    }
  }

  function updateAuroraProgress(progress) {
    const cursorMax = window.innerWidth <= 960 ? 0.38 : 0.74;
    root.style.setProperty('--aurora-opacity', '0.55');
    root.style.setProperty('--cursor-glow-opacity', cursorMax.toFixed(3));
    root.style.setProperty('--hero-glow-opacity', '1');
  }

  function updateHeroScoreVisual(scrollTop = null) {
    const rawProgress = getHeroScoreProgress(scrollTop);
    const progress = applyProgressHolds(rawProgress, HERO_PROGRESS_HOLDS);
    updateAuroraProgress(progress);

    if (!heroScoreValue || !heroScoreCaption) return;

    const captionForScore = (score) => HERO_SCORE_CAPTIONS.find((caption) => score < caption.max)
      || HERO_SCORE_CAPTIONS[HERO_SCORE_CAPTIONS.length - 1];

    const score = 50 + progress * 50;

    setOdometer(Math.round(score), rawProgress === 0 || reduceMotion);
    setHeroScoreCaption(captionForScore(score), rawProgress === 0 || reduceMotion);
  }

  function formatHeroClockTime(date) {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'pm' : 'am';
    return `${hours % 12 || 12}:${minutes} ${meridiem}`;
  }

  function makeHeroPlanetTexture(THREE, palette = {}) {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    const data = image.data;
    const clampByte = (value) => Math.min(255, Math.max(0, value));
    const base = {
      r: palette.r ?? 218,
      g: palette.g ?? 168,
      b: palette.b ?? 185,
      noiseR: palette.noiseR ?? 0.72,
      noiseG: palette.noiseG ?? 0.50,
      noiseB: palette.noiseB ?? 0.58,
    };

    const noiseGridSize = 96;
    const noiseGrid = Array.from({ length: noiseGridSize + 1 }, () => (
      Array.from({ length: noiseGridSize + 1 }, () => Math.random())
    ));
    const fade = (t) => t * t * (3 - 2 * t);
    const sampleNoise = (x, y) => {
      const gx = x * noiseGridSize;
      const gy = y * noiseGridSize;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = fade(gx - x0);
      const ty = fade(gy - y0);
      const x1 = Math.min(noiseGridSize, x0 + 1);
      const y1 = Math.min(noiseGridSize, y0 + 1);
      const a = lerp(noiseGrid[y0][x0], noiseGrid[y0][x1], tx);
      const b = lerp(noiseGrid[y1][x0], noiseGrid[y1][x1], tx);
      return lerp(a, b, ty);
    };

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = (y * size + x) * 4;
        const nx = x / size;
        const ny = y / size;
        const broad = sampleNoise(nx, ny) - 0.5;
        const fine = sampleNoise((nx * 3.1) % 1, (ny * 3.1) % 1) - 0.5;
        const vignette = 1 - Math.abs(ny - 0.5) * 0.22;
        const mottled = broad * 16 + fine * 7 + (Math.random() - 0.5) * 5;
        data[i] = clampByte((base.r + mottled * base.noiseR) * vignette);
        data[i + 1] = clampByte((base.g + mottled * base.noiseG) * vignette);
        data[i + 2] = clampByte((base.b + mottled * base.noiseB) * vignette);
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
  }

  function makeWhatPlanetMaterial(THREE, color, texturePalette) {
    const texture = makeHeroPlanetTexture(THREE, texturePalette);
    const material = new THREE.MeshStandardMaterial({
      color,
      map: texture,
      bumpMap: texture,
      bumpScale: 0.018,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    material.userData.texture = texture;
    return material;
  }

  function makeHeartTube(THREE, scale, tubeRadius, color, opacity) {
    const segments = 256;
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = (Math.PI * 2 * i) / segments;
      const x = scale * 16 * Math.pow(Math.sin(t), 3);
      // +4 centres the heart vertically around y = 0
      const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 4);
      points.push(new THREE.Vector3(x, y, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 6, true);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
  }

  function makeOrbitEllipseTube(THREE, radiusX, radiusY, tubeRadius, color, opacity) {
    const points = [];
    const segments = 192;
    for (let i = 0; i <= segments; i += 1) {
      const theta = (Math.PI * 2 * i) / segments;
      points.push(new THREE.Vector3(Math.cos(theta) * radiusX, Math.sin(theta) * radiusY, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 6, true);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
  }

  function makeHeroCircleTube(THREE, radius, tubeRadius, color, opacity) {
    const points = [];
    const segments = 192;
    for (let i = 0; i <= segments; i += 1) {
      const theta = (Math.PI * 2 * i) / segments;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 6, true);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
  }

  function buildHeroClockScene(THREE) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 9.15);

    const texture = makeHeroPlanetTexture(THREE);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 96, 96),
      new THREE.MeshStandardMaterial({
        color: 0xf2d0de,
        map: texture,
        bumpMap: texture,
        bumpScale: 0.024,
        roughness: 0.92,
        metalness: 0.0,
      }),
    );
    sphere.rotation.set(-0.2, -0.28, 0.04);
    scene.add(sphere);

    // Text plane starts by following the sphere roll, then locks to the front at 9pm.
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 400;
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.colorSpace = THREE.SRGBColorSpace;
    const textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.72, 1.34),
      new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    );
    // Text plane lives in the scene (not child of sphere) so sphere's Y/Z rotations
    // don't tilt it. Only rotation.x (roll) is synced until the 9pm front lock.
    textPlane.position.z = 1.36; // world-space: just in front of sphere surface (r=1.32)
    scene.add(textPlane);

    const hourGroup = new THREE.Group();
    const hourOrbit = makeHeroCircleTube(THREE, 1.58, 0.007, 0xf4a8c8, 0.42);
    hourOrbit.rotation.x = Math.PI / 2 - 0.14;
    hourOrbit.rotation.y = 0.06;
    hourGroup.add(hourOrbit);

    const minuteGroup = new THREE.Group();
    const minuteOrbit = makeHeroCircleTube(THREE, 2.04, 0.006, 0xd8c0ff, 0.52);
    minuteOrbit.rotation.x = Math.PI / 2 - 0.06;
    minuteOrbit.rotation.y = -0.04;
    minuteGroup.add(minuteOrbit);

    scene.add(hourGroup, minuteGroup);

    scene.add(new THREE.AmbientLight(0xf8d8e8, 0.80));
    const keyLight = new THREE.DirectionalLight(0xffc8e0, 0.92);
    keyLight.position.set(-1.7, 2.3, 3.0);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x7060d8, 3.2, 7);
    fillLight.position.set(2.4, -1.6, 2.0);
    scene.add(fillLight);
    const auroraLight = new THREE.PointLight(0x9070e8, 1.8, 6);
    auroraLight.position.set(-1.2, -2.2, -0.8);
    scene.add(auroraLight);

    return { scene, camera, texture, sphere, hourGroup, minuteGroup, textCanvas, textTexture, textPlane };
  }

  function resizeHeroClock3D() {
    if (!heroClock3D || !heroClockCanvas) return;
    const rect = heroClockCanvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (heroClock3D.width === width && heroClock3D.height === height) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    heroClock3D.renderer.setPixelRatio(dpr);
    heroClock3D.renderer.setSize(width, height, false);
    heroClock3D.camera.aspect = width / height;
    heroClock3D.camera.updateProjectionMatrix();
    heroClock3D.width = width;
    heroClock3D.height = height;
  }

  function renderHeroClock3D() {
    if (!heroClock3D) return;
    const { progress, hourAngle, minuteAngle, textLocked } = heroClockState;
    const roll = progress * Math.PI * 5.4;

    resizeHeroClock3D();
    heroClock3D.sphere.rotation.x = roll;
    heroClock3D.sphere.rotation.y = -0.28 + Math.sin(progress * Math.PI * 2) * 0.08;
    heroClock3D.texture.offset.y = progress * -1.2;
    heroClock3D.texture.offset.x = progress * 0.14;

    // Text plane orbits sphere center as it rolls — position + rotation both follow X-roll
    // A point on the sphere surface traces (0, -r·sinθ, r·cosθ) as the sphere pitches by θ
    if (heroClock3D.textPlane) {
      const r = 1.36;
      const compactText = window.innerWidth <= 960;
      const narrowText = window.innerWidth <= 600;
      heroClock3D.textPlane.scale.set(narrowText ? 0.48 : (compactText ? 0.64 : 1), narrowText ? 0.58 : (compactText ? 0.72 : 1), 1);
      heroClock3D.textPlane.visible = !textLocked;
      if (textLocked) {
        heroClock3D.textPlane.position.set(0, 0, r);
        heroClock3D.textPlane.rotation.x = 0;
      } else {
        heroClock3D.textPlane.position.set(0, -Math.sin(roll) * r, Math.cos(roll) * r);
        heroClock3D.textPlane.rotation.x = roll;
      }
    }

    heroClock3D.hourGroup.rotation.z = -hourAngle;
    heroClock3D.minuteGroup.rotation.z = -minuteAngle;

    heroClock3D.renderer.render(heroClock3D.scene, heroClock3D.camera);
  }

  async function initHeroClock3D() {
    if (!heroClock || !heroClockCanvas) return;

    try {
      const THREE = await import('./vendor/three.module.min.js');
      const renderer = new THREE.WebGLRenderer({
        canvas: heroClockCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'default',
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const { scene, camera, texture, sphere, hourGroup, minuteGroup, textCanvas, textTexture, textPlane } = buildHeroClockScene(THREE);

      heroClock3D = { renderer, scene, camera, texture, sphere, hourGroup, minuteGroup, textCanvas, textTexture, textPlane, width: 0, height: 0 };

      // Draw "meet your match / at nine" on sphere surface; re-draws on font load + night change
      function refreshHeroText() {
        const canvas = heroClock3D.textCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const fontFamily = getComputedStyle(root).getPropertyValue('--font-brand').trim().replace(/"/g, '') || 'system-ui, sans-serif';
        // Measure at target size, scale down if text overflows canvas
        const compactText = window.innerWidth <= 960;
        const narrowText = window.innerWidth <= 600;
        let fontSize = narrowText ? 104 : (compactText ? 116 : 128);
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        const testWidth = ctx.measureText('Meet your match').width;
        if (testWidth > W * 0.96) fontSize = Math.floor(fontSize * (W * 0.96) / testWidth);

        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        const lineH = fontSize * 0.98;
        const y1 = (H - lineH * 2) / 2 + fontSize * 0.85;
        const y2 = y1 + lineH;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.fillText('Meet your match', W / 2, y1);

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        if (isNightActive) {
          const grad = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
          grad.addColorStop(0, '#d13588');
          grad.addColorStop(0.5, '#9a7ad8');
          grad.addColorStop(1, '#5e60c9');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.96)';
        }
        ctx.fillText('at nine', W / 2, y2);

        heroClock3D.textTexture.needsUpdate = true;
      }

      heroClock3D.refreshHeroText = refreshHeroText;
      refreshHeroText();
      document.fonts.ready.then(() => { refreshHeroText(); renderHeroClock3D(); });

      heroClock.classList.add('is-webgl');
      renderHeroClock3D();
      updateHeroClockVisual();
      initOrbitRingsClock3D(THREE);
    } catch (error) {
      console.warn('Unable to initialize the hero clock sphere.', error);
      heroClock.classList.add('is-unavailable');
    }
  }

  function initOrbitRingsClock3D(THREE) {
    const canvas = document.querySelector('.orbit-rings-canvas');
    const el = document.querySelector('.orbit-rings-clock');
    if (!canvas || !el) return;
    try {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.z = 9.15;

      // Circular rings — start edge-on at 2am angles, spread apart to form a heart together
      const hourGroup = new THREE.Group();
      const hourRing = makeOrbitEllipseTube(THREE, 0.86, 1.58, 0.0038, 0xf4a8c8, 0.46);
      hourRing.rotation.x = Math.PI / 2 - 0.14;
      hourRing.rotation.y = 0.06;
      hourGroup.rotation.z = -(330 * Math.PI / 180);
      hourGroup.add(hourRing);

      const minuteGroup = new THREE.Group();
      const minuteRing = makeOrbitEllipseTube(THREE, 1.1, 2.0, 0.0033, 0xd8c0ff, 0.56);
      minuteRing.rotation.x = Math.PI / 2 - 0.06;
      minuteRing.rotation.y = -0.04;
      minuteGroup.rotation.z = -(1710 * Math.PI / 180);
      minuteGroup.add(minuteRing);

      scene.add(hourGroup, minuteGroup);
      orbitRings3D = { renderer, scene, camera, el, hourGroup, minuteGroup, width: 0, height: 0 };
    } catch (e) {
      console.warn('Unable to initialize orbit rings clock.', e);
    }
  }

  function renderOrbitRings3D(orbitProg = 0) {
    if (!orbitRings3D) return;
    const { renderer, scene, camera, hourGroup, minuteGroup } = orbitRings3D;

    // Seamless handoff from hero clock: START_SCALE makes orbit rings appear at the same
    // visual size as the hero clock rings (hour r=1.58, minute r=2.04) at orbitProg=0.
    // Tube radii are pre-divided by START_SCALE so apparent thickness stays consistent.
    // HEART_D per ring = rY * sin(TILT) so each ring's bottom tip converges at x=0.
    const START_SCALE  = 1.85;
    const HEART_H      = 0.18;
    const HEART_TILT   = 0.52;
    const HEART_D_H    = 1.58 * Math.sin(HEART_TILT); // pink (hour) left lobe  ≈ 0.785
    const HEART_D_M    = 2.0  * Math.sin(HEART_TILT); // purple (minute) right lobe ≈ 0.994

    const HOUR_Z_START   = -(330 * Math.PI / 180);
    const MINUTE_Z_START = -(1710 * Math.PI / 180);

    const groupScale = lerp(START_SCALE, 1, orbitProg);

    if (hourGroup) {
      // pink (hour) ring → left lobe
      hourGroup.position.set(
        lerp(0, -HEART_D_H, orbitProg),
        lerp(0, HEART_H, orbitProg),
        0,
      );
      hourGroup.rotation.z = lerp(HOUR_Z_START, +HEART_TILT, orbitProg);
      hourGroup.scale.setScalar(groupScale);
      const mH = hourGroup.children[0];
      if (mH) {
        mH.rotation.x = lerp(Math.PI / 2 - 0.14, 0, orbitProg); // edge-on → face-on
        mH.rotation.y = lerp(0.06, 0, orbitProg);
      }
    }
    if (minuteGroup) {
      // purple (minute) ring → right lobe
      minuteGroup.position.set(
        lerp(0, HEART_D_M, orbitProg),
        lerp(0, HEART_H, orbitProg),
        0,
      );
      minuteGroup.rotation.z = lerp(MINUTE_Z_START, -HEART_TILT, orbitProg);
      minuteGroup.scale.setScalar(groupScale);
      const mM = minuteGroup.children[0];
      if (mM) {
        mM.rotation.x = lerp(Math.PI / 2 - 0.06, 0, orbitProg); // edge-on → face-on
        mM.rotation.y = lerp(-0.04, 0, orbitProg);
      }
    }

    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (orbitRings3D.width !== w || orbitRings3D.height !== h) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      orbitRings3D.width = w;
      orbitRings3D.height = h;
    }
    renderer.render(scene, camera);
  }

  function renderOrbitRingsInSection(fitAmount, canvasLeft = whatSphereState?.left, canvasTop = whatSphereState?.top) {
    if (!orbitRings3D || !whatSphereState) return;
    const { renderer, scene, camera, hourGroup, minuteGroup } = orbitRings3D;
    const { chemProgress, journalProgress } = whatSphereState;

    // Resize canvas first so canvasHalf is accurate
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (orbitRings3D.width !== w || orbitRings3D.height !== h) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      orbitRings3D.width = w;
      orbitRings3D.height = h;
    }
    const canvasHalf = w / 2;

    // sectionT: 0 = heart formation, 1 = section ring positions
    const sectionT = smoothstep(1 - fitAmount);

    const HEART_TILT = 0.52;
    const HEART_D_H  = 1.58 * Math.sin(HEART_TILT);
    const HEART_H    = 0.18;
    const HEART_D_M  = 2.0  * Math.sin(HEART_TILT);
    const ORBIT_CAM_Z = 9.15;
    const ORBIT_TAN   = Math.tan(17 * Math.PI / 180);

    // Keep kindred rings visibly centered on each star; expand later for mapped labels.
    const compact = window.innerWidth <= 960;
    const baseRingPx = compact ? 87 : 155;
    const sectionRingPx = compact ? 147 : 220;
    const RING_PX = lerp(baseRingPx, sectionRingPx, clamp(Math.max(chemProgress, journalProgress)));
    const TARGET_R = RING_PX / canvasHalf * ORBIT_CAM_Z * ORBIT_TAN;

    // Keep chemistry rings front-facing so they read as circles, not projected ellipses.
    const PINK_RX = 0, PINK_RY = 0;
    const PURP_RX = 0, PURP_RY = 0;
    const CHEM_RX = 0, CHEM_RY = 0;
    const pinkRX = lerp(PINK_RX, CHEM_RX, chemProgress);
    const pinkRY = lerp(PINK_RY, CHEM_RY, chemProgress);
    const purpRX = lerp(PURP_RX, CHEM_RX, chemProgress);
    const purpRY = lerp(PURP_RY, CHEM_RY, chemProgress);

    let overlapX = 0;
    let overlapY = 0;
    if (
      whatSphereState.centerDot &&
      whatSphereState.orbitDot &&
      whatSphereState.groupWorld &&
      whatSphereState.camera3D
    ) {
      whatSphereState.groupWorld.updateWorldMatrix(true, false);
      const projectDot = (mesh) => {
        const p = mesh.position.clone()
          .applyMatrix4(whatSphereState.groupWorld.matrixWorld)
          .project(whatSphereState.camera3D);
        return {
          x: (p.x + 1) / 2 * window.innerWidth,
          y: (1 - p.y) / 2 * window.innerHeight,
        };
      };
      const centerScreen = projectDot(whatSphereState.centerDot);
      const orbitScreen = projectDot(whatSphereState.orbitDot);
      const overlapScreenX = (centerScreen.x + orbitScreen.x) * 0.5;
      const overlapScreenY = (centerScreen.y + orbitScreen.y) * 0.5;
      const sphereScreenX = (canvasLeft / 100) * window.innerWidth;
      const sphereScreenY = (canvasTop / 100) * window.innerHeight;
      overlapX = (overlapScreenX - sphereScreenX) / canvasHalf * ORBIT_CAM_Z * ORBIT_TAN;
      overlapY = -(overlapScreenY - sphereScreenY) / canvasHalf * ORBIT_CAM_Z * ORBIT_TAN;
    }

    // 1) Pink ring: heart-left → centered on pink star (orbit scene origin)
    if (hourGroup) {
      const pinkX = lerp(0, overlapX, chemProgress);
      const pinkY = lerp(0, overlapY, chemProgress);
      hourGroup.position.set(
        lerp(-HEART_D_H, pinkX, sectionT),
        lerp(HEART_H, pinkY, sectionT),
        0,
      );
      // Non-uniform scale: ellipse → circle of TARGET_R (done before rotation)
      hourGroup.scale.set(lerp(1, TARGET_R / 0.86, sectionT), lerp(1, TARGET_R / 1.58, sectionT), 1);
      // Tilt on GROUP: scale creates circle first, then GROUP rotation tilts the circle → no distortion
      hourGroup.rotation.set(
        lerp(0, pinkRX, sectionT),
        lerp(0, pinkRY, sectionT),
        lerp(HEART_TILT, 0, sectionT),
      );
      const mH = hourGroup.children[0];
      if (mH) mH.rotation.set(0, 0, 0); // keep mesh rotation clean
    }

    // 2) Purple ring: heart-right → centered on purple star (orbitDot screen position)
    if (minuteGroup) {
      let purpX = 0, purpY = 0;
      if (whatSphereState.orbitDot && whatSphereState.groupWorld && whatSphereState.camera3D) {
        whatSphereState.groupWorld.updateWorldMatrix(true, false);
        const p = whatSphereState.orbitDot.position.clone()
          .applyMatrix4(whatSphereState.groupWorld.matrixWorld)
          .project(whatSphereState.camera3D);
        const sphereScreenX = (canvasLeft / 100) * window.innerWidth;
        const sphereScreenY = (canvasTop  / 100) * window.innerHeight;
        const dotScreenX    = (p.x + 1) / 2 * window.innerWidth;
        const dotScreenY    = (1 - p.y) / 2 * window.innerHeight;
        purpX =  (dotScreenX - sphereScreenX) / canvasHalf * ORBIT_CAM_Z * ORBIT_TAN;
        purpY = -(dotScreenY - sphereScreenY) / canvasHalf * ORBIT_CAM_Z * ORBIT_TAN;
      }
      // In chemistry: pull both rings to the center of the visible overlap.
      purpX = lerp(purpX, overlapX, chemProgress);
      purpY = lerp(purpY, overlapY, chemProgress);

      minuteGroup.position.set(lerp(HEART_D_M, purpX, sectionT), lerp(HEART_H, purpY, sectionT), 0);
      minuteGroup.scale.set(lerp(1, TARGET_R / 1.1, sectionT), lerp(1, TARGET_R / 2.0, sectionT), 1);
      minuteGroup.rotation.set(
        lerp(0, purpRX, sectionT),
        lerp(0, purpRY, sectionT),
        lerp(-HEART_TILT, 0, sectionT),
      );
      const mM = minuteGroup.children[0];
      if (mM) {
        mM.rotation.set(0, 0, 0);
        mM.material.opacity = (1 - journalProgress) * 0.56;
      }
    }

    renderer.render(scene, camera);
  }

  function updateOrbitRingsClock() {
    if (!orbitRings3D || !sphereApproach) return;
    const el = orbitRings3D.el;
    const darkRoomEl = document.querySelector('.dark-room-clock');

    if (!darkRoomEl || darkRoomEl._lockScrollTop == null) {
      el.style.visibility = 'hidden';
      return;
    }

    const scroller = document.scrollingElement || document.documentElement;
    const scrollTop = scroller.scrollTop || 0;
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;
    const compact = vw <= 960;

    const lockScrollTop = darkRoomEl._lockScrollTop;
    const lockX = darkRoomEl._lockX;
    const lockY = darkRoomEl._lockY;
    const startSize = darkRoomEl._startSize ?? (compact ? 270 : 580);

    // orbitEnd = absolute scrollTop when sphere-approach text is centred in viewport
    const orbitEnd = sphereApproach.offsetTop + sphereApproach.offsetHeight * 0.5 - vh * 0.5;
    const scrollDelta = scrollTop - lockScrollTop;
    const RING_EXIT_SCROLL = 80;

    // Stay hidden while hero rings are still sliding out of the sphere
    if (!darkRoomEl._ringExitScrollEnd || scrollTop < darkRoomEl._ringExitScrollEnd) {
      el.style.visibility = 'hidden';
      return;
    }

    // Rebase: orbitProg=0 at the moment orbit rings appear, so geometry is edge-on
    const adjustedDelta = Math.max(0, scrollDelta - RING_EXIT_SCROLL);
    const adjustedRange = Math.max(1, orbitEnd - lockScrollTop - RING_EXIT_SCROLL);
    const orbitProg = smoothstep(clamp(adjustedDelta / adjustedRange));

    const targetSize = compact ? Math.min(vw * 0.9, 520) : Math.min(vw * 0.88, 1100);

    // After orbitEnd: rings continue into sections (no fade, same element)
    if (scrollTop >= orbitEnd) {
      if (!whatSphereState) { el.style.visibility = 'hidden'; return; }
      const { fitAmount, left, top, journalProgress } = whatSphereState;
      const attachEndScroll = (whatSections[0]?.offsetTop ?? (orbitEnd + vh)) - vh * 0.08;
      const attachRange = Math.max(1, attachEndScroll - orbitEnd);
      const ringAttachProgress = smoothstep(clamp((scrollTop - orbitEnd) / attachRange));
      const ringLeft = lerp(50, left, ringAttachProgress);
      const ringTop = lerp(50, top, ringAttachProgress);
      const ringFitAmount = lerp(1, fitAmount, ringAttachProgress);

      const externalRingOpacity = (1 - journalProgress * 0.5) * (1 - ringAttachProgress);
      el.style.visibility = externalRingOpacity > 0.02 ? 'visible' : 'hidden';
      el.style.setProperty('--ork-opacity', externalRingOpacity.toFixed(3));

      // Let the sphere lock first; rings keep their path and attach over a short handoff.
      el.style.setProperty('--ork-x', `${ringLeft.toFixed(2)}%`);
      el.style.setProperty('--ork-y', `${ringTop.toFixed(2)}%`);

      // Shrink canvas as rings shrink toward section size
      const sectionSize = compact ? 480 : 980;
      el.style.setProperty('--ork-size', `${Math.round(lerp(targetSize, sectionSize, 1 - ringFitAmount))}px`);

      renderOrbitRingsInSection(ringFitAmount, ringLeft, ringTop);
      return;
    }

    el.style.visibility = 'visible';
    el.style.setProperty('--ork-opacity', '1');

    const startX = darkRoomEl._orbitStartX ?? lockX;
    const startY = darkRoomEl._orbitStartY ?? lockY;
    const posX = lerp(startX, 50, orbitProg);
    const posY = lerp(startY, 50, orbitProg);

    // Geometry animates throughout the full travel — no delay.
    // Power easing (x^1.5) makes the initial rotation gradual so rings visibly turn
    // in 3D as they move, rather than staying flat then snapping open.
    const geomProg = Math.pow(orbitProg, 1.5);

    el.style.setProperty('--ork-x', `${posX.toFixed(2)}%`);
    el.style.setProperty('--ork-y', `${posY.toFixed(2)}%`);
    el.style.setProperty('--ork-size', `${Math.round(lerp(startSize, targetSize, geomProg))}px`);

    renderOrbitRings3D(geomProg);
  }

  function updateDarkRoomClock() {
    const el = document.querySelector('.dark-room-clock');
    if (!el || !hero || !darkRoom || !sphereApproach || !heroClockCanvas || !heroClock3D) return;

    const scroller = document.scrollingElement || document.documentElement;
    const scrollTop = scroller.scrollTop || 0;
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;
    const compact = vw <= 960;

    const heroScrollEnd = hero.offsetTop + hero.offsetHeight - vh;
    const zoneEnd = sphereApproach.offsetTop;
    const progress = clamp((scrollTop - heroScrollEnd) / Math.max(1, zoneEnd - heroScrollEnd));

    if (progress <= 0) {
      // Return canvas to hero if it was teleported
      if (darkRoomClockTransiting) {
        heroClock.appendChild(heroClockCanvas);
        heroClockCanvas.style.cssText = '';
        heroClock3D.width = 0;
        heroClock3D.height = 0;
        el.style.visibility = 'hidden';
        el.style.setProperty('--drck-opacity', '0');
        darkRoomClockTransiting = false;
        // Restore hero CSS glows now that canvas is back in hero
        if (hero) hero.classList.remove('clock-transiting');
      }
      // Restore sphere material and ring depthTest on scroll-up
      if (heroClock3D?.sphere?.material?.transparent) {
        heroClock3D.sphere.material.transparent = false;
        heroClock3D.sphere.material.opacity = 1;
        heroClock3D.sphere.material.needsUpdate = true;
      }
      // Restore ring opacity on scroll-up
      const rH = heroClock3D?.hourGroup?.children[0];
      const rM = heroClock3D?.minuteGroup?.children[0];
      if (rH?.material) rH.material.opacity = 0.42;
      if (rM?.material) rM.material.opacity = 0.52;
      return;
    }

    // First frame after hero unsticks: teleport canvas into fixed overlay
    if (!darkRoomClockTransiting) {
      const cr = heroClockCanvas.getBoundingClientRect();
      const cx = (cr.left + cr.width / 2) / vw * 100;
      const cy = (cr.top + cr.height / 2) / vh * 100;
      el._startX = cx;
      el._startY = cy;
      el._startSize = cr.width;

      // Position overlay exactly over the hero clock canvas
      el.style.setProperty('--drck-size', `${cr.width}px`);
      el.style.setProperty('--drck-x', `${cx.toFixed(2)}%`);
      el.style.setProperty('--drck-y', `${cy.toFixed(2)}%`);
      el.style.setProperty('--drck-opacity', '1');
      el.style.visibility = 'visible';

      // Move canvas into overlay, fill it completely
      el.appendChild(heroClockCanvas);
      heroClockCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      heroClock3D.width = 0;
      heroClock3D.height = 0;

      darkRoomClockTransiting = true;
      // Hide hero CSS glows so they don't paint above the sphere in dark-room-clock
      if (hero) hero.classList.add('clock-transiting');
    }

    el.style.visibility = 'visible';

    const LOCK_PROGRESS = 0.52; // progress at which 2am is reached

    const startX = el._startX ?? (compact ? 50 : 80);
    const startY = el._startY ?? (compact ? 62 : 50);
    // keep X fixed (straight down) on both mobile and desktop
    const endX = el._startX ?? startX;
    const endY = compact ? 82 : 70;
    const lineProgress = clamp(progress / LOCK_PROGRESS);

    if (progress < LOCK_PROGRESS) {
      // Animating toward 2am — restore everything in case of scroll-back from orbit phase
      el._lockScrollTop = null;
      if (heroClock3D?.sphere?.material?.transparent) {
        heroClock3D.sphere.material.transparent = false;
        heroClock3D.sphere.material.opacity = 1;
        heroClock3D.sphere.material.needsUpdate = true;
      }
      // Restore orbit ring opacity, mesh rotations, and group positions (in case of scroll-back)
      const meshH0 = heroClock3D?.hourGroup?.children[0];
      const meshM0 = heroClock3D?.minuteGroup?.children[0];
      if (meshH0?.material) meshH0.material.opacity = 0.42;
      if (meshM0?.material) meshM0.material.opacity = 0.52;
      if (meshH0) { meshH0.rotation.x = Math.PI / 2 - 0.14; meshH0.rotation.y = 0.06; }
      if (meshM0) { meshM0.rotation.x = Math.PI / 2 - 0.06; meshM0.rotation.y = -0.04; }
      el._ringExitScrollEnd = null;
      el._orbitStartX = null;
      el._orbitStartY = null;
      el._orbitStartFrozen = false;
      if (heroClock3D?.hourGroup) heroClock3D.hourGroup.position.set(0, 0, 0);
      if (heroClock3D?.minuteGroup) heroClock3D.minuteGroup.position.set(0, 0, 0);

      el.style.setProperty('--drck-x', `${lerp(startX, endX, lineProgress).toFixed(2)}%`);
      el.style.setProperty('--drck-y', `${lerp(startY, endY, lineProgress).toFixed(2)}%`);
      el.style.setProperty('--drck-size', `${el._startSize ?? (compact ? 270 : 580)}px`);
      el.style.setProperty('--drck-opacity', '1');

      // Clock: 9pm → 2am (still animating)
      const clockProg = clamp(progress / LOCK_PROGRESS);
      heroClockState.hourAngle = (270 + clockProg * 150 - 90) * (Math.PI / 180);
      heroClockState.minuteAngle = (clockProg * 5 * 360 - 90) * (Math.PI / 180);
      heroClockState.progress = clockProg;
      heroClockState.textLocked = true;
      renderHeroClock3D();
    } else {
      // 2am reached: rings slide out of the sphere naturally, then orbit-rings-clock takes over
      const RING_EXIT_SCROLL = 80;
      if (el._lockScrollTop == null) {
        el._lockScrollTop = scrollTop;
        el._lockX = endX;
        el._lockY = endY;
        el._ringExitScrollEnd = scrollTop + RING_EXIT_SCROLL;
        el._orbitStartFrozen = false;
        if (heroClock3D?.sphere?.material) {
          heroClock3D.sphere.material.transparent = true;
          heroClock3D.sphere.material.needsUpdate = true;
        }
      }

      // Sphere canvas position must be current before projecting the exiting rings.
      const scrolledY = el._lockY - ((scrollTop - el._lockScrollTop) / vh * 100);
      el.style.setProperty('--drck-x', `${el._lockX.toFixed(2)}%`);
      el.style.setProperty('--drck-y', `${scrolledY.toFixed(2)}%`);
      el.style.setProperty('--drck-size', `${el._startSize ?? (compact ? 270 : 580)}px`);
      el.style.setProperty('--drck-opacity', '1');

      const halfSizePct = (el._startSize ?? 580) / vh / 2 * 100;
      if (scrolledY < -halfSizePct) { el.style.visibility = 'hidden'; return; }

      // Slide rings toward lower-right at FULL opacity — no fade, purely physical exit.
      // Rings are hidden only once they've cleared the sphere, when orbit-rings-clock takes over.
      const ringExitProg = smoothstep(clamp((scrollTop - el._lockScrollTop) / RING_EXIT_SCROLL));
      const mH = heroClock3D?.hourGroup?.children[0];
      const mM = heroClock3D?.minuteGroup?.children[0];
      if (heroClock3D?.hourGroup) heroClock3D.hourGroup.position.set(ringExitProg * 1.8, ringExitProg * -1.0, 0);
      if (heroClock3D?.minuteGroup) heroClock3D.minuteGroup.position.set(ringExitProg * 1.8, ringExitProg * -1.0, 0);
      if (!el._orbitStartFrozen && heroClock3D?.hourGroup && heroClock3D?.minuteGroup && heroClock3D?.camera) {
        const ringCenter = heroClock3D.hourGroup.position.clone()
          .lerp(heroClock3D.minuteGroup.position, 0.5)
          .project(heroClock3D.camera);
        const handoffSize = el._startSize ?? (compact ? 270 : 580);
        const handoffY = el._lockY - (RING_EXIT_SCROLL / vh) * 100;
        const overlayRect = ringExitProg >= 0.999
          ? {
              left: (el._lockX / 100) * vw - handoffSize / 2,
              top: (handoffY / 100) * vh - handoffSize / 2,
              width: handoffSize,
              height: handoffSize,
            }
          : el.getBoundingClientRect();
        el._orbitStartX = ((overlayRect.left + (ringCenter.x * 0.5 + 0.5) * overlayRect.width) / vw) * 100;
        el._orbitStartY = ((overlayRect.top + (-ringCenter.y * 0.5 + 0.5) * overlayRect.height) / vh) * 100;
        if (ringExitProg >= 0.999) el._orbitStartFrozen = true;
      }
      if (mH?.material) mH.material.opacity = ringExitProg < 1 ? 0.42 : 0;
      if (mM?.material) mM.material.opacity = ringExitProg < 1 ? 0.52 : 0;

      heroClockState.hourAngle = 330 * Math.PI / 180;
      heroClockState.minuteAngle = 1710 * Math.PI / 180;
      heroClockState.progress = 1;
      heroClockState.textLocked = true;
      if (heroClock3D?.sphere?.material) heroClock3D.sphere.material.opacity = 1;

      renderHeroClock3D();
      return;
    }
  }

  function updateHeroClockVisual(scrollTop = null) {
    if (!heroClock) return;

    // 9pm~2am 접속 유저: 이미 야간 모드이므로 hero 섹션에서 구체를 굴리지 않고 현재 시각 고정
    if (heroClockStartedActive) {
      isNightActive = true;
      applyNightActiveState();
      if (!darkRoomClockTransiting) {
        const h = heroClockBaseTime.getHours();
        const m = heroClockBaseTime.getMinutes();
        const s = heroClockBaseTime.getSeconds();
        const minuteAngle = ((m + s / 60) / 60) * 360;
        const hourAngle = (((h % 12) + m / 60 + s / 3600) / 12) * 360;
        heroClockState.progress = 0;
        heroClockState.hourAngle = (hourAngle - 90) * (Math.PI / 180);
        heroClockState.minuteAngle = (minuteAngle - 90) * (Math.PI / 180);
        heroClockState.textLocked = true;
        renderHeroClock3D();
      }
      const timeText = formatHeroClockTime(heroClockBaseTime);
      if (heroTimeValue && heroLastTimeText !== timeText) {
        heroTimeValue.textContent = timeText;
        heroLastTimeText = timeText;
      }
      heroClock.setAttribute('aria-label', `current time ${timeText}`);
      return;
    }

    const rawProgress = getHeroScoreProgress(scrollTop);
    const effectiveRawProgress = (heroNightLockProgress !== null)
      ? Math.max(rawProgress, heroNightLockProgress)
      : rawProgress;
    const progress = reduceMotion ? 0 : applyProgressHolds(effectiveRawProgress, HERO_NIGHT_HOLDS);
    const minutesFromScroll = Math.round(progress * HERO_CLOCK_SCROLL_MINUTES);
    const displayTime = new Date(heroClockBaseTime.getTime() + minutesFromScroll * 60000);
    if (displayTime.getHours() >= 21) {
      displayTime.setHours(21, 0, 0, 0);
    }
    const hours = displayTime.getHours();
    const minutes = displayTime.getMinutes();
    const seconds = displayTime.getSeconds();
    const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
    const hourAngle = (((hours % 12) + minutes / 60 + seconds / 3600) / 12) * 360;
    const timeText = formatHeroClockTime(displayTime);

    isNightActive = hours >= 21 || hours < 2;
    if (isNightActive && heroNightLockProgress === null) {
      heroNightLockProgress = rawProgress;
    }
    applyNightActiveState();

    if (!darkRoomClockTransiting) {
      heroClockState.progress = progress;
      heroClockState.hourAngle = (hourAngle - 90) * (Math.PI / 180);
      heroClockState.minuteAngle = (minuteAngle - 90) * (Math.PI / 180);
      heroClockState.textLocked = isNightActive;
      renderHeroClock3D();
    }

    if (heroTimeValue && heroLastTimeText !== timeText) {
      heroTimeValue.textContent = timeText;
      heroLastTimeText = timeText;
    }

    heroClock.setAttribute('aria-label', `current time ${timeText}`);
  }

  function showWaitlistMessage(text, type) {
    if (!waitlistMessage) return;
    waitlistMessage.textContent = text;
    waitlistMessage.className = `waitlist-message ${type} show`;
    window.setTimeout(() => {
      waitlistMessage.classList.remove('show');
    }, 5000);
  }

  async function submitWaitlistEmail(email) {
    const now = Date.now();
    if (now - lastWaitlistSubmission < WAITLIST_RATE_LIMIT_MS) {
      showWaitlistMessage('Please wait before submitting again', 'error');
      return false;
    }

    if (!EMAIL_REGEX.test(email)) {
      showWaitlistMessage('Please enter a valid email address', 'error');
      return false;
    }

    try {
      const response = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        showWaitlistMessage(data.error || 'Something went wrong. Please try again.', 'error');
        return false;
      }

      lastWaitlistSubmission = now;
      waitlistModal?.classList.add('show');
      waitlistModal?.setAttribute('aria-hidden', 'false');
      return true;
    } catch (_) {
      showWaitlistMessage('Network error. Please check your connection.', 'error');
      return false;
    }
  }

  function setupWaitlistForm() {
    if (!waitlistForm || !waitlistEmail || !waitlistButton) return;

    waitlistForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = waitlistEmail.value.trim();

      if (!email) {
        showWaitlistMessage('Please enter your email', 'error');
        return;
      }

      waitlistButton.disabled = true;
      waitlistButton.textContent = 'joining...';

      const success = await submitWaitlistEmail(email);

      waitlistButton.disabled = false;
      waitlistButton.textContent = 'join';

      if (success) {
        waitlistEmail.value = '';
      }
    });

    waitlistModal?.addEventListener('click', (event) => {
      if (event.target !== waitlistModal) return;
      waitlistModal.classList.remove('show');
      waitlistModal.setAttribute('aria-hidden', 'true');
    });

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !waitlistModal?.classList.contains('show')) return;
      waitlistModal.classList.remove('show');
      waitlistModal.setAttribute('aria-hidden', 'true');
    });
  }

  function setHowSlide(index) {
    if (!howSlides.length) return;
    activeHowSlide = (index + howSlides.length) % howSlides.length;

    howSlides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeHowSlide;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      if (isActive && slide.querySelector('.proto-chat')) triggerChatAnimation(slide);
      if (isActive && slide.querySelector('.proto-voice-talk')) triggerVoiceTalkAnimation(slide);
      if (!isActive && slide.querySelector('.proto-voice-talk')) stopVoiceTalkAnimation(slide);
    });

    howCopies.forEach((copy, copyIndex) => {
      const isActive = copyIndex === activeHowSlide;
      copy.classList.toggle('active', isActive);
      copy.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    howPrevButtons.forEach((button) => {
      const isHidden = activeHowSlide === 0;
      button.hidden = isHidden;
      button.disabled = isHidden;
      button.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
    });
    howNextButtons.forEach((button) => {
      const isHidden = activeHowSlide === howSlides.length - 1;
      button.hidden = isHidden;
      button.disabled = isHidden;
      button.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
    });
  }

  let chatAnimTimers = [];

  function triggerChatAnimation(slide) {
    const rows = Array.from(slide.querySelectorAll('.proto-row'));
    const chatEl = slide.querySelector('.proto-chat');
    rows.forEach((row) => row.classList.remove('proto-msg-in'));
    chatAnimTimers.forEach(clearTimeout);
    chatAnimTimers = [];
    if (chatEl) chatEl.scrollTop = 0;

    const scrollChatTo = (top) => {
      if (!chatEl) return;
      chatEl.scrollTo({ top, behavior: 'smooth' });
    };

    const delays = [80, 700, 1600, 2500, 3300, 4000, 4800, 5500];
    rows.forEach((row, i) => {
      const t = setTimeout(() => {
        row.classList.add('proto-msg-in');
        if (chatEl) {
          const rowBottom = row.offsetTop - chatEl.offsetTop + row.offsetHeight;
          const visibleBottom = chatEl.scrollTop + chatEl.clientHeight;
          if (rowBottom > visibleBottom) scrollChatTo(rowBottom - chatEl.clientHeight + 8);
        }
      }, delays[i] ?? i * 700);
      chatAnimTimers.push(t);
    });
  }

  const LIFE_QUESTIONS = {
    life:         "What's your top priority in life:\nmoney, love, or success?",
    time:         "How would you spend\na perfect Sunday together?",
    travel:       "Which do you prefer:\nbeach or mountains?",
    relationship: "What's your biggest\ndealbreaker in a relationship?",
    love:         "Do you believe\nin love at first sight?",
    money:        "Do you think\nmoney can buy happiness?",
  };

  let voiceAnimTimers = [];
  let voiceCallTimer = null;

  function stopVoiceTalkAnimation(slide) {
    voiceAnimTimers.forEach(clearTimeout);
    voiceAnimTimers = [];
    if (voiceCallTimer) { clearInterval(voiceCallTimer); voiceCallTimer = null; }
    const cards = Array.from(slide.querySelectorAll('.proto-life-card'));
    const modal = slide.querySelector('.proto-life-modal');
    cards.forEach((c) => c.classList.remove('pressed'));
    if (modal) modal.classList.remove('active');
    const timerEl = slide.querySelector('.proto-voice-timer');
    if (timerEl) timerEl.textContent = '00:00 / 40:00';
  }

  function triggerVoiceTalkAnimation(slide) {
    stopVoiceTalkAnimation(slide);
    const cats = ['life', 'time', 'travel', 'relationship', 'love', 'money'];
    const modal    = slide.querySelector('.proto-life-modal');
    const modalCat = slide.querySelector('.proto-life-modal-cat');
    const modalQ   = slide.querySelector('.proto-life-modal-q');
    const timerEl  = slide.querySelector('.proto-voice-timer');

    // call timer
    let elapsed = 0;
    function fmt(s) {
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }
    voiceCallTimer = setInterval(() => {
      elapsed++;
      if (timerEl) timerEl.textContent = `${fmt(elapsed)} / 40:00`;
    }, 1000);

    // timings (ms)
    const T_INITIAL = 2000;
    const T_PRESS   = 100;
    const T_RELEASE = 100;
    const T_MODAL   = 2500;
    const T_FADE    = 150;
    const T_GAP     = 350;
    const T_STEP    = T_PRESS + T_RELEASE + T_FADE + T_MODAL + T_FADE + T_GAP;

    cats.forEach((cat, i) => {
      const offset = T_INITIAL + i * T_STEP;
      const card = slide.querySelector(`.proto-life-card[data-cat="${cat}"]`);

      voiceAnimTimers.push(setTimeout(() => {
        if (card) card.classList.add('pressed');
      }, offset));

      voiceAnimTimers.push(setTimeout(() => {
        if (card) card.classList.remove('pressed');
        if (modalCat) modalCat.textContent = cat;
        if (modalQ)   modalQ.textContent   = LIFE_QUESTIONS[cat] || '';
        if (modal)    modal.classList.add('active');
      }, offset + T_PRESS + T_RELEASE));

      voiceAnimTimers.push(setTimeout(() => {
        if (modal) modal.classList.remove('active');
      }, offset + T_PRESS + T_RELEASE + T_FADE + T_MODAL));
    });
  }

  let optionAnimTimers = [];

  function triggerOptionAnimation(slide) {
    const foodCards = Array.from(slide.querySelectorAll('.proto-food-card'));
    const foodDots = Array.from(slide.querySelectorAll('.proto-dots i'));
    optionAnimTimers.forEach(clearTimeout);
    optionAnimTimers = [];
    foodCards.forEach((c, i) => c.classList.toggle('center', i === 0));
    foodDots.forEach((d, i) => d.classList.toggle('active', i === 0));
    [[1, 1400], [2, 2800]].forEach(([cardIndex, delay]) => {
      const t = setTimeout(() => {
        foodCards.forEach((c, i) => c.classList.toggle('center', i === cardIndex));
        foodDots.forEach((d, i) => d.classList.toggle('active', i === cardIndex));
      }, delay);
      optionAnimTimers.push(t);
    });
  }

  function setupHowMobile() {
    const howSection = document.querySelector('.how-nine');
    if (!howSection || !howCarousel) return null;

    if (howMobileEl) return howMobileEl;

    const mobileEl = document.createElement('div');
    mobileEl.className = 'how-mobile';

    howSlides.forEach((slide, i) => {
      const copy = howCopies[i];
      const item = document.createElement('div');
      item.className = 'how-mobile-item';
      item.dataset.howMobileIndex = i;

      if (copy) {
        const copyDiv = document.createElement('div');
        copyDiv.className = 'how-mobile-copy reveal';
        copyDiv.innerHTML = copy.innerHTML;
        item.appendChild(copyDiv);
      }

      const phoneWrap = document.createElement('div');
      phoneWrap.className = 'how-mobile-phone-wrap reveal d1';
      const phone = document.createElement('div');
      phone.className = 'phone how-mobile-phone';
      const screens = document.createElement('div');
      screens.className = 'how-phone-screens';
      const slideClone = slide.cloneNode(true);
      slideClone.classList.add('active');
      slideClone.setAttribute('aria-hidden', 'false');
      screens.appendChild(slideClone);
      phone.appendChild(screens);
      phoneWrap.appendChild(phone);
      item.appendChild(phoneWrap);

      mobileEl.appendChild(item);
    });

    howCarousel.after(mobileEl);
    howMobileEl = mobileEl;
    window.observeReveal?.(mobileEl);

    if ('IntersectionObserver' in window) {
      const mobileObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = parseInt(entry.target.dataset.howMobileIndex, 10);
          const slideEl = entry.target.querySelector('[data-how-slide]');
          if (!slideEl) return;
          if (index === 0) triggerOptionAnimation(slideEl);
          if (index === 1) triggerVoiceTalkAnimation(slideEl);
          if (index === 2) triggerChatAnimation(slideEl);
        });
      }, { threshold: 0.25 });

      mobileEl.querySelectorAll('.how-mobile-item').forEach((item) => mobileObserver.observe(item));
    }

    return howMobileEl;
  }

  function syncHowLayout() {
    if (!howNine) return;
    setupHowMobile();
    howNine.classList.remove('how-nine--mobile');
  }

  function setupHowCarousel() {
    if (!howCarousel || !howSlides.length) return;
    syncHowLayout();
  }

  function interpolateStops(progress, stops) {
    if (!stops.length) return 0;
    if (progress <= stops[0][0]) return stops[0][1];

    for (let index = 1; index < stops.length; index += 1) {
      const [prevProgress, prevValue] = stops[index - 1];
      const [nextProgress, nextValue] = stops[index];
      if (progress <= nextProgress) {
        const localProgress = clamp((progress - prevProgress) / Math.max(0.0001, nextProgress - prevProgress));
        return lerp(prevValue, nextValue, localProgress);
      }
    }

    return stops[stops.length - 1][1];
  }

  function setSphereVar(name, value, unit = '') {
    if (!whatSphere || !Number.isFinite(value)) return;
    whatSphere.style.setProperty(name, `${value.toFixed(3)}${unit}`);
  }

  function applyWhatSphereState(state) {
    if (!whatSphere) return;
    whatSphere.style.visibility = state.opacity > 0.015 ? 'visible' : 'hidden';
    setSphereVar('--sphere-opacity', state.opacity);
    setSphereVar('--what-left', state.left, '%');
    setSphereVar('--what-top', state.top, '%');
    setSphereVar('--what-scale', state.scale);
  }

  function buildLemniscateRing(THREE, a, rotation, material) {
    const points = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const t = (Math.PI * 2 * i) / segments;
      const denom = 1 + Math.sin(t) * Math.sin(t);
      const x = a * Math.cos(t) / denom;
      const y = a * Math.sin(t) * Math.cos(t) / denom;
      points.push(new THREE.Vector3(x, y, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, 200, 0.002, 4, true);
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(rotation.x, rotation.y, rotation.z);
    return ring;
  }

  function buildOrbitRing(THREE, radiusX, radiusY, rotation, material) {
    const points = [];
    const segments = 128;
    for (let i = 0; i < segments; i++) {
      const t = (Math.PI * 2 * i) / segments;
      points.push(new THREE.Vector3(Math.cos(t) * radiusX, Math.sin(t) * radiusY, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, 128, 0.002, 4, true);
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(rotation.x, rotation.y, rotation.z);
    ring.userData.baseZ = rotation.z;
    return ring;
  }

  function buildOrbitSphere(THREE) {
    const group = new THREE.Group();

    const mkMat = (opacity, color = 0xf0eaff) => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const rings = [];

    const ringPoint = (rX, rY, rot, theta) => {
      const p = new THREE.Vector3(Math.cos(theta) * rX, Math.sin(theta) * rY, 0);
      p.applyEuler(new THREE.Euler(rot.x, rot.y, rot.z));
      return p;
    };

    // pink center sphere
    const centerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 96, 96),
      makeWhatPlanetMaterial(THREE, 0xf2d0de, {
        r: 218,
        g: 168,
        b: 185,
        noiseR: 0.72,
        noiseG: 0.50,
        noiseB: 0.58,
      }),
    );
    centerDot.userData.maxOpacity = 0.74;
    group.add(centerDot);

    // purple orbit sphere
    const orbitPos = ringPoint(1.72, 0.54, { x: 0.10, y: 0.34, z: -0.08 }, 0.8);
    const orbitDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 96, 96),
      makeWhatPlanetMaterial(THREE, 0xefe7ff, {
        r: 220,
        g: 207,
        b: 255,
        noiseR: 0.48,
        noiseG: 0.44,
        noiseB: 0.60,
      }),
    );
    orbitDot.userData.maxOpacity = 0.64;
    orbitDot.position.copy(orbitPos.clone().multiplyScalar(1.4));
    orbitDot.userData.to   = orbitPos.clone().multiplyScalar(1.4).toArray();
    orbitDot.userData.from = orbitPos.clone().multiplyScalar(3.5).toArray();
    group.add(orbitDot);

    // small dots that orbit on the lemniscate rings
    const lemnDotA = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff99cc, transparent: true, opacity: 0, depthWrite: false }),
    );
    group.add(lemnDotA);
    const lemnDotB = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xccaaff, transparent: true, opacity: 0, depthWrite: false }),
    );
    group.add(lemnDotB);

    // Orbital rings for what-you-get sections (kindred / chemistry / journal)
    const mkRingMat = (color) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const makeCircleRing = (color) => {
      const R = 0.82; const SEGS = 128;
      const pts = [];
      for (let i = 0; i <= SEGS; i++) {
        const t = (Math.PI * 2 * i) / SEGS;
        pts.push(new THREE.Vector3(Math.cos(t) * R, Math.sin(t) * R, 0));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const geo = new THREE.TubeGeometry(curve, SEGS, 0.003, 6, true);
      return new THREE.Mesh(geo, mkRingMat(color));
    };

    const pinkRingGroup = new THREE.Group();
    const pinkRingMesh = makeCircleRing(0xf4a8c8);
    pinkRingGroup.add(pinkRingMesh);
    group.add(pinkRingGroup);

    const purpleRingGroup = new THREE.Group();
    const purpleRingMesh = makeCircleRing(0xd8c0ff);
    purpleRingGroup.add(purpleRingMesh);
    group.add(purpleRingGroup);

    return { group, rings, centerDot, orbitDot, whiteDots: [], centerGlowMesh: null, orbitGlowMesh: null, lemnDotA, lemnDotB, pinkRingMesh, purpleRingMesh, pinkRingGroup, purpleRingGroup };
  }

  function resizeWhatSphere3D() {
    if (!whatSphere3D || !whatSphere3D.ready || !whatSphere) return;
    const rect = whatSphere.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width === whatSphere3D.width && height === whatSphere3D.height) return;

    whatSphere3D.width = width;
    whatSphere3D.height = height;
    whatSphere3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    whatSphere3D.renderer.setSize(width, height, false);
    whatSphere3D.camera.aspect = width / height;
    whatSphere3D.camera.updateProjectionMatrix();
  }

  function isWhatSphereAtRest() {
    return Object.keys(whatSphereTarget).every((key) => (
      Math.abs(whatSphereTarget[key] - whatSphereCurrent[key]) < 0.003
    ));
  }

  function renderWhatSphere3D(time = performance.now()) {
    if (!whatSphere3D || !whatSphere3D.ready) return;

    whatSphereCurrent = { ...whatSphereTarget };
    applyWhatSphereState(whatSphereCurrent);
    resizeWhatSphere3D();

    const cameraZ = whatSphereCurrent.cameraZ;
    const viewHeight = 2 * Math.tan((whatSphere3D.camera.fov * Math.PI / 180) / 2) * cameraZ;
    const viewWidth = viewHeight * whatSphere3D.camera.aspect;
    const targetX = (whatSphereCurrent.left / 100 - 0.5) * viewWidth;
    const targetY = -(whatSphereCurrent.top / 100 - 0.5) * viewHeight;
    const canvasScale = window.innerWidth <= 960 ? 0.64 : 0.58;
    const panelScale = whatSphereCurrent.depth * whatSphereCurrent.scale * canvasScale;
    const spacerScale = (viewWidth * ORBIT_SPACER_WIDTH) / (ORBIT_FRAME_RADIUS_X * 2);
    const objectScale = lerp(panelScale, spacerScale, clamp(whatSphereCurrent.fitAmount));

    whatSphere3D.group.rotation.set(
      whatSphereCurrent.rotationX,
      whatSphereCurrent.rotationY,
      whatSphereCurrent.rotationZ,
    );
    whatSphere3D.focusVector
      .set(whatSphereCurrent.focusX, whatSphereCurrent.focusY, whatSphereCurrent.focusZ)
      .applyEuler(whatSphere3D.group.rotation);
    whatSphere3D.group.position.set(
      targetX - whatSphere3D.focusVector.x * objectScale,
      targetY - whatSphere3D.focusVector.y * objectScale,
      0,
    );
    whatSphere3D.group.scale.setScalar(objectScale);
    whatSphere3D.camera.position.z = cameraZ;

    if (whatSphere3D.centerDot && whatSphere3D.orbitDot) {
      const dp = whatSphereCurrent.dotProgress;

      const centerEased = smoothstep(clamp(dp / 0.7));
      whatSphere3D.centerDot.material.opacity = centerEased * (whatSphere3D.centerDot.userData.maxOpacity ?? 1);
      whatSphere3D.centerDot.scale.setScalar(centerEased);
      whatSphere3D.centerDot.position.set(
        lerp(0.3, 0, centerEased),
        lerp(0.6, 0, centerEased),
        lerp(0.8, 0, centerEased),
      );
      whatSphere3D.centerDot.rotation.x = time * 0.00018;
      whatSphere3D.centerDot.rotation.y = -0.28 + time * 0.00012;
      const centerTexture = whatSphere3D.centerDot.material.userData.texture;
      if (centerTexture) {
        centerTexture.offset.x = time * 0.000008;
        centerTexture.offset.y = time * -0.000018;
      }

      const orbitEased = smoothstep(clamp((dp - 0.2) / 0.8));
      const orbitFade = 1 - whatSphereCurrent.journalProgress;
      whatSphere3D.orbitDot.material.opacity = orbitEased * orbitFade * (whatSphere3D.orbitDot.userData.maxOpacity ?? 1);
      whatSphere3D.orbitDot.scale.setScalar(orbitEased * orbitFade);
      whatSphere3D.orbitDot.rotation.x = -0.12 + time * 0.00015;
      whatSphere3D.orbitDot.rotation.y = 0.34 + time * 0.00011;
      const orbitTexture = whatSphere3D.orbitDot.material.userData.texture;
      if (orbitTexture) {
        orbitTexture.offset.x = time * -0.000007;
        orbitTexture.offset.y = time * -0.000014;
      }
      const { from: oFrom, to: oTo } = whatSphere3D.orbitDot.userData;
      const chemP = whatSphereCurrent.chemProgress;
      const compact = window.innerWidth <= 960;
      const mobileOrbitTighten = compact ? lerp(0.74, 1, chemP) : 1;
      const CHEM_OVERLAP = [0.0, 0.05, 0.55];
      whatSphere3D.orbitDot.position.set(
        lerp(lerp(oFrom[0], oTo[0], orbitEased) * mobileOrbitTighten, CHEM_OVERLAP[0], chemP),
        lerp(lerp(oFrom[1], oTo[1], orbitEased) * mobileOrbitTighten, CHEM_OVERLAP[1], chemP),
        lerp(lerp(oFrom[2], oTo[2], orbitEased), CHEM_OVERLAP[2], chemP),
      );

      const kp = whatSphereCurrent.kindredProgress;

      const ringRadiusPx = lerp(compact ? 112 : 155, compact ? 147 : 220, clamp(Math.max(chemP, whatSphereCurrent.journalProgress)));
      const viewHeightForRings = 2 * Math.tan((whatSphere3D.camera.fov * Math.PI / 180) / 2) * cameraZ;
      const pxPerLocalUnit = (whatSphere3D.height / viewHeightForRings) * objectScale;
      const localRingRadius = ringRadiusPx / Math.max(1, pxPerLocalUnit);
      const ringScalar = localRingRadius / 0.82;
      const sectionRingOpacity = smoothstep(clamp(Math.max(kp, chemP, whatSphereCurrent.journalProgress)));
      const overlapLocal = new whatSphere3D.THREE.Vector3(
        (whatSphere3D.centerDot.position.x + whatSphere3D.orbitDot.position.x) * 0.5,
        (whatSphere3D.centerDot.position.y + whatSphere3D.orbitDot.position.y) * 0.5,
        (whatSphere3D.centerDot.position.z + whatSphere3D.orbitDot.position.z) * 0.5,
      );
      const pinkRingCenter = whatSphere3D.centerDot.position.clone().lerp(overlapLocal, chemP);
      const purpleRingCenter = whatSphere3D.orbitDot.position.clone().lerp(overlapLocal, chemP);
      const ringQuat = whatSphere3D.group.quaternion.clone().invert();

      if (whatSphere3D.pinkRingGroup && whatSphere3D.pinkRingMesh) {
        whatSphere3D.pinkRingGroup.position.copy(pinkRingCenter);
        whatSphere3D.pinkRingGroup.quaternion.copy(ringQuat);
        whatSphere3D.pinkRingGroup.scale.setScalar(ringScalar);
        whatSphere3D.pinkRingMesh.material.opacity = sectionRingOpacity * 0.5;
      }

      if (whatSphere3D.purpleRingGroup && whatSphere3D.purpleRingMesh) {
        whatSphere3D.purpleRingGroup.position.copy(purpleRingCenter);
        whatSphere3D.purpleRingGroup.quaternion.copy(ringQuat);
        whatSphere3D.purpleRingGroup.scale.setScalar(ringScalar);
        whatSphere3D.purpleRingMesh.material.opacity = sectionRingOpacity * (1 - whatSphereCurrent.journalProgress) * 0.56;
      }

      // Pass orbitDot reference for orbit-rings-clock section positioning
      if (whatSphereState) {
        whatSphereState.centerDot = whatSphere3D.centerDot;
        whatSphereState.orbitDot   = whatSphere3D.orbitDot;
        whatSphereState.groupWorld = whatSphere3D.group;
        whatSphereState.camera3D   = whatSphere3D.camera;
      }

      if (whatSphere3D.chemOverlay) {
        whatSphere3D.positionConstellationOverlay?.(whatSphere3D.chemOverlay);
        whatSphere3D.chemOverlay.style.opacity = chemP;
      }

      if (whatSphere3D.centerGlowMesh) {
        whatSphere3D.centerGlowMesh.material.uniforms.uOpacity.value = whatSphereCurrent.centerGlow;
      }
      if (whatSphere3D.orbitGlowMesh) {
        whatSphere3D.orbitGlowMesh.material.uniforms.uOpacity.value = whatSphereCurrent.orbitGlow * orbitFade;
      }

      if (whatSphere3D.kindredOverlay) {
        whatSphere3D.kindredOverlay.style.opacity = 0;
      }
      if (whatSphere3D.journalOverlay) {
        whatSphere3D.positionConstellationOverlay?.(whatSphere3D.journalOverlay);
        whatSphere3D.journalOverlay.style.opacity = whatSphereCurrent.journalProgress;
      }

      const jp = whatSphereCurrent.journalProgress;

      // heart icons projected from 3D sphere centers
      if (whatSphere3D.centerHeart && whatSphere3D.THREE) {
        whatSphere3D.group.updateWorldMatrix(true, false);
        const T = whatSphere3D.THREE;
        const project = (mesh) => {
          const p = mesh.position.clone().applyMatrix4(whatSphere3D.group.matrixWorld).project(whatSphere3D.camera);
          return { x: (p.x * 0.5 + 0.5) * 100, y: (-p.y * 0.5 + 0.5) * 100 };
        };
        const heartShow = Math.max(0, (centerEased - 0.6) / 0.4) * (1 - chemP);
        const cp = project(whatSphere3D.centerDot);
        whatSphere3D.centerHeart.style.left = cp.x + '%';
        whatSphere3D.centerHeart.style.top  = cp.y + '%';
        whatSphere3D.centerHeart.style.opacity = heartShow;
        const op2 = project(whatSphere3D.orbitDot);
        whatSphere3D.orbitHeart.style.left = op2.x + '%';
        whatSphere3D.orbitHeart.style.top  = op2.y + '%';
        whatSphere3D.orbitHeart.style.opacity = heartShow * orbitFade;
        if (whatSphere3D.chemHeart) {
          whatSphere3D.chemHeart.style.left = `${(cp.x + op2.x) * 0.5}%`;
          whatSphere3D.chemHeart.style.top = `${(cp.y + op2.y) * 0.5}%`;
          whatSphere3D.chemHeart.style.opacity = chemP * centerEased;
        }
      }

    }

    whatSphere3D.renderer.render(whatSphere3D.scene, whatSphere3D.camera);
  }

  function requestWhatSphereRender() {
    if (!whatSphere3D || !whatSphere3D.ready || whatSphereRenderRaf) return;
    whatSphereRenderRaf = requestAnimationFrame(function renderFrame(time) {
      whatSphereRenderRaf = null;
      renderWhatSphere3D(time);

      if (!reduceMotion && !isWhatSphereAtRest()) {
        requestWhatSphereRender();
      }
    });
  }

  function setWhatSphere3DTarget(nextState) {
    const shouldAppearImmediately = whatSphereCurrent.opacity < 0.02 && nextState.opacity > 0.98;
    const shouldHideImmediately = whatSphereCurrent.opacity > 0.02 && nextState.opacity < 0.02;
    whatSphereTarget = { ...whatSphereTarget, ...nextState };
    if (shouldAppearImmediately) whatSphereCurrent.opacity = whatSphereTarget.opacity;
    if (shouldHideImmediately) whatSphereCurrent.opacity = whatSphereTarget.opacity;
    applyWhatSphereState(whatSphereTarget);
    requestWhatSphereRender();
  }

  async function initWhatSphere3D() {
    if (!whatSphere || !whatSphereCanvas) return;

    try {
      const THREE = await import('./vendor/three.module.min.js');
      const renderer = new THREE.WebGLRenderer({
        canvas: whatSphereCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'default',
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      const { group, rings, centerDot, orbitDot, whiteDots, centerGlowMesh, orbitGlowMesh, lemnDotA, lemnDotB, pinkRingMesh, purpleRingMesh, pinkRingGroup, purpleRingGroup } = buildOrbitSphere(THREE);

      scene.add(new THREE.AmbientLight(0xffffff, 1.25));
      const keyLight = new THREE.PointLight(0xff9bdc, 2.35, 7);
      keyLight.position.set(1.6, 1.1, 2.4);
      scene.add(keyLight);
      const coolLight = new THREE.PointLight(0x8b78ff, 1.7, 6);
      coolLight.position.set(-1.2, -0.7, 2.2);
      scene.add(coolLight);
      scene.add(group);
      camera.position.z = whatSphereDefault.cameraZ;
      const makeHeartEl = () => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;pointer-events:none;transform:translate(-50%,-50%);color:rgba(255,255,255,0.82);font-size:18px;opacity:0;will-change:opacity,left,top';
        el.textContent = '♥';
        whatSphere.appendChild(el);
        return el;
      };

      whatSphere3D = {
        ready: true,
        renderer,
        scene,
        camera,
        group,
        rings,
        centerDot,
        orbitDot,
        whiteDots,
        centerGlowMesh,
        orbitGlowMesh,
        lemnDotA,
        lemnDotB,
        lemnThetaA: 0.5,
        lemnThetaB: 3.5,
        pinkRingMesh,
        purpleRingMesh,
        pinkRingGroup,
        purpleRingGroup,
        centerHeart: makeHeartEl(),
        orbitHeart: makeHeartEl(),
        chemHeart: makeHeartEl(),
        THREE,
        focusVector: new THREE.Vector3(),
        width: 0,
        height: 0,
      };

      const sectionRingPoint = (theta, center, radiusPx) => {
        return {
          dx: center.dx + Math.cos(theta) * radiusPx,
          dy: center.dy - Math.sin(theta) * radiusPx,
        };
      };

      const positionConstellationOverlay = (overlay) => {
        if (!overlay?._words) return;

        const DOT_RADIUS = 7;
        const chemP = whatSphereCurrent.chemProgress;
        const journalP = whatSphereCurrent.journalProgress;
        const compact = window.innerWidth <= 960;
        const baseRingPx = compact ? 87 : 155;
        const sectionRingPx = compact ? 147 : 220;
        const ringRadiusPx = lerp(baseRingPx, sectionRingPx, clamp(Math.max(chemP, journalP)));
        const baseScreen = {
          x: (whatSphereCurrent.left / 100) * window.innerWidth,
          y: (whatSphereCurrent.top / 100) * window.innerHeight,
        };
        const projectMesh = (mesh) => {
          whatSphere3D.group.updateWorldMatrix(true, false);
          const p = mesh.position.clone()
            .applyMatrix4(whatSphere3D.group.matrixWorld)
            .project(whatSphere3D.camera);
          return {
            x: (p.x + 1) / 2 * window.innerWidth,
            y: (1 - p.y) / 2 * window.innerHeight,
          };
        };
        const centerScreen = projectMesh(whatSphere3D.centerDot);
        const orbitScreen = projectMesh(whatSphere3D.orbitDot);
        const centerDotRel = {
          dx: centerScreen.x - baseScreen.x,
          dy: centerScreen.y - baseScreen.y,
        };
        const overlapRel = {
          dx: (centerScreen.x + orbitScreen.x) * 0.5 - baseScreen.x,
          dy: (centerScreen.y + orbitScreen.y) * 0.5 - baseScreen.y,
        };
        const ringCenters = {
          chemistry: {
            dx: lerp(centerDotRel.dx, overlapRel.dx, chemP),
            dy: lerp(centerDotRel.dy, overlapRel.dy, chemP),
          },
          journal: centerDotRel,
        };

        overlay._words.forEach((word) => {
          let dx = word.dx;
          let dy = word.dy;
          const anchorRight = word.side === 'right' || (word.side === 'compact-right' && compact);
          if (Number.isFinite(word.theta) && ringCenters[word.ring]) {
            const point = sectionRingPoint(word.theta, ringCenters[word.ring], ringRadiusPx);
            dx = point.dx + (word.dotAnchor ? (anchorRight ? DOT_RADIUS : -DOT_RADIUS) : 0);
            dy = point.dy;
          }
          if (word.dotAnchor) {
            word.el.style.transform = anchorRight ? 'translate(-100%,-50%)' : 'translate(0,-50%)';
            word.el.style.flexDirection = anchorRight ? 'row-reverse' : 'row';
          }
          word.el.style.left = `calc(var(--what-left) + ${dx.toFixed(2)}px)`;
          word.el.style.top = `calc(var(--what-top) + ${dy.toFixed(2)}px)`;
        });
      };

      const makeConstellationOverlay = (words) => {
        const wrap = document.createElement('div');
        wrap.className = 'constellation-overlay';
        wrap._words = [];
        words.forEach(({ text, dx = 0, dy = 0, theta, ring, color, size, dotAnchor, side }) => {
          const el = document.createElement('span');
          el.className = `constellation-word dot-${color}`;
          el.textContent = text;
          // dotAnchor: position text edge so the matte dot center lands on the ring.
          const transform = dotAnchor ? 'translate(0,-50%)' : 'translate(-50%,-50%)';
          el.style.cssText = `left:calc(var(--what-left) + ${dx}px);top:calc(var(--what-top) + ${dy}px);font-size:${size}px;transform:${transform}`;
          wrap.appendChild(el);
          wrap._words.push({ el, dx, dy, theta, ring, dotAnchor, side });
        });
        whatSphere.appendChild(wrap);
        positionConstellationOverlay(wrap);
        return wrap;
      };

      whatSphere3D.kindredOverlay = makeConstellationOverlay([
        { text: 'drawn together',    dx: -112, dy: -70, color: 'purple', size: 11.5 },
        { text: 'same frequency',    dx:  68,  dy: -56, color: 'pink',   size: 11   },
        { text: 'quiet recognition', dx: -96,  dy:  66, color: 'purple', size: 11   },
      ]);

      whatSphere3D.chemOverlay = makeConstellationOverlay([
        { text: 'shared values',    theta: Math.PI / 2, ring: 'chemistry', color: 'pink',   size: 12.5, dotAnchor: true },
        { text: 'gentle humor',     theta: 3.70,        ring: 'chemistry', color: 'purple', size: 12,   dotAnchor: true },
        { text: 'late-night talks', theta: 5.60,        ring: 'chemistry', color: 'pink',   size: 12,   dotAnchor: true, side: 'compact-right' },
      ]);
      // wire chem to chemProgress via direct property
      whatSphere3D.chemOverlay._isChem = true;

      whatSphere3D.journalOverlay = makeConstellationOverlay([
        { text: 'to listen',    theta: 2.35, ring: 'journal', color: 'purple', size: 12.5, dotAnchor: true },
        { text: 'to laugh',     theta: 0.75, ring: 'journal', color: 'pink',   size: 13,   dotAnchor: true, side: 'compact-right' },
        { text: 'to notice',    theta: 3.78, ring: 'journal', color: 'purple', size: 12,   dotAnchor: true },
        { text: 'what matters', theta: 5.55, ring: 'journal', color: 'pink',   size: 13,   dotAnchor: true, side: 'compact-right' },
      ]);

      whatSphere3D.positionConstellationOverlay = positionConstellationOverlay;

      resizeWhatSphere3D();
      renderWhatSphere3D();
      requestScrollUpdate();
    } catch (error) {
      whatSphere.classList.add('is-unavailable');
      console.warn('Unable to initialize the what-you-get sphere.', error);
    }
  }

  function updateWhatSphere() {
    if (!whatSphere || !darkRoom || !sphereApproach || !howNine || whatSections.length < 3) return;

    const scroller = document.scrollingElement || document.documentElement;
    const scrollTop = scroller.scrollTop || 0;
    const start = darkRoom.offsetTop;
    const end = howNine.offsetTop;
    const progress = clamp((scrollTop - start) / Math.max(1, end - start));
    const compact = window.innerWidth <= 960;
    const vh = window.innerHeight || 1;
    const at = (el) => clamp((el.offsetTop - start) / Math.max(1, end - start));
    const viewportTopFor = (el, anchor = 0.5) => ((el.offsetTop + el.offsetHeight * anchor - scrollTop) / vh) * 100;
    const pApproach = at(sphereApproach);
    const pKindred = at(whatSections[0]);
    const pChemistry = at(whatSections[1]);
    const pJournal = at(whatSections[2]);
    const pJournalBreath = lerp(pChemistry, pJournal, 0.42);
    const heldProgress = applyProgressHolds(progress, [
      { at: pKindred, radius: compact ? 0.065 : 0.052, strength: 0.72 },
      { at: pChemistry, radius: compact ? 0.065 : 0.052, strength: 0.72 },
      { at: pJournal, radius: compact ? 0.07 : 0.056, strength: 0.76 },
    ]);
    const sphereProgress = Math.min(heldProgress, pJournal);
    const approachTop = viewportTopFor(sphereApproach, 0.5);
    const approachTopAtTransition = sphereApproach.offsetHeight * 0.5 / vh * 100;
    const introEnd = Math.max(0.0001, pApproach * 0.8);
    const preSectionFade = clamp((scrollTop - (start - vh * 0.6)) / (vh * 0.6));
    const sphereOpacity = interpolateStops(progress, [
      [0, preSectionFade * 0.18],
      [introEnd * 0.45, 0.48],
      [introEnd, 1],
      [1, 1],
    ]);
    const fixedVideoSwitch = (from, to, width = compact ? 0.18 : 0.13) => {
      const mid = lerp(from, to, 0.5);
      const span = Math.max(0.0001, (to - from) * width);
      return smoothstep(clamp((sphereProgress - (mid - span)) / (span * 2)));
    };
    const approachToKindred = fixedVideoSwitch(pApproach, pKindred, compact ? 0.24 : 0.2);
    const kindredToChemistry = fixedVideoSwitch(pKindred, pChemistry);
    const chemistryToJournal = fixedVideoSwitch(pChemistry, pJournal);
    const sectionLeft = compact
      ? lerp(lerp(35, 39, kindredToChemistry), 50, chemistryToJournal)
      : lerp(lerp(65, 28, kindredToChemistry), 72, chemistryToJournal);
    const sectionTop = compact ? 62 : 52;
    const left = progress <= pApproach
      ? 50
      : lerp(50, sectionLeft, approachToKindred);
    const top = progress <= pApproach
      ? approachTop
      : lerp(approachTopAtTransition, sectionTop, approachToKindred);
    const journalScrollLift = (Math.max(0, scrollTop - whatSections[2].offsetTop) / vh) * 100;
    const journalTopOffset = lerp(0, 8, chemistryToJournal);
    const releasedTop = top + journalTopOffset - journalScrollLift;
    const scale = compact ? 0.98 : 1.02;
    const depth = compact ? 1.08 : 1.12;
    const fitAmount = interpolateStops(sphereProgress, [[0, 1], [pApproach, 1], [pKindred, 0], [pJournal, 0], [1, 0]]);
    const rotationX = interpolateStops(sphereProgress, [[0, -0.1], [pApproach, -0.1], [pKindred, 0.04], [pChemistry, -0.04], [pJournal, 0.08], [1, 0.08]]);
    const rotationY = interpolateStops(sphereProgress, [[0, -0.34], [pApproach, -0.34], [pKindred, 0.54], [pChemistry, 1.38], [pJournalBreath, 1.62], [pJournal, 2.1], [1, 2.1]]);
    const rotationZ = progress <= pApproach ? 0.06 : 0.04;
    const cameraZ = lerp(whatSphereDefault.cameraZ, compact ? 5.05 : 5.12, approachToKindred);

    const dotAnimStart = lerp(pApproach, pKindred, 0.35);
    const dotProgress = clamp((sphereProgress - dotAnimStart) / Math.max(0.0001, pKindred - dotAnimStart));

    // orbitProgress: mirrors orbit-rings-clock animation (0→1 from lockScrollTop to orbitEnd)
    const orbitEnd = sphereApproach.offsetTop + sphereApproach.offsetHeight * 0.5 - vh * 0.5;
    const darkRoomClockEl = document.querySelector('.dark-room-clock');
    const lockST = darkRoomClockEl?._lockScrollTop ?? null;
    const localOrbitProg = lockST !== null
      ? smoothstep(clamp((scrollTop - lockST) / Math.max(1, orbitEnd - lockST)))
      : 0;

    // Crossfade: rings appear as orbit-rings-clock fades (same 0.38vh window)
    const CROSS_VH_PROG = 0.38 * vh / Math.max(1, end - start);
    const handoffP = clamp((orbitEnd - start) / Math.max(1, end - start));
    const crossStartP = Math.max(0, handoffP - CROSS_VH_PROG);
    const ringAppearProgress = smoothstep(clamp((sphereProgress - crossStartP) / Math.max(0.0001, handoffP - crossStartP)));

    // kindred: orbit(보라)만 글로우
    const kindredGlowIn = clamp((sphereProgress - lerp(pApproach, pKindred, 0.4)) / Math.max(0.0001, pKindred - lerp(pApproach, pKindred, 0.4)));
    const kindredGlowOut = 1 - clamp((sphereProgress - lerp(pKindred, pChemistry, 0.1)) / Math.max(0.0001, lerp(pKindred, pChemistry, 0.3) - lerp(pKindred, pChemistry, 0.1)));
    const kindredOrbitGlow = smoothstep(clamp(Math.min(kindredGlowIn, kindredGlowOut)));

    // journal: center(분홍)만 글로우
    const journalGlowIn = clamp((sphereProgress - lerp(pChemistry, pJournal, 0.5)) / Math.max(0.0001, pJournal - lerp(pChemistry, pJournal, 0.5)));
    const journalCenterGlow = smoothstep(clamp(journalGlowIn));

    const chemInStart = lerp(pKindred, pChemistry, 0.35);
    const chemOutStart = lerp(pChemistry, pJournal, 0.15);
    const chemOutEnd = lerp(pChemistry, pJournal, 0.55);
    const chemIn = clamp((sphereProgress - chemInStart) / Math.max(0.0001, pChemistry - chemInStart));
    const chemOut = 1 - clamp((sphereProgress - chemOutStart) / Math.max(0.0001, chemOutEnd - chemOutStart));
    const chemProgress = smoothstep(clamp(Math.min(chemIn, chemOut)));

    const kindredIn  = clamp((sphereProgress - lerp(pApproach, pKindred, 0.5)) / Math.max(0.0001, pKindred - lerp(pApproach, pKindred, 0.5)));
    const kindredOut = 1 - clamp((sphereProgress - lerp(pKindred, pChemistry, 0.2)) / Math.max(0.0001, lerp(pKindred, pChemistry, 0.45) - lerp(pKindred, pChemistry, 0.2)));
    const kindredProgress = smoothstep(clamp(Math.min(kindredIn, kindredOut)));

    setWhatSphere3DTarget({
      opacity: sphereOpacity,
      left,
      top: releasedTop,
      scale,
      depth,
      fitAmount,
      focusX: 0,
      focusY: 0,
      focusZ: 0,
      rotationX,
      rotationY,
      rotationZ,
      cameraZ,
      dotProgress,
      chemProgress,
      centerGlow: 0,
      orbitGlow: 0,
      kindredProgress,
      journalProgress: journalCenterGlow,
      ringAppearProgress,
      orbitProgress: localOrbitProg,
    });

    // Keep orbit-rings-clock updated for section phase
    whatSphereState = {
      fitAmount,
      left,
      top: releasedTop,
      kindredProgress,
      chemProgress,
      journalProgress: journalCenterGlow,
      dotProgress,
      compact,
      orbitEnd,
    };

    renderWhatSphere3D();
  }

  function updateDarkRoom() {
    if (!darkRoom) return;
    const vh = window.innerHeight || 1;
    const rect = darkRoom.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const intensity = clamp(1 - Math.abs(center - vh / 2) / (vh * 0.7));
    darkRoom.style.setProperty('--dark-y', `${((1 - intensity) * 20).toFixed(2)}px`);
  }

  function centerHashPanel(behavior = 'auto') {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const scroller = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(0, scroller.scrollHeight - window.innerHeight);
    const rect = target.getBoundingClientRect();
    window.scrollTo({
      top: clamp(scroller.scrollTop + rect.top, 0, maxScroll),
      behavior,
    });
  }

  function updateScrollScene() {
    rafPending = false;

    const scroller = document.scrollingElement || document.documentElement;
    const scrollTop = scroller.scrollTop || 0;
    const maxScroll = Math.max(1, scroller.scrollHeight - window.innerHeight);
    latestProgress = clamp(scrollTop / maxScroll);

    updateHeroClockVisual(scrollTop);
    updateHeroScoreVisual(scrollTop);
    updateDarkRoomClock();
    updateWhatSphere();
    updateOrbitRingsClock();
    updateDarkRoom();
  }

  function requestScrollUpdate() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(updateScrollScene);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      centerHashPanel('smooth');
      requestScrollUpdate();
    }, 120);
  });
  initHeroTimeGate();
  initHeroClock3D();
  initWhatSphere3D();
  setupWaitlistForm();
  setupHowCarousel();
  initOdometer();
  setTimeout(() => {
    centerHashPanel('auto');
    requestScrollUpdate();
  }, 80);
  requestScrollUpdate();

  if (!reduceMotion) {
    window.addEventListener('pointermove', (event) => {
      root.style.setProperty('--cursor-x', `${event.clientX}px`);
      root.style.setProperty('--cursor-y', `${event.clientY}px`);
    }, { passive: true });

    document.querySelectorAll('.btn').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        button.style.setProperty('--mx', `${(x * 8).toFixed(2)}px`);
        button.style.setProperty('--my', `${(y * 6).toFixed(2)}px`);
      }, { passive: true });

      button.addEventListener('pointerleave', () => {
        button.style.setProperty('--mx', '0px');
        button.style.setProperty('--my', '0px');
      });
    });
  }

  function setupCanvas() {
    const canvas = document.getElementById('nightCanvas');
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let mouseX = 0.5;
    let mouseY = 0.5;

    function createParticles() {
      const count = Math.min(190, Math.max(90, Math.floor((width * height) / 9000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.6 + 0.35,
        speed: Math.random() * 0.26 + 0.08,
        drift: Math.random() * 0.6 + 0.15,
        phase: Math.random() * Math.PI * 2,
        hue: index % 5 === 0 ? 255 : (index % 4 === 0 ? 328 : 239),
        alpha: Math.random() * 0.36 + 0.12,
      }));
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', (event) => {
      mouseX = event.clientX / Math.max(1, window.innerWidth);
      mouseY = event.clientY / Math.max(1, window.innerHeight);
    }, { passive: true });

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const scrollWind = latestProgress * 0.55;
      const pullX = (mouseX - 0.5) * 0.24;
      const pullY = (mouseY - 0.5) * 0.08;

      particles.forEach((particle) => {
        particle.phase += 0.006 + particle.speed * 0.004;
        particle.x += Math.sin(particle.phase + time * 0.00015) * particle.drift + pullX;
        particle.y += particle.speed + scrollWind + pullY;

        if (particle.y > height + 8) {
          particle.y = -8;
          particle.x = Math.random() * width;
        }
        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;

        const pulse = 0.62 + Math.sin(time * 0.0016 + particle.phase) * 0.38;
        ctx.globalAlpha = particle.alpha * pulse;
        ctx.fillStyle = `hsl(${particle.hue} 86% 72%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(draw);
    }

    resizeCanvas();
    requestAnimationFrame(draw);
  }

  setupCanvas();
})();
