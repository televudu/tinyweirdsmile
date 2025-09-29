const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const ASSET_BASE_PATH = 'tiny-imagenes';
const MANIFEST_PATH = `${ASSET_BASE_PATH}/manifest.json`;
const LAYOUT_CONFIG_PATH = 'config-layout.json';
const VALID_LAYERS = new Set(['bg', 'mid', 'front']);

const SCENE_OFFSETS = {
  intro: { x: 0, y: 0 },
  ciudad: { x: 0, y: 0 },
  noche: { x: 0, y: 0 },
};

const START_SCROLL_OFFSET = 2100;
const LOOP_SCROLL_OFFSET = 0;
const EXTRA_END_PADDING = 1000;

const ITEM_LAYOUT = {};

const stageWrapper = document.querySelector('[data-stage]');
const stageEl = document.querySelector('[data-story-stage]');
const root = document.documentElement;
const layerContainers = new Map();
const stageItems = [];
const assetsByKey = new Map();
const sceneOrder = [];
const sceneIndicators = new Map();
const layoutToggleBtn = document.querySelector('[data-layout-toggle]');
const layoutPanel = document.querySelector('[data-layout-panel]');
const layoutOutput = document.querySelector('[data-layout-output]');
const layoutCopyBtn = document.querySelector('[data-layout-copy]');
const audioToggleBtn = document.querySelector('[data-audio-toggle]');
const loopOverlay = document.querySelector('[data-loop-overlay]');
const titleScreen = document.querySelector('[data-title-screen]');

let isLayoutMode = false;
let activeDrag = null;
let currentSceneForPanel = null;
let stageHeight = BASE_HEIGHT;
let sceneIndicatorLayer = null;
let parallaxOffset = 0;
let parallaxUpdateScheduled = false;

const STAGE_PADDING = 240;
const STAGE_HEIGHT_MIN = BASE_HEIGHT;
const SCENE_INDICATOR_Y_OFFSET = 120;
const SCENE_INDICATOR_MIN_Y = -180;
const BASE_LAYER_Z = {
  bg: 100,
  mid: 200,
  front: 300,
};

const SCROLL_LOOP_THRESHOLD = 24;
const SCROLL_LOOP_RESET_DELAY = 650;
const LOOP_OVERLAY_DURATION = 180;

const PARALLAX_FACTORS = {
  bg: 0.80,
  mid: 0.90,
  front: 1,
};

const AUDIO_TRACKS = [
  'audio/tinyweirdsmile.mp3',
  'audio/tinyweirdsmile-b.mp3',
];

let audioElement = null;
let isAudioPlaying = false;
let hasExperienceStarted = false;
let currentAudioTrackIndex = 0;

if (!stageEl) {
  console.error('No se encontró el contenedor de la stage.');
} else {
  stageEl.querySelectorAll('[data-layer]').forEach((layerEl) => {
    const layerId = layerEl.dataset.layer;
    if (!layerId) {
      return;
    }
    layerContainers.set(layerId, layerEl);
  });

  sceneIndicatorLayer = document.createElement('div');
  sceneIndicatorLayer.className = 'scene-indicator-layer';
  stageEl.appendChild(sceneIndicatorLayer);
}

updateStageHeightVar();

function parseAssetFilename(filename) {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  const parts = withoutExt.split('-');

  if (parts.length < 3) {
    console.warn(`Archivo ignorado (formato inválido): ${filename}`);
    return null;
  }

  const [scene, layer, ...rest] = parts;
  const itemId = rest.join('-');
  const normalizedLayer = layer.toLowerCase();

  if (!VALID_LAYERS.has(normalizedLayer)) {
    console.warn(`Capa inválida para ${filename}: ${layer}`);
    return null;
  }

  return {
    filename,
    scene: scene.toLowerCase(),
    layer: normalizedLayer,
    id: itemId.toLowerCase(),
    key: `${scene.toLowerCase()}:${itemId.toLowerCase()}`,
  };
}

