// Vice Cover Studio — the cover renderer. Draws the whole poster onto a canvas
// at the exact export size: photo panels, gutters, colour grade, vignette and
// the bold caption lettering. No network, no libraries, plain Canvas 2D.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUT_NAMES = ['split', 'grid', 'strip'];
export const GRADE_NAMES = ['sunset', 'neon', 'dusk', 'clean'];

/** Panel rectangles for a layout, as fractions of the cover (x, y, w, h). */
export function layoutPanels(layout, gutter) {
  const g = gutter;
  if (layout === 'grid') {
    return [
      { x: 0, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
      { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.5 - g / 2 },
      { x: 0, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
      { x: 0.5 + g / 2, y: 0.5 + g / 2, w: 0.5 - g / 2, h: 0.5 - g / 2 },
    ];
  }
  if (layout === 'strip') {
    return [
      { x: 0, y: 0, w: 1, h: 0.64 - g / 2 },
      { x: 0, y: 0.64 + g / 2, w: 1 / 3 - (2 * g) / 3, h: 0.36 - g / 2 },
      { x: 1 / 3 + g / 3, y: 0.64 + g / 2, w: 1 / 3 - (2 * g) / 3, h: 0.36 - g / 2 },
      { x: 2 / 3 + (2 * g) / 3, y: 0.64 + g / 2, w: 1 / 3 - (2 * g) / 3, h: 0.36 - g / 2 },
    ];
  }
  // split: one hero panel left, two stacked panels right.
  return [
    { x: 0, y: 0, w: 0.62 - g / 2, h: 1 },
    { x: 0.62 + g / 2, y: 0, w: 0.38 - g / 2, h: 0.5 - g / 2 },
    { x: 0.62 + g / 2, y: 0.5 + g / 2, w: 0.38 - g / 2, h: 0.5 - g / 2 },
  ];
}

/** Which panel (index) holds the point (fx, fy) in fractions of the cover, or -1. */
export function panelAt(layout, fx, fy) {
  const panels = layoutPanels(layout, 0.006);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return -1;
}

/** How far a photo may be panned inside its panel, as a fraction of the panel. */
function panLimit(img, rect, zoom) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  return {
    ox: Math.max(0, (dw - rect.w) / 2 / rect.w),
    oy: Math.max(0, (dh - rect.h) / 2 / rect.h),
  };
}

function clampPan(img, rect, slot) {
  const lim = panLimit(img, rect, slot.zoom);
  slot.ox = Math.max(-lim.ox, Math.min(lim.ox, slot.ox));
  slot.oy = Math.max(-lim.oy, Math.min(lim.oy, slot.oy));
}

/** Draw one photo into its panel, cover-fit, zoomed and panned. */
function drawPanelPhoto(ctx, img, rect, slot) {
  clampPan(img, rect, slot);
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * slot.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + slot.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + slot.oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  // Thin dark frame so the panels read as a poster grid.
  ctx.save();
  ctx.strokeStyle = 'rgba(10, 6, 16, 0.9)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** The colour grade: translucent gradients laid over the whole cover. */
function drawGrade(ctx, grade, W, H) {
  if (grade === 'clean') return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255, 122, 24, 0)');
    g.addColorStop(0.55, 'rgba(255, 46, 136, 0.28)');
    g.addColorStop(1, 'rgba(255, 122, 24, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light';
    const warm = ctx.createLinearGradient(0, 0, W, H);
    warm.addColorStop(0, 'rgba(255, 190, 80, 0.25)');
    warm.addColorStop(1, 'rgba(255, 46, 136, 0.25)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'neon') {
    const top = ctx.createRadialGradient(W * 0.15, H * 0.1, 0, W * 0.15, H * 0.1, W * 0.7);
    top.addColorStop(0, 'rgba(57, 213, 255, 0.5)');
    top.addColorStop(1, 'rgba(57, 213, 255, 0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H);
    const bottom = ctx.createRadialGradient(W * 0.9, H * 0.95, 0, W * 0.9, H * 0.95, W * 0.75);
    bottom.addColorStop(0, 'rgba(255, 46, 136, 0.55)');
    bottom.addColorStop(1, 'rgba(255, 46, 136, 0)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, W, H);
  } else if (grade === 'dusk') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(122, 30, 92, 0.45)');
    g.addColorStop(0.6, 'rgba(43, 15, 61, 0.25)');
    g.addColorStop(1, 'rgba(57, 213, 255, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/** A soft dark edge so the caption sits on the art. */
function drawVignette(ctx, W, H) {
  ctx.save();
  const r = Math.hypot(W, H) / 2;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(8, 4, 14, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const shade = ctx.createLinearGradient(0, H * 0.62, 0, H);
  shade.addColorStop(0, 'rgba(8, 4, 14, 0)');
  shade.addColorStop(1, 'rgba(8, 4, 14, 0.6)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  ctx.restore();
}

/** The headline and subline, poster-style: big, tilted, outlined. */
function drawCaption(ctx, state, W, H) {
  const headline = (state.headline || '').trim().toUpperCase();
  const subline = (state.subline || '').trim().toUpperCase();
  if (!headline && !subline) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(W / 2, H * 0.87);
  ctx.rotate(-0.035);
  if (headline) {
    const size = H * 0.15 * state.headlineScale;
    ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    ctx.lineJoin = 'round';
    if (state.outline) {
      ctx.lineWidth = Math.max(4, size * 0.09);
      ctx.strokeStyle = '#0d0812';
      ctx.strokeText(headline, 0, 0);
    }
    ctx.fillStyle = state.headlineColor;
    ctx.fillText(headline, 0, 0);
  }
  if (subline) {
    const size = H * 0.042;
    ctx.font = `${size}px "Anton", "Arial Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.22)}px`; } catch { /* older canvas: no letter spacing */ }
    const y = H * 0.075;
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = '#0d0812';
    ctx.strokeText(subline, 0, y);
    ctx.fillStyle = '#ffd60a';
    ctx.fillText(subline, 0, y);
    // Short rules either side of the subline.
    const w = ctx.measureText(subline).width;
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 90, y);
    ctx.lineTo(-w / 2 - 24, y);
    ctx.moveTo(w / 2 + 24, y);
    ctx.lineTo(w / 2 + 90, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw the whole cover. `state` holds layout, grade, headline, subline,
 * headlineScale, headlineColor, outline, photos (entries { name, img }) and
 * slots (one { photo, zoom, ox, oy } per panel).
 */
export function renderCover(ctx, state, W, H) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0812';
  ctx.fillRect(0, 0, W, H);
  const panels = layoutPanels(state.layout, 0.006);
  const gradeFilter = state.grade === 'clean'
    ? 'none'
    : state.grade === 'neon'
      ? 'saturate(1.35) contrast(1.1)'
      : 'saturate(1.25) contrast(1.06)';
  ctx.filter = gradeFilter;
  panels.forEach((frac, i) => {
    const rect = { x: frac.x * W, y: frac.y * H, w: frac.w * W, h: frac.h * H };
    const slot = state.slots[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const entry = state.photos[slot.photo];
    const img = entry && entry.img ? entry.img : entry;
    if (img && img.naturalWidth > 0) {
      drawPanelPhoto(ctx, img, rect, slot);
    } else {
      // Empty panel: a sunset placeholder so the poster never looks broken.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#7a1e5c');
      g.addColorStop(0.6, '#ff2e88');
      g.addColorStop(1, '#ff7a18');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.max(14, rect.h * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Selected panel marker is drawn by the caller on the preview only.
  });
  ctx.filter = 'none';
  drawGrade(ctx, state.grade, W, H);
  drawVignette(ctx, W, H);
  drawCaption(ctx, state, W, H);
  ctx.restore();
}

/** The pixel size of the chosen export size. */
export function sizeOf(name) {
  return SIZES[name] ?? SIZES['1920x1080'];
}
