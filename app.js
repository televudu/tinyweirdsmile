const stageEl = document.querySelector('.story-stage');
const items = Array.from(document.querySelectorAll('.story-item'));
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const ITEM_LAYOUT = {
  'intro-hoyo': { x: 800, y: 240, scale: 1 },
  'intro-llave': { x: 820, y: 520, scale: 1 },
};

function applyLayout() {
  const availableWidth = window.innerWidth;
  const scale = availableWidth / BASE_WIDTH;
  document.documentElement.style.setProperty('--stage-scale', scale);

  items.forEach((item) => {
    const key = item.dataset.key;
    const layout = ITEM_LAYOUT[key];
    if (!layout) {
      return;
    }
    const x = layout.x;
    const y = layout.y;
    const itemScale = layout.scale ?? 1;

    item.style.transform = `translate(${x}px, ${y}px) scale(${itemScale})`;
  });
}

applyLayout();
window.addEventListener('resize', applyLayout);
