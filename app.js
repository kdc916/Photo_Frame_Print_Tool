(() => {
  'use strict';

  const MM_PER_INCH = 25.4;
  const EXPORT_DPI = 300;
  const PREVIEW_PX_PER_MM = 3.2;
  const A4 = {
    portrait: { w: 210, h: 297 },
    landscape: { w: 297, h: 210 }
  };
  const SLOT_COUNT = 2;
  const LAYOUT_GAP_MM = 8;

  const PRESETS = [
    { name: '딸기우유', style: 'plain', bg: '#ffb7c5', line: '#ed7891', pattern: 'none', p1: '#ffffff', p2: '#ffd86f', size: 2.2, gap: 4, random: 0, texture: 'soft', radius: 5 },
    { name: '병아리', style: 'plain', bg: '#fff1b7', line: '#efc94c', pattern: 'dots', p1: '#f5c94f', p2: '#ffffff', size: 2.2, gap: 2.8, random: 0, texture: 'none', radius: 5 },
    { name: '민트구름', style: 'scallop', bg: '#dff7f2', line: '#72cdbd', pattern: 'dots', p1: '#8ddfd0', p2: '#ffffff', size: 2, gap: 3.2, random: 0, texture: 'paper', radius: 7 },
    { name: '하늘줄무늬', style: 'plain', bg: '#e6f2ff', line: '#7cb8f2', pattern: 'stripes', p1: '#8fc8ff', p2: '#ffffff', size: 2.4, gap: 3.2, random: 0, texture: 'none', radius: 4 },
    { name: '보라별', style: 'plain', bg: '#eee9ff', line: '#9a86e9', pattern: 'stars', p1: '#a48bf2', p2: '#ffffff', size: 2.8, gap: 3.4, random: 0.12, texture: 'none', radius: 6 },
    { name: '크레용', style: 'plain', bg: '#fff0df', line: '#e98f69', pattern: 'crayon', p1: '#ff9d72', p2: '#ffc37d', size: 2.2, gap: 3, random: 0.55, texture: 'speckle', radius: 2 },
    { name: '깔끔이중', style: 'double', bg: '#eef5ff', line: '#6da5e8', pattern: 'none', p1: '#ffffff', p2: '#ffffff', size: 2, gap: 4, random: 0, texture: 'none', radius: 2 },
    { name: '심플점선', style: 'dashed', bg: '#f7f8fa', line: '#4e5968', pattern: 'none', p1: '#ffffff', p2: '#ffffff', size: 2, gap: 4, random: 0, texture: 'none', radius: 3 }
  ];

  const el = id => document.getElementById(id);
  const canvas = el('previewCanvas');

  function createDefaultFrame() {
    return {
      style: 'plain',
      backgroundColor: '#ffb7c5',
      lineColor: '#ed7891',
      width: 5,
      radius: 4,
      pattern: 'none',
      patternColor1: '#ffffff',
      patternColor2: '#ffd86f',
      patternSize: 2.2,
      patternGap: 4,
      patternRandom: 0,
      patternSeed: 1201,
      texture: 'none',
      textureStrength: 0.25,
      presetIndex: 0
    };
  }

  function createSlot(index) {
    const frame = createDefaultFrame();
    frame.patternSeed = 1201 + index * 137;
    return {
      image: null,
      imageUrl: null,
      imageName: '',
      zoom: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      flipX: false,
      frame: frame,
      nameText: '',
      secondaryText: '',
      fontFamily: 'system-ui',
      fontLabel: '기본 시스템',
      textSize: 8,
      textColor: '#ffffff',
      textPosition: 'bottom',
      textOffsetX: 0,
      textOffsetY: 0,
      textWeight: 700,
      textOutline: true,
      outlineColor: '#6d554b'
    };
  }

  const state = {
    orientation: 'portrait',
    layout: 1,
    photoW: 89,
    photoH: 119,
    activeSlot: 0,
    guide: {
      style: 'both',
      color: '#8a8a8a',
      offset: 2,
      safeArea: false
    },
    slots: [createSlot(0), createSlot(1)],
    drag: null
  };

  function roundedRectPath(context, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function hashNoise(i, seed) {
    const s = Number(seed || 1);
    const x = Math.sin((i + 1) * 12.9898 + s * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function getPageSize() {
    return A4[state.orientation];
  }

  function getSlotOuter(slot) {
    const fw = slot.frame.width;
    return { w: state.photoW + fw * 2, h: state.photoH + fw * 2 };
  }

  function buildRect(slotIndex, x, y) {
    const slot = state.slots[slotIndex];
    const fw = slot.frame.width;
    const outer = getSlotOuter(slot);
    return {
      slotIndex: slotIndex,
      x: x,
      y: y,
      w: outer.w,
      h: outer.h,
      photoX: x + fw,
      photoY: y + fw,
      photoW: state.photoW,
      photoH: state.photoH
    };
  }

  function layoutOverflowMetric(totalW, totalH, usableW, usableH) {
    return Math.max(0, totalW - usableW) + Math.max(0, totalH - usableH);
  }

  function getLayoutRects() {
    const page = getPageSize();
    const margin = 8;
    const usableW = page.w - margin * 2;
    const usableH = page.h - margin * 2;

    if (state.layout === 1) {
      const outer = getSlotOuter(state.slots[0]);
      return [buildRect(0, margin + (usableW - outer.w) / 2, margin + (usableH - outer.h) / 2)];
    }

    const a = getSlotOuter(state.slots[0]);
    const b = getSlotOuter(state.slots[1]);

    const horizontal = {
      totalW: a.w + b.w + LAYOUT_GAP_MM,
      totalH: Math.max(a.h, b.h)
    };
    const vertical = {
      totalW: Math.max(a.w, b.w),
      totalH: a.h + b.h + LAYOUT_GAP_MM
    };

    const horizontalFits = horizontal.totalW <= usableW && horizontal.totalH <= usableH;
    const verticalFits = vertical.totalW <= usableW && vertical.totalH <= usableH;

    let mode;
    if (state.orientation === 'landscape' && horizontalFits) mode = 'horizontal';
    else if (state.orientation === 'portrait' && verticalFits) mode = 'vertical';
    else if (horizontalFits) mode = 'horizontal';
    else if (verticalFits) mode = 'vertical';
    else {
      const hm = layoutOverflowMetric(horizontal.totalW, horizontal.totalH, usableW, usableH);
      const vm = layoutOverflowMetric(vertical.totalW, vertical.totalH, usableW, usableH);
      mode = hm <= vm ? 'horizontal' : 'vertical';
    }

    if (mode === 'horizontal') {
      const startX = margin + (usableW - horizontal.totalW) / 2;
      const centerY = margin + usableH / 2;
      return [
        buildRect(0, startX, centerY - a.h / 2),
        buildRect(1, startX + a.w + LAYOUT_GAP_MM, centerY - b.h / 2)
      ];
    }

    const startY = margin + (usableH - vertical.totalH) / 2;
    const centerX = margin + usableW / 2;
    return [
      buildRect(0, centerX - a.w / 2, startY),
      buildRect(1, centerX - b.w / 2, startY + a.h + LAYOUT_GAP_MM)
    ];
  }

  function fitScale(img, targetW, targetH) {
    return Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
  }

  function drawPhoto(context, slot, r, ppm) {
    const frame = slot.frame;
    const x = r.photoX * ppm;
    const y = r.photoY * ppm;
    const w = r.photoW * ppm;
    const h = r.photoH * ppm;
    const bleedMm = Math.min(0.45, Math.max(0.18, frame.width * 0.08));
    const bleed = bleedMm * ppm;
    const innerRadiusMm = Math.max(0, frame.radius - frame.width * 0.65);

    context.save();
    context.beginPath();
    roundedRectPath(context, x - bleed, y - bleed, w + bleed * 2, h + bleed * 2, (innerRadiusMm + bleedMm) * ppm);
    context.clip();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#f3f0ed';
    context.fillRect(x - bleed, y - bleed, w + bleed * 2, h + bleed * 2);

    if (!slot.image) {
      context.fillStyle = '#9f9892';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = Math.max(12, 4.2 * ppm) + 'px system-ui, sans-serif';
      context.fillText('사진을 넣어주세요', x + w / 2, y + h / 2 - 7 * ppm);
      context.font = Math.max(9, 2.5 * ppm) + 'px system-ui, sans-serif';
      context.fillStyle = '#bbb3ad';
      context.fillText(state.photoW + ' × ' + state.photoH + ' mm', x + w / 2, y + h / 2 + 2 * ppm);
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
    context.scale(slot.flipX ? -1 : 1, 1);
    context.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    context.restore();
  }

  function clipFrameRing(context, r, ppm, frame, callback) {
    const fw = frame.width * ppm;
    const x = r.x * ppm;
    const y = r.y * ppm;
    const w = r.w * ppm;
    const h = r.h * ppm;
    const ix = r.photoX * ppm;
    const iy = r.photoY * ppm;
    const iw = r.photoW * ppm;
    const ih = r.photoH * ppm;
    const radius = frame.radius * ppm;

    context.save();
    context.beginPath();
    roundedRectPath(context, x, y, w, h, radius);
    roundedRectPath(context, ix, iy, iw, ih, Math.max(0, radius - fw * 0.65));
    context.clip('evenodd');
    callback({ x: x, y: y, w: w, h: h, ix: ix, iy: iy, iw: iw, ih: ih, fw: fw, radius: radius });
    context.restore();
  }

  function linePositions(start, end, desiredStep) {
    const length = Math.max(0, end - start);
    if (length <= 0) return [];
    const step = Math.max(1, desiredStep);
    const count = Math.max(1, Math.floor(length / step) + 1);
    if (count === 1) return [(start + end) / 2];
    const actual = length / (count - 1);
    const result = [];
    for (let i = 0; i < count; i++) result.push(start + actual * i);
    return result;
  }

  function drawStar(context, x, y, radius, color, rotation) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation || 0);
    context.fillStyle = color;
    context.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? radius : radius * 0.45;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawDiamond(context, x, y, size, color, rotation) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation || 0);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, -size * 0.5);
    context.lineTo(size * 0.5, 0);
    context.lineTo(0, size * 0.5);
    context.lineTo(-size * 0.5, 0);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawHeart(context, x, y, size, color, rotation) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation || 0);
    context.scale(size / 18, size / 18);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, 6);
    context.bezierCurveTo(-10, 0, -8, -8, -2, -8);
    context.bezierCurveTo(1, -8, 3, -6, 4, -4);
    context.bezierCurveTo(5, -6, 7, -8, 10, -8);
    context.bezierCurveTo(16, -8, 18, 0, 8, 6);
    context.lineTo(4, 10);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawFlower(context, x, y, radius, c1, c2, rotation) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation || 0);
    context.fillStyle = c1;
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      context.beginPath();
      context.arc(Math.cos(a) * radius * 0.55, Math.sin(a) * radius * 0.55, radius * 0.46, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = c2;
    context.beginPath();
    context.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawRegularEdgeSymbols(context, g, ppm, frame, symbol) {
    const band = frame.width * ppm;
    const requested = Math.max(0.6, frame.patternSize) * ppm;
    const size = Math.min(requested, band * 0.68);
    const gap = Math.max(1, frame.patternGap) * ppm;
    const desiredStep = Math.max(size + gap, size * 1.35);

    // Keep all symbols on the center line of the frame band.
    const topY = g.y + band * 0.5;
    const bottomY = g.y + g.h - band * 0.5;
    const leftX = g.x + band * 0.5;
    const rightX = g.x + g.w - band * 0.5;

    // Corners are intentionally left empty. This avoids half-clipped symbols and
    // makes opposite sides use the same visible rhythm.
    const cornerInset = Math.max(
      frame.radius * ppm + size * 0.25,
      band * 0.72,
      size * 0.85
    );

    const xStart = g.x + cornerInset;
    const xEnd = g.x + g.w - cornerInset;
    const yStart = g.y + cornerInset;
    const yEnd = g.y + g.h - cornerInset;

    const xs = linePositions(xStart, xEnd, desiredStep);
    const ys = linePositions(yStart, yEnd, desiredStep);

    let index = 0;
    xs.forEach(function(px, idx) {
      symbol(px, topY, size, index++, 'top', idx, xs.length);
      symbol(px, bottomY, size, index++, 'bottom', idx, xs.length);
    });
    ys.forEach(function(py, idx) {
      symbol(leftX, py, size, index++, 'left', idx, ys.length);
      symbol(rightX, py, size, index++, 'right', idx, ys.length);
    });
  }

  function drawPattern(context, g, ppm, frame) {
    if (!frame.pattern || frame.pattern === 'none') return;

    const p1 = frame.patternColor1;
    const p2 = frame.patternColor2;
    const size = Math.max(0.6, frame.patternSize) * ppm;
    const gap = Math.max(1, frame.patternGap) * ppm;
    const random = Math.max(0, Math.min(1, frame.patternRandom));
    const seed = Number(frame.patternSeed || 1);

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (frame.pattern === 'dots') {
      drawRegularEdgeSymbols(context, g, ppm, frame, function(x, y, s) {
        context.fillStyle = p1;
        context.beginPath();
        context.arc(x, y, s / 2, 0, Math.PI * 2);
        context.fill();
      });
    } else if (frame.pattern === 'stars') {
      drawRegularEdgeSymbols(context, g, ppm, frame, function(x, y, s, i) {
        const jitter = random * Math.min(g.fw * 0.12, gap * 0.18);
        const jx = (hashNoise(i, seed + 7) - 0.5) * jitter;
        const jy = (hashNoise(i, seed + 13) - 0.5) * jitter;
        const rot = (hashNoise(i, seed + 19) - 0.5) * random * 0.8;
        drawStar(context, x + jx, y + jy, s / 2, i % 2 ? p2 : p1, rot);
      });
    } else if (frame.pattern === 'hearts') {
      drawRegularEdgeSymbols(context, g, ppm, frame, function(x, y, s, i) {
        const jitter = random * Math.min(g.fw * 0.12, gap * 0.18);
        const jx = (hashNoise(i, seed + 23) - 0.5) * jitter;
        const jy = (hashNoise(i, seed + 29) - 0.5) * jitter;
        const rot = (hashNoise(i, seed + 31) - 0.5) * random * 0.65;
        drawHeart(context, x + jx, y + jy, s, i % 2 ? p2 : p1, rot);
      });
    } else if (frame.pattern === 'flowers') {
      drawRegularEdgeSymbols(context, g, ppm, frame, function(x, y, s, i) {
        const jitter = random * Math.min(g.fw * 0.1, gap * 0.15);
        drawFlower(
          context,
          x + (hashNoise(i, seed + 37) - 0.5) * jitter,
          y + (hashNoise(i, seed + 41) - 0.5) * jitter,
          s / 2,
          i % 2 ? p2 : p1,
          i % 2 ? p1 : p2,
          (hashNoise(i, seed + 43) - 0.5) * random
        );
      });
    } else if (frame.pattern === 'stripes') {
      context.strokeStyle = p1;
      context.lineWidth = Math.max(0.7 * ppm, Math.min(size * 0.34, g.fw * 0.5));
      const step = Math.max(Math.min(size, g.fw * 0.75) + gap, 2.4 * ppm);
      // Center the diagonal phase so opposite edges remain visually balanced.
      const centerK = g.w / 2 - g.h / 2;
      const extent = g.w + g.h;
      const count = Math.ceil(extent / step) + 2;
      for (let n = -count; n <= count; n++) {
        const k = centerK + n * step;
        context.beginPath();
        context.moveTo(g.x + k, g.y + g.h);
        context.lineTo(g.x + k + g.h, g.y);
        context.stroke();
      }
    } else if (frame.pattern === 'checker') {
      const cell = Math.max(1.2 * ppm, Math.min(size, g.fw * 0.72));
      const step = Math.max(cell, cell + gap * 0.25);
      const cx = g.x + g.w / 2;
      const cy = g.y + g.h / 2;
      const startX = cx - Math.ceil(g.w / step / 2) * step;
      const startY = cy - Math.ceil(g.h / step / 2) * step;
      let row = 0;
      for (let y = startY; y < g.y + g.h; y += step, row++) {
        let col = 0;
        for (let x = startX; x < g.x + g.w; x += step, col++) {
          context.fillStyle = (row + col) % 2 ? p1 : p2;
          context.fillRect(x, y, cell, cell);
        }
      }
    } else if (frame.pattern === 'diamonds') {
      drawRegularEdgeSymbols(context, g, ppm, frame, function(x, y, s, i) {
        drawDiamond(context, x, y, s, i % 2 ? p2 : p1, 0);
      });
    } else if (frame.pattern === 'waves' || frame.pattern === 'zigzag') {
      const safeSize = Math.min(size, g.fw * 0.72);
      const stepY = Math.max(safeSize + gap, 2.5 * ppm);
      const amp = Math.max(0.45 * ppm, Math.min(safeSize * 0.3, g.fw * 0.28));
      const waveLen = Math.max(3 * ppm, (safeSize + gap) * 1.6);
      context.strokeStyle = p1;
      context.lineWidth = Math.max(0.55 * ppm, Math.min(safeSize * 0.18, g.fw * 0.28));
      const ys = linePositions(g.y + g.fw * 0.5, g.y + g.h - g.fw * 0.5, stepY);
      ys.forEach(function(y, row) {
        context.beginPath();
        context.moveTo(g.x, y);
        if (frame.pattern === 'zigzag') {
          let up = true;
          for (let x = g.x + waveLen / 2; x <= g.x + g.w + waveLen / 2; x += waveLen / 2) {
            context.lineTo(x, y + (up ? -amp : amp));
            up = !up;
          }
        } else {
          for (let x = g.x; x <= g.x + g.w; x += waveLen) {
            context.quadraticCurveTo(x + waveLen * 0.25, y - amp, x + waveLen * 0.5, y);
            context.quadraticCurveTo(x + waveLen * 0.75, y + amp, x + waveLen, y);
          }
        }
        context.strokeStyle = row % 2 ? p2 : p1;
        context.stroke();
      });
    } else if (frame.pattern === 'confetti' || frame.pattern === 'sprinkles') {
      const areaMm = (g.w / ppm) * (g.h / ppm);
      const baseCount = Math.max(18, Math.round(areaMm / Math.max(4, Math.pow(frame.patternSize + frame.patternGap, 2)) * 1.8));
      const count = Math.min(900, baseCount);
      for (let i = 0; i < count; i++) {
        const rx = g.x + hashNoise(i * 3 + 1, seed) * g.w;
        const ry = g.y + hashNoise(i * 3 + 2, seed + 17) * g.h;
        const variation = 1 + (hashNoise(i, seed + 29) - 0.5) * random * 0.9;
        const ss = size * variation;
        const angle = hashNoise(i, seed + 47) * Math.PI * (random > 0 ? 2 : 0.5);
        context.save();
        context.translate(rx, ry);
        context.rotate(angle);
        context.fillStyle = i % 3 === 0 ? p2 : p1;
        if (frame.pattern === 'confetti') {
          context.fillRect(-ss * 0.48, -ss * 0.18, ss * 0.96, ss * 0.36);
        } else {
          context.strokeStyle = i % 3 === 0 ? p2 : p1;
          context.lineWidth = Math.max(0.45 * ppm, ss * 0.22);
          context.beginPath();
          context.moveTo(-ss * 0.45, 0);
          context.lineTo(ss * 0.45, 0);
          context.stroke();
        }
        context.restore();
      }
    } else if (frame.pattern === 'crayon') {
      const count = Math.max(28, Math.round((g.w + g.h) / Math.max(1, size + gap) * 3));
      for (let i = 0; i < count; i++) {
        const rx = g.x + hashNoise(i, seed + 59) * g.w;
        const ry = g.y + hashNoise(i, seed + 61) * g.h;
        const len = size * (1.2 + hashNoise(i, seed + 67) * (1 + random * 2.2));
        const angle = (hashNoise(i, seed + 71) - 0.5) * Math.PI * (0.18 + random * 1.6);
        context.save();
        context.translate(rx, ry);
        context.rotate(angle);
        context.strokeStyle = i % 2 ? p1 : p2;
        context.globalAlpha = 0.45 + random * 0.35;
        context.lineWidth = Math.max(0.35 * ppm, size * (0.12 + hashNoise(i, seed + 73) * 0.18));
        context.beginPath();
        context.moveTo(-len / 2, 0);
        context.lineTo(len / 2, 0);
        context.stroke();
        context.restore();
      }
      context.globalAlpha = 1;
    }

    context.restore();
  }

  function drawTexture(context, g, ppm, frame) {
    const strength = frame.textureStrength;
    if (!strength || frame.texture === 'none') return;
    const areaMm = (g.w / ppm) * (g.h / ppm);
    const count = Math.min(1400, Math.round(areaMm * (frame.texture === 'paper' ? 0.08 : 0.18)));
    context.save();
    for (let i = 0; i < count; i++) {
      const rx = g.x + hashNoise(i, frame.patternSeed + 101) * g.w;
      const ry = g.y + hashNoise(i, frame.patternSeed + 151) * g.h;
      const alpha = strength * (frame.texture === 'soft' ? 0.04 : 0.09);
      context.fillStyle = 'rgba(70,55,45,' + alpha + ')';
      const dot = (frame.texture === 'paper' ? 0.15 : 0.22 + hashNoise(i, frame.patternSeed + 177) * 0.35) * ppm;
      context.beginPath();
      context.arc(rx, ry, Math.max(0.4, dot), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawFrame(context, slot, r, ppm) {
    const frame = slot.frame;

    clipFrameRing(context, r, ppm, frame, function(g) {
      context.fillStyle = frame.backgroundColor;
      context.fillRect(g.x, g.y, g.w, g.h);
      drawPattern(context, g, ppm, frame);
      drawTexture(context, g, ppm, frame);
    });

    const x = r.x * ppm;
    const y = r.y * ppm;
    const w = r.w * ppm;
    const h = r.h * ppm;
    const radius = frame.radius * ppm;

    context.save();
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = frame.lineColor;

    if (frame.style === 'double') {
      context.lineWidth = Math.max(1, 0.75 * ppm);
      context.beginPath();
      roundedRectPath(context, x + 1.1 * ppm, y + 1.1 * ppm, w - 2.2 * ppm, h - 2.2 * ppm, Math.max(0, radius - 1.1 * ppm));
      context.stroke();
      const inset = Math.max(2.1, frame.width - 1.15) * ppm;
      context.beginPath();
      roundedRectPath(context, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(0, radius - inset));
      context.stroke();
    } else if (frame.style === 'dashed') {
      context.lineWidth = Math.max(1.1, 0.9 * ppm);
      context.setLineDash([3 * ppm, 2 * ppm]);
      context.beginPath();
      roundedRectPath(context, x + 1.15 * ppm, y + 1.15 * ppm, w - 2.3 * ppm, h - 2.3 * ppm, Math.max(0, radius - 1.15 * ppm));
      context.stroke();
    } else if (frame.style === 'scallop') {
      context.fillStyle = frame.lineColor;
      const spacing = Math.max(3.2, frame.width * 0.9) * ppm;
      const rad = Math.max(1.1, frame.width * 0.28) * ppm;
      for (let xx = x + radius + spacing / 2; xx < x + w - radius; xx += spacing) {
        context.beginPath();
        context.arc(xx, y + rad * 0.85, rad, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(xx, y + h - rad * 0.85, rad, 0, Math.PI * 2);
        context.fill();
      }
      for (let yy = y + radius + spacing / 2; yy < y + h - radius; yy += spacing) {
        context.beginPath();
        context.arc(x + rad * 0.85, yy, rad, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(x + w - rad * 0.85, yy, rad, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
  }

  function fontStack(family) {
    if (!family || family === 'system-ui') return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    return '"' + String(family).replace(/["\\]/g, '') + '", sans-serif';
  }

  function fitTextSize(context, text, desiredSize, maxWidth, weight, family) {
    let size = desiredSize;
    context.font = weight + ' ' + size + 'px ' + fontStack(family);
    const measured = context.measureText(text).width;
    if (measured > maxWidth && measured > 0) size *= maxWidth / measured;
    return Math.max(desiredSize * 0.42, size);
  }

  function drawTextLine(context, text, cx, cy, desiredSize, maxWidth, slot, ppm) {
    if (!text) return;
    const size = fitTextSize(context, text, desiredSize, maxWidth, slot.textWeight, slot.fontFamily);
    context.font = slot.textWeight + ' ' + size + 'px ' + fontStack(slot.fontFamily);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';

    if (slot.textOutline) {
      context.strokeStyle = slot.outlineColor;
      context.lineWidth = Math.max(1, 0.45 * ppm);
      context.strokeText(text, cx, cy);
    }
    context.fillStyle = slot.textColor;
    context.fillText(text, cx, cy);
  }

  function drawTextLayer(context, slot, r, ppm) {
    const primary = (slot.nameText || '').trim();
    const secondary = (slot.secondaryText || '').trim();
    if (!primary && !secondary) return;

    const frame = slot.frame;
    const x = r.photoX * ppm;
    const y = r.photoY * ppm;
    const w = r.photoW * ppm;
    const h = r.photoH * ppm;
    const innerRadius = Math.max(0, frame.radius - frame.width * 0.65) * ppm;
    const baseSize = Math.max(3, slot.textSize) * ppm;
    const secondSize = primary ? Math.max(2.6 * ppm, baseSize * 0.48) : Math.max(2.8 * ppm, baseSize * 0.68);
    const gap = secondary && primary ? 1.2 * ppm : 0;
    const groupH = (primary ? baseSize : 0) + gap + (secondary ? secondSize : 0);
    const pad = 4 * ppm;

    let top;
    if (slot.textPosition === 'top') top = y + pad;
    else if (slot.textPosition === 'center') top = y + (h - groupH) / 2;
    else top = y + h - groupH - pad;

    const cx = x + w / 2 + slot.textOffsetX * ppm;
    top += slot.textOffsetY * ppm;

    context.save();
    context.beginPath();
    roundedRectPath(context, x, y, w, h, innerRadius);
    context.clip();

    let cursor = top;
    if (primary) {
      drawTextLine(context, primary, cx, cursor + baseSize / 2, baseSize, w - pad * 2, slot, ppm);
      cursor += baseSize + gap;
    }
    if (secondary) {
      drawTextLine(context, secondary, cx, cursor + secondSize / 2, secondSize, w - pad * 2, slot, ppm);
    }
    context.restore();
  }

  function drawGuide(context, r, ppm) {
    const style = state.guide.style;
    if (style === 'none') return;
    const offset = state.guide.offset * ppm;
    const x = r.x * ppm - offset;
    const y = r.y * ppm - offset;
    const w = r.w * ppm + offset * 2;
    const h = r.h * ppm + offset * 2;
    context.save();
    context.strokeStyle = state.guide.color;
    context.lineWidth = Math.max(0.7, 0.22 * ppm);

    if (style === 'dash' || style === 'both') {
      context.setLineDash([2 * ppm, 1.5 * ppm]);
      context.strokeRect(x, y, w, h);
      context.setLineDash([]);
    } else if (style === 'solid') {
      context.strokeRect(x, y, w, h);
    }

    if (style === 'crop' || style === 'both') {
      const len = 5 * ppm;
      const gap = 1 * ppm;
      const corners = [
        [x, y, -1, -1],
        [x + w, y, 1, -1],
        [x, y + h, -1, 1],
        [x + w, y + h, 1, 1]
      ];
      corners.forEach(function(corner) {
        const cx = corner[0], cy = corner[1], sx = corner[2], sy = corner[3];
        context.beginPath();
        context.moveTo(cx + sx * gap, cy);
        context.lineTo(cx + sx * (gap + len), cy);
        context.stroke();
        context.beginPath();
        context.moveTo(cx, cy + sy * gap);
        context.lineTo(cx, cy + sy * (gap + len));
        context.stroke();
      });
    }

    context.restore();
  }

  function drawSafeArea(context, r, ppm) {
    if (!state.guide.safeArea) return;
    const pad = 3 * ppm;
    context.save();
    context.strokeStyle = 'rgba(255,82,120,.55)';
    context.lineWidth = Math.max(0.7, 0.2 * ppm);
    context.setLineDash([1.3 * ppm, 1.3 * ppm]);
    context.strokeRect(r.photoX * ppm + pad, r.photoY * ppm + pad, r.photoW * ppm - pad * 2, r.photoH * ppm - pad * 2);
    context.restore();
  }

  function renderTo(target, ppm, showSelection) {
    const page = getPageSize();
    target.width = Math.round(page.w * ppm);
    target.height = Math.round(page.h * ppm);
    const c = target.getContext('2d');
    c.clearRect(0, 0, target.width, target.height);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, target.width, target.height);

    const rects = getLayoutRects();
    rects.forEach(function(r, i) {
      const slot = state.slots[i];
      drawPhoto(c, slot, r, ppm);
      drawFrame(c, slot, r, ppm);
      drawTextLayer(c, slot, r, ppm);
      drawSafeArea(c, r, ppm);
      drawGuide(c, r, ppm);

      if (showSelection && i === state.activeSlot) {
        c.save();
        c.strokeStyle = '#ff5c7b';
        c.lineWidth = Math.max(1.3, 0.4 * ppm);
        c.setLineDash([1.2 * ppm, 1.2 * ppm]);
        c.beginPath();
        roundedRectPath(
          c,
          (r.x - 0.8) * ppm,
          (r.y - 0.8) * ppm,
          (r.w + 1.6) * ppm,
          (r.h + 1.6) * ppm,
          Math.max(0, (state.slots[i].frame.radius + 0.8) * ppm)
        );
        c.stroke();
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
    const rects = getLayoutRects();
    const overflow = rects.some(function(r) {
      return r.x - guidePad < 0 ||
        r.y - guidePad < 0 ||
        r.x + r.w + guidePad > page.w ||
        r.y + r.h + guidePad > page.h;
    });

    const widths = rects.map(function(r, i) {
      return state.slots[i].frame.width;
    }).join(' / ');

    const status = el('statusText');
    status.textContent = state.layout + '장 배치 · ' + state.photoW + ' × ' + state.photoH + ' mm · 프레임 ' + widths + ' mm' + (overflow ? ' · ⚠ A4 영역 초과' : '');
    status.style.color = overflow ? '#cf425f' : '';
    el('activeSlotBadge').textContent = (state.activeSlot + 1) + '번 사진';
    el('frameSlotBadge').textContent = (state.activeSlot + 1) + '번 프레임';
  }

  function renderSlotTabs() {
    const wrap = el('slotTabs');
    wrap.innerHTML = '';
    for (let i = 0; i < state.layout; i++) {
      const slot = state.slots[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (i + 1) + (slot.image ? ' ✓' : '');
      b.className = i === state.activeSlot ? 'active' : '';
      b.title = slot.imageName || (i + 1) + '번 사진';
      b.addEventListener('click', function() {
        state.activeSlot = i;
        renderSlotTabs();
        syncControls();
        render();
      });
      wrap.appendChild(b);
    }
  }

  function syncPhotoControls() {
    const slot = state.slots[state.activeSlot];
    el('zoomRange').value = slot.zoom;
    el('zoomValue').textContent = Number(slot.zoom).toFixed(2) + '×';
    el('rotateRange').value = slot.rotation;
    el('rotateValue').textContent = Number(slot.rotation).toFixed(1).replace('.0', '') + '°';
    el('flipXBtn').classList.toggle('is-active', !!slot.flipX);
    el('flipXBtn').textContent = slot.flipX ? '좌우 반전 ✓' : '좌우 반전';
  }

  function syncFrameControls() {
    const frame = state.slots[state.activeSlot].frame;
    el('frameStyle').value = frame.style;
    el('frameColor').value = frame.backgroundColor;
    el('frameLineColor').value = frame.lineColor;
    el('frameWidthRange').value = frame.width;
    el('frameWidthValue').textContent = frame.width + ' mm';
    el('radiusRange').value = frame.radius;
    el('radiusValue').textContent = frame.radius + ' mm';
    el('patternType').value = frame.pattern;
    el('patternColor1').value = frame.patternColor1;
    el('patternColor2').value = frame.patternColor2;
    el('patternSizeRange').value = frame.patternSize;
    el('patternSizeValue').textContent = frame.patternSize + ' mm';
    el('patternGapRange').value = frame.patternGap;
    el('patternGapValue').textContent = frame.patternGap + ' mm';
    el('patternRandomRange').value = frame.patternRandom;
    el('patternRandomValue').textContent = Math.round(frame.patternRandom * 100) + '%';
    el('patternSeed').value = frame.patternSeed;
    el('textureSelect').value = frame.texture;
    el('textureRange').value = frame.textureStrength;
    el('textureValue').textContent = Math.round(frame.textureStrength * 100) + '%';
    document.querySelectorAll('.preset').forEach(function(node, i) {
      node.classList.toggle('active', i === frame.presetIndex);
    });
  }

  function syncTextControls() {
    const slot = state.slots[state.activeSlot];
    el('nameText').value = slot.nameText || '';
    el('secondaryText').value = slot.secondaryText || '';
    el('textSize').value = slot.textSize;
    el('textColor').value = slot.textColor;
    el('textPosition').value = slot.textPosition;
    el('textOffsetX').value = slot.textOffsetX;
    el('textOffsetY').value = slot.textOffsetY;
    el('textWeight').value = String(slot.textWeight);
    el('textOutlineToggle').checked = !!slot.textOutline;
    el('outlineColor').value = slot.outlineColor;
    ensureFontOption(slot.fontFamily, slot.fontLabel || slot.fontFamily);
    el('fontSelect').value = slot.fontFamily;
  }

  function syncControls() {
    syncPhotoControls();
    syncFrameControls();
    syncTextControls();
    updateStatus();
  }

  function markFrameCustom() {
    state.slots[state.activeSlot].frame.presetIndex = -1;
    document.querySelectorAll('.preset').forEach(function(node) {
      node.classList.remove('active');
    });
  }

  function applyPreset(index) {
    const p = PRESETS[index];
    const frame = state.slots[state.activeSlot].frame;
    frame.style = p.style;
    frame.backgroundColor = p.bg;
    frame.lineColor = p.line;
    frame.pattern = p.pattern;
    frame.patternColor1 = p.p1;
    frame.patternColor2 = p.p2;
    frame.patternSize = p.size;
    frame.patternGap = p.gap;
    frame.patternRandom = p.random;
    frame.texture = p.texture;
    frame.radius = p.radius;
    frame.presetIndex = index;
    syncFrameControls();
    render();
  }

  function buildPresets() {
    const wrap = el('presetGrid');
    wrap.innerHTML = '';
    PRESETS.forEach(function(p, index) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset' + (index === 0 ? ' active' : '');
      b.style.setProperty('--c1', p.line);
      b.style.setProperty('--c2', p.bg);
      b.innerHTML = '<span class="preset-swatch"></span><span>' + p.name + '</span>';
      b.addEventListener('click', function() {
        applyPreset(index);
      });
      wrap.appendChild(b);
    });
  }

  function ensureFontOption(value, label) {
    const select = el('fontSelect');
    const exists = Array.from(select.options).some(function(option) {
      return option.value === value;
    });
    if (!exists) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label || value;
      select.appendChild(option);
    }
  }

  function setFontStatus(message, stateName) {
    const status = el('fontStatus');
    status.textContent = message;
    if (stateName) status.dataset.state = stateName;
    else delete status.dataset.state;
  }

  async function scanSystemFonts() {
    if (typeof window.queryLocalFonts !== 'function') {
      setFontStatus('이 브라우저는 설치 폰트 목록 검색을 지원하지 않습니다. 폰트 파일 불러오기를 사용해 주세요.', 'warn');
      return;
    }
    try {
      setFontStatus('설치된 폰트를 확인하는 중입니다…');
      const fonts = await window.queryLocalFonts();
      const families = Array.from(new Set(fonts.map(function(font) {
        return font.family;
      }).filter(Boolean))).sort(function(a, b) {
        return a.localeCompare(b, 'ko');
      });
      families.forEach(function(family) {
        ensureFontOption(family, family);
      });
      setFontStatus('설치 폰트 ' + families.length + '개를 찾았습니다. 폰트 목록에서 선택하세요.', 'ok');
    } catch (error) {
      const denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setFontStatus(
        denied ? '설치 폰트 접근 권한이 허용되지 않았습니다. 폰트 파일을 직접 불러올 수 있습니다.' : '설치 폰트를 확인하지 못했습니다. 폰트 파일을 직접 불러와 주세요.',
        'error'
      );
    }
  }

  async function loadFontFile(file) {
    if (!file) return;
    try {
      setFontStatus('폰트 파일을 불러오는 중입니다…');
      const buffer = await file.arrayBuffer();
      const family = 'maxVFX_UserFont_' + Date.now();
      const face = new FontFace(family, buffer);
      await face.load();
      document.fonts.add(face);
      const label = file.name.replace(/\.[^.]+$/, '') || '사용자 폰트';
      ensureFontOption(family, label + ' · 불러옴');
      const slot = state.slots[state.activeSlot];
      slot.fontFamily = family;
      slot.fontLabel = label + ' · 불러옴';
      el('fontSelect').value = family;
      setFontStatus('“' + label + '” 폰트를 적용했습니다. 현재 브라우저 세션과 PNG 출력에 사용됩니다.', 'ok');
      render();
    } catch (error) {
      setFontStatus('폰트를 읽지 못했습니다. TTF, OTF, WOFF, WOFF2 파일인지 확인해 주세요.', 'error');
    }
  }

  function loadImage(file) {
    if (!file) return;
    const slot = state.slots[state.activeSlot];
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function() {
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
    img.onerror = function() {
      URL.revokeObjectURL(url);
      alert('이미지를 불러오지 못했습니다. JPG, PNG, WebP 등 일반 이미지 파일을 사용해 주세요.');
    };
    img.src = url;
  }

  function exportPNG() {
    const exportCanvas = document.createElement('canvas');
    renderTo(exportCanvas, EXPORT_DPI / MM_PER_INCH, false);
    exportCanvas.toBlob(function(blob) {
      if (!blob) return;
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      link.download = 'A4_Photo_Frame_' + state.layout + 'up_' + stamp + '.png';
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function() {
        URL.revokeObjectURL(link.href);
      }, 1500);
    }, 'image/png');
  }

  function setLayout(layout) {
    state.layout = Math.max(1, Math.min(2, Number(layout) || 1));
    state.activeSlot = Math.min(state.activeSlot, state.layout - 1);
    document.querySelectorAll('#layoutButtons button').forEach(function(b) {
      b.classList.toggle('active', Number(b.dataset.layout) === state.layout);
    });
    renderSlotTabs();
    syncControls();
    render();
  }

  function resetAll() {
    if (!confirm('현재 작업을 초기화할까요?')) return;

    state.slots.forEach(function(s) {
      if (s.imageUrl) URL.revokeObjectURL(s.imageUrl);
    });

    state.orientation = 'portrait';
    state.layout = 1;
    state.photoW = 89;
    state.photoH = 119;
    state.activeSlot = 0;
    state.guide = { style: 'both', color: '#8a8a8a', offset: 2, safeArea: false };
    state.slots = [createSlot(0), createSlot(1)];

    el('orientationSelect').value = 'portrait';
    el('photoWidth').value = 89;
    el('photoHeight').value = 119;
    el('guideStyle').value = 'both';
    el('guideColor').value = '#8a8a8a';
    el('guideOffset').value = 2;
    el('safeAreaToggle').checked = false;
    setFontStatus('설치 폰트 검색은 지원되는 Chrome/Edge에서 사용할 수 있습니다. 폰트 파일은 브라우저 안에서만 사용됩니다.');
    setLayout(1);
  }

  function pointerToMm(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * canvas.width / rect.width / PREVIEW_PX_PER_MM,
      y: (ev.clientY - rect.top) * canvas.height / rect.height / PREVIEW_PX_PER_MM
    };
  }

  function hitPhoto(p) {
    const rects = getLayoutRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (p.x >= r.photoX && p.x <= r.photoX + r.photoW && p.y >= r.photoY && p.y <= r.photoY + r.photoH) {
        return { i: i, r: r };
      }
    }
    return null;
  }

  function hitFrame(p) {
    const rects = getLayoutRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      const inOuter = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      const inPhoto = p.x >= r.photoX && p.x <= r.photoX + r.photoW && p.y >= r.photoY && p.y <= r.photoY + r.photoH;
      if (inOuter && !inPhoto) return { i: i, r: r };
    }
    return null;
  }

  function activateSlot(index) {
    if (index < 0 || index >= state.layout) return;
    state.activeSlot = index;
    renderSlotTabs();
    syncControls();
    render();
  }

  function focusFrameEditor() {
    const section = el('framePatternSection');
    if (!section) return;
    section.classList.remove('frame-focus');
    void section.offsetWidth;
    section.classList.add('frame-focus');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(function() {
      section.classList.remove('frame-focus');
    }, 1200);
  }

  canvas.addEventListener('pointerdown', function(ev) {
    const p = pointerToMm(ev);
    const photoHit = hitPhoto(p);
    if (photoHit) {
      activateSlot(photoHit.i);
      const slot = state.slots[photoHit.i];
      state.drag = {
        slot: photoHit.i,
        startX: p.x,
        startY: p.y,
        offsetX: slot.offsetX,
        offsetY: slot.offsetY
      };
      canvas.setPointerCapture(ev.pointerId);
      return;
    }

    const frameHit = hitFrame(p);
    if (frameHit) {
      activateSlot(frameHit.i);
      focusFrameEditor();
    }
  });

  canvas.addEventListener('pointermove', function(ev) {
    const p = pointerToMm(ev);

    if (state.drag) {
      const slot = state.slots[state.drag.slot];
      slot.offsetX = state.drag.offsetX + (p.x - state.drag.startX);
      slot.offsetY = state.drag.offsetY + (p.y - state.drag.startY);
      canvas.style.cursor = 'grabbing';
      render();
      return;
    }

    if (hitPhoto(p)) canvas.style.cursor = 'grab';
    else if (hitFrame(p)) canvas.style.cursor = 'pointer';
    else canvas.style.cursor = 'default';
  });

  canvas.addEventListener('pointerup', function(ev) {
    state.drag = null;
    const p = pointerToMm(ev);
    if (hitPhoto(p)) canvas.style.cursor = 'grab';
    else if (hitFrame(p)) canvas.style.cursor = 'pointer';
    else canvas.style.cursor = 'default';
  });
  canvas.addEventListener('pointercancel', function() {
    state.drag = null;
    canvas.style.cursor = 'default';
  });
  canvas.addEventListener('pointerleave', function() {
    if (!state.drag) canvas.style.cursor = 'default';
  });

  document.querySelectorAll('#layoutButtons button').forEach(function(b) {
    b.addEventListener('click', function() {
      setLayout(b.dataset.layout);
    });
  });

  el('orientationSelect').addEventListener('change', function(e) {
    state.orientation = e.target.value;
    render();
  });
  el('photoWidth').addEventListener('input', function(e) {
    state.photoW = Math.max(30, Number(e.target.value) || 89);
    render();
  });
  el('photoHeight').addEventListener('input', function(e) {
    state.photoH = Math.max(30, Number(e.target.value) || 119);
    render();
  });

  el('imageInput').addEventListener('change', function(e) {
    loadImage(e.target.files && e.target.files[0]);
    e.target.value = '';
  });
  el('zoomRange').addEventListener('input', function(e) {
    const s = state.slots[state.activeSlot];
    s.zoom = Number(e.target.value);
    el('zoomValue').textContent = s.zoom.toFixed(2) + '×';
    render();
  });
  el('rotateRange').addEventListener('input', function(e) {
    const s = state.slots[state.activeSlot];
    s.rotation = Number(e.target.value);
    el('rotateValue').textContent = s.rotation.toFixed(1).replace('.0', '') + '°';
    render();
  });
  el('fitBtn').addEventListener('click', function() {
    const s = state.slots[state.activeSlot];
    s.zoom = 1;
    s.rotation = 0;
    s.offsetX = 0;
    s.offsetY = 0;
    syncPhotoControls();
    render();
  });
  el('centerBtn').addEventListener('click', function() {
    const s = state.slots[state.activeSlot];
    s.offsetX = 0;
    s.offsetY = 0;
    render();
  });
  el('flipXBtn').addEventListener('click', function() {
    const s = state.slots[state.activeSlot];
    s.flipX = !s.flipX;
    syncPhotoControls();
    render();
  });
  el('copyPhotoBtn').addEventListener('click', function() {
    const src = state.slots[state.activeSlot];
    if (!src.image) {
      alert('먼저 사진을 불러와 주세요.');
      return;
    }
    const target = state.activeSlot === 0 ? 1 : 0;
    const dst = state.slots[target];
    dst.image = src.image;
    dst.imageUrl = null;
    dst.imageName = src.imageName;
    dst.zoom = src.zoom;
    dst.rotation = src.rotation;
    dst.offsetX = src.offsetX;
    dst.offsetY = src.offsetY;
    dst.flipX = src.flipX;
    renderSlotTabs();
    render();
  });

  el('frameStyle').addEventListener('change', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.style = e.target.value;
    markFrameCustom();
    render();
  });
  el('frameColor').addEventListener('input', function(e) {
    state.slots[state.activeSlot].frame.backgroundColor = e.target.value;
    markFrameCustom();
    render();
  });
  el('frameLineColor').addEventListener('input', function(e) {
    state.slots[state.activeSlot].frame.lineColor = e.target.value;
    markFrameCustom();
    render();
  });
  el('frameWidthRange').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.width = Number(e.target.value);
    el('frameWidthValue').textContent = frame.width + ' mm';
    markFrameCustom();
    render();
  });
  el('radiusRange').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.radius = Number(e.target.value);
    el('radiusValue').textContent = frame.radius + ' mm';
    markFrameCustom();
    render();
  });

  el('patternType').addEventListener('change', function(e) {
    state.slots[state.activeSlot].frame.pattern = e.target.value;
    markFrameCustom();
    render();
  });
  el('patternColor1').addEventListener('input', function(e) {
    state.slots[state.activeSlot].frame.patternColor1 = e.target.value;
    markFrameCustom();
    render();
  });
  el('patternColor2').addEventListener('input', function(e) {
    state.slots[state.activeSlot].frame.patternColor2 = e.target.value;
    markFrameCustom();
    render();
  });
  el('patternSizeRange').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.patternSize = Number(e.target.value);
    el('patternSizeValue').textContent = frame.patternSize + ' mm';
    markFrameCustom();
    render();
  });
  el('patternGapRange').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.patternGap = Number(e.target.value);
    el('patternGapValue').textContent = frame.patternGap + ' mm';
    markFrameCustom();
    render();
  });
  el('patternRandomRange').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.patternRandom = Number(e.target.value);
    el('patternRandomValue').textContent = Math.round(frame.patternRandom * 100) + '%';
    markFrameCustom();
    render();
  });
  el('patternSeed').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.patternSeed = Math.max(1, Math.min(99999, Number(e.target.value) || 1));
    markFrameCustom();
    render();
  });
  el('randomSeedBtn').addEventListener('click', function() {
    const frame = state.slots[state.activeSlot].frame;
    frame.patternSeed = 1 + Math.floor(Math.random() * 99999);
    el('patternSeed').value = frame.patternSeed;
    markFrameCustom();
    render();
  });
  el('textureSelect').addEventListener('change', function(e) {
    state.slots[state.activeSlot].frame.texture = e.target.value;
    markFrameCustom();
    render();
  });
  el('textureRange').addEventListener('input', function(e) {
    const frame = state.slots[state.activeSlot].frame;
    frame.textureStrength = Number(e.target.value);
    el('textureValue').textContent = Math.round(frame.textureStrength * 100) + '%';
    markFrameCustom();
    render();
  });
  el('copyFrameBtn').addEventListener('click', function() {
    const target = state.activeSlot === 0 ? 1 : 0;
    state.slots[target].frame = JSON.parse(JSON.stringify(state.slots[state.activeSlot].frame));
    if (state.layout === 1) {
      alert('현재 프레임 설정을 2번 슬롯에도 복사했습니다. 2장 배치로 전환하면 확인할 수 있습니다.');
    }
    render();
  });

  el('nameText').addEventListener('input', function(e) {
    state.slots[state.activeSlot].nameText = e.target.value;
    render();
  });
  el('secondaryText').addEventListener('input', function(e) {
    state.slots[state.activeSlot].secondaryText = e.target.value;
    render();
  });
  el('textSize').addEventListener('input', function(e) {
    state.slots[state.activeSlot].textSize = Math.min(24, Math.max(3, Number(e.target.value) || 8));
    render();
  });
  el('textColor').addEventListener('input', function(e) {
    state.slots[state.activeSlot].textColor = e.target.value;
    render();
  });
  el('textPosition').addEventListener('change', function(e) {
    state.slots[state.activeSlot].textPosition = e.target.value;
    render();
  });
  el('textOffsetX').addEventListener('input', function(e) {
    state.slots[state.activeSlot].textOffsetX = Math.min(40, Math.max(-40, Number(e.target.value) || 0));
    render();
  });
  el('textOffsetY').addEventListener('input', function(e) {
    state.slots[state.activeSlot].textOffsetY = Math.min(40, Math.max(-40, Number(e.target.value) || 0));
    render();
  });
  el('textWeight').addEventListener('change', function(e) {
    state.slots[state.activeSlot].textWeight = Number(e.target.value) || 700;
    render();
  });
  el('textOutlineToggle').addEventListener('change', function(e) {
    state.slots[state.activeSlot].textOutline = e.target.checked;
    render();
  });
  el('outlineColor').addEventListener('input', function(e) {
    state.slots[state.activeSlot].outlineColor = e.target.value;
    render();
  });
  el('fontSelect').addEventListener('change', function(e) {
    const slot = state.slots[state.activeSlot];
    slot.fontFamily = e.target.value;
    slot.fontLabel = e.target.options[e.target.selectedIndex] ? e.target.options[e.target.selectedIndex].textContent : e.target.value;
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 32px ' + fontStack(slot.fontFamily), '가나다 ABC').finally(render);
    } else {
      render();
    }
  });
  el('scanFontsBtn').addEventListener('click', scanSystemFonts);
  el('fontFileInput').addEventListener('change', function(e) {
    loadFontFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  });
  el('copyTextBtn').addEventListener('click', function() {
    const src = state.slots[state.activeSlot];
    const dst = state.slots[state.activeSlot === 0 ? 1 : 0];
    dst.nameText = src.nameText;
    dst.secondaryText = src.secondaryText;
    dst.fontFamily = src.fontFamily;
    dst.fontLabel = src.fontLabel;
    dst.textSize = src.textSize;
    dst.textColor = src.textColor;
    dst.textPosition = src.textPosition;
    dst.textOffsetX = src.textOffsetX;
    dst.textOffsetY = src.textOffsetY;
    dst.textWeight = src.textWeight;
    dst.textOutline = src.textOutline;
    dst.outlineColor = src.outlineColor;
    render();
  });

  el('guideStyle').addEventListener('change', function(e) {
    state.guide.style = e.target.value;
    render();
  });
  el('guideColor').addEventListener('input', function(e) {
    state.guide.color = e.target.value;
    render();
  });
  el('guideOffset').addEventListener('input', function(e) {
    state.guide.offset = Math.max(0, Number(e.target.value) || 0);
    render();
  });
  el('safeAreaToggle').addEventListener('change', function(e) {
    state.guide.safeArea = e.target.checked;
    render();
  });

  el('exportBtn').addEventListener('click', exportPNG);
  el('printBtn').addEventListener('click', function() {
    window.print();
  });
  el('resetBtn').addEventListener('click', resetAll);

  window.addEventListener('beforeprint', function() {
    const page = getPageSize();
    renderTo(canvas, PREVIEW_PX_PER_MM, false);
    const style = document.createElement('style');
    style.id = 'dynamicPrintStyle';
    style.textContent = '@page{size:A4 ' + state.orientation + ';margin:0} @media print{#previewCanvas{width:' + page.w + 'mm!important;height:' + page.h + 'mm!important}}';
    document.head.appendChild(style);
  });

  window.addEventListener('afterprint', function() {
    const style = document.getElementById('dynamicPrintStyle');
    if (style) style.remove();
    render();
  });

  buildPresets();
  renderSlotTabs();
  syncControls();
  render();
})();