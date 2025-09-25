// Centraliza los valores de posición/escala por figura para evitar editar el HTML.
// Las claves de primer nivel son las secciones (intro, ciudad, etc.); dentro, cada figura usa
// un slug automático derivado de su alt (por ejemplo `intro-llave`). Puedes comprobarlo en devtools
// vía el atributo `data-layout-key` que app.js añade a cada <figure>.
// Propiedades disponibles por item:
//   baseX / baseY  → desplazamiento en vw/vh (por defecto 0)
//   baseScale      → multiplicador de escala (por defecto 1)
//   animate        → preset de animación existente (fade-in, zoom-in, flash, slide-h, loop-rise, orbit, sweep, bloom)
//   fullWidth      → ajusta el <img> a 100vw de ancho manteniendo height auto
//   width / height → tamaños específicos (acepta número en px, e.g. 480, o string con unidades, e.g. '60vw')
//   zIndex         → control de profundidad dentro de la sección (se aplica como style.zIndex)
//   hidden         → cuando es true oculta por completo la figura (visible también acepta false)
//   group          → referencia la clave de otra figura para heredar sus ajustes/visibilidad
//   offsetX/Y      → desplaza en relación al parent (se suma al baseX/baseY que herede)
//   note           → texto opcional para recordar la intención del ajuste
//   _meta          → reservado por sección para controlar zIndex/offsets/márgenes del contenedor completo
// Si omites una propiedad, app.js retomará el valor original declarado en el HTML.

