const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const ASSET_BASE_PATH = 'tiny-imagenes';
const MANIFEST_PATH = `${ASSET_BASE_PATH}/manifest.json`;
const LAYOUT_CONFIG_PATH = 'config-layout.json';
const VALID_LAYERS = new Set(['bg', 'mid', 'front']);

const SCENE_OFFSETS = {
  intro: { x: 0, y: 0 },
  ciudad: { x: 0, y: 0 },
};

const ITEM_LAYOUT = {};

const stageEl = document.querySelector('[data-story-stage]');
const root = document.documentElement;
const layerContainers = new Map();
const stageItems = [];
const assetsByKey = new Map();
const layoutToggleBtn = document.querySelector('[data-layout-toggle]');
const layoutPanel = document.querySelector('[data-layout-panel]');
const layoutOutput = document.querySelector('[data-layout-output]');
const layoutCopyBtn = document.querySelector('[data-layout-copy]');

let isLayoutMode = false;
let activeDrag = null;
let currentSceneForPanel = null;
let stageHeight = BASE_HEIGHT;

const STAGE_PADDING = 240;
const STAGE_HEIGHT_MIN = BASE_HEIGHT;

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
  return { x, y, scalePercent, layer };
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
    };
    return;
  }

  if (!existing.layer) {
    existing.layer = asset.layer;
  }
}

function getLayoutForKey(key) {
  return ITEM_LAYOUT[key] ?? { x: 0, y: 0, scalePercent: 100 };
}

function createStageItems(assets) {
  assets.forEach((asset) => {
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
    setupDragHandlers(figure, asset);
  });
}

function applyLayout() {
  if (!stageItems.length) {
    return;
  }

  const availableWidth = window.innerWidth;
  const scale = availableWidth / BASE_WIDTH;
  root.style.setProperty('--stage-scale', scale.toString());

  stageItems.forEach(({ element, asset }) => {
    const sceneOffset = SCENE_OFFSETS[asset.scene] ?? { x: 0, y: 0 };
    const layout = getLayoutForKey(asset.key);
    const x = sceneOffset.x + layout.x;
    const y = sceneOffset.y + layout.y;
    const itemScale = (layout.scalePercent ?? 100) / 100;

    element.style.transform = `translate(${x}px, ${y}px) scale(${itemScale})`;
  });

  updateStageHeightFromItems(scale);
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
    applyLayout();
    window.addEventListener('resize', applyLayout);
    initLayoutControls();
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
    if (scene) {
      const sceneLayout = exportSceneLayout(scene);
      updateLayoutPanel(scene, sceneLayout);
    }
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

  element.classList.remove('is-dragging');
  element.classList.remove('is-scaling');

  if (captureTarget && pointerId !== undefined && captureTarget.hasPointerCapture?.(pointerId)) {
    captureTarget.releasePointerCapture(pointerId);
  }

  captureTarget?.removeEventListener('pointermove', onDragMove);
  captureTarget?.removeEventListener('pointerup', onDragEnd);
  captureTarget?.removeEventListener('pointercancel', onDragEnd);

  const sceneLayout = exportSceneLayout(asset.scene);
  console.info(`Layout actualizado (${asset.scene})`, sceneLayout);
  updateLayoutPanel(asset.scene, sceneLayout);

  activeDrag = null;
}

function exportSceneLayout(scene) {
  const result = {};
  Object.entries(ITEM_LAYOUT).forEach(([key, layout]) => {
    const [sceneId, itemId] = key.split(':');
    if (sceneId === scene) {
      const entry = { ...layout };
      if (!entry.layer) {
        const assetInfo = assetsByKey.get(key);
        if (assetInfo?.layer) {
          entry.layer = assetInfo.layer;
        }
      }
      result[itemId] = entry;
    }
  });
  return result;
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

  const nextScalePercent = clamp(
    (activeDrag.layoutStart.scalePercent ?? 100) * ratio,
    minScale,
    maxScale,
  );

  ITEM_LAYOUT[activeDrag.asset.key] = {
    ...activeDrag.layoutStart,
    scalePercent: nextScalePercent,
  };

  applyLayout();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateLayoutPanel(scene, layout) {
  if (!layoutOutput) {
    return;
  }

  currentSceneForPanel = scene;
  const formatted = formatSceneLayout(scene, layout);
  layoutOutput.textContent = formatted;

  if (layoutCopyBtn) {
    layoutCopyBtn.textContent = layoutCopyBtn.dataset.state === 'copied'
      ? 'Copiado'
      : 'Copiar JSON';
  }
}

async function copyLayoutToClipboard() {
  if (!layoutOutput || !navigator?.clipboard) {
    return;
  }

  const text = layoutOutput.textContent ?? '';
  if (!text.trim()) {
    return;
  }

  try {
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

  const fallbackScale = stageScale || getStageScale();
  let maxBottom = BASE_HEIGHT;

  stageItems.forEach(({ element, asset }) => {
    const layout = getLayoutForKey(asset.key);
    const itemScale = (layout.scalePercent ?? 100) / 100;
    const img = element.querySelector('img');
    if (!img) {
      return;
    }

    let assetHeight = img.naturalHeight || 0;
    if (!assetHeight) {
      const rect = img.getBoundingClientRect();
      assetHeight = rect.height && fallbackScale ? rect.height / fallbackScale : 0;
    }

    const bottom = layout.y + assetHeight * itemScale;
    if (bottom > maxBottom) {
      maxBottom = bottom;
    }
  });

  const padded = Math.ceil(maxBottom + STAGE_PADDING);
  if (padded > stageHeight + 1) {
    stageHeight = padded;
    updateStageHeightVar();
  }
}

function formatSceneLayout(scene, layout) {
  const entries = Object.entries(layout || {})
    .sort(([aId, a], [bId, b]) => {
      const layerOrder = ['bg', 'mid', 'front'];
      const layerDiff = layerOrder.indexOf((a?.layer) ?? '') - layerOrder.indexOf((b?.layer) ?? '');
      return layerDiff !== 0 ? layerDiff : aId.localeCompare(bId);
    });

  const output = [];
  output.push('{');
  output.push(`  // Escena: ${scene}`);
  output.push(`  "${scene}": {`);

  let currentLayer = null;
  entries.forEach(([itemId, data], index) => {
    const layer = data?.layer ?? 'front';
    if (layer !== currentLayer) {
      currentLayer = layer;
      output.push('');
      output.push(`    // Capa: ${layer}`);
    }

    const parts = [`"layer": "${layer}"`, `"x": ${formatNumber(data?.x)}`, `"y": ${formatNumber(data?.y)}`, `"scalePercent": ${formatNumber(data?.scalePercent ?? 100)}`];
    const line = `    "${itemId}": { ${parts.join(', ')} }${index === entries.length - 1 ? '' : ','}`;
    output.push(line);
  });

  output.push('  }');
  output.push('}');
  return output.join('\n');
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