async function loadManifest() {
  const response = await fetch(MANIFEST_PATH);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el manifiesto: ${MANIFEST_PATH}`);
  }
  return response.json();
}

async function loadLayoutConfig() {
  try {
    const response = await fetch(LAYOUT_CONFIG_PATH);
    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(`No se pudo cargar el layout config (${response.status}).`);
      }
      return {};
    }

    const rawText = await response.text();
    const sanitized = stripJsonComments(rawText);
    if (!sanitized.trim()) {
      return {};
    }

    try {
      return JSON.parse(sanitized);
    } catch (parseError) {
      console.error('El layout config contiene errores de formato', parseError);
      console.error('Contenido recibido:\n', sanitized);
      return {};
    }
  } catch (error) {
    console.error('Error cargando el layout config', error);
    return {};
  }
}

function populateLayoutFromConfig(config) {
  Object.entries(config ?? {}).forEach(([sceneId, items]) => {
    if (!items || typeof items !== 'object') {
      return;
    }
    rememberScene(sceneId);
    Object.entries(items).forEach(([itemId, layout]) => {
      const sceneKey = sceneId.toLowerCase();
      const itemKey = itemId.toLowerCase();
      const key = `${sceneKey}:${itemKey}`;
      ITEM_LAYOUT[key] = normalizeLayoutEntry(layout);
    });
  });
}

function normalizeLayoutEntry(entry) {
  const x = Number(entry?.x) || 0;
  const y = Number(entry?.y) || 0;
  const rawScale = Number(entry?.scalePercent);
  const scalePercent = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 100;
  const layer = typeof entry?.layer === 'string' && entry.layer.trim()
    ? entry.layer.trim().toLowerCase()
    : undefined;
  const rawZ = Number(entry?.zIndex);
  const zIndex = Number.isFinite(rawZ) ? rawZ : 0;
  const rawParallax = Number(entry?.parallaxFactor);
  const parallaxFactor = Number.isFinite(rawParallax) ? rawParallax : undefined;
  const duplicateOf = typeof entry?.duplicateOf === 'string' && entry.duplicateOf.trim()
    ? entry.duplicateOf.trim().toLowerCase()
    : undefined;
  const hidden = Boolean(entry?.hidden);
  return {
    x,
    y,
    scalePercent,
    layer,
    zIndex,
    parallaxFactor,
    duplicateOf,
    hidden,
  };
}

function rememberScene(sceneId) {
  if (!sceneId || typeof sceneId.toLowerCase !== 'function') {
    return;
  }
  const normalized = sceneId.toLowerCase();
  if (!sceneOrder.includes(normalized)) {
    sceneOrder.push(normalized);
  }
}

function ensureLayoutEntry(asset) {
  const key = asset.key;
  const existing = ITEM_LAYOUT[key];
  if (!existing) {
    ITEM_LAYOUT[key] = {
      layer: asset.layer,
      x: 0,
      y: 0,
      scalePercent: 100,
      zIndex: 0,
      parallaxFactor: undefined,
      hidden: false,
    };
    return;
  }

  if (!existing.layer) {
    existing.layer = asset.layer;
  }

  if (!Number.isFinite(existing.scalePercent)) {
    existing.scalePercent = 100;
  }

  if (!Number.isFinite(existing.zIndex)) {
    existing.zIndex = 0;
  }

  if (!Number.isFinite(existing.parallaxFactor)) {
    existing.parallaxFactor = undefined;
  }

  existing.hidden = Boolean(existing.hidden);
}

function getLayoutForKey(key) {
  const layout = ITEM_LAYOUT[key];
  if (!layout) {
    return {
      x: 0,
      y: 0,
      scalePercent: 100,
      zIndex: 0,
      parallaxFactor: undefined,
      hidden: false,
    };
  }

  if (!Number.isFinite(layout.scalePercent)) {
    layout.scalePercent = 100;
  }
  if (!Number.isFinite(layout.zIndex)) {
    layout.zIndex = 0;
  }
  if (!Number.isFinite(layout.parallaxFactor)) {
    layout.parallaxFactor = undefined;
  }
  layout.hidden = Boolean(layout.hidden);
  return layout;
}

function getItemZIndex(layout, asset) {
  const base = BASE_LAYER_Z[asset.layer] ?? 0;
  const offset = Number(layout?.zIndex);
  return base + (Number.isFinite(offset) ? offset : 0);
}

function resolveScale(layout, asset, element) {
  const baseScale = (Number(layout?.scalePercent) || 100) / 100;
  const img = element?.querySelector('img');
  const rect = element?.getBoundingClientRect?.();
  const stageScale = getStageScale();

  const naturalWidth = getNaturalDimension(
    img?.naturalWidth,
    rect?.width && stageScale ? rect.width / stageScale : 0,
  );
  const naturalHeight = getNaturalDimension(
    img?.naturalHeight,
    rect?.height && stageScale ? rect.height / stageScale : 0,
  );

  const width = naturalWidth * baseScale;
  const height = naturalHeight * baseScale;

  return { scaleX: baseScale, scaleY: baseScale, width, height, naturalWidth, naturalHeight };
}

function createStageItems(assets) {
  assets.forEach((asset) => {
    rememberScene(asset.scene);
    const layerContainer = layerContainers.get(asset.layer);
    if (!layerContainer) {
      console.warn(`No existe contenedor para la capa ${asset.layer}`);
      return;
    }

    const figure = document.createElement('figure');
    figure.className = 'story-item';
    figure.dataset.scene = asset.scene;
    figure.dataset.layer = asset.layer;
    figure.dataset.item = asset.id;
    figure.dataset.key = asset.key;

    const img = document.createElement('img');
    img.src = `${ASSET_BASE_PATH}/${asset.filename}`;
    img.alt = `${asset.scene} ${asset.id}`.replace(/-/g, ' ');
    img.draggable = false;
    img.loading = 'lazy';

    figure.appendChild(img);
    layerContainer.appendChild(figure);

    if (!img.complete) {
      img.addEventListener('load', () => {
        requestAnimationFrame(() => applyLayout());
      }, { once: true });
    }

    ensureLayoutEntry(asset);
    stageItems.push({ element: figure, asset });
    assetsByKey.set(asset.key, asset);
    ensureSceneIndicator(asset.scene);
    setupDragHandlers(figure, asset);
  });
}

function createDuplicateStageItems() {
  Object.entries(ITEM_LAYOUT).forEach(([key, layout]) => {
    if (assetsByKey.has(key)) {
      return;
    }

    const duplicateOf = typeof layout?.duplicateOf === 'string' && layout.duplicateOf.trim()
      ? layout.duplicateOf.trim().toLowerCase()
      : '';
    if (!duplicateOf) {
      return;
    }

    const [sceneId, itemId] = key.split(':');
    if (!sceneId || !itemId) {
      return;
    }

    let sourceKey = duplicateOf;
    if (!duplicateOf.includes(':')) {
      sourceKey = `${sceneId}:${duplicateOf}`;
    }

    const sourceAsset = assetsByKey.get(sourceKey);
    if (!sourceAsset) {
      console.warn(`No se encontró el elemento original para duplicar: ${sourceKey}`);
      return;
    }

    const layerId = layout.layer || sourceAsset.layer;
    const layerContainer = layerContainers.get(layerId);
    if (!layerContainer) {
      console.warn(`No existe contenedor para la capa ${layerId} (duplicado ${key})`);
      return;
    }

    const duplicateAsset = {
      filename: sourceAsset.filename,
      scene: sceneId,
      layer: layerId,
      id: itemId,
      key,
    };

    const figure = document.createElement('figure');
    figure.className = 'story-item';
    figure.dataset.scene = sceneId;
    figure.dataset.layer = layerId;
    figure.dataset.item = itemId;
    figure.dataset.key = key;

    const img = document.createElement('img');
    img.src = `${ASSET_BASE_PATH}/${sourceAsset.filename}`;
    img.alt = `${sceneId} ${itemId}`.replace(/-/g, ' ');
    img.draggable = false;
    img.loading = 'lazy';

    figure.appendChild(img);
    layerContainer.appendChild(figure);

    if (!img.complete) {
      img.addEventListener('load', () => {
        requestAnimationFrame(() => applyLayout());
      }, { once: true });
    }

    rememberScene(sceneId);
    assetsByKey.set(key, duplicateAsset);
    stageItems.push({ element: figure, asset: duplicateAsset });
    ensureSceneIndicator(sceneId);
    setupDragHandlers(figure, duplicateAsset);
  });
}

function getStageAvailableWidth() {
  const wrapper = stageEl?.parentElement;
  if (wrapper) {
    const rect = wrapper.getBoundingClientRect?.();
    if (rect && Number.isFinite(rect.width) && rect.width > 0) {
      return rect.width;
    }

    const clientWidth = wrapper.clientWidth;
    if (Number.isFinite(clientWidth) && clientWidth > 0) {
      return clientWidth;
    }
  }

  const viewportWidth = document.documentElement?.clientWidth;
  if (Number.isFinite(viewportWidth) && viewportWidth > 0) {
    return viewportWidth;
  }

  if (Number.isFinite(window.innerWidth) && window.innerWidth > 0) {
    return window.innerWidth;
  }

  return BASE_WIDTH;
}

function scheduleParallaxUpdate() {
  if (parallaxUpdateScheduled) {
    return;
  }
  parallaxUpdateScheduled = true;
  requestAnimationFrame(() => {
    parallaxUpdateScheduled = false;
    applyLayout();
  });
}

function applyLayout() {
  if (!stageItems.length) {
    positionSceneIndicators();
    return;
  }

  const scrollingContainer = stageWrapper && stageWrapper.scrollHeight > stageWrapper.clientHeight + 1
    ? stageWrapper
    : null;
  const currentScroll = scrollingContainer ? scrollingContainer.scrollTop : window.scrollY || 0;
  parallaxOffset = currentScroll;

  const availableWidth = getStageAvailableWidth();
  const scale = availableWidth > 0 ? availableWidth / BASE_WIDTH : 1;
  root.style.setProperty('--stage-scale', scale.toString());

  stageItems.forEach(({ element, asset }) => {
    const baseOffset = SCENE_OFFSETS[asset.scene] ?? { x: 0, y: 0 };
    const sceneOffset = {
      x: baseOffset.x,
      y: baseOffset.y + START_SCROLL_OFFSET,
    };
    const layout = getLayoutForKey(asset.key);
    let parallaxFactor = Number(layout?.parallaxFactor);
    if (!Number.isFinite(parallaxFactor)) {
      const datasetFactor = Number(element?.dataset?.parallaxFactor);
      if (Number.isFinite(datasetFactor)) {
        parallaxFactor = datasetFactor;
      }
    }
    if (!Number.isFinite(parallaxFactor)) {
      parallaxFactor = PARALLAX_FACTORS[asset.layer] ?? 1;
    }

    const parallaxY = parallaxOffset * (1 - parallaxFactor);
    const y = sceneOffset.y + layout.y + parallaxY;
    const { scaleX, scaleY } = resolveScale(layout, asset, element);
    const img = element.querySelector('img');

    const x = sceneOffset.x + layout.x;
    element.style.width = '';
    element.style.transform = `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`;
    if (img) {
      img.style.width = '';
      img.style.height = '';
    }

    if (layout.hidden) {
      element.style.opacity = '0';
      element.style.visibility = 'hidden';
      element.style.pointerEvents = 'none';
    } else {
      element.style.opacity = '';
      element.style.visibility = '';
      element.style.pointerEvents = '';
    }

    element.style.zIndex = `${getItemZIndex(layout, asset)}`;
  });

  updateStageHeightFromItems(scale);
  positionSceneIndicators();
}

function setupScrollLoop() {
  const scrollingEl = (() => {
    if (stageWrapper && stageWrapper.scrollHeight > stageWrapper.clientHeight + 1) {
      return stageWrapper;
    }
    return document.scrollingElement || document.documentElement || document.body;
  })();

  if (!scrollingEl) {
    return;
  }

  let isLoopingScroll = false;

  const handleScroll = () => {
    scheduleParallaxUpdate();
    if (isLoopingScroll) {
      return;
    }

    const maxScroll = scrollingEl.scrollHeight - (scrollingEl === stageWrapper ? stageWrapper.clientHeight : window.innerHeight);
    if (maxScroll <= 0) {
      return;
    }

    const currentScroll = scrollingEl === stageWrapper
      ? stageWrapper.scrollTop
      : (window.scrollY || scrollingEl.scrollTop || 0);

    if (currentScroll >= maxScroll - SCROLL_LOOP_THRESHOLD) {
      isLoopingScroll = true;
      fadeOverlayIn().then(() => {
        scrollToOffset(LOOP_SCROLL_OFFSET, { smooth: false });
        fadeOverlayOut();
        window.setTimeout(() => {
          isLoopingScroll = false;
        }, SCROLL_LOOP_RESET_DELAY);
      });
    }
  };

  const listenerTarget = scrollingEl === stageWrapper ? stageWrapper : window;
  listenerTarget.addEventListener('scroll', handleScroll, { passive: true });
}

function updateAudioToggle() {
  if (!audioToggleBtn) {
    return;
  }

  audioToggleBtn.textContent = isAudioPlaying ? 'Pausar música' : 'Activar música';
  document.body.dataset.audioState = isAudioPlaying ? 'playing' : 'paused';
}

function ensureAudioElement() {
  if (audioElement) {
    return audioElement;
  }

  currentAudioTrackIndex = 0;
  audioElement = new Audio(AUDIO_TRACKS[currentAudioTrackIndex]);
  audioElement.preload = 'auto';
  audioElement.volume = 0.6;
  audioElement.addEventListener('playing', () => {
    isAudioPlaying = true;
    updateAudioToggle();
  });
  audioElement.addEventListener('pause', () => {
    if (!audioElement || !audioElement.paused) {
      return;
    }
    isAudioPlaying = false;
    updateAudioToggle();
  });
  audioElement.addEventListener('ended', handleAudioEnded);
  updateAudioToggle();
  return audioElement;
}

function toggleAudio() {
  const audio = ensureAudioElement();
  if (!audio) {
    return;
  }

  if (audio.paused) {
    audio.play().catch((error) => {
      console.warn('No se pudo reproducir el audio automáticamente', error);
    });
  } else {
    audio.pause();
  }
}

function handleAudioEnded() {
  if (!audioElement) {
    return;
  }

  currentAudioTrackIndex = (currentAudioTrackIndex + 1) % AUDIO_TRACKS.length;
  audioElement.src = AUDIO_TRACKS[currentAudioTrackIndex];
  audioElement.currentTime = 0;
  audioElement.play().catch((error) => {
    console.warn('No se pudo reproducir la siguiente pista', error);
  });
}

function initAudioControls() {
  if (!audioToggleBtn) {
    return;
  }

  updateAudioToggle();
  audioToggleBtn.addEventListener('click', () => {
    toggleAudio();
  });
}

function initTitleScreen() {
  if (!titleScreen) {
    document.body.classList.add('has-experience-started');
    return;
  }

  titleScreen.addEventListener('click', () => {
    void startExperience();
  });
}

function ensureSceneIndicator(sceneId) {
  if (!sceneIndicatorLayer || !sceneId) {
    return null;
  }

  const sceneKey = sceneId.toLowerCase();
  if (sceneIndicators.has(sceneKey)) {
    return sceneIndicators.get(sceneKey);
  }

  const indicator = document.createElement('div');
  indicator.className = 'scene-indicator';
  indicator.dataset.sceneIndicator = sceneKey;
  indicator.textContent = sceneKey;
  indicator.addEventListener('pointerdown', (event) => {
    if (!isLayoutMode) {
      return;
    }
    startSceneDrag(event, sceneKey, indicator);
  });

  sceneIndicatorLayer.appendChild(indicator);
  sceneIndicators.set(sceneKey, indicator);
  return indicator;
}

function getSceneItemKeys(sceneId) {
  const target = sceneId?.toLowerCase?.();
  if (!target) {
    return [];
  }

  return stageItems
    .filter(({ asset }) => asset.scene === target)
    .map(({ asset }) => asset.key);
}

function computeSceneIndicatorPosition(sceneId) {
  const itemKeys = getSceneItemKeys(sceneId);
  if (!itemKeys.length) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  itemKeys.forEach((key) => {
    const layout = getLayoutForKey(key);
    if (layout.x < minX) {
      minX = layout.x;
    }
    if (layout.y < minY) {
      minY = layout.y;
    }
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null;
  }

  const y = Math.max((minY + START_SCROLL_OFFSET) - SCENE_INDICATOR_Y_OFFSET, SCENE_INDICATOR_MIN_Y);
  return { x: minX, y };
}

function positionSceneIndicators() {
  if (!sceneIndicatorLayer) {
    return;
  }

  sceneIndicators.forEach((indicator, sceneId) => {
    const position = computeSceneIndicatorPosition(sceneId);
    if (!position) {
      indicator.hidden = true;
      return;
    }

    indicator.hidden = false;
    const clampedX = Math.max(position.x, 0);
    indicator.style.transform = `translate(${clampedX}px, ${position.y}px)`;
  });
}

async function initStage() {
  if (!stageEl) {
    return;
  }

  try {
    const [manifest, layoutConfig] = await Promise.all([loadManifest(), loadLayoutConfig()]);
    populateLayoutFromConfig(layoutConfig);
    const assets = manifest
      .map((filename) => parseAssetFilename(filename))
      .filter(Boolean);

    createStageItems(assets);
    createDuplicateStageItems();
    applyLayout();
    window.addEventListener('resize', applyLayout);
    initLayoutControls();
    initAudioControls();
    initTitleScreen();
    setupScrollLoop();
  } catch (error) {
    console.error('Error inicializando la stage', error);
  }
}

initStage();

function initLayoutControls() {
  if (!layoutToggleBtn) {
    return;
  }

  layoutToggleBtn.addEventListener('click', () => {
    setLayoutMode(!isLayoutMode);
  });

  setLayoutMode(false);

  layoutCopyBtn?.addEventListener('click', () => {
    void copyLayoutToClipboard();
  });
}

function setLayoutMode(enabled) {
  isLayoutMode = enabled;
  document.body.classList.toggle('layout-mode', enabled);
  if (layoutToggleBtn) {
    layoutToggleBtn.textContent = enabled ? 'Salir modo layout' : 'Modo layout';
  }

  if (layoutPanel) {
    layoutPanel.hidden = true;
  }

  if (!enabled && activeDrag) {
    finishActiveDrag();
  }

  if (!enabled) {
    void copyLayoutToClipboard();
  } else {
    const scene = currentSceneForPanel || stageItems[0]?.asset.scene;
    updateLayoutPanel(scene ?? null);
  }
}

function setupDragHandlers(element, asset) {
  ensureResizeHandles(element, asset);
  element.addEventListener('pointerdown', (event) => {
    if (!isLayoutMode) {
      return;
    }
    startDrag(event, element, asset);
  });
}

function startSceneDrag(event, sceneId, indicator) {
  event.preventDefault();
  event.stopPropagation();

  const itemKeys = getSceneItemKeys(sceneId);
  if (!itemKeys.length) {
    return;
  }

  indicator.setPointerCapture?.(event.pointerId);

  const sceneLayouts = itemKeys.map((key) => ({
    key,
    layout: { ...getLayoutForKey(key) },
  }));

  activeDrag = {
    mode: 'scene',
    pointerId: event.pointerId,
    element: indicator,
    scene: sceneId,
    captureTarget: indicator,
    origin: { x: event.clientX, y: event.clientY },
    sceneLayouts,
  };

  indicator.classList.add('is-scene-dragging');
  indicator.addEventListener('pointermove', onDragMove);
  indicator.addEventListener('pointerup', onDragEnd);
  indicator.addEventListener('pointercancel', onDragEnd);

  updateLayoutPanel(sceneId);
}

function startDrag(event, element, asset) {
  event.preventDefault();
  element.setPointerCapture(event.pointerId);

  const layout = { ...getLayoutForKey(asset.key) };

  activeDrag = {
    mode: 'move',
    pointerId: event.pointerId,
    element,
    asset,
    captureTarget: element,
    origin: { x: event.clientX, y: event.clientY },
    layoutStart: { ...layout },
  };

  element.classList.add('is-dragging');
  element.addEventListener('pointermove', onDragMove);
  element.addEventListener('pointerup', onDragEnd);
  element.addEventListener('pointercancel', onDragEnd);
}

function onDragMove(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  if (activeDrag.mode === 'move') {
    handleMoveDrag(event);
  } else if (activeDrag.mode === 'scale') {
    handleScaleDrag(event);
  } else if (activeDrag.mode === 'scene') {
    handleSceneDrag(event);
  }
}

function onDragEnd(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  finishActiveDrag();
}

function finishActiveDrag() {
  if (!activeDrag) {
    return;
  }

  const { element, asset, pointerId, captureTarget, mode } = activeDrag;

  element?.classList.remove('is-dragging');
  element?.classList.remove('is-scaling');
  element?.classList.remove('is-scene-dragging');

  if (captureTarget && pointerId !== undefined && captureTarget.hasPointerCapture?.(pointerId)) {
    captureTarget.releasePointerCapture(pointerId);
  }

  captureTarget?.removeEventListener('pointermove', onDragMove);
  captureTarget?.removeEventListener('pointerup', onDragEnd);
  captureTarget?.removeEventListener('pointercancel', onDragEnd);

  let sceneId = null;
  if (mode === 'scene') {
    sceneId = activeDrag.scene;
  } else if (asset?.scene) {
    sceneId = asset.scene;
  }

  if (sceneId) {
    const sceneLayout = exportSceneLayout(sceneId);
    console.info(`Layout actualizado (${sceneId})`, sceneLayout);
    updateLayoutPanel(sceneId);
  }

  activeDrag = null;
}

function exportAllScenesLayout() {
  const result = {};

  Object.entries(ITEM_LAYOUT).forEach(([key, layout]) => {
    const [sceneId, itemId] = key.split(':');
    if (!sceneId || !itemId) {
      return;
    }

    const sceneKey = sceneId.toLowerCase();
    const itemKey = itemId.toLowerCase();
    if (!result[sceneKey]) {
      result[sceneKey] = {};
    }

    const entry = { ...layout };
    if (!entry.layer) {
      const assetInfo = assetsByKey.get(`${sceneKey}:${itemKey}`);
      if (assetInfo?.layer) {
        entry.layer = assetInfo.layer;
      }
    }

    result[sceneKey][itemKey] = entry;
  });

  sceneOrder.forEach((sceneId) => {
    if (!result[sceneId]) {
      result[sceneId] = {};
    }
  });

  return result;
}

function exportSceneLayout(scene) {
  const sceneKey = scene?.toLowerCase?.();
  if (!sceneKey) {
    return {};
  }

  const allLayouts = exportAllScenesLayout();
  const layout = allLayouts[sceneKey] ?? {};
  return Object.fromEntries(
    Object.entries(layout).map(([itemId, entry]) => [itemId, { ...entry }]),
  );
}

function getStageScale() {
  const value = Number.parseFloat(getComputedStyle(root).getPropertyValue('--stage-scale'));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function updateStageHeightVar() {
  root.style.setProperty('--stage-height', `${Math.max(stageHeight, STAGE_HEIGHT_MIN)}`);
}

function ensureResizeHandles(element, asset) {
  if (element.querySelector('[data-layout-handle]')) {
    return;
  }

  ['nw', 'ne', 'se', 'sw'].forEach((position) => {
    const handle = document.createElement('span');
    handle.className = 'layout-handle';
    handle.dataset.layoutHandle = position;
    handle.title = 'Redimensionar';
    handle.addEventListener('pointerdown', (event) => {
      if (!isLayoutMode) {
        return;
      }
      startScale(event, element, asset, handle);
    });
    element.appendChild(handle);
  });
}

function startScale(event, element, asset, handle) {
  event.preventDefault();
  event.stopPropagation();

  handle.setPointerCapture(event.pointerId);

  const layout = { ...getLayoutForKey(asset.key) };
  const rect = element.getBoundingClientRect();
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  const stageScale = getStageScale();
  const img = element.querySelector('img');
  const naturalWidth = getNaturalDimension(img?.naturalWidth, rect.width / stageScale);
  const naturalHeight = getNaturalDimension(img?.naturalHeight, rect.height / stageScale);
  const startScale = (layout.scalePercent ?? 100) / 100;
  const startWidth = Math.max(naturalWidth * startScale, 1);
  const startHeight = Math.max(naturalHeight * startScale, 1);
  const layoutCenter = {
    x: layout.x + startWidth / 2,
    y: layout.y + startHeight / 2,
  };
  const distance = Math.hypot(event.clientX - center.x, event.clientY - center.y);

  activeDrag = {
    mode: 'scale',
    pointerId: event.pointerId,
    element,
    asset,
    captureTarget: handle,
    origin: { x: event.clientX, y: event.clientY },
    layoutStart: { ...layout },
    scaleCenter: center,
    startDistance: distance || 1,
    assetSize: { width: naturalWidth, height: naturalHeight },
    layoutCenter,
  };

  element.classList.add('is-scaling');
  handle.addEventListener('pointermove', onDragMove);
  handle.addEventListener('pointerup', onDragEnd);
  handle.addEventListener('pointercancel', onDragEnd);
}

function handleMoveDrag(event) {
  if (!activeDrag) {
    return;
  }

  const scale = getStageScale();
  const deltaX = (event.clientX - activeDrag.origin.x) / scale;
  const deltaY = (event.clientY - activeDrag.origin.y) / scale;

  const updated = {
    ...activeDrag.layoutStart,
    x: activeDrag.layoutStart.x + deltaX,
    y: activeDrag.layoutStart.y + deltaY,
  };

  ITEM_LAYOUT[activeDrag.asset.key] = updated;
  applyLayout();
}

function handleScaleDrag(event) {
  if (!activeDrag) {
    return;
  }

  const currentDistance = Math.hypot(
    event.clientX - activeDrag.scaleCenter.x,
    event.clientY - activeDrag.scaleCenter.y,
  );

  const baseDistance = activeDrag.startDistance || 1;
  const ratio = currentDistance / baseDistance;
  const minScale = 5;
  const maxScale = 800;

  const startScale = activeDrag.layoutStart.scalePercent ?? 100;

  const nextScalePercent = clamp(
    startScale * ratio,
    minScale,
    maxScale,
  );

  const naturalWidth = activeDrag.assetSize?.width;
  const naturalHeight = activeDrag.assetSize?.height;
  const layoutCenter = activeDrag.layoutCenter;
  const nextScale = nextScalePercent / 100;

  let nextX = activeDrag.layoutStart.x;
  let nextY = activeDrag.layoutStart.y;

  if (
    layoutCenter
    && Number.isFinite(naturalWidth) && naturalWidth > 0
    && Number.isFinite(naturalHeight) && naturalHeight > 0
  ) {
    const newWidth = naturalWidth * nextScale;
    const newHeight = naturalHeight * nextScale;
    nextX = layoutCenter.x - newWidth / 2;
    nextY = layoutCenter.y - newHeight / 2;
  }

  ITEM_LAYOUT[activeDrag.asset.key] = {
    ...getLayoutForKey(activeDrag.asset.key),
    scalePercent: nextScalePercent,
    x: nextX,
    y: nextY,
  };

  applyLayout();
}

function handleSceneDrag(event) {
  if (!activeDrag || activeDrag.mode !== 'scene') {
    return;
  }

  const scale = getStageScale();
  const deltaX = (event.clientX - activeDrag.origin.x) / scale;
  const deltaY = (event.clientY - activeDrag.origin.y) / scale;

  activeDrag.sceneLayouts.forEach(({ key, layout: startLayout }) => {
    const current = { ...ITEM_LAYOUT[key] };
    ITEM_LAYOUT[key] = {
      ...current,
      x: startLayout.x + deltaX,
      y: startLayout.y + deltaY,
    };
  });

  applyLayout();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getNaturalDimension(primary, fallback) {
  if (Number.isFinite(primary) && primary > 0) {
    return primary;
  }
  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }
  return 1;
}

function createLayoutExportString(activeScene) {
  const allLayouts = exportAllScenesLayout();
  return formatLayoutExport(allLayouts, { activeScene });
}

function updateLayoutPanel(scene) {
  if (!layoutOutput) {
    return;
  }

  currentSceneForPanel = scene ?? null;
  const formatted = createLayoutExportString(currentSceneForPanel);
  layoutOutput.textContent = formatted;

  if (layoutCopyBtn) {
    layoutCopyBtn.textContent = layoutCopyBtn.dataset.state === 'copied'
      ? 'Copiado'
      : 'Copiar JSON';
  }
}

async function copyLayoutToClipboard() {
  if (!navigator?.clipboard) {
    return;
  }

  const text = createLayoutExportString(currentSceneForPanel);
  if (!text.trim()) {
    return;
  }

  try {
    if (layoutOutput) {
      layoutOutput.textContent = text;
    }
    await navigator.clipboard.writeText(text);
    if (layoutCopyBtn) {
      layoutCopyBtn.dataset.state = 'copied';
      layoutCopyBtn.textContent = 'Copiado';
      setTimeout(() => {
        if (!layoutCopyBtn) {
          return;
        }
        layoutCopyBtn.dataset.state = '';
        layoutCopyBtn.textContent = 'Copiar JSON';
      }, 1500);
    }
  } catch (error) {
    console.warn('No se pudo copiar al portapapeles', error);
  }
}

function updateStageHeightFromItems(stageScale) {
  if (!stageItems.length) {
    stageHeight = BASE_HEIGHT;
    updateStageHeightVar();
    return;
  }

  let maxBottom = BASE_HEIGHT;

  stageItems.forEach(({ element, asset }) => {
    const layout = getLayoutForKey(asset.key);
    const { height } = resolveScale(layout, asset, element);
    const img = element.querySelector('img');
    if (!img) {
      return;
    }

    const bottom = layout.y + START_SCROLL_OFFSET + height;
    if (bottom > maxBottom) {
      maxBottom = bottom;
    }
  });

  const extraSpace = Math.max(STAGE_PADDING, START_SCROLL_OFFSET + EXTRA_END_PADDING);
  const padded = Math.ceil(maxBottom + extraSpace);

  if (stageHeight !== padded) {
    stageHeight = padded;
    updateStageHeightVar();
  }
}

function formatLayoutExport(layoutByScene, { activeScene } = {}) {
  const scenesInOrder = getOrderedScenes(layoutByScene);
  const lines = ['{'];

  if (activeScene) {
    lines.push(`  // Escena activa: ${activeScene}`);
    lines.push('');
  }

  scenesInOrder.forEach((sceneId, index) => {
    const sceneLines = formatSceneBlock(sceneId, layoutByScene[sceneId]);
    if (index < scenesInOrder.length - 1) {
      const lastIndex = sceneLines.length - 1;
      sceneLines[lastIndex] = `${sceneLines[lastIndex]},`;
    }
    lines.push(...sceneLines);
    if (index < scenesInOrder.length - 1) {
      lines.push('');
    }
  });

  lines.push('}');
  return lines.join('\n');
}

