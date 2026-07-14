/* ==========================================================================
   CYBORG 2077 — script.js
   Lenis smooth scroll + GSAP/ScrollTrigger orchestration + canvas fx
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------------- */
/* PRELOADER                                                               */
/* ---------------------------------------------------------------------- */
(function preloader(){
  const loader = document.getElementById('loader');
  const pct = document.getElementById('loaderPct');
  let n = 0;
  const iv = setInterval(() => {
    n += Math.floor(Math.random() * 12) + 4;
    if (n >= 100) { n = 100; clearInterval(iv); }
    pct.textContent = String(n).padStart(2, '0');
    if (n === 100) {
      setTimeout(() => {
        loader.classList.add('hidden');
        document.body.style.overflow = '';
        playHeroIntro();
      }, 300);
    }
  }, 120);
})();

/* ---------------------------------------------------------------------- */
/* LENIS SMOOTH SCROLL                                                     */
/* ---------------------------------------------------------------------- */
const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.2,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

/* ---------------------------------------------------------------------- */
/* SCROLL PROGRESS BAR + NAVBAR STATE                                      */
/* ---------------------------------------------------------------------- */
const scrollBar = document.getElementById('scrollBar');
const navbar = document.getElementById('navbar');

lenis.on('scroll', ({ scroll, limit }) => {
  const p = limit > 0 ? (scroll / limit) * 100 : 0;
  scrollBar.style.width = p + '%';
  navbar.classList.toggle('scrolled', scroll > 40);
});

/* ---------------------------------------------------------------------- */
/* MOBILE MENU                                                             */
/* ---------------------------------------------------------------------- */
const navBurger = document.getElementById('navBurger');
const mobileMenu = document.getElementById('mobileMenu');
navBurger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  navBurger.classList.toggle('active');
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

/* ---------------------------------------------------------------------- */
/* CUSTOM CURSOR GLOW                                                      */
/* ---------------------------------------------------------------------- */
const cursorGlow = document.getElementById('cursorGlow');
const cursorDot = document.getElementById('cursorDot');
let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
let glowX = mouseX, glowY = mouseY;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
});

