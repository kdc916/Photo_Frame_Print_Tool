(() => {
  'use strict';

  const MM_PER_INCH = 25.4;
  const EXPORT_DPI = 300;
  const PREVIEW_PX_PER_MM = 3.2;
  const A4 = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };

  const PRESETS = [
    { name: '딸기우유', style: 'solid', c1: '#ffb7c5', c2: '#fff0f3', texture: 'soft', radius: 5 },
    { name: '병아리', style: 'dots', c1: '#ffd85d', c2: '#fff6c8', texture: 'none', radius: 5 },
    { name: '민트구름', style: 'scallop', c1: '#8ddfd0', c2: '#eafbf7', texture: 'paper', radius: 7 },
    { name: '하늘줄무늬', style: 'stripes', c1: '#8fc8ff', c2: '#eef7ff', texture: 'none', radius: 4 },
    { name: '보라별', style: 'confetti', c1: '#b7a3ff', c2: '#f2eeff', texture: 'none', radius: 6 },
    { name: '크레용', style: 'crayon', c1: '#ff9d72', c2: '#fff0df', texture: 'speckle', radius: 2 },
    { name: '깔끔이중', style: 'double', c1: '#7fb7ff', c2: '#ffffff', texture: 'none', radius: 1 },
    { name: '심플점선', style: 'dashed', c1: '#4e5968', c2: '#f8f9fb', texture: 'none', radius: 3 },
  ];

  const el = id => document.getElementById(id);
  const canvas = el('previewCanvas');
  const ctx = canvas.getContext('2d');

  const state = {
    orientation: 'portrait',
    layout: 1,
    photoW: 89,
    photoH: 119,
    activeSlot: 0,
    frame: {
      style: 'solid',
      color1: '#ffb7c5',
      color2: '#fff2a8',
      width: 5,
      radius: 4,
      texture: 'none',
      textureStrength: 0.25,
    },
    guide: {
      style: 'both',
      color: '#8a8a8a',
      offset: 2,
      safeArea: false,
    },
    slots: [],
    drag: null,
  };

  function createSlot() {
    return {
      image: null,
      imageUrl: null,
      imageName: '',
      zoom: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  function ensureSlots() {
    while (state.slots.length < state.layout) state.slots.push(createSlot());
    if (state.slots.length > state.layout) state.slots.length = state.layout;
    state.activeSlot = Math.min(state.activeSlot, state.layout - 1);
    renderSlotTabs();
    syncPhotoControls();
  }

  function roundedRectPath(context, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function hashNoise(i, seed = 11) {
    const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function getPageSize() {
    return A4[state.orientation];
  }

  function getLayoutRects() {
    const page = getPageSize();
    const fw = state.frame.width;
    const outerW = state.photoW + fw * 2;
    const outerH = state.photoH + fw * 2;
    const margin = 7;
    const usableW = page.w - margin * 2;
    const usableH = page.h - margin * 2;

    let cols = 1, rows = 1;
    if (state.layout === 2) {
      const canSide = outerW * 2 + 5 <= usableW;
      cols = canSide ? 2 : 1;
      rows = canSide ? 1 : 2;
    } else if (state.layout === 4) {
      cols = 2; rows = 2;
    }

    const cellW = usableW / cols;
    const cellH = usableH / rows;
    const rects = [];

    for (let i = 0; i < state.layout; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * cellW + (cellW - outerW) / 2;
      const y = margin + row * cellH + (cellH - outerH) / 2;
      rects.push({ x, y, w: outerW, h: outerH, photoX: x + fw, photoY: y + fw, photoW: state.photoW, photoH: state.photoH });
    }
    return rects;
  }

  function fitScale(img, targetW, targetH) {
    return Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
  }

  function drawPhoto(context, slot, r, ppm) {
    const x = r.photoX * ppm, y = r.photoY * ppm, w = r.photoW * ppm, h = r.photoH * ppm;
    context.save();
    context.beginPath();
    roundedRectPath(context, x, y, w, h, Math.max(0, (state.frame.radius - 0.8) * ppm));
    context.clip();
    context.fillStyle = '#f3f0ed';
    context.fillRect(x, y, w, h);

    if (!slot.image) {
      context.fillStyle = '#9f9892';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `${Math.max(12, 4.2 * ppm)}px system-ui, sans-serif`;
      context.fillText('사진을 넣어주세요', x + w / 2, y + h / 2 - 7 * ppm);
      context.font = `${Math.max(9, 2.5 * ppm)}px system-ui, sans-serif`;
      context.fillStyle = '#bbb3ad';
      context.fillText(`${state.photoW} × ${state.photoH} mm`, x + w / 2, y + h / 2 + 2 * ppm);
      context.restore();
      return;
    }

    const img = slot.image;
    const base = fitScale(img, w, h);
    const scale = base * slot.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const cx = x + w / 2 + slot.offsetX * ppm;
    const cy = y + h / 2 + slot.offsetY * ppm;

    context.translate(cx, cy);
    context.rotate(slot.rotation * Math.PI / 180);
    context.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    context.restore();
  }

  function clipFrameRing(context, r, ppm, callback) {
    const fw = state.frame.width * ppm;
    const x = r.x * ppm, y = r.y * ppm, w = r.w * ppm, h = r.h * ppm;
    const ix = r.photoX * ppm, iy = r.photoY * ppm, iw = r.photoW * ppm, ih = r.photoH * ppm;
    const radius = state.frame.radius * ppm;
    context.save();
    context.beginPath();
    roundedRectPath(context, x, y, w, h, radius);
    roundedRectPath(context, ix, iy, iw, ih, Math.max(0, radius - fw * .65));
    context.clip('evenodd');
    callback({ x, y, w, h, ix, iy, iw, ih, fw, radius });
    context.restore();
  }

  function drawTexture(context, g, ppm) {
    const strength = state.frame.textureStrength;
    if (!strength || state.frame.texture === 'none') return;
    const count = Math.round((g.w * g.h) / (ppm * ppm) * (state.frame.texture === 'paper' ? .07 : .16));
    context.save();
    for (let i = 0; i < count; i++) {
      const rx = g.x + hashNoise(i, 5) * g.w;
      const ry = g.y + hashNoise(i, 17) * g.h;
      const alpha = strength * (state.frame.texture === 'soft' ? .045 : .09);
      context.fillStyle = `rgba(70,55,45,${alpha})`;
      const size = (state.frame.texture === 'paper' ? .15 : .25 + hashNoise(i, 9) * .35) * ppm;
      context.beginPath();
      context.arc(rx, ry, Math.max(.4, size), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawFrame(context, r, ppm) {
    const c1 = state.frame.color1;
    const c2 = state.frame.color2;
    const style = state.frame.style;
    clipFrameRing(context, r, ppm, g => {
      context.fillStyle = c2;
      context.fillRect(g.x, g.y, g.w, g.h);

      if (style === 'solid') {
        context.fillStyle = c1;
        context.fillRect(g.x, g.y, g.w, g.h);
      } else if (style === 'stripes') {
        context.fillStyle = c2;
        context.fillRect(g.x, g.y, g.w, g.h);
        context.strokeStyle = c1;
        context.lineWidth = Math.max(2, 2.2 * ppm);
        const step = 6 * ppm;
        for (let i = -g.h; i < g.w + g.h; i += step) {
          context.beginPath();
          context.moveTo(g.x + i, g.y + g.h);
          context.lineTo(g.x + i + g.h, g.y);
          context.stroke();
        }
      } else if (style === 'dots') {
        context.fillStyle = c2;
        context.fillRect(g.x, g.y, g.w, g.h);
        context.fillStyle = c1;
        const step = 5.5 * ppm;
        const rad = 1.15 * ppm;
        for (let yy = g.y + step / 2; yy < g.y + g.h; yy += step) {
          for (let xx = g.x + step / 2; xx < g.x + g.w; xx += step) {
            context.beginPath(); context.arc(xx, yy, rad, 0, Math.PI * 2); context.fill();
          }
        }
      } else if (style === 'confetti') {
        context.fillStyle = c2;
        context.fillRect(g.x, g.y, g.w, g.h);
        for (let i = 0; i < 220; i++) {
          const xx = g.x + hashNoise(i, 3) * g.w;
          const yy = g.y + hashNoise(i, 7) * g.h;
          const size = (0.6 + hashNoise(i, 13) * 1.4) * ppm;
          context.fillStyle = i % 3 === 0 ? c1 : (i % 3 === 1 ? '#ffffff' : '#ffd86f');
          context.save();
          context.translate(xx, yy);
          context.rotate(hashNoise(i, 19) * Math.PI);
          context.fillRect(-size, -size * .35, size * 2, size * .7);
          context.restore();
        }
      } else if (style === 'crayon') {
        context.fillStyle = c2;
        context.fillRect(g.x, g.y, g.w, g.h);
        context.globalAlpha = .75;
        for (let i = 0; i < 100; i++) {
          const yy = g.y + hashNoise(i, 29) * g.h;
          context.strokeStyle = c1;
          context.lineWidth = (.4 + hashNoise(i, 31) * 1.3) * ppm;
          context.beginPath();
          context.moveTo(g.x + hashNoise(i, 37) * g.w, yy);
          context.lineTo(g.x + hashNoise(i, 41) * g.w, yy + (hashNoise(i, 43) - .5) * 4 * ppm);
          context.stroke();
        }
        context.globalAlpha = 1;
      } else {
        context.fillStyle = c2;
        context.fillRect(g.x, g.y, g.w, g.h);
      }
      drawTexture(context, g, ppm);
    });

    const x = r.x * ppm, y = r.y * ppm, w = r.w * ppm, h = r.h * ppm;
    const radius = state.frame.radius * ppm;
    context.save();
    context.lineJoin = 'round';
    context.lineCap = 'round';

    if (style === 'double') {
      context.strokeStyle = state.frame.color1;
      context.lineWidth = Math.max(1, .9 * ppm);
      context.beginPath(); roundedRectPath(context, x + 1.2 * ppm, y + 1.2 * ppm, w - 2.4 * ppm, h - 2.4 * ppm, Math.max(0, radius - 1.2 * ppm)); context.stroke();
      const inset = Math.max(2.2, state.frame.width - 1.2) * ppm;
      context.beginPath(); roundedRectPath(context, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(0, radius - inset)); context.stroke();
    } else if (style === 'dashed') {
      context.strokeStyle = state.frame.color1;
      context.lineWidth = Math.max(1.2, 1.1 * ppm);
      context.setLineDash([3.2 * ppm, 2.1 * ppm]);
      context.beginPath(); roundedRectPath(context, x + 1.2 * ppm, y + 1.2 * ppm, w - 2.4 * ppm, h - 2.4 * ppm, Math.max(0, radius - 1.2 * ppm)); context.stroke();
    } else if (style === 'scallop') {
      context.fillStyle = state.frame.color1;
      const spacing = Math.max(3.2, state.frame.width * .9) * ppm;
      const rad = Math.max(1.3, state.frame.width * .34) * ppm;
      for (let xx = x + spacing / 2; xx < x + w; xx += spacing) {
        context.beginPath(); context.arc(xx, y + rad * .75, rad, 0, Math.PI * 2); context.fill();
        context.beginPath(); context.arc(xx, y + h - rad * .75, rad, 0, Math.PI * 2); context.fill();
      }
      for (let yy = y + spacing / 2; yy < y + h; yy += spacing) {
        context.beginPath(); context.arc(x + rad * .75, yy, rad, 0, Math.PI * 2); context.fill();
        context.beginPath(); context.arc(x + w - rad * .75, yy, rad, 0, Math.PI * 2); context.fill();
      }
    }
    context.restore();
  }

  function drawGuide(context, r, ppm) {
    const style = state.guide.style;
    if (style === 'none') return;
    const offset = state.guide.offset * ppm;
    const x = r.x * ppm - offset, y = r.y * ppm - offset;
    const w = r.w * ppm + offset * 2, h = r.h * ppm + offset * 2;
    const color = state.guide.color;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = Math.max(.7, .22 * ppm);

    if (style === 'dash' || style === 'both') {
      context.setLineDash([2 * ppm, 1.5 * ppm]);
      context.strokeRect(x, y, w, h);
      context.setLineDash([]);
    } else if (style === 'solid') {
      context.strokeRect(x, y, w, h);
    }

    if (style === 'crop' || style === 'both') {
      const len = 5 * ppm, gap = 1 * ppm;
      const corners = [
        [x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]
      ];
      for (const [cx, cy, sx, sy] of corners) {
        context.beginPath(); context.moveTo(cx + sx * gap, cy); context.lineTo(cx + sx * (gap + len), cy); context.stroke();
        context.beginPath(); context.moveTo(cx, cy + sy * gap); context.lineTo(cx, cy + sy * (gap + len)); context.stroke();
      }
    }
    context.restore();
  }

  function drawSafeArea(context, r, ppm) {
    if (!state.guide.safeArea) return;
    const pad = 3 * ppm;
    context.save();
    context.strokeStyle = 'rgba(255, 82, 120, .55)';
    context.lineWidth = Math.max(.7, .2 * ppm);
    context.setLineDash([1.3 * ppm, 1.3 * ppm]);
    context.strokeRect(r.photoX * ppm + pad, r.photoY * ppm + pad, r.photoW * ppm - pad * 2, r.photoH * ppm - pad * 2);
    context.restore();
  }

  function renderTo(target, ppm, showSelection = false) {
    const page = getPageSize();
    target.width = Math.round(page.w * ppm);
    target.height = Math.round(page.h * ppm);
    const c = target.getContext('2d');
    c.clearRect(0, 0, target.width, target.height);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, target.width, target.height);

    const rects = getLayoutRects();
    rects.forEach((r, i) => {
      drawFrame(c, r, ppm);
      drawPhoto(c, state.slots[i], r, ppm);
      drawSafeArea(c, r, ppm);
      drawGuide(c, r, ppm);
      if (showSelection && i === state.activeSlot) {
        c.save();
        c.strokeStyle = '#ff5c7b';
        c.lineWidth = Math.max(1.3, .4 * ppm);
        c.setLineDash([1.2 * ppm, 1.2 * ppm]);
        c.strokeRect(r.photoX * ppm, r.photoY * ppm, r.photoW * ppm, r.photoH * ppm);
        c.restore();
      }
    });
  }

  function render() {
    renderTo(canvas, PREVIEW_PX_PER_MM, true);
    updateStatus();
  }

  function updateStatus() {
    const page = getPageSize();
    const guidePad = state.guide.style === 'none' ? 0 : state.guide.offset;
    const overflow = getLayoutRects().some(r =>
      r.x - guidePad < 0 || r.y - guidePad < 0 ||
      r.x + r.w + guidePad > page.w || r.y + r.h + guidePad > page.h
    );
    const status = el('statusText');
    status.textContent = `${state.layout}장 배치 · ${state.photoW} × ${state.photoH} mm · 프레임 ${state.frame.width} mm${overflow ? ' · ⚠ A4 영역 초과' : ''}`;
    status.style.color = overflow ? '#cf425f' : '';
    el('activeSlotBadge').textContent = `${state.activeSlot + 1}번 사진`;
  }

  function renderSlotTabs() {
    const wrap = el('slotTabs');
    wrap.innerHTML = '';
    state.slots.forEach((slot, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${i + 1}` + (slot.image ? ' ✓' : '');
      b.className = i === state.activeSlot ? 'active' : '';
      b.title = slot.imageName || `${i + 1}번 사진`;
      b.addEventListener('click', () => {
        state.activeSlot = i;
        renderSlotTabs();
        syncPhotoControls();
        render();
      });
      wrap.appendChild(b);
    });
  }

  function syncPhotoControls() {
    const slot = state.slots[state.activeSlot] || createSlot();
    el('zoomRange').value = slot.zoom;
    el('zoomValue').textContent = `${Number(slot.zoom).toFixed(2)}×`;
    el('rotateRange').value = slot.rotation;
    el('rotateValue').textContent = `${Number(slot.rotation).toFixed(1).replace('.0','')}°`;
    updateStatus();
  }

  function applyPreset(index) {
    const p = PRESETS[index];
    state.frame.style = p.style;
    state.frame.color1 = p.c1;
    state.frame.color2 = p.c2;
    state.frame.texture = p.texture;
    state.frame.radius = p.radius;
    el('frameStyle').value = p.style;
    el('frameColor').value = p.c1;
    el('frameColor2').value = p.c2;
    el('textureSelect').value = p.texture;
    el('radiusRange').value = p.radius;
    el('radiusValue').textContent = `${p.radius} mm`;
    document.querySelectorAll('.preset').forEach((node, i) => node.classList.toggle('active', i === index));
    render();
  }

  function buildPresets() {
    const wrap = el('presetGrid');
    PRESETS.forEach((p, index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset' + (index === 0 ? ' active' : '');
      b.style.setProperty('--c1', p.c1);
      b.style.setProperty('--c2', p.c2);
      b.innerHTML = `<span class="preset-swatch"></span><span>${p.name}</span>`;
      b.addEventListener('click', () => applyPreset(index));
      wrap.appendChild(b);
    });
  }

  function loadImage(file) {
    if (!file) return;
    const slot = state.slots[state.activeSlot];
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (slot.imageUrl) URL.revokeObjectURL(slot.imageUrl);
      slot.image = img;
      slot.imageUrl = url;
      slot.imageName = file.name;
      slot.zoom = 1;
      slot.rotation = 0;
      slot.offsetX = 0;
      slot.offsetY = 0;
      renderSlotTabs();
      syncPhotoControls();
      render();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('이미지를 불러오지 못했습니다. JPG, PNG, WebP 등 일반 이미지 파일을 사용해 주세요.');
    };
    img.src = url;
  }

  function exportPNG() {
    const exportCanvas = document.createElement('canvas');
    renderTo(exportCanvas, EXPORT_DPI / MM_PER_INCH, false);
    exportCanvas.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      link.download = `A4_Photo_Frame_${state.layout}up_${stamp}.png`;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    }, 'image/png');
  }

  function setLayout(layout) {
    state.layout = Number(layout);
    document.querySelectorAll('#layoutButtons button').forEach(b => b.classList.toggle('active', Number(b.dataset.layout) === state.layout));
    ensureSlots();
    render();
  }

  function resetAll() {
    if (!confirm('현재 작업을 초기화할까요?')) return;
    state.orientation = 'portrait';
    state.layout = 1;
    state.photoW = 89;
    state.photoH = 119;
    state.activeSlot = 0;
    state.frame = { style: 'solid', color1: '#ffb7c5', color2: '#fff2a8', width: 5, radius: 4, texture: 'none', textureStrength: 0.25 };
    state.guide = { style: 'both', color: '#8a8a8a', offset: 2, safeArea: false };
    state.slots.forEach(s => s.imageUrl && URL.revokeObjectURL(s.imageUrl));
    state.slots = [];
    ensureSlots();

    el('orientationSelect').value = 'portrait';
    el('photoWidth').value = 89;
    el('photoHeight').value = 119;
    el('frameStyle').value = 'solid';
    el('frameColor').value = '#ffb7c5';
    el('frameColor2').value = '#fff2a8';
    el('frameWidthRange').value = 5;
    el('frameWidthValue').textContent = '5 mm';
    el('radiusRange').value = 4;
    el('radiusValue').textContent = '4 mm';
    el('textureSelect').value = 'none';
    el('textureRange').value = .25;
    el('textureValue').textContent = '25%';
    el('guideStyle').value = 'both';
    el('guideColor').value = '#8a8a8a';
    el('guideOffset').value = 2;
    el('safeAreaToggle').checked = false;
    setLayout(1);
    document.querySelectorAll('.preset').forEach((node, i) => node.classList.toggle('active', i === 0));
    render();
  }

  function pointerToMm(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * canvas.width / rect.width / PREVIEW_PX_PER_MM,
      y: (ev.clientY - rect.top) * canvas.height / rect.height / PREVIEW_PX_PER_MM,
    };
  }

  function hitPhoto(p) {
    const rects = getLayoutRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (p.x >= r.photoX && p.x <= r.photoX + r.photoW && p.y >= r.photoY && p.y <= r.photoY + r.photoH) return { i, r };
    }
    return null;
  }

  canvas.addEventListener('pointerdown', ev => {
    const p = pointerToMm(ev);
    const hit = hitPhoto(p);
    if (!hit) return;
    state.activeSlot = hit.i;
    renderSlotTabs();
    syncPhotoControls();
    const slot = state.slots[hit.i];
    state.drag = { slot: hit.i, startX: p.x, startY: p.y, offsetX: slot.offsetX, offsetY: slot.offsetY };
    canvas.setPointerCapture(ev.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', ev => {
    if (!state.drag) return;
    const p = pointerToMm(ev);
    const slot = state.slots[state.drag.slot];
    slot.offsetX = state.drag.offsetX + (p.x - state.drag.startX);
    slot.offsetY = state.drag.offsetY + (p.y - state.drag.startY);
    render();
  });
  canvas.addEventListener('pointerup', () => state.drag = null);
  canvas.addEventListener('pointercancel', () => state.drag = null);

  document.querySelectorAll('#layoutButtons button').forEach(b => b.addEventListener('click', () => setLayout(b.dataset.layout)));
  el('orientationSelect').addEventListener('change', e => { state.orientation = e.target.value; render(); });
  el('photoWidth').addEventListener('input', e => { state.photoW = Math.max(30, Number(e.target.value) || 89); render(); });
  el('photoHeight').addEventListener('input', e => { state.photoH = Math.max(30, Number(e.target.value) || 119); render(); });
  el('imageInput').addEventListener('change', e => { loadImage(e.target.files?.[0]); e.target.value = ''; });
  el('zoomRange').addEventListener('input', e => { const s = state.slots[state.activeSlot]; s.zoom = Number(e.target.value); el('zoomValue').textContent = `${s.zoom.toFixed(2)}×`; render(); });
  el('rotateRange').addEventListener('input', e => { const s = state.slots[state.activeSlot]; s.rotation = Number(e.target.value); el('rotateValue').textContent = `${s.rotation.toFixed(1).replace('.0','')}°`; render(); });
  el('fitBtn').addEventListener('click', () => { const s = state.slots[state.activeSlot]; s.zoom = 1; s.rotation = 0; s.offsetX = 0; s.offsetY = 0; syncPhotoControls(); render(); });
  el('centerBtn').addEventListener('click', () => { const s = state.slots[state.activeSlot]; s.offsetX = 0; s.offsetY = 0; render(); });
  el('copyPhotoBtn').addEventListener('click', () => {
    const src = state.slots[state.activeSlot];
    if (!src.image) return alert('먼저 사진을 불러와 주세요.');
    state.slots.forEach((s, i) => {
      if (i === state.activeSlot) return;
      s.image = src.image; s.imageUrl = null; s.imageName = src.imageName; s.zoom = src.zoom; s.rotation = src.rotation; s.offsetX = src.offsetX; s.offsetY = src.offsetY;
    });
    renderSlotTabs(); render();
  });

  el('frameStyle').addEventListener('change', e => { state.frame.style = e.target.value; render(); });
  el('frameColor').addEventListener('input', e => { state.frame.color1 = e.target.value; render(); });
  el('frameColor2').addEventListener('input', e => { state.frame.color2 = e.target.value; render(); });
  el('frameWidthRange').addEventListener('input', e => { state.frame.width = Number(e.target.value); el('frameWidthValue').textContent = `${state.frame.width} mm`; render(); });
  el('radiusRange').addEventListener('input', e => { state.frame.radius = Number(e.target.value); el('radiusValue').textContent = `${state.frame.radius} mm`; render(); });
  el('textureSelect').addEventListener('change', e => { state.frame.texture = e.target.value; render(); });
  el('textureRange').addEventListener('input', e => { state.frame.textureStrength = Number(e.target.value); el('textureValue').textContent = `${Math.round(state.frame.textureStrength * 100)}%`; render(); });

  el('guideStyle').addEventListener('change', e => { state.guide.style = e.target.value; render(); });
  el('guideColor').addEventListener('input', e => { state.guide.color = e.target.value; render(); });
  el('guideOffset').addEventListener('input', e => { state.guide.offset = Math.max(0, Number(e.target.value) || 0); render(); });
  el('safeAreaToggle').addEventListener('change', e => { state.guide.safeArea = e.target.checked; render(); });

  el('exportBtn').addEventListener('click', exportPNG);
  el('printBtn').addEventListener('click', () => window.print());
  el('resetBtn').addEventListener('click', resetAll);

  window.addEventListener('beforeprint', () => {
    const page = getPageSize();
    renderTo(canvas, PREVIEW_PX_PER_MM, false);
    const style = document.createElement('style');
    style.id = 'dynamicPrintStyle';
    style.textContent = `@page{size:A4 ${state.orientation};margin:0} @media print{#previewCanvas{width:${page.w}mm!important;height:${page.h}mm!important}}`;
    document.head.appendChild(style);
  });
  window.addEventListener('afterprint', () => {
    document.getElementById('dynamicPrintStyle')?.remove();
    render();
  });

  buildPresets();
  ensureSlots();
  render();
})();
