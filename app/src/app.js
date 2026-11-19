// Vice Cover Studio — the editor. Wires the controls to the cover renderer:
// photo uploads and samples, panel layout, caption, colour grade, export size
// and the PNG export. Photos are read on this machine only, never uploaded.

import { SIZES, layoutPanels, panelAt, renderCover, sizeOf } from './cover.js';

const $ = (id) => document.getElementById(id);

const preview = $('preview');
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');
const prevCtx = preview.getContext('2d');

const state = {
  layout: 'split',
  grade: 'sunset',
  size: '1920x1080',
  headline: 'SUNSET HEIST',
  subline: 'VICE COVER STUDIO',
  headlineScale: 1,
  headlineColor: '#ffffff',
  outline: true,
  photos: [], // { name, img } in load order
  slots: [], // one { photo, zoom, ox, oy } per panel of the current layout
  selected: 0,
  picked: 0,
};

function slotCount() {
  return layoutPanels(state.layout, 0.006).length;
}

function ensureSlots() {
  while (state.slots.length < slotCount()) {
    state.slots.push({ photo: state.slots.length % Math.max(1, state.photos.length), zoom: 1, ox: 0, oy: 0 });
  }
  state.slots.length = slotCount();
  state.selected = Math.min(state.selected, state.slots.length - 1);
}

/** Draw the cover at export size, then scale it into the preview canvas. */
function render() {
  ensureSlots();
  const [W, H] = sizeOf(state.size);
  offscreen.width = W;
  offscreen.height = H;
  renderCover(offCtx, state, W, H);
  const pw = 960;
  const ph = Math.round((960 * H) / W);
  preview.width = pw;
  preview.height = ph;
  prevCtx.clearRect(0, 0, pw, ph);
  prevCtx.drawImage(offscreen, 0, 0, pw, ph);
  // Selected panel outline, in preview coordinates.
  const fracs = layoutPanels(state.layout, 0.006);
  const sel = fracs[state.selected];
  if (sel) {
    prevCtx.save();
    prevCtx.strokeStyle = '#ffd60a';
    prevCtx.lineWidth = 3;
    prevCtx.setLineDash([10, 6]);
    prevCtx.strokeRect(sel.x * pw + 1, sel.y * ph + 1, sel.w * pw - 2, sel.h * ph - 2);
    prevCtx.restore();
  }
}

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ name, img });
    img.onerror = () => reject(new Error(`could not load ${name}`));
    img.src = src;
  });
}

async function addPhoto(src, name) {
  try {
    const photo = await loadImage(src, name);
    state.photos.push(photo);
    state.picked = state.photos.length - 1;
    buildTray();
    render();
  } catch (err) {
    console.error(err);
  }
}

function buildTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  if (state.photos.length === 0) {
    const span = document.createElement('span');
    span.className = 'empty';
    span.textContent = 'No photos yet — add one, or load a sample below.';
    tray.appendChild(span);
  }
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (i === state.picked) thumb.classList.add('picked');
    thumb.addEventListener('click', () => {
      state.picked = i;
      state.slots[state.selected].photo = i;
      buildTray();
      syncZoom();
      render();
    });
    tray.appendChild(thumb);
  });
  // Sample buttons, once.
  if (!tray.dataset.samples) {
    tray.dataset.samples = '1';
    for (const sample of ['boulevard', 'pier']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.textContent = `Sample: ${sample}`;
      btn.addEventListener('click', () => addPhoto(`samples/${sample}.jpg`, `${sample}.jpg`));
      tray.appendChild(btn);
    }
  }
}

function syncZoom() {
  $('zoomRange').value = String(state.slots[state.selected]?.zoom ?? 1);
}

function bindChoiceGroup(id, key) {
  $(id).addEventListener('click', (event) => {
    const btn = event.target.closest('[data-' + key + ']');
    if (!btn) return;
    for (const b of $(id).querySelectorAll('.choice')) {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    }
    state[key] = btn.dataset[key];
    if (key === 'layout') ensureSlots();
    render();
  });
}

bindChoiceGroup('layoutChoices', 'layout');
bindChoiceGroup('gradeChoices', 'grade');
bindChoiceGroup('sizeChoices', 'size');