window.STORY_LAYOUT = {
  intro: {
    _meta: { zIndex: 70 },
    // --- front ---
    'intro-front-hoyo': { baseX: 0, baseY: -25, baseScale: 1.3 },
    'intro-front-llave': { baseX: 0, baseY: 60, baseScale: 1 },
  },
  ciudad: {
    _meta: { zIndex: 60 },
    // --- bg ---
    'ciudad-bg-edificio': { baseX: -3, baseY: 45, baseScale: 1, fullWidth: true, hidden: false },
    // --- mid ---
    'ciudad-mid-chicago': { baseX: 0, baseY: 20, baseScale: 1 },
    // --- front ---
    'ciudad-front-chicago-foto': { baseX: -20, baseY: 10, baseScale: 1 },
    'ciudad-front-mies': { baseX: -10, baseY: 110, baseScale: 1 },
    'ciudad-front-mies-2': { offsetX: 10, offsetY: 30, group: 'ciudad-front-mies' },
    'ciudad-front-mies-3': { offsetX: 12, offsetY: 60, group: 'ciudad-front-mies' },
    'ciudad-front-mies-4': { offsetX: 12, offsetY: 100, group: 'ciudad-front-mies' },
    'ciudad-front-nuclear': { offsetX: -3, offsetY: 147, group: 'ciudad-front-mies' },
  },
  noche: {
    _meta: { zIndex: 50, marginTop: '350vh' },
    // --- bg ---
    'noche-bg-grid': { baseX: -0.3, baseY: -18, baseScale: 1, zIndex: -10, hidden: false, fullWidth: true },
    'noche-bg-ojos': { baseX: 0, baseY: 220, baseScale: 2, hidden: false, fullWidth: true },
    'noche-bg-ojos-2': { baseX: 0, baseY: 300, baseScale: 2, hidden: false },
    // --- mid ---
    'noche-mid-guera': { baseX: -5, baseY: -40, baseScale: 1 },
    'noche-mid-patrulla': { group: 'noche-mid-guera', offsetY: 408 },
    'noche-mid-ojos-front': { group: 'noche-mid-guera', offsetX: 5, offsetY: 80 },
    // --- front ---
    'noche-front-miles-1': { baseX: 20, baseY: -40, baseScale: 1 },
    'noche-front-miles-2': { group: 'noche-front-miles-1', offsetY: 17.7 },
    'noche-front-ninja': { group: 'noche-front-miles-1', offsetX: -32, offsetY: 44 },
    'noche-front-ninja-2': { group: 'noche-front-miles-1', offsetX: -12, offsetY: 76 },
    'noche-front-ninja-3': { group: 'noche-front-miles-1', offsetX: -12, offsetY: 156 },
    'noche-front-aura': { group: 'noche-front-miles-1', offsetX: -45, offsetY: 178, zIndex: 10 },
    'noche-front-hoyo-negro': { group: 'noche-front-miles-1', offsetX: -20, offsetY: 204 },
    'noche-front-cochera': { offsetY: 220 },
    'noche-front-cochera-2': { offsetY: 270 },
    'noche-front-estacionamiento': { offsetY: 330 },
    'noche-front-mira': { offsetX: 20, offsetY: 365 },
  },
  universo: {
    _meta: { zIndex: 40, marginTop: '430vh' },
    // --- bg ---
    'universo-bg-supernova': { baseX: 0, baseY: 150, baseScale: 1, hidden: false, fullWidth: true },
    'universo-bg-hoyo': { baseX: 0, baseY: 280, baseScale: 1, hidden: false, fullWidth: true },
    // --- mid ---
    'universo-mid-hoyo': { baseX: 0, baseY: -45, baseScale: 1 },
    'universo-mid-hoyo-2': { group: 'universo-mid-hoyo', offsetY: 115 },
    'universo-mid-hoyo-3': { group: 'universo-mid-hoyo', offsetY: 164 },
    'universo-mid-esfera': { group: 'universo-mid-hoyo', offsetX: -30, offsetY: 150 },
    'universo-mid-esfera-2': { group: 'universo-mid-hoyo', offsetX: -20, offsetY: 170 },
    'universo-mid-esfera-3': { group: 'universo-mid-hoyo', offsetX: 20, offsetY: 190 },
    'universo-mid-huevo': { group: 'universo-mid-hoyo', offsetY: 225 },
    'universo-mid-teorica': { group: 'universo-mid-hoyo', offsetX: -15, offsetY: 60 },
    // --- front ---
    'universo-front-mirada': { offsetX: -20, offsetY: -40 },
    'universo-front-perlas': { offsetX: 20, offsetY: -30 },
    'universo-front-esfera-4': { offsetX: 20, offsetY: 180 },
    'universo-front-fuego': {  offsetY: 20 },
    'universo-front-hoyo-3': { offsetX: 7, offsetY: 230 },
    'universo-front-baile': { baseX: -25, baseY: 230, baseScale: 1 },
    'universo-front-kirsten': { offsetY: 128, hidden: true },
    'universo-front-poseido': { offsetY: 90 },
    'universo-front-sombra': { offsetX: 20, offsetY: 245, baseScale: .6 },
    'universo-front-teorema': { offsetX: -20, offsetY: 260 },
  },
  jardin: {
    _meta: { zIndex: 50, marginTop: '280vh' },
    // --- bg ---
    'jardin-bg-bosco': { baseX: 0, baseY: 60, baseScale: 1, hidden: false, fullWidth: true },
    // --- mid ---
    'jardin-mid-cabeza': { baseX: 0, baseY: 120, baseScale: 1 },
    // --- front ---
    'jardin-front-kurt': { baseX: -20, baseY: -10, baseScale: 1 },
    'jardin-front-mies': {  offsetX: -20, offsetY: 28 },
    'jardin-front-edificio': { offsetX: 20, offsetY: 50 },
    'jardin-front-dibujo': { offsetX: -20, offsetY: 86 },
    'jardin-front-dvndra': { offsetX: 20, offsetY: 12 },
    'jardin-front-huxley': { offsetX: 18, offsetY: 88 },
    'jardin-front-huxley-dibujo': { offsetX: 26, offsetY: 93, zIndex: -1},
    'jardin-front-pez': { offsetX: 20, offsetY: 125 },
  },
  pintura: {
    _meta: { zIndex: 20, marginTop: '210vh' },
    // --- front ---
    'pintura-front-1': { baseX: 0, baseY: -45, baseScale: 1, fullWidth: true },
    'pintura-front-2': { group: 'pintura-front-1', offsetY: 83, fullWidth: true },
    'pintura-front-3': { group: 'pintura-front-1', offsetY: 150, fullWidth: true },
  },
  fin: {
    _meta: { zIndex: 10, marginTop: '210vh' },
    // --- front ---
    'fin-front-ecuacion': { baseX: 0, baseY: -30, baseScale: 1.6 },
  },
};