function getOrderedScenes(layoutByScene) {
  const ordered = [];
  const seen = new Set();

  sceneOrder.forEach((sceneId) => {
    if (Object.prototype.hasOwnProperty.call(layoutByScene, sceneId)) {
      ordered.push(sceneId);
      seen.add(sceneId);
    }
  });

  Object.keys(layoutByScene).forEach((sceneId) => {
    if (!seen.has(sceneId)) {
      ordered.push(sceneId);
      seen.add(sceneId);
    }
  });

  return ordered;
}

function formatSceneBlock(scene, layout) {
  const entries = Object.entries(layout || {})
    .sort(([aId, a], [bId, b]) => {
      const layerOrder = ['bg', 'mid', 'front'];
      const layerDiff = layerOrder.indexOf((a?.layer) ?? '') - layerOrder.indexOf((b?.layer) ?? '');
      return layerDiff !== 0 ? layerDiff : aId.localeCompare(bId);
    });

  const lines = [];
  lines.push(`  // Escena: ${scene}`);
  lines.push(`  "${scene}": {`);

  let currentLayer = null;
  entries.forEach(([itemId, data], index) => {
    const layer = data?.layer ?? 'front';
    if (layer !== currentLayer) {
      currentLayer = layer;
      lines.push('');
      lines.push(`    // Capa: ${layer}`);
    }

    const scalePercent = data?.scalePercent ?? 100;
    const zIndex = data?.zIndex ?? 0;

    const parts = [
      `"layer": "${layer}"`,
      `"x": ${formatNumber(data?.x)}`,
      `"y": ${formatNumber(data?.y)}`,
      `"scalePercent": ${formatNumber(scalePercent)}`,
      `"zIndex": ${formatNumber(zIndex)}`,
    ];
    if (Number.isFinite(data?.parallaxFactor)) {
      parts.push(`"parallaxFactor": ${formatNumber(data.parallaxFactor)}`);
    }
    if (data?.hidden) {
      parts.push('"hidden": true');
    }
    if (data?.duplicateOf) {
      parts.push(`"duplicateOf": "${data.duplicateOf}"`);
    }
    const line = `    "${itemId}": { ${parts.join(', ')} }${index === entries.length - 1 ? '' : ','}`;
    lines.push(line);
  });

  lines.push('  }');
  return lines;
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '0';
  }
  if (Number.isInteger(num)) {
    return String(num);
  }
  return num.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function stripJsonComments(text) {
  let result = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      inString = true;
      stringChar = char;
      result += char;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
}
function scrollToOffset(offset, { smooth = false, duration = 0 } = {}) {
  const container = stageWrapper && stageWrapper.scrollHeight > stageWrapper.clientHeight + 1
    ? stageWrapper
    : null;

  if (!smooth || duration <= 0) {
    if (container) {
      container.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      window.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
    }
    return;
  }

  const start = container ? container.scrollTop : window.scrollY;
  const distance = offset - start;
  if (Math.abs(distance) < 0.5) {
    if (container) {
      container.scrollTo({ top: offset, behavior: 'auto' });
    } else {
      window.scrollTo({ top: offset, behavior: 'auto' });
    }
    return;
  }

  const startTime = performance.now();

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOut(progress);
    const next = start + distance * eased;

    if (container) {
      container.scrollTop = next;
    } else {
      window.scrollTo(0, next);
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

function resetScrollToStart({ smooth } = { smooth: false }) {
  scrollToOffset(START_SCROLL_OFFSET, { smooth });
}

function fadeOverlayIn() {
  if (!loopOverlay) {
    return Promise.resolve();
  }
  loopOverlay.hidden = false;
  loopOverlay.classList.add('is-visible');
  return new Promise((resolve) => {
    window.setTimeout(resolve, LOOP_OVERLAY_DURATION);
  });
}

function fadeOverlayOut() {
  if (!loopOverlay) {
    return;
  }
  loopOverlay.classList.remove('is-visible');
  window.setTimeout(() => {
    if (!loopOverlay.classList.contains('is-visible')) {
      loopOverlay.hidden = true;
    }
  }, LOOP_OVERLAY_DURATION);
}

function scrollToItemCenter(sceneId, itemId, { smooth = true, duration = 800 } = {}) {
  const itemEntry = stageItems.find(({ asset }) => asset.scene === sceneId && asset.id === itemId);
  if (!itemEntry?.element) {
    resetScrollToStart({ smooth });
    return;
  }

  const container = stageWrapper && stageWrapper.scrollHeight > stageWrapper.clientHeight + 1
    ? stageWrapper
    : null;

  window.requestAnimationFrame(() => {
    const elementRect = itemEntry.element.getBoundingClientRect();
    const containerRect = container ? container.getBoundingClientRect() : { top: 0 };
    const viewportHeight = container ? container.clientHeight : window.innerHeight;
    const currentScroll = container ? container.scrollTop : window.scrollY;
    const target = Math.max(
      currentScroll + (elementRect.top - containerRect.top) - (viewportHeight / 2) + (elementRect.height / 2),
      0,
    );

    scrollToOffset(target, { smooth, duration });
  });
}

function fadeOutTitleScreen() {
  if (!titleScreen) {
    return Promise.resolve();
  }
  titleScreen.classList.add('is-fading-out');
  return new Promise((resolve) => {
    window.setTimeout(() => {
      titleScreen.hidden = true;
      titleScreen.classList.remove('is-fading-out');
      resolve();
    }, 250);
  });
}

async function startExperience() {
  if (hasExperienceStarted) {
    toggleAudio();
    return;
  }

  const audio = ensureAudioElement();
  try {
    await audio.play();
  } catch (error) {
    console.warn('No se pudo reproducir el audio automáticamente', error);
  }

  hasExperienceStarted = true;
  document.body.classList.add('has-experience-started');
  scrollToOffset(0, { smooth: false });
  await fadeOutTitleScreen();
  window.setTimeout(() => {
    scrollToItemCenter('intro', 'hoyo', { smooth: true, duration: 1200 });
  }, 200);
}