$('colourSwatches').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-colour]');
  if (!btn) return;
  for (const b of $('colourSwatches').querySelectorAll('.swatch')) b.classList.toggle('active', b === btn);
  state.headlineColor = btn.dataset.colour;
  render();
});

$('headlineInput').addEventListener('input', (e) => { state.headline = e.target.value; render(); });
$('sublineInput').addEventListener('input', (e) => { state.subline = e.target.value; render(); });
$('sizeRange').addEventListener('input', (e) => { state.headlineScale = Number(e.target.value); render(); });
$('outlineCheck').addEventListener('change', (e) => { state.outline = e.target.checked; render(); });
$('zoomRange').addEventListener('input', (e) => {
  state.slots[state.selected].zoom = Number(e.target.value);
  render();
});
$('fitButton').addEventListener('click', () => {
  const slot = state.slots[state.selected];
  slot.zoom = 1; slot.ox = 0; slot.oy = 0;
  syncZoom();
  render();
});

$('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    await addPhoto(url, file.name);
  }
  e.target.value = '';
});

// Preview interaction: click selects (and fills) a panel, drag pans its photo.
let dragging = null;
function previewPoint(event) {
  const rect = preview.getBoundingClientRect();
  const fx = (event.clientX - rect.left) / rect.width;
  const fy = (event.clientY - rect.top) / rect.height;
  return { fx, fy };
}

preview.addEventListener('pointerdown', (event) => {
  const { fx, fy } = previewPoint(event);
  const hit = panelAt(state.layout, fx, fy);
  if (hit < 0) return;
  state.selected = hit;
  state.slots[hit].photo = state.picked;
  syncZoom();
  render();
  dragging = { fx, fy, slot: state.slots[hit] };
  preview.setPointerCapture(event.pointerId);
});

preview.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const { fx, fy } = previewPoint(event);
  const fracs = layoutPanels(state.layout, 0.006);
  const rect = fracs[state.selected];
  dragging.slot.ox += (fx - dragging.fx) / rect.w;
  dragging.slot.oy += (fy - dragging.fy) / rect.h;
  dragging.fx = fx;
  dragging.fy = fy;
  render();
});

preview.addEventListener('pointerup', () => { dragging = null; });
preview.addEventListener('pointercancel', () => { dragging = null; });

/** Export the cover at its exact size as a PNG download. */
function exportPNG() {
  const [W, H] = sizeOf(state.size);
  offscreen.width = W;
  offscreen.height = H;
  renderCover(offCtx, state, W, H);
  offscreen.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    $('exportNote').textContent = `Exported vice-cover-${state.size}.png (${W} × ${H}).`;
  }, 'image/png');
}

$('exportButton').addEventListener('click', exportPNG);

/** Automation hooks for screenshots and tests: ?sample=&layout=&grade=&size=&headline=&subline=&export=1 */
function applyQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('layout') && SIZES) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  if (q.get('headline') !== null) { state.headline = q.get('headline'); $('headlineInput').value = state.headline; }
  if (q.get('subline') !== null) { state.subline = q.get('subline'); $('sublineInput').value = state.subline; }
  const syncGroup = (id, key) => {
    for (const b of $(id).querySelectorAll('.choice')) {
      const on = b.dataset[key] === state[key];
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  syncGroup('layoutChoices', 'layout');
  syncGroup('gradeChoices', 'grade');
  syncGroup('sizeChoices', 'size');
  return q;
}

async function boot() {
  const q = applyQuery();
  const samples = (q.get('sample') || 'boulevard,pier').split(',').filter(Boolean);
  for (const sample of samples) {
    await addPhoto(`samples/${sample}.jpg`, `${sample}.jpg`);
  }
  // First photo fills the hero panel, second fills the top-right one.
  state.slots[0] = { photo: 0, zoom: 1, ox: 0, oy: 0 };
  if (state.slots[1]) state.slots[1] = { photo: Math.min(1, state.photos.length - 1), zoom: 1, ox: 0, oy: 0 };
  buildTray();
  try {
    await Promise.all([
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.load('40px "Anton"'),
    ]);
  } catch { /* fall back to system fonts for the caption */ }
  render();
  if (q.get('export') === '1') exportPNG();
  window.__cover = { state, render, exportPNG };
}

buildTray();
boot();