function animateCursor(){
  glowX += (mouseX - glowX) * 0.08;
  glowY += (mouseY - glowY) * 0.08;
  cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%,-50%)`;
  requestAnimationFrame(animateCursor);
}
animateCursor();

/* ---------------------------------------------------------------------- */
/* HERO — MOUSE SPOTLIGHT / PARALLAX LAYERS                                */
/* ---------------------------------------------------------------------- */
const heroSection = document.getElementById('hero');
const planetLayer = document.getElementById('planetLayer');
const gridFloor = document.getElementById('gridFloor');
const cyborgWrap = document.getElementById('cyborgWrap');

heroSection.addEventListener('mousemove', (e) => {
  const rect = heroSection.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;

  // NOTE: mouse-driven parallax uses x / rotateY / rotateX only — vertical
  // scroll-driven parallax (below) owns yPercent, so the two never fight.
  gsap.to(planetLayer, { x: px * -40, rotateZ: py * 4, duration: 1.2, ease: 'power3.out' });
  gsap.to(cyborgWrap, { x: px * 24, rotateY: px * 6, duration: 1.2, ease: 'power3.out' });
  gsap.to(gridFloor, { x: px * -20, duration: 1.4, ease: 'power3.out' });
});

/* ---------------------------------------------------------------------- */
/* SCROLL-LINKED PARALLAX LAYERS                                           */
/* Every [data-speed] element drifts vertically as its own section        */
/* travels through the viewport — negative = background (drifts slower/   */
/* opposite), positive = foreground (drifts faster). This is separate     */
/* from the mouse-parallax above (that owns x / rotation only).           */
/* ---------------------------------------------------------------------- */
(function scrollParallaxLayers(){
  document.querySelectorAll('[data-speed]').forEach(el => {
    const speed = parseFloat(el.dataset.speed) || 0;
    const trigger = el.closest('.hero') || el.closest('.section') || el.closest('.footer') || el.parentElement;
    const isHero = trigger.classList.contains('hero');

    gsap.to(el, {
      yPercent: speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: trigger,
        // Hero layers parallax as the page scrolls AWAY from the hero.
        // Other sections parallax across their own transit of the viewport.
        start: isHero ? 'top top' : 'top bottom',
        end: 'bottom top',
        scrub: 0.6,
      }
    });
  });

  // Depth-staggered glass cards: alternating cards drift at slightly
  // different speeds so grids read as layered planes, not a flat sheet.
  gsap.utils.toArray('.card-grid').forEach(grid => {
    Array.from(grid.children).forEach((card, i) => {
      const speed = (i % 2 === 0) ? 5 : -7;
      gsap.to(card, {
        yPercent: speed,
        ease: 'none',
        scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
  });

  // Timeline cards: left/right alternation already exists structurally —
  // give them a slight opposing vertical drift for extra depth.
  gsap.utils.toArray('.timeline-item').forEach((item, i) => {
    gsap.to(item, {
      yPercent: item.classList.contains('left') ? -4 : 4,
      ease: 'none',
      scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    });
  });
})();

/* ---------------------------------------------------------------------- */
/* STARFIELD CANVAS (hero)                                                 */
/* ---------------------------------------------------------------------- */
(function starfield(){
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let w, h, stars, particles;

  function resize(){
    w = canvas.width = heroSection.offsetWidth;
    h = canvas.height = heroSection.offsetHeight;
    initStars();
  }

  function initStars(){
    stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.015 + 0.002,
    }));
    particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(Math.random() * 0.3 + 0.1),
      hue: Math.random() > 0.5 ? '0,229,255' : '157,77,255',
      a: Math.random() * 0.5 + 0.2,
    }));
  }

  function draw(){
    ctx.clearRect(0, 0, w, h);
    // stars twinkle
    stars.forEach(s => {
      s.a += s.speed;
      const alpha = (Math.sin(s.a) + 1) / 2 * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${alpha})`;
      ctx.fill();
    });
    // drifting glow particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      grad.addColorStop(0, `rgba(${p.hue},${p.a})`);
      grad.addColorStop(1, `rgba(${p.hue},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ---------------------------------------------------------------------- */
/* BINARY RAIN CANVAS (security section)                                   */
/* ---------------------------------------------------------------------- */
(function binaryRain(){
  const canvas = document.getElementById('binaryRain');
  const ctx = canvas.getContext('2d');
  const section = document.getElementById('security');
  let w, h, columns, drops;
  const fontSize = 15;
  const chars = '01';

  function resize(){
    w = canvas.width = section.offsetWidth;
    h = canvas.height = section.offsetHeight;
    columns = Math.floor(w / fontSize);
    drops = new Array(columns).fill(0).map(() => Math.random() * -100);
  }

  function draw(){
    ctx.fillStyle = 'rgba(5,6,13,0.15)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = fontSize + 'px monospace';
    for (let i = 0; i < columns; i++){
      const text = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      const grad = Math.random() > 0.96 ? '#9dfff4' : 'rgba(0,194,255,0.55)';
      ctx.fillStyle = grad;
      ctx.fillText(text, x, y);
      if (y > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ---------------------------------------------------------------------- */
/* SECURITY — network connection lines                                     */
/* ---------------------------------------------------------------------- */
(function networkLines(){
  const wrap = document.getElementById('networkLines');
  if (!wrap) return;
  wrap.style.position = 'absolute';
  wrap.style.inset = '0';
  wrap.style.zIndex = '0';
  wrap.style.pointerEvents = 'none';
  wrap.style.opacity = '0.25';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  wrap.appendChild(svg);

  const points = Array.from({ length: 14 }, () => ({
    x: Math.random() * 100, y: Math.random() * 100
  }));

  points.forEach((p, i) => {
    points.forEach((q, j) => {
      if (j <= i) return;
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist < 28) {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', p.x + '%');
        line.setAttribute('y1', p.y + '%');
        line.setAttribute('x2', q.x + '%');
        line.setAttribute('y2', q.y + '%');
        line.setAttribute('stroke', '#00c2ff');
        line.setAttribute('stroke-width', '0.5');
        svg.appendChild(line);
      }
    });
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', p.x + '%');
    c.setAttribute('cy', p.y + '%');
    c.setAttribute('r', '2');
    c.setAttribute('fill', '#9d4dff');
    svg.appendChild(c);
  });
})();

/* ---------------------------------------------------------------------- */
/* HUD COUNTERS (security stats)                                           */
/* ---------------------------------------------------------------------- */
document.querySelectorAll('.hud-val.counter').forEach(el => {
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 2.2,
        ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.floor(obj.val).toLocaleString(); }
      });
    }
  });
});

/* ---------------------------------------------------------------------- */
/* GSAP CONTEXT — page animations (after DOM ready)                        */
/* ---------------------------------------------------------------------- */
function playHeroIntro(){
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.7 })
    .to('.glitch-title', { opacity: 1, duration: 0.8 }, '-=0.3')
    .to('.hero-subtitle', { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
    .to('.hero-desc', { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
    .to('.hero-cta-row', { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
    .to('.scroll-indicator', { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
    .from('.cyborg-wrap', { opacity: 0, y: 60, duration: 1.2, ease: 'power2.out' }, '-=1.2')
    .from('.planet', { opacity: 0, scale: 0.6, duration: 1.2, ease: 'power2.out' }, '-=1');
}

/* Section headers reveal */
gsap.utils.toArray('.section-head').forEach(head => {
  gsap.from(head.children, {
    opacity: 0,
    y: 40,
    duration: 0.9,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: { trigger: head, start: 'top 80%' }
  });
});

/* Glass card reveal */
gsap.utils.toArray('.card-grid').forEach(grid => {
  gsap.from(grid.children, {
    opacity: 0,
    y: 60,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: { trigger: grid, start: 'top 85%' }
  });
});

/* 3D tilt on glass cards */
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, { rotateY: px * 10, rotateX: -py * 10, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' });
  });
});

/* ---------------------------------------------------------------------- */
/* ML SECTION — flow line draw + node reveal + floating code               */
/* ---------------------------------------------------------------------- */
gsap.to('#mlLinePath', {
  strokeDashoffset: 0,
  duration: 1.6,
  ease: 'power2.inOut',
  scrollTrigger: { trigger: '#mlFlow', start: 'top 70%' }
});

gsap.utils.toArray('.ml-node').forEach((node, i) => {
  gsap.to(node, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    delay: i * 0.15,
    ease: 'back.out(1.6)',
    scrollTrigger: { trigger: '#mlFlow', start: 'top 70%' }
  });
});

gsap.from('.code-snippet', {
  opacity: 0,
  scale: 0.8,
  duration: 0.6,
  stagger: 0.1,
  scrollTrigger: { trigger: '#codeFloatWrap', start: 'top 85%' }
});

/* ---------------------------------------------------------------------- */
/* ROBOTICS — robot arm scroll-driven motion                               */
/* ---------------------------------------------------------------------- */
gsap.timeline({
  scrollTrigger: {
    trigger: '#robotics',
    start: 'top 60%',
    end: 'bottom 40%',
    scrub: 1,
  }
})
  .to('#armSeg1', { rotate: -18, duration: 1 }, 0)
  .to('#armSeg2', { rotate: 26, duration: 1 }, 0)
  .to('#armSeg3', { rotate: -14, duration: 1 }, 0)
  .to('#armClaw', { attr: { d: 'M30 78 L10 70 M30 78 L10 86' }, duration: 1 }, 0);

/* ---------------------------------------------------------------------- */
/* TIMELINE SECTION — vertical fill + item reveal                          */
/* ---------------------------------------------------------------------- */
gsap.to('#timelineFill', {
  height: '100%',
  ease: 'none',
  scrollTrigger: {
    trigger: '#timelineTrack',
    start: 'top 60%',
    end: 'bottom 80%',
    scrub: 0.6,
  }
});

gsap.utils.toArray('.timeline-item').forEach(item => {
  gsap.to(item, {
    opacity: 1,
    x: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: item, start: 'top 85%' }
  });
});

/* ---------------------------------------------------------------------- */
/* PARALLAX GLOW ORBS ON SECTIONS                                          */
/* ---------------------------------------------------------------------- */
gsap.utils.toArray('.section-bg-glow').forEach(glow => {
  gsap.to(glow, {
    y: 120,
    ease: 'none',
    scrollTrigger: {
      trigger: glow.parentElement,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
});

/* ---------------------------------------------------------------------- */
/* CONTACT FORM — fake transmit feedback                                   */
/* ---------------------------------------------------------------------- */
const contactForm = document.getElementById('contactForm');
if (contactForm){
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button span');
    const original = btn.textContent;
    btn.textContent = 'Transmission Sent ✓';
    setTimeout(() => { btn.textContent = original; contactForm.reset(); }, 2400);
  });
}

/* ---------------------------------------------------------------------- */
/* SAFETY: refresh ScrollTrigger after full load (fonts/images shift)      */
/* ---------------------------------------------------------------------- */
window.addEventListener('load', () => ScrollTrigger.refresh());
document.body.style.overflow = 'hidden';
