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
  const whatSections = [
    document.querySelector('.what-kindred'),
    document.querySelector('.what-chemistry'),
    document.querySelector('.what-journal'),
  ].filter(Boolean);

  let latestProgress = 0;
  let rafPending = false;
  let activeHowSlide = 0;
  let howMobileEl = null;
  let howCarouselIsBound = false;
  let whatSphere3D = null;
  let whatSphereRenderRaf = null;

  const WAITLIST_ENDPOINT = 'https://aboutnine.ai/api/subscribe';
  const WAITLIST_RATE_LIMIT_MS = 3000;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ORBIT_FRAME_RADIUS_X = 1.84;
  const ORBIT_SPACER_WIDTH = 1.5;
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
    journalProgress: 0,
  };
  let whatSphereTarget = { ...whatSphereDefault };
  let whatSphereCurrent = { ...whatSphereDefault };
  let lastWaitlistSubmission = 0;
  let heroScoreCaptionId = '';
  let heroScoreCaptionTimer = null;
  let odometerSlots = [];

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

  function updateAuroraProgress(progress) {
    const eased = progress * progress * (3 - 2 * progress);
    const cursorMax = window.innerWidth <= 960 ? 0.38 : 0.74;
    root.style.setProperty('--aurora-opacity', (eased * 0.55).toFixed(3));
    root.style.setProperty('--cursor-glow-opacity', (eased * cursorMax).toFixed(3));
    root.style.setProperty('--hero-glow-opacity', eased.toFixed(3));
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
      if (isActive && slide.querySelector('.proto-option')) triggerOptionAnimation(slide);
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
        copyDiv.className = 'how-mobile-copy';
        copyDiv.innerHTML = copy.innerHTML;
        item.appendChild(copyDiv);
      }

      const phoneWrap = document.createElement('div');
      phoneWrap.className = 'how-mobile-phone-wrap';
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

    if ('IntersectionObserver' in window) {
      const mobileObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = parseInt(entry.target.dataset.howMobileIndex, 10);
          const slideEl = entry.target.querySelector('[data-how-slide]');
          if (!slideEl) return;
          if (index === 1) triggerOptionAnimation(slideEl);
          if (index === 2) triggerChatAnimation(slideEl);
        });
      }, { threshold: 0.25 });

      mobileEl.querySelectorAll('.how-mobile-item').forEach((item) => mobileObserver.observe(item));
    }

    return howMobileEl;
  }

  function syncHowLayout(isMobile = window.matchMedia('(max-width: 960px)').matches) {
    if (!howNine) return;
    if (isMobile) setupHowMobile();
    howNine.classList.toggle('how-nine--mobile', isMobile);
    if (!isMobile) setHowSlide(activeHowSlide);
  }

  function setupHowCarousel() {
    if (!howCarousel || !howSlides.length) return;

    if (!howCarouselIsBound) {
      howPrevButtons.forEach((button) => {
        button.addEventListener('click', () => setHowSlide(activeHowSlide - 1));
      });
      howNextButtons.forEach((button) => {
        button.addEventListener('click', () => setHowSlide(activeHowSlide + 1));
      });

      howCarousel.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') setHowSlide(activeHowSlide - 1);
        if (event.key === 'ArrowRight') setHowSlide(activeHowSlide + 1);
      });

      howCarouselIsBound = true;
    }

    const mobileQuery = window.matchMedia('(max-width: 960px)');
    const handleHowLayoutChange = (event) => {
      syncHowLayout(event.matches);
      requestScrollUpdate();
    };
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', handleHowLayoutChange);
    } else {
      mobileQuery.addListener(handleHowLayoutChange);
    }
    syncHowLayout(mobileQuery.matches);
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

  function buildOrbitRing(THREE, radiusX, radiusY, rotation, material) {
    const points = [];
    const segments = 128;

    for (let index = 0; index < segments; index += 1) {
      const theta = (Math.PI * 2 * index) / segments;
      points.push(new THREE.Vector3(Math.cos(theta) * radiusX, Math.sin(theta) * radiusY, 0));
    }

    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, 128, 0.007, 5, true);
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(rotation.x, rotation.y, rotation.z);
    return ring;
  }

  function buildOrbitSphere(THREE) {
    const group = new THREE.Group();
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xf7f2ff,
      transparent: true,
      opacity: 0.42,
      depthTest: true,
      depthWrite: false,
    });
    const warmOrbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xf7f2ff,
      transparent: true,
      opacity: 0.28,
      depthTest: true,
      depthWrite: false,
    });
    const rings = [
      buildOrbitRing(THREE, 1.72, 0.54, { x: 0.1, y: 0.34, z: -0.08 }, orbitMaterial),
      buildOrbitRing(THREE, 1.58, 0.46, { x: 0.94, y: -0.16, z: 0.72 }, orbitMaterial),
      buildOrbitRing(THREE, 1.64, 0.5, { x: -0.64, y: 0.68, z: -0.5 }, orbitMaterial),
      buildOrbitRing(THREE, 1.4, 0.4, { x: 1.36, y: 0.2, z: -0.92 }, warmOrbitMaterial),
      buildOrbitRing(THREE, 1.84, 0.6, { x: -0.22, y: -0.72, z: 0.36 }, orbitMaterial),
    ];
    rings.forEach((ring) => {
      ring.userData.baseZ = ring.rotation.z;
      group.add(ring);
    });

    const centerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.195, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xcc4477, emissive: 0xff9bdc, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0, transparent: true, opacity: 0, depthWrite: false,
      }),
    );
    group.add(centerDot);

    const ringPoint = (rX, rY, rot, theta) => {
      const p = new THREE.Vector3(Math.cos(theta) * rX, Math.sin(theta) * rY, 0);
      p.applyEuler(new THREE.Euler(rot.x, rot.y, rot.z));
      return p;
    };

    const placeDot = (mesh, pos) => {
      mesh.position.copy(pos);
      mesh.userData.to = pos.toArray();
      mesh.userData.from = pos.clone().multiplyScalar(2.5).toArray();
      group.add(mesh);
    };

    const orbitPos = ringPoint(1.72, 0.54, { x: 0.1, y: 0.34, z: -0.08 }, 0.8);
    const orbitDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0x4833aa, emissive: 0x8b78ff, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0, transparent: true, opacity: 0, depthWrite: false,
      }),
    );
    placeDot(orbitDot, orbitPos);

    const STAR_PLACEMENTS = [
      ringPoint(1.72, 0.54, { x: 0.1,   y: 0.34,  z: -0.08 }, Math.PI),
      ringPoint(1.58, 0.46, { x: 0.94,  y: -0.16, z: 0.72  }, 0.4),
      ringPoint(1.64, 0.50, { x: -0.64, y: 0.68,  z: -0.5  }, 2.6),
      ringPoint(1.40, 0.40, { x: 1.36,  y: 0.20,  z: -0.92 }, 1.8),
      ringPoint(1.84, 0.60, { x: -0.22, y: -0.72, z: 0.36  }, 5.0),
    ];
    const whiteDots = STAR_PLACEMENTS.map((pos) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0xd0c8ff, emissive: 0xffffff, emissiveIntensity: 0.2,
          roughness: 0.4, metalness: 0, transparent: true, opacity: 0, depthWrite: false,
        }),
      );
      placeDot(dot, pos);
      return dot;
    });

    const makeGlowMaterial = (colorHex) => new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(colorHex) },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
          float alpha = uOpacity * pow(rim, 1.6);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });

    const centerGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 24),
      makeGlowMaterial(0xff9bdc),
    );
    centerDot.add(centerGlowMesh);

    const orbitGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 24, 24),
      makeGlowMaterial(0x8b78ff),
    );
    orbitDot.add(orbitGlowMesh);

    return { group, rings, centerDot, orbitDot, whiteDots, centerGlowMesh, orbitGlowMesh };
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
    const canvasScale = window.innerWidth <= 960 ? 0.52 : 0.58;
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
      whatSphere3D.centerDot.material.opacity = centerEased;
      whatSphere3D.centerDot.scale.setScalar(centerEased);
      whatSphere3D.centerDot.position.set(
        lerp(0.3, 0, centerEased),
        lerp(0.6, 0, centerEased),
        lerp(0.8, 0, centerEased),
      );

      const orbitEased = smoothstep(clamp((dp - 0.2) / 0.8));
      whatSphere3D.orbitDot.material.opacity = orbitEased;
      whatSphere3D.orbitDot.scale.setScalar(orbitEased);
      const { from: oFrom, to: oTo } = whatSphere3D.orbitDot.userData;
      const chemP = whatSphereCurrent.chemProgress;
      const CHEM_OVERLAP = [0.0, -0.24, 0.05];
      whatSphere3D.orbitDot.position.set(
        lerp(lerp(oFrom[0], oTo[0], orbitEased), CHEM_OVERLAP[0], chemP),
        lerp(lerp(oFrom[1], oTo[1], orbitEased), CHEM_OVERLAP[1], chemP),
        lerp(lerp(oFrom[2], oTo[2], orbitEased), CHEM_OVERLAP[2], chemP),
      );

      if (whatSphere3D.chemOverlay) {
        whatSphere3D.chemOverlay.style.opacity = chemP;
      }

      if (whatSphere3D.centerGlowMesh) {
        whatSphere3D.centerGlowMesh.material.uniforms.uOpacity.value = whatSphereCurrent.centerGlow;
      }
      if (whatSphere3D.orbitGlowMesh) {
        whatSphere3D.orbitGlowMesh.material.uniforms.uOpacity.value = whatSphereCurrent.orbitGlow;
      }

      if (whatSphere3D.journalOverlay) {
        whatSphere3D.journalOverlay.style.opacity = whatSphereCurrent.journalProgress;
      }

      const STAR_STAGGER = [0.0, 0.08, 0.04, 0.12, 0.06];
      whatSphere3D.whiteDots?.forEach((dot, i) => {
        const { from, to } = dot.userData;
        const t = smoothstep(clamp((dp - STAR_STAGGER[i]) / 0.7));
        dot.material.opacity = t * 0.85;
        dot.scale.setScalar(t);
        dot.position.set(
          lerp(from[0], to[0], t),
          lerp(from[1], to[1], t),
          lerp(from[2], to[2], t),
        );
      });
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
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      const { group, rings, centerDot, orbitDot, whiteDots, centerGlowMesh, orbitGlowMesh } = buildOrbitSphere(THREE);

      scene.add(new THREE.AmbientLight(0xffffff, 1.25));
      const keyLight = new THREE.PointLight(0xff9bdc, 2.35, 7);
      keyLight.position.set(1.6, 1.1, 2.4);
      scene.add(keyLight);
      const coolLight = new THREE.PointLight(0x8b78ff, 1.7, 6);
      coolLight.position.set(-1.2, -0.7, 2.2);
      scene.add(coolLight);
      scene.add(group);
      camera.position.z = whatSphereDefault.cameraZ;
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
        focusVector: new THREE.Vector3(),
        width: 0,
        height: 0,
      };

      const chemOverlay = document.createElement('div');
      chemOverlay.className = 'chem-text-overlay';
      chemOverlay.textContent = 'your synergy is rare. like two complementary elements, your resonance creates a stable orbit.';
      whatSphere.appendChild(chemOverlay);
      whatSphere3D.chemOverlay = chemOverlay;

      const journalOverlay = document.createElement('div');
      journalOverlay.className = 'journal-text-overlay';
      const journalWords = [
        { text: 'to eat',    dx: -65,  dy: -44,  size: 12 },
        { text: 'to listen', dx:  56,  dy:  12,  size: 13.5 },
        { text: 'to see',    dx: -46,  dy:  54,  size: 11.5 },
        { text: 'matters',   dx:  48,  dy: -54,  size: 13 },
      ];
      journalWords.forEach(({ text, dx, dy, size }) => {
        const el = document.createElement('span');
        el.className = 'journal-word';
        el.textContent = text;
        el.style.cssText = `left:calc(var(--what-left) + ${dx}px);top:calc(var(--what-top) + ${dy}px);font-size:${size}px`;
        journalOverlay.appendChild(el);
      });
      whatSphere.appendChild(journalOverlay);
      whatSphere3D.journalOverlay = journalOverlay;

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
    const heldScrollTop = start + heldProgress * Math.max(1, end - start);
    const sphereProgress = Math.min(heldProgress, pJournal);
    const journalScrollLift = (Math.max(0, heldScrollTop - whatSections[2].offsetTop) / vh) * 100;
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
    const left = compact ? 50 : interpolateStops(sphereProgress, [
      [0, 50],
      [pApproach, 50],
      [pKindred, 72],
      [pChemistry, 28],
      [pJournalBreath, 50],
      [pJournal, 68],
      [1, 68],
    ]);
    const baseTop = progress <= pApproach
      ? approachTop
      : (compact
        ? interpolateStops(sphereProgress, [[pApproach, approachTopAtTransition], [pKindred, 70], [pChemistry, 74], [pJournalBreath, 72], [pJournal, 68], [1, 68]])
        : interpolateStops(sphereProgress, [[pApproach, approachTopAtTransition], [pKindred, 51], [pChemistry, 50], [pJournalBreath, 54], [pJournal, 52], [1, 52]]));
    const top = baseTop - journalScrollLift;
    const scale = compact
      ? interpolateStops(sphereProgress, [[0, 1.12], [pApproach, 1.12], [pKindred, 0.9], [pChemistry, 1.02], [pJournalBreath, 0.72], [pJournal, 1.02], [1, 1.02]])
      : interpolateStops(sphereProgress, [[0, 1.18], [pApproach, 1.18], [pKindred, 0.96], [pChemistry, 1.06], [pJournalBreath, 0.78], [pJournal, 1.04], [1, 1.04]]);
    const depth = compact
      ? interpolateStops(sphereProgress, [[0, 1.2], [pApproach, 1.2], [pKindred, 1.02], [pChemistry, 1.16], [pJournalBreath, 0.82], [pJournal, 1.12], [1, 1.12]])
      : interpolateStops(sphereProgress, [[0, 1.26], [pApproach, 1.26], [pKindred, 1.06], [pChemistry, 1.2], [pJournalBreath, 0.88], [pJournal, 1.16], [1, 1.16]]);
    const fitAmount = interpolateStops(sphereProgress, [[0, 1], [pApproach, 1], [pKindred, 0], [pJournal, 0], [1, 0]]);
    const rotationX = interpolateStops(sphereProgress, [[0, -0.1], [pApproach, -0.1], [pKindred, 0.04], [pChemistry, -0.16], [pJournalBreath, 0.02], [pJournal, 0.16], [1, 0.16]]);
    const rotationY = interpolateStops(sphereProgress, [[0, -0.34], [pApproach, -0.34], [pKindred, 0.54], [pChemistry, 1.38], [pJournalBreath, 1.62], [pJournal, 2.1], [1, 2.1]]);
    const rotationZ = interpolateStops(sphereProgress, [[0, 0.06], [pApproach, 0.06], [pKindred, 0.04], [pChemistry, -0.1], [pJournalBreath, 0.08], [pJournal, 0.04], [1, 0.04]]);
    const cameraZ = compact
      ? interpolateStops(sphereProgress, [[0, 4.92], [pApproach, 4.92], [pKindred, 5.7], [pChemistry, 5.3], [pJournalBreath, 6.4], [pJournal, 5.3], [1, 5.3]])
      : interpolateStops(sphereProgress, [[0, 4.84], [pApproach, 4.84], [pKindred, 5.42], [pChemistry, 5], [pJournalBreath, 6.2], [pJournal, 5], [1, 5]]);

    const dotAnimStart = lerp(pApproach, pKindred, 0.35);
    const dotProgress = clamp((sphereProgress - dotAnimStart) / Math.max(0.0001, pKindred - dotAnimStart));

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

    setWhatSphere3DTarget({
      opacity: sphereOpacity,
      left,
      top,
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
      centerGlow: Math.max(chemProgress, journalCenterGlow),
      orbitGlow: Math.max(kindredOrbitGlow, chemProgress),
      journalProgress: journalCenterGlow,
    });
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

    updateHeroScoreVisual(scrollTop);
    updateWhatSphere();
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
