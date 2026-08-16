/* ============================================================
   Ferrari 499P · 交互脚本(原生 JS,无依赖)
   遮盖滚动画廊 / 拖拽换角度 / 视频视口管理 / 导航与显现动画
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var isMobile = function () { return window.matchMedia('(max-width: 980px)').matches; };

  /* ---------- Service Worker ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---------- 工具 ---------- */
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* ---------- Hero 标题逐字入场 ---------- */
  var heroTitleEl = document.querySelector('.hero__title');
  if (heroTitleEl) {
    var text = heroTitleEl.textContent;
    heroTitleEl.innerHTML = text.split('').map(function (ch, i) {
      if (ch === ' ') return ' ';
      return '<span style="--d:' + (0.3 + i * 0.07).toFixed(2) + 's">' + ch + '</span>';
    }).join('');
  }

  /* ---------- 背景视频按视口启用 ----------
     HTML 中 hero 与 vsection 视频均为 preload="none" 且无 autoplay:
     桌面端(>980px)由 JS 激活播放;移动端保持 poster 静态图,
     一个字节的视频也不会加载。 */
  function degradeBgVideos() {
    var vids = [];
    var hv = document.querySelector('.hero__video');
    if (hv) vids.push(hv);
    document.querySelectorAll('.vsection__video').forEach(function (v) { vids.push(v); });
    vids.forEach(function (v) {
      if (isMobile()) {
        v.pause();
      } else {
        v.preload = 'auto';
        if (v.closest('.hero')) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      }
    });
  }
  degradeBgVideos();
  var lastMobile = isMobile();
  window.addEventListener('resize', function () {
    var m = isMobile();
    if (m !== lastMobile) { lastMobile = m; degradeBgVideos(); }
  });

  /* ---------- 自定义光标 ---------- */
  var cursorEl = document.querySelector('.cursor');
  if (cursorEl && finePointer && !prefersReduced) {
    var cx = -100, cy = -100, ctx = -100, cty = -100, cursorRaf = null;
    document.addEventListener('mousemove', function (e) {
      ctx = e.clientX; cty = e.clientY;
      if (cursorRaf === null) {
        cursorRaf = requestAnimationFrame(function loop() {
          cx = lerp(cx, ctx, 0.28); cy = lerp(cy, cty, 0.28);
          cursorEl.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
          if (Math.abs(cx - ctx) < 0.4 && Math.abs(cy - cty) < 0.4) { cx = ctx; cy = cty; cursorRaf = null; return; }
          cursorRaf = requestAnimationFrame(loop);
        });
      }
    });
    document.addEventListener('mouseenter', function () { cursorEl.classList.add('is-on'); });
    document.addEventListener('mouseleave', function () { cursorEl.classList.remove('is-on'); });
    document.querySelectorAll('a, button, .hcard, .dcard, .ptcard, .wincard, .gauge, .cg-text, .tl__item').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursorEl.classList.add('is-hot'); });
      el.addEventListener('mouseleave', function () { cursorEl.classList.remove('is-hot'); });
    });
  }

  /* ---------- 夜战红光斑 ---------- */
  var glow = document.querySelector('.glow');
  if (glow && finePointer && !prefersReduced) {
    var gx = -600, gy = -600, gtx = -600, gty = -600, glowRaf = null;
    document.addEventListener('mousemove', function (e) {
      gtx = e.clientX; gty = e.clientY;
      if (glowRaf === null) {
        glowRaf = requestAnimationFrame(function loop() {
          gx = lerp(gx, gtx, 0.12); gy = lerp(gy, gty, 0.12);
          glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
          glowRaf = requestAnimationFrame(loop);
        });
      }
    });
    document.addEventListener('mouseenter', function () { glow.classList.add('is-on'); });
    document.addEventListener('mouseleave', function () { glow.classList.remove('is-on'); });
  }

  /* ---------- 章节索引(全屏菜单 + 当前章节提示) ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navSections = sections.filter(function (s) { return s.id !== 'hero'; });
  var isEN = (document.documentElement.lang || '').toLowerCase() === 'en';
  var sectionNames = isEN ? {
    return: 'Origin', design: 'Design', powertrain: 'Powertrain',
    aero: 'Aerodynamics', cockpit: 'Cockpit', palmares: 'Palmarès',
    modificata: 'Modificata', specs: 'Specifications', conclusion: 'Epilogue'
  } : {
    return: '缘起', design: '设计', powertrain: '动力总成',
    aero: '空气动力学', cockpit: '座舱', palmares: '战绩',
    modificata: 'Modificata', specs: '技术规格', conclusion: '尾声'
  };
  var menuNav = document.querySelector('.menu-overlay__nav');
  var navNow = document.getElementById('navNow');
  var menuItems = [];
  navSections.forEach(function (s, i) {
    var name = sectionNames[s.id] || s.id;
    var idx = s.getAttribute('data-num') || pad2(i + 1);
    if (menuNav) {
      var m = document.createElement('a');
      m.href = '#' + s.id;
      m.innerHTML = '<span class="idx">' + idx + '</span>' + name;
      m.style.transitionDelay = (i * 0.04) + 's';
      menuNav.appendChild(m);
      menuItems.push(m);
    }
  });

  var sectionIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var id = en.target.id;
      menuItems.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
      var brand = document.querySelector('.nav__brand');
      var langWrap = document.querySelector('.nav__lang');
      if (id === 'hero') {
        if (navNow) { navNow.style.opacity = '0'; }
        if (brand) brand.classList.add('is-hidden');
        if (langWrap) langWrap.classList.add('is-hidden');
      } else {
        if (navNow) {
          navNow.style.opacity = '1';
          navNow.innerHTML = '<b>' + (en.target.getAttribute('data-num') || '') + '</b> · ' + (sectionNames[id] || id);
        }
        if (brand) brand.classList.remove('is-hidden');
        if (langWrap) langWrap.classList.remove('is-hidden');
      }
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  sections.forEach(function (s) { sectionIO.observe(s); });

  /* ---------- 滚动:导航/进度表盘/hero 视差 ---------- */
  var nav = document.getElementById('nav');
  var sg = document.querySelector('.scroll-gauge');
  var sgBar = sg ? sg.querySelector('.sg__bar') : null;
  var sgNum = sg ? sg.querySelector('.sg__num') : null;
  var SG_LEN = 119.4;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var p = docH > 0 ? y / docH : 0;

    if (nav) { if (y > 40) nav.classList.add('is-solid'); else nav.classList.remove('is-solid'); }

    if (sg) {
      if (y > window.innerHeight * 0.7) sg.classList.add('is-on'); else sg.classList.remove('is-on');
      if (sgBar) sgBar.style.strokeDashoffset = String(SG_LEN * (1 - p));
      if (sgNum) sgNum.textContent = pad2(Math.round(p * 100));
    }
    var navBar = document.getElementById('navBar');
    if (navBar) navBar.style.width = (p * 100).toFixed(1) + '%';

    var hero = document.querySelector('.hero');
    if (hero && y < hero.offsetHeight * 1.5) {
      var hh = hero.offsetHeight;
      var fade = clamp(1 - y / (hh * 0.75), 0, 1);
      var hv = hero.querySelector('.hero__video');
      if (hv) hv.style.opacity = String(fade);
      var hc = hero.querySelector('.hero__content');
      if (hc) hc.style.transform = 'translateY(' + (-y * 0.12).toFixed(1) + 'px) scale(' + (1 - y * 0.0006).toFixed(4) + ')';
    }
  }
  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(function () { onScroll(); scrollTicking = false; });
    }
  }, { passive: true });
  onScroll();

  if (sg) sg.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });

  /* ---------- 显现动画 ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealIO.observe(el); });

  /* 成组卡片递增延迟 */
  if (!prefersReduced) {
    ['.heritage__row', '.pt__three', '.webcards', '.vcards', '.bigstats', '.wincards', '.crew__row', '.gauges', '.timeline', '.techlist'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (group) {
        Array.prototype.forEach.call(group.children, function (child, i) {
          child.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
        });
      });
    });
  }

  /* 章节分隔页 + 时间线节点 + zoom 图片揭示 */
  var cbIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); cbIO.unobserve(en.target); }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.chapter-break, .tl__item, .zoom').forEach(function (el) { cbIO.observe(el); });

  /* ---------- 数字计数 ---------- */
  function animateCount(el, to) {
    var start = null, dur = 1800;
    function step(ts) {
      if (!start) start = ts;
      var t = clamp((ts - start) / dur, 0, 1);
      var v = to * easeOutExpo(t);
      el.textContent = Math.round(v).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = to.toLocaleString('en-US');
    }
    requestAnimationFrame(step);
  }
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      animateCount(en.target, parseFloat(en.target.getAttribute('data-to')) || 0);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.count').forEach(function (el) { countIO.observe(el); });

  /* ---------- 表盘 ---------- */
  var G_LEN = 527.8;
  var gaugeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var g = en.target;
      gaugeIO.unobserve(g);
      var target = parseFloat(g.getAttribute('data-gauge')) || 0;
      var max = parseFloat(g.getAttribute('data-max')) || target;
      var bar = g.querySelector('.gauge__bar');
      var num = g.querySelector('.gauge__svg figcaption b');
      var dur = 2200, start = null;
      function step(ts) {
        if (!start) start = ts;
        var t = clamp((ts - start) / dur, 0, 1);
        var e = easeOutExpo(t);
        if (bar) bar.style.strokeDashoffset = String(G_LEN * (1 - (target / max) * e));
        if (num) num.textContent = Math.round(target * e).toLocaleString('en-US');
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.gauge').forEach(function (g) { gaugeIO.observe(g); });

  /* ---------- 遮盖滚动画廊(Chiron 同款范式,02 设计) ---------- */
  var cg = document.getElementById('cgallery');
  if (cg) {
    var cgImgs = Array.prototype.slice.call(cg.querySelectorAll('.cg-image'));
    var cgTexts = Array.prototype.slice.call(cg.querySelectorAll('.cg-text'));
    var cgCards = cgTexts.map(function (t) { return t.querySelector('.cg-text__card'); });
    var cgCount = document.getElementById('cgCount');
    var cgClips = cgImgs.map(function (_, k) { return k === 0 ? 0 : 100; });
    var cgWritten = cgImgs.map(function () { return -1; });
    var cgActive = 0;
    var cgRaf = null;
    var cgInView = false;

    function cgApplyDirect() {
      cgImgs.forEach(function (im, k) {
        cgClips[k] = k <= cgActive ? 0 : 100;
        im.style.clipPath = 'inset(' + cgClips[k] + '% 0% 0%)';
      });
    }
    function cgLoop() {
      var done = true;
      cgImgs.forEach(function (im, k) {
        var target = k <= cgActive ? 0 : 100;
        cgClips[k] += (target - cgClips[k]) * 0.09;
        if (Math.abs(target - cgClips[k]) > 0.25) done = false;
        else cgClips[k] = target;
        if (Math.abs(cgClips[k] - cgWritten[k]) > 0.2) {
          cgWritten[k] = cgClips[k];
          im.style.clipPath = 'inset(' + cgClips[k].toFixed(2) + '% 0% 0%)';
        }
      });
      cgRaf = done ? null : requestAnimationFrame(cgLoop);
    }
    function cgKick() {
      if (prefersReduced) { cgApplyDirect(); return; }
      if (cgRaf === null) cgRaf = requestAnimationFrame(cgLoop);
    }
    function cgSet(i) {
      var idx = (i % cgTexts.length + cgTexts.length) % cgTexts.length;
      if (idx === cgActive && cgCards[idx] && cgCards[idx].classList.contains('is-on')) return;
      cgActive = idx;
      cgCards.forEach(function (c, k) {
        if (!c) return;
        c.classList.toggle('is-on', k === idx);
        c.classList.toggle('is-out', k !== idx);
      });
      /* 移动端:图层交叉淡化(is-on);桌面:clip 插值 */
      cgImgs.forEach(function (im, k) { im.classList.toggle('is-on', k === idx); });
      if (cgCount) cgCount.textContent = pad2(idx + 1);
      cgKick();
    }
    /* 桌面:文字卡进入视口中带 → 激活对应图层 */
    var cgIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !isMobile()) {
          var idx = cgTexts.indexOf(en.target);
          if (idx >= 0) cgSet(idx);
        }
      });
    }, { rootMargin: '-42% 0px -42% 0px' });
    cgTexts.forEach(function (t) { cgIO.observe(t); });
    /* 可见性(移动端轮播仅在可见时进行) */
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { cgInView = en.isIntersecting; });
    }, { threshold: 0.25 }).observe(cg);
    /* 移动端:自动轮播 */
    setInterval(function () {
      if (isMobile() && cgInView) cgSet(cgActive + 1);
    }, 3800);
  }

  /* ---------- 拖拽换角度(04 空气动力学) ---------- */
  var rotStage = document.getElementById('rotStage');
  if (rotStage) {
    var rotImgs = Array.prototype.slice.call(rotStage.querySelectorAll('[data-rot]'));
    var rotDots = Array.prototype.slice.call(document.querySelectorAll('#rotDots i'));
    var rotTicks = Array.prototype.slice.call(document.querySelectorAll('#rotScale i'));
    var rotDeg = document.getElementById('rotDeg');
    var rotator = document.getElementById('rotator');
    var N = rotImgs.length, STEP = 360 / N;
    var rotIdx = 0, rotInView = false, rotDrag = false, rotLastX = 0, rotAccum = 0;

    function rotSet(i, fromUser) {
      var idx = ((i % N) + N) % N;
      if (idx === rotIdx && fromUser !== 'force') return;
      rotIdx = idx;
      rotImgs.forEach(function (im, k) { im.classList.toggle('is-active', k === idx); });
      rotDots.forEach(function (d, k) { d.classList.toggle('is-active', k === idx); });
      rotTicks.forEach(function (t, k) { t.classList.toggle('is-active', k === idx); });
      if (rotDeg) rotDeg.textContent = (idx * STEP) + '°';
    }
    rotStage.setAttribute('tabindex', '0');
    rotStage.setAttribute('role', 'slider');
    rotStage.setAttribute('aria-label', isEN ? 'Rotate car view' : '旋转车身视角');
    rotStage.addEventListener('pointerdown', function (e) {
      rotDrag = true; rotLastX = e.clientX; rotAccum = 0;
      rotStage.classList.add('is-grabbing');
      if (rotStage.setPointerCapture) { try { rotStage.setPointerCapture(e.pointerId); } catch (err) {} }
      e.preventDefault();
    });
    rotStage.addEventListener('pointermove', function (e) {
      if (!rotDrag) return;
      var dx = e.clientX - rotLastX;
      rotLastX = e.clientX;
      rotAccum += dx;
      while (rotAccum > 42) { rotSet(rotIdx + 1); rotAccum -= 42; }
      while (rotAccum < -42) { rotSet(rotIdx - 1); rotAccum += 42; }
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      rotStage.addEventListener(ev, function () { rotDrag = false; rotStage.classList.remove('is-grabbing'); });
    });
    rotDots.forEach(function (d, k) {
      d.addEventListener('click', function () { rotSet(k, 'force'); });
    });
    rotStage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { rotSet(rotIdx + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { rotSet(rotIdx - 1); e.preventDefault(); }
    });
    if (rotator) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { rotInView = en.isIntersecting; });
      }, { threshold: 0.3 }).observe(rotator);
    }
    /* 移动端:自动轮播(用户拖动后暂停 8 秒) */
    var rotHold = 0;
    rotStage.addEventListener('pointerdown', function () { rotHold = Date.now(); });
    setInterval(function () {
      if (isMobile() && rotInView && Date.now() - rotHold > 8000) rotSet(rotIdx + 1);
    }, 3400);
  }

  /* ---------- 菜单开关 ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var menuOverlay = document.getElementById('menuOverlay');
  function closeMenu() {
    if (!menuOverlay || !menuOverlay.classList.contains('is-open')) return;
    menuOverlay.classList.remove('is-open');
    setTimeout(function () { menuOverlay.hidden = true; }, 400);
    if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.classList.remove('is-open'); }
    document.body.style.overflow = '';
  }
  if (menuBtn && menuOverlay) {
    menuBtn.addEventListener('click', function () {
      if (menuOverlay.classList.contains('is-open')) { closeMenu(); }
      else {
        menuOverlay.hidden = false;
        requestAnimationFrame(function () { menuOverlay.classList.add('is-open'); });
        menuBtn.setAttribute('aria-expanded', 'true');
        menuBtn.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
    });
    menuOverlay.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  }

  /* ---------- 平滑锚点滚动 ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
      var fromMenu = menuOverlay && menuOverlay.classList.contains('is-open');
      closeMenu();
      document.body.style.overflow = '';
      var go = function () { window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' }); };
      if (fromMenu) setTimeout(go, 360); else go();
    });
  });

  /* ---------- 点击波纹 ---------- */
  document.addEventListener('click', function (e) {
    if (prefersReduced) return;
    var r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 750);
  });

  /* ---------- 卡片鼠标高光跟随 ---------- */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll('.hcard, .ptcard, .dcard, .wincard').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* ---------- 卡片点击亮度脉冲 ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.hcard, .ptcard, .dcard, .wincard, .cg-text, .tl__item') : null;
    if (!el) return;
    if (e.target.closest('a') || e.target.closest('video')) return;
    el.classList.remove('is-tapped');
    void el.offsetWidth;
    el.classList.add('is-tapped');
    el.addEventListener('animationend', function h() { el.classList.remove('is-tapped'); }, { once: true });
  });

  /* ---------- 全宽视频区:入场 + 视口播放(移动端已退化为静态图) ---------- */
  var vsIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var sec = en.target;
      var v = sec.querySelector('.vsection__video');
      if (en.isIntersecting) {
        sec.classList.add('is-in');
        if (v && v.tagName === 'VIDEO' && !isMobile()) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      } else if (v && v.tagName === 'VIDEO') {
        v.pause();
      }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.vsection').forEach(function (el) { vsIO.observe(el); });

  /* ---------- 视频卡 / 媒体行视频:视口播放 ---------- */
  var vcIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target.querySelector('video');
      if (!v) return;
      if (en.isIntersecting) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else v.pause();
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.webcard, .vcard, .media-row__img').forEach(function (el) {
    if (el.querySelector('video')) vcIO.observe(el);
  });

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- 图片懒加载兜底 ---------- */
  document.querySelectorAll('img').forEach(function (img) {
    if (!img.closest('.hero') && !img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
})();
