/*
 * Storytelling parallax scaffolding.
 * Each section groups its layers; data-speed controls parallax ratio.
 * Individual figures can declare data-animate behaviours for scroll-driven effects.
 */

gsap.registerPlugin(ScrollTrigger);

const layoutConfig = window.STORY_LAYOUT ?? {};

const LAYER_SPEEDS = {
  "layer-front": .6,
  "layer-mid": .45,
  "layer-bg": .35,
};
const PARALLAX_RANGE = 18;

const sections = gsap.utils.toArray(".story-section");

sections.forEach((section) => {
  const sectionKey = resolveSectionKey(section);
  const sectionConfig = layoutConfig[sectionKey] ?? {};

  applySectionMeta(section, sectionConfig._meta);

  const layers = section.querySelectorAll(".layer");
  layers.forEach((layer) => {
    const speed = resolveLayerSpeed(layer);
    const amplitude = PARALLAX_RANGE / speed;
    gsap.fromTo(
      layer,
      { yPercent: -amplitude },
      {
        yPercent: amplitude,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });

  const items = section.querySelectorAll(".parallax-item");
  items.forEach((item) => {
    const rawKey = resolveItemKey(item);
    const layerLabel = resolveLayerLabel(item) ?? "front";
    const layeredKey = composeLayeredKey(sectionKey, layerLabel, rawKey);

    const override = resolveLayoutOptions(sectionConfig, layeredKey, rawKey);

    item.dataset.layoutKey = layeredKey;
    if (override?.note) {
      item.dataset.layoutNote = override.note;
    } else {
      delete item.dataset.layoutNote;
    }

    const shouldHide = override?.hidden === true || override?.visible === false;
    if (shouldHide) {
      item.style.display = "none";
      return;
    }
    item.style.removeProperty("display");

    const baseX = pickNumber(override?.baseX, item.dataset.baseX, 0);
    const baseY = pickNumber(override?.baseY, item.dataset.baseY, 0);
    const baseScale = pickNumber(override?.baseScale, item.dataset.baseScale, 1);
    const zIndex = pickNumber(override?.zIndex, item.dataset.zIndex);

    item.style.setProperty("--base-x", baseX);
    item.style.setProperty("--base-y", baseY);
    item.style.setProperty("--scale", baseScale);
    if (zIndex !== undefined) {
      item.style.zIndex = zIndex;
    }

    const isFullWidth = Boolean(override?.fullWidth);
    item.classList.toggle("is-full-width", isFullWidth);
    item.style.removeProperty("width");
    item.style.removeProperty("left");

    const media = item.querySelector("img, video, canvas");
    if (media) {
      media.style.removeProperty("maxWidth");
      if (override?.width !== undefined) {
        media.style.width = normalizeSizeValue(override.width);
      } else if (!isFullWidth) {
        media.style.removeProperty("width");
      } else {
        media.style.width = "";
      }

      if (override?.height !== undefined) {
        media.style.height = normalizeSizeValue(override.height);
      } else {
        media.style.removeProperty("height");
      }
    }

    const animationType = override?.animate ?? item.dataset.animate;
    if (animationType && animationType !== "none") {
      createScrollAnimation(item, animationType, section);
    }
  });
});

function resolveLayerSpeed(layer) {
  const declared = parseFloat(layer.dataset.speed ?? "");
  if (!Number.isNaN(declared)) {
    return declared;
  }
  for (const [cls, speed] of Object.entries(LAYER_SPEEDS)) {
    if (layer.classList.contains(cls)) {
      return speed;
    }
  }
  return LAYER_SPEEDS["layer-mid"];
}

function createScrollAnimation(item, type, section) {
  const defaultConfig = {
    trigger: section,
    start: "top 80%",
    end: "bottom top",
  };

  switch (type) {
    case "fade-in":
      gsap.fromTo(
        item,
        { autoAlpha: 0, yPercent: 12 },
        {
          autoAlpha: 1,
          yPercent: 0,
          ease: "power1.out",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "zoom-in":
      gsap.fromTo(
        item,
        { autoAlpha: 0, scale: 0.65 },
        {
          autoAlpha: 1,
          scale: 1,
          ease: "power2.out",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "flash":
      gsap.fromTo(
        item,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          ease: "power3.out",
          duration: 0.6,
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
      break;

    case "slide-h": {
      const shift = parseFloat(item.dataset.shift || "25");
      gsap.fromTo(
        item,
        { xPercent: -shift },
        {
          xPercent: shift,
          ease: "none",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;
    }

    case "loop-rise":
      gsap.fromTo(
        item,
        { yPercent: -20 },
        {
          yPercent: 10,
          ease: "sine.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "orbit":
      gsap.fromTo(
        item,
        { rotation: -12, xPercent: -8 },
        {
          rotation: 12,
          xPercent: 8,
          ease: "sine.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "sweep":
      gsap.fromTo(
        item,
        { xPercent: -35, autoAlpha: 0.6 },
        {
          xPercent: 35,
          autoAlpha: 1,
          ease: "power1.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    case "bloom":
      gsap.fromTo(
        item,
        { scale: 0.55, autoAlpha: 0.4 },
        {
          scale: 1.2,
          autoAlpha: 1,
          ease: "power2.out",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
      break;

    default:
      // Fall back to a gentle float tied to scroll.
      gsap.fromTo(
        item,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "sine.inOut",
          scrollTrigger: {
            ...defaultConfig,
            scrub: true,
          },
        }
      );
  }
}

// Small helper to highlight active section for debugging / layout tweaks.
ScrollTrigger.batch(".story-section", {
  onEnter: (batch) => batch.forEach((section) => section.classList.add("is-active")),
  onLeaveBack: (batch) => batch.forEach((section) => section.classList.remove("is-active")),
});

function resolveSectionKey(section) {
  return section.dataset.section || section.id || "unknown";
}

function resolveItemKey(item) {
  if (item.dataset.key) {
    return item.dataset.key;
  }

  const img = item.querySelector("img");
  if (img) {
    const explicit = img.dataset?.key;
    if (explicit) {
      return explicit;
    }

    const alt = img.getAttribute("alt") || "";
    if (alt.trim()) {
      return slugify(alt);
    }

    const src = img.getAttribute("src") || "";
    if (src) {
      const fileName = src.split(/[\\/]/).pop() || src;
      const withoutExt = fileName.replace(/\.[^.]+$/, "");
      return slugify(withoutExt);
    }
  }

  return "unknown-item";
}

function pickNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const numeric = typeof value === "number" ? value : parseFloat(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return undefined;
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSizeValue(value) {
  if (typeof value === "number") {
    return `${value}px`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }
  return "";
}

function applySectionMeta(section, meta) {
  if (!meta) {
    return;
  }

  if (meta.zIndex !== undefined) {
    section.style.zIndex = meta.zIndex;
  }

  if (meta.offsetX !== undefined) {
    setSectionOffset(section, "--section-offset-x", meta.offsetX);
  }
  if (meta.offsetY !== undefined) {
    setSectionOffset(section, "--section-offset-y", meta.offsetY);
  }

  setSectionSpacing(section, "marginTop", meta.marginTop);
  setSectionSpacing(section, "marginBottom", meta.marginBottom);
  setSectionSpacing(section, "paddingTop", meta.paddingTop);
  setSectionSpacing(section, "paddingBottom", meta.paddingBottom);
  setSectionSpacing(section, "paddingLeft", meta.paddingLeft);
  setSectionSpacing(section, "paddingRight", meta.paddingRight);
}

function setSectionOffset(section, varName, value) {
  const normalized = normalizeSizeValue(value);
  if (normalized) {
    section.style.setProperty(varName, normalized);
  }
}

function setSectionSpacing(section, property, value) {
  if (value === undefined) {
    return;
  }
  const normalized = normalizeSizeValue(value);
  section.style[property] = normalized || "";
}

function resolveLayerLabel(item) {
  let el = item.parentElement;
  while (el) {
    if (el.classList?.contains("layer")) {
      const layerClass = Array.from(el.classList).find((cls) => cls.startsWith("layer-"));
      if (layerClass) {
        return layerClass.replace("layer-", "");
      }
    }
    el = el.parentElement;
  }
  return "front";
}

function resolveLayoutOptions(sectionConfig, layeredKey, rawKey) {
  if (!sectionConfig) {
    return null;
  }

  const layeredChain = collectConfigChain(sectionConfig, layeredKey);
  const chainToUse = layeredChain.length
    ? layeredChain
    : collectConfigChain(sectionConfig, rawKey);

  if (!chainToUse.length) {
    return null;
  }

  return mergeConfigChain(chainToUse);
}

function collectConfigChain(sectionConfig, key, chain = [], seen = new Set()) {
  if (!key || seen.has(key)) {
    return chain;
  }
  const entry = sectionConfig[key];
  if (!entry) {
    return chain;
  }

  seen.add(key);
  const parentKey = entry.group ?? entry.parent ?? null;
  if (parentKey) {
    collectConfigChain(sectionConfig, parentKey, chain, seen);
  }

  chain.push({ key, entry });
  return chain;
}

function mergeConfigChain(chain) {
  const merged = {};
  let ancestorHidden = false;
  let lastVisible;

  const baseState = {
    baseX: undefined,
    baseY: undefined,
    baseScale: undefined,
  };

  chain.forEach(({ entry }) => {
    if (entry.hidden === true) {
      ancestorHidden = true;
    }
    if (entry.visible !== undefined) {
      lastVisible = entry.visible;
    }

    if (entry.baseX !== undefined) {
      baseState.baseX = entry.baseX;
    }
    if (entry.offsetX !== undefined) {
      const base = baseState.baseX ?? 0;
      baseState.baseX = base + entry.offsetX;
    }

    if (entry.baseY !== undefined) {
      baseState.baseY = entry.baseY;
    }
    if (entry.offsetY !== undefined) {
      const base = baseState.baseY ?? 0;
      baseState.baseY = base + entry.offsetY;
    }

    if (entry.baseScale !== undefined) {
      baseState.baseScale = entry.baseScale;
    }
    if (entry.offsetScale !== undefined) {
      const base = baseState.baseScale ?? 1;
      baseState.baseScale = base + entry.offsetScale;
    }

    Object.entries(entry).forEach(([prop, value]) => {
      if (
        prop === "hidden" ||
        prop === "visible" ||
        prop === "group" ||
        prop === "parent" ||
        prop === "baseX" ||
        prop === "baseY" ||
        prop === "baseScale" ||
        prop === "offsetX" ||
        prop === "offsetY" ||
        prop === "offsetScale"
      ) {
        return;
      }
      merged[prop] = value;
    });
  });

  if (baseState.baseX !== undefined) {
    merged.baseX = baseState.baseX;
  }
  if (baseState.baseY !== undefined) {
    merged.baseY = baseState.baseY;
  }
  if (baseState.baseScale !== undefined) {
    merged.baseScale = baseState.baseScale;
  }

  if (ancestorHidden) {
    merged.hidden = true;
  } else if (lastVisible !== undefined) {
    merged.hidden = lastVisible === false;
    merged.visible = lastVisible;
  }

  return merged;
}

function composeLayeredKey(sectionKey, layerLabel, rawKey) {
  let suffix = rawKey;
  const anticipatedPrefix = `${sectionKey}-`;
  if (suffix.startsWith(anticipatedPrefix)) {
    suffix = suffix.slice(anticipatedPrefix.length);
  }
  const layerPrefix = `${layerLabel}-`;
  if (suffix.startsWith(layerPrefix)) {
    suffix = suffix.slice(layerPrefix.length);
  }
  suffix = suffix || rawKey;
  return `${sectionKey}-${layerLabel}-${suffix}`;
}
