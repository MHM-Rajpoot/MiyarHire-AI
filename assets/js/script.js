/* Local, dependency-free presentation controls. The HTML also works without JS. */
(() => {
  'use strict';

  const slides = Array.from(document.querySelectorAll('#stage .slide'));
  if (!slides.length) return;

  const byId = id => document.getElementById(id);
  const stage = byId('stage');
  const dialog = byId('agendaDialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animatedImages = Array.from(document.querySelectorAll('[data-animated-src]'));
  const chapterButtons = Array.from(document.querySelectorAll('button[data-chapter], a[data-chapter]'));
  let current = 0;
  let reading = false;
  let playing = false;
  let motion = false;
  let timer;
  let touchStart;
  let observer;
  let language = 'en';
  let languageTransition;
  let languageBusy = false;
  let transitionVersion = 0;
  let playbackEnded = false;
  let videoHold = false;
  let videoFallback;
  const darkPreference = window.matchMedia('(prefers-color-scheme: dark)');
  let themeChoice = null;
  try { themeChoice = localStorage.getItem('miyarhire-theme'); } catch { /* Local storage is optional. */ }
  if (!['light', 'dark'].includes(themeChoice)) themeChoice = null;
  const translations = window.DECK_AR || {};
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const t = value => language === 'ar' ? (translations[normalize(value)] || value) : value;

  const title = index => slides[index].dataset.title || `Slide ${index + 1}`;
  const announce = message => { if (byId('slideStatus')) byId('slideStatus').textContent = t(message); };
  const setText = (id, value) => { if (byId(id)) byId(id).textContent = t(value); };
  const listen = (id, event, handler) => byId(id)?.addEventListener(event, handler);
  function syncTheme() {
    const dark = (themeChoice || (darkPreference.matches ? 'dark' : 'light')) === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    byId('themeBtn')?.setAttribute('aria-pressed', String(dark));
    byId('themeBtn')?.setAttribute('aria-label', t(dark ? 'Switch to light mode' : 'Switch to dark mode'));
    setText('themeIcon', dark ? '☀' : '☾');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a1520' : '#EDF5FA');
  }
  listen('themeBtn', 'click', () => {
    themeChoice = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('miyarhire-theme', themeChoice); } catch { /* Keep the choice for this visit. */ }
    syncTheme();
  });
  darkPreference.addEventListener?.('change', syncTheme);
  const fromHash = () => {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return null; }
    const index = slides.findIndex(slide => slide.id === hash);
    if (index >= 0) return index;
    return /^\d+$/.test(hash) ? Math.max(0, Math.min(slides.length - 1, Number(hash) - 1)) : null;
  };
  const writeHash = () => {
    const hash = `#${slides[current].id}`;
    if (location.hash === hash) return;
    try { history.replaceState(null, '', hash); }
    catch { location.hash = hash; }
  };

  // Short pages carry the content. Measure their complete natural canvas so a
  // resized window or short landscape screen never introduces scroll or cropping.
  function fitSlide() {
    if (reading) return;
    const canvas = slides[current].querySelector('.slide-canvas');
    if (!canvas || !stage.clientHeight) return;
    const width = Math.max(canvas.offsetWidth, canvas.scrollWidth);
    const height = Math.max(canvas.offsetHeight, canvas.scrollHeight);
    const scale = Math.min(1, (stage.clientWidth - 2) / width, (stage.clientHeight - 2) / height);
    canvas.style.setProperty('--slide-scale', String(scale));
  }
  let fitFrame;
  const scheduleFit = () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitSlide);
  };

  // Illustrations animate on their own as soon as a slide appears. The play
  // button advances slides; it no longer starts or stops the drawings.
  function syncMotion() {
    motion = !reducedMotion.matches && !document.hidden;
    document.body.classList.toggle('motion-paused', !motion);
    if (!motion) stopTyping();
    animatedImages.forEach(img => {
      const visible = reading || img.closest('.slide') === slides[current];
      const source = motion && visible ? img.dataset.animatedSrc : img.dataset.staticSrc;
      if (source && img.getAttribute('src') !== source) img.setAttribute('src', source);
    });
  }

  // The stage one demonstration streams from YouTube. The player is created only
  // while its slide is on screen and removed on the way out, so nothing loads,
  // autoplays, or keeps sounding in the background. It starts muted, which is the
  // only way a browser allows autoplay without a press; one button adds sound.
  const videoFrames = Array.from(document.querySelectorAll('.video-frame[data-video]'));
  const YOUTUBE = 'https://www.youtube.com';
  // YouTube refuses an embed that carries no referrer, which is every page
  // opened straight off the disk. There the poster stays a link to the video
  // rather than a player that would only ever show a configuration error.
  const canEmbed = /^https?:$/.test(location.protocol);
  const playerOf = frame => frame.querySelector('iframe');

  function post(frame, message) {
    playerOf(frame)?.contentWindow?.postMessage(JSON.stringify(message), '*');
  }

  function releaseVideoHold() {
    clearTimeout(videoFallback);
    videoFrames.forEach(frame => frame.removeAttribute('data-holding'));
    if (!videoHold) return;
    videoHold = false;
    schedule();
  }

  // Playback waits for the clip. If the player never reports back — a blocked
  // frame or no connection — the deck resumes by itself after the clip's length.
  function holdForVideo(frame) {
    clearTimeout(videoFallback);
    clearTimeout(timer);
    videoHold = true;
    frame.setAttribute('data-holding', '');
    videoFallback = setTimeout(releaseVideoHold, (Number(frame.dataset.videoSeconds) || 0) * 1000 + 4000);
  }

  function setSound(frame, on) {
    post(frame, { event: 'command', func: on ? 'unMute' : 'mute', args: [] });
    if (on) post(frame, { event: 'command', func: 'setVolume', args: [100] });
    frame.querySelector('.video-sound')?.setAttribute('aria-pressed', String(on));
  }

  function startVideo(frame, withSound) {
    if (!canEmbed) return;
    if (playerOf(frame)) {
      if (withSound) setSound(frame, true);
      return;
    }
    const parameters = new URLSearchParams({
      autoplay: '1', mute: withSound ? '0' : '1', playsinline: '1',
      rel: '0', modestbranding: '1', enablejsapi: '1'
    });
    parameters.set('origin', location.origin);
    const player = document.createElement('iframe');
    player.title = frame.dataset.videoTitle || t('Stage one demonstration');
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.allowFullscreen = true;
    // The handshake asks the player to report each state change back to this page.
    player.addEventListener('load', () => post(frame, { event: 'listening', id: frame.dataset.video, channel: 'widget' }));
    player.src = `${YOUTUBE}/embed/${encodeURIComponent(frame.dataset.video)}?${parameters}`;
    frame.append(player);
    frame.setAttribute('data-active', '');
    frame.querySelector('.video-sound')?.setAttribute('aria-pressed', String(Boolean(withSound)));
    holdForVideo(frame);
    if (playing) announce('The demonstration is playing. The slideshow continues when it ends.');
  }

  function stopVideo(frame) {
    if (!playerOf(frame)) return;
    playerOf(frame).remove();
    frame.removeAttribute('data-active');
    frame.removeAttribute('data-holding');
    releaseVideoHold();
  }

  function syncVideo() {
    videoFrames.forEach(frame => {
      if (!reading && frame.closest('.slide') === slides[current]) startVideo(frame, false);
      else stopVideo(frame);
    });
  }

  videoFrames.forEach(frame => {
    if (!canEmbed) frame.setAttribute('data-external', '');
    // Without JavaScript, and off the disk, the poster stays an ordinary link.
    frame.querySelector('.video-poster')?.addEventListener('click', event => {
      if (!canEmbed) return;
      event.preventDefault();
      startVideo(frame, true);
    });
    frame.querySelector('.video-sound')?.addEventListener('click', event => {
      setSound(frame, event.currentTarget.getAttribute('aria-pressed') !== 'true');
    });
  });

  // Player states: 1 playing and 3 buffering hold the slide; 0 ended hands it
  // back; -1 and 5 mean autoplay never started, so the deck must not wait. A
  // pause keeps the hold — the presenter stopped on that frame to talk about it.
  window.addEventListener('message', event => {
    if (event.origin !== YOUTUBE) return;
    let data = event.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
    const state = typeof data?.info === 'number' ? data.info : data?.info?.playerState;
    if (typeof state !== 'number') return;
    const frame = videoFrames.find(item => playerOf(item)?.contentWindow === event.source);
    if (!frame || frame.closest('.slide') !== slides[current]) return;
    if (state === 1 || state === 3) holdForVideo(frame);
    else if (state !== 2) releaseVideoHold();
  });

  // Paper gets the poster frame, never an empty player box.
  window.addEventListener('beforeprint', () => videoFrames.forEach(frame => stopVideo(frame)));
  window.addEventListener('afterprint', syncVideo);

  function schedule() {
    clearTimeout(timer);
    // A playing demonstration owns the slide: no language flip, no next slide.
    if (!playing || reading || document.hidden || languageBusy || videoHold) return;
    timer = setTimeout(() => {
      if (language === 'en') changeLanguage('ar');
      else if (current < slides.length - 1) navigate(current + 1, false, 'en');
      else {
        playbackEnded = true;
        setPlaying(false);
      }
    }, 15000);
  }

  function setPlaying(value) {
    if (!value) cancelLanguageTransition();
    if (value && playbackEnded) navigate(0, false, 'en');
    playing = value && !reading;
    syncPlaybackControls();
    syncMotion();
    schedule();
  }

  function syncPlaybackControls() {
    document.body.classList.toggle('is-playing', playing);
    byId('playBtn')?.setAttribute('aria-pressed', String(playing));
    byId('playBtn')?.setAttribute('aria-label', t(playing ? 'Pause the slideshow' : 'Play English then Arabic, 15 seconds each'));
    setText('playLabel', playing ? 'Pause' : 'Play');
  }

  function updateControls() {
    setText('currentSlide', String(current + 1).padStart(2, '0'));
    setText('totalSlides', String(slides.length).padStart(2, '0'));
    setText('sectionName', title(current));
    setText('languagePhase', language === 'ar' ? 'AR' : 'EN');
    byId('languagePhase')?.setAttribute('aria-label', language === 'ar' ? 'العربية' : 'English');
    if (byId('prevBtn')) byId('prevBtn').disabled = current === 0 && language === 'en';
    if (byId('nextBtn')) byId('nextBtn').disabled = current === slides.length - 1 && language === 'ar';
    if (byId('playBtn')) byId('playBtn').disabled = reading;
    document.querySelectorAll('#progressTrack button, #agendaList button').forEach(button => {
      const index = Number(button.dataset.index);
      const slideTitle = t(title(index));
      if (button.closest('#agendaList')) button.textContent = `${String(index + 1).padStart(2, '0')}  ${slideTitle}`;
      else {
        button.title = `${index + 1}. ${slideTitle}`;
        button.setAttribute('aria-label', language === 'ar' ? `انتقل إلى الشريحة ${index + 1}: ${slideTitle}` : `Go to slide ${index + 1}: ${slideTitle}`);
      }
      const active = Number(button.dataset.index) === current;
      button.classList.toggle('is-active', active);
      button.classList.toggle('near-current', Math.abs(index - current) <= 3);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    chapterButtons.forEach(button => {
      const active = button.dataset.chapter === slides[current].dataset.chapter;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  function navigate(index, manual = true, targetLanguage = 'en') {
    index = Math.max(0, Math.min(slides.length - 1, index));
    const focusedSlide = document.activeElement.closest?.('.slide');
    const focusWillLeave = focusedSlide && focusedSlide !== slides[index];
    const changed = index !== current;
    if (!manual && changed && focusedSlide) {
      setPlaying(false);
      return;
    }
    cancelLanguageTransition();
    playbackEnded = false;
    current = index;
    // Move focus before hiding its old container, only for user-initiated navigation.
    slides[current].hidden = false;
    slides[current].classList.add('is-active');
    if (focusWillLeave) {
      const heading = slides[current].querySelector('h1, h2') || slides[current];
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    slides.forEach((slide, position) => {
      slide.hidden = !reading && position !== current;
      slide.classList.toggle('is-active', position === current);
    });
    if (reading && manual) slides[current].scrollIntoView({ behavior: 'auto', block: 'start' });
    else if (!reading && (changed || manual)) {
      slides[current].scrollTop = 0;
      stage.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    applyLanguage(targetLanguage);
    syncMotion();
    syncVideo();
    writeHash();
    if (manual) announceSlide();
    startTyping();
    schedule();
  }

  function step(direction) {
    if (languageBusy) return;
    playbackEnded = false;
    if (direction > 0) {
      if (language === 'en') changeLanguage('ar');
      else if (current < slides.length - 1) navigate(current + 1, true, 'en');
    } else {
      if (language === 'ar') changeLanguage('en');
      else if (current > 0) navigate(current - 1, true, 'ar');
    }
  }

  slides.forEach((slide, index) => {
    const progressButton = document.createElement('button');
    progressButton.type = 'button';
    progressButton.dataset.index = String(index);
    progressButton.title = `${index + 1}. ${title(index)}`;
    progressButton.setAttribute('aria-label', `Go to slide ${index + 1}: ${title(index)}`);
    progressButton.addEventListener('click', () => navigate(index));
    byId('progressTrack')?.append(progressButton);

    const item = document.createElement('li');
    const agendaButton = document.createElement('button');
    agendaButton.type = 'button';
    agendaButton.dataset.index = String(index);
    agendaButton.textContent = `${String(index + 1).padStart(2, '0')}  ${title(index)}`;
    agendaButton.addEventListener('click', () => {
      dialog.close();
      navigate(index);
    });
    item.append(agendaButton);
    byId('agendaList')?.append(item);
  });

  function setReading(value) {
    setPlaying(false);
    reading = value;
    document.body.classList.toggle('reading-mode', reading);
    document.body.classList.toggle('presentation-mode', !reading);
    byId('viewBtn')?.setAttribute('aria-pressed', String(reading));
    byId('viewBtn')?.setAttribute('aria-label', t(reading ? 'Switch to slide view' : 'Read all slides on one page'));
    setText('viewLabel', reading ? 'Slide view' : 'Read all');
    navigate(current, false, language);
    if (reading) slides[current].scrollIntoView({ behavior: 'auto', block: 'start' });
    else window.scrollTo(0, 0);
    if (reading) announce('Reading view. All slides are visible.');
    else announceSlide();
  }

  function openAgenda() {
    if (!dialog?.showModal) return;
    setPlaying(false);
    dialog.showModal();
    dialog.querySelector('[aria-current="step"]')?.focus();
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else announce('Full screen is unavailable in this browser.');
    } catch { announce('Full screen could not open. You can use your browser’s full screen control.'); }
  }

  listen('prevBtn', 'click', () => step(-1));
  listen('nextBtn', 'click', () => step(1));
  listen('playBtn', 'click', () => setPlaying(!playing));
  listen('viewBtn', 'click', () => setReading(!reading));
  listen('fullscreenBtn', 'click', fullscreen);
  listen('agendaBtn', 'click', openAgenda);
  listen('closeAgenda', 'click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', event => {
    const index = slides.findIndex(slide => slide.id === button.dataset.go);
    if (index >= 0) { event.preventDefault(); navigate(index); }
  }));

  const interactive = target => target.closest?.('a, button, input, textarea, select, summary, [contenteditable="true"], [role="button"]');
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || dialog?.open || interactive(event.target)) return;
    const actions = {
      ArrowRight: () => step(1), ArrowDown: () => step(1), PageDown: () => step(1),
      ArrowLeft: () => step(-1), ArrowUp: () => step(-1), PageUp: () => step(-1),
      Home: () => navigate(0), End: () => navigate(slides.length - 1),
      ' ': () => setPlaying(!playing), f: fullscreen, o: openAgenda,
      Escape: () => setPlaying(false)
    };
    const action = actions[event.key] || actions[event.key.toLowerCase()];
    if (!action || (reading && !['f', 'o', 'Escape'].includes(event.key))) return;
    event.preventDefault();
    action();
  });

  stage.addEventListener('touchstart', event => {
    touchStart = !reading && event.touches.length === 1 && !interactive(event.target)
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  window.addEventListener('hashchange', () => {
    const index = fromHash();
    if (index !== null) navigate(index);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelLanguageTransition();
    schedule();
    syncMotion();
  });
  document.addEventListener('fullscreenchange', () => {
    byId('fullscreenBtn')?.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    byId('fullscreenBtn')?.setAttribute('aria-label', t(document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'));
  });
  const onMotionPreference = () => {
    if (reducedMotion.matches) languageTransition?.finish();
    syncMotion();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionPreference);
  else reducedMotion.addListener(onMotionPreference);

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(() => {
      if (!reading) return;
      const position = window.innerHeight * 0.35;
      const index = slides.findIndex(slide => {
        const bounds = slide.getBoundingClientRect();
        return bounds.top <= position && bounds.bottom > position;
      });
      if (index < 0 || index === current) return;
      current = index;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
      updateControls();
      writeHash();
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    slides.forEach(slide => observer.observe(slide));
  }

  // Keep original text nodes rather than replacing markup, icons, links or listeners.
  // Exclude labels owned by the controller; those are refreshed from its state.
  const dynamic = '#themeBtn, #languageBtn, #languagePhase, #playLabel, #viewLabel, #sectionName, #slideStatus, #agendaList, #progressTrack, script, style, noscript';
  const textEntries = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest(dynamic)) continue;
    const arabic = translations[normalize(node.nodeValue)];
    if (arabic) textEntries.push({ node, english: node.nodeValue, arabic: node.nodeValue.replace(/\S[\s\S]*\S|\S/, arabic) });
  }
  const attributeEntries = [];
  document.querySelectorAll('[aria-label], [alt], [title]').forEach(element => {
    if (element.closest(dynamic)) return;
    ['aria-label', 'alt', 'title'].forEach(name => {
      const english = element.getAttribute(name);
      if (english && translations[normalize(english)]) attributeEntries.push({ element, name, english, arabic: translations[normalize(english)] });
    });
  });
  const englishPageTitle = document.title;

  function announceSlide() {
    announce(language === 'ar'
      ? `الشريحة ${current + 1} من ${slides.length}، بالعربية: ${t(title(current))}`
      : `Slide ${current + 1} of ${slides.length}, English: ${title(current)}`);
  }

  function applyLanguage(value) {
    language = value;
    document.documentElement.lang = value;
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr';
    document.title = t(englishPageTitle);
    textEntries.forEach(entry => { entry.node.nodeValue = value === 'ar' ? entry.arabic : entry.english; });
    attributeEntries.forEach(entry => entry.element.setAttribute(entry.name, value === 'ar' ? entry.arabic : entry.english));
    setText('languageLabel', value === 'ar' ? 'English' : 'العربية');
    byId('languageBtn').lang = value === 'ar' ? 'en' : 'ar';
    byId('languageBtn').dir = value === 'ar' ? 'ltr' : 'rtl';
    byId('languageBtn').setAttribute('aria-label', value === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    byId('viewBtn')?.setAttribute('aria-label', t(reading ? 'Switch to slide view' : 'Read all slides on one page'));
    byId('fullscreenBtn')?.setAttribute('aria-label', t(document.fullscreenElement ? 'Exit full screen' : 'Enter full screen'));
    setText('viewLabel', reading ? 'Slide view' : 'Read all');
    updateControls();
    syncPlaybackControls();
    syncMotion();
    syncTheme();
    fitSlide();
  }

  function cancelLanguageTransition() {
    transitionVersion += 1;
    languageTransition?.cancel();
    languageTransition = null;
    languageBusy = false;
  }

  function animateLetters(content, revealing) {
    if (reducedMotion.matches || document.hidden) return Promise.resolve();
    // Highlight ranges mask whole grapheme clusters without changing DOM layout,
    // bidi order, Arabic joining, diacritics, links, or the accessible text.
    if (window.CSS?.highlights && window.Highlight && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(language, { granularity: 'grapheme' });
      const lines = textEntries.filter(entry => content.contains(entry.node)).map(({ node }) => {
        const offsets = [...segmenter.segment(node.nodeValue)].map(part => part.index);
        offsets.push(node.nodeValue.length);
        return { node, offsets };
      });
      return new Promise(resolve => {
        let frame;
        const start = performance.now();
        const clear = () => {
          cancelAnimationFrame(frame);
          CSS.highlights.delete('deck-converting');
          resolve();
        };
        languageTransition = { cancel: clear, finish: clear };
        const draw = now => {
          const progress = Math.min(1, (now - start) / 650);
          const ranges = lines.map(({ node, offsets }) => {
            const boundary = offsets[Math.floor(progress * (offsets.length - 1))];
            const range = document.createRange();
            range.setStart(node, revealing ? boundary : 0);
            range.setEnd(node, revealing ? node.nodeValue.length : boundary);
            return range;
          });
          CSS.highlights.set('deck-converting', new Highlight(...ranges));
          if (progress < 1) frame = requestAnimationFrame(draw);
          else clear();
        };
        draw(start);
      });
    }
    // Older browsers retain the bilingual transition without breaking Arabic text.
    if (!content.animate) return Promise.resolve();
    languageTransition = content.animate(revealing ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    return languageTransition.finished.catch(() => {});
  }

  async function changeLanguage(target) {
    if (languageBusy) return;
    clearTimeout(timer);
    stopTyping();
    languageBusy = true;
    const version = ++transitionVersion;
    // Each text run dissolves and reappears in logical letter order.
    const content = reading ? stage : slides[current].querySelector('.slide-inner');
    try {
      await animateLetters(content, false);
      if (version !== transitionVersion) return;
      applyLanguage(target);
      languageTransition?.cancel();
      await animateLetters(content, true);
      if (version !== transitionVersion) return;
      announceSlide();
    } finally {
      if (version === transitionVersion) {
        languageTransition?.cancel();
        languageTransition = null;
        languageBusy = false;
        schedule();
      }
    }
  }
  listen('languageBtn', 'click', () => {
    setPlaying(false);
    playbackEnded = false;
    changeLanguage(language === 'en' ? 'ar' : 'en');
  });

  // Each slide writes its main point on. Highlight ranges hide the text that is
  // not yet written, so Arabic joining, diacritics, bidi order, and the
  // accessible text are untouched — the same masking the language switch uses.
  const canType = () => !!(window.CSS?.highlights && window.Highlight && Intl.Segmenter);
  let typing = null;

  function stopTyping() {
    if (!typing) return;
    cancelAnimationFrame(typing.frame);
    typing.caret.remove();
    typing = null;
    CSS.highlights.delete('deck-typing');
  }

  // A collapsed range gives the write head its position in either direction.
  // The canvas is scaled, so screen distances convert back to canvas pixels.
  function placeCaret(target, caret, head) {
    if (!head) { caret.hidden = true; return; }
    const range = document.createRange();
    range.setStart(head.node, head.offset);
    range.setEnd(head.node, head.offset);
    const rect = range.getBoundingClientRect();
    const base = target.getBoundingClientRect();
    if (!rect.height) { caret.hidden = true; return; }
    const scale = parseFloat(target.closest('.slide-canvas')?.style.getPropertyValue('--slide-scale')) || 1;
    caret.hidden = false;
    caret.style.height = `${rect.height / scale}px`;
    caret.style.transform = `translate(${(rect.left - base.left) / scale}px, ${(rect.top - base.top) / scale}px)`;
  }

  function startTyping() {
    stopTyping();
    if (reading || !motion || languageBusy || !canType()) return;
    const target = slides[current].querySelector('[data-type]');
    if (!target) return;
    const segmenter = new Intl.Segmenter(language, { granularity: 'grapheme' });
    const runs = [];
    let total = 0;
    const walk = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode;
      if (!node.nodeValue.trim()) continue;
      const offsets = [...segmenter.segment(node.nodeValue)].map(part => part.index);
      offsets.push(node.nodeValue.length);
      runs.push({ node, offsets, start: total });
      total += offsets.length - 1;
    }
    if (!total) return;
    const caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.setAttribute('aria-hidden', 'true');
    target.append(caret);
    // Long lines still finish well inside the 15-second playback step.
    const duration = Math.min(1900, 340 + total * 15);
    const state = { caret, frame: 0 };
    typing = state;
    const begin = performance.now();
    const draw = now => {
      const written = Math.round(Math.min(1, (now - begin) / duration) * total);
      const ranges = [];
      let head = null;
      runs.forEach(run => {
        const graphemes = run.offsets.length - 1;
        const done = Math.max(0, Math.min(graphemes, written - run.start));
        if (done === graphemes) return;
        const range = document.createRange();
        range.setStart(run.node, run.offsets[done]);
        range.setEnd(run.node, run.node.nodeValue.length);
        ranges.push(range);
        if (!head) head = { node: run.node, offset: run.offsets[done] };
      });
      CSS.highlights.set('deck-typing', new Highlight(...ranges));
      placeCaret(target, caret, head);
      if (written < total) state.frame = requestAnimationFrame(draw);
      else stopTyping();
    };
    state.frame = requestAnimationFrame(draw);
  }

  window.addEventListener('beforeprint', stopTyping);

  document.documentElement.classList.add('js');
  document.body.classList.add('presentation-mode');
  window.addEventListener('resize', scheduleFit);
  if ('ResizeObserver' in window) {
    const sizeObserver = new ResizeObserver(scheduleFit);
    sizeObserver.observe(stage);
    slides.forEach(slide => sizeObserver.observe(slide.querySelector('.slide-canvas')));
  }
  document.fonts?.ready.then(scheduleFit);
  document.querySelectorAll('#stage img').forEach(img => img.addEventListener('load', scheduleFit));
  byId('viewBtn')?.setAttribute('aria-pressed', 'false');
  if (!document.documentElement.requestFullscreen && byId('fullscreenBtn')) {
    byId('fullscreenBtn').disabled = true;
    byId('fullscreenBtn').title = 'Full screen is unavailable in this browser';
  }
  setPlaying(false);
  // Every presentation starts with English; playback reveals Arabic next.
  navigate(fromHash() ?? 0, false);
})();
