# Contexto · Tiny Weird Smile (branch `stage-refactor`)

## Qué se busca
- Construir un scrollytelling con un único escenario (un solo contenedor) donde convivan las imágenes recortadas etiquetadas como `escena-nivel-nombre`.
- Mantener las tres capas (`bg`, `mid`, `front`) para lograr el efecto de paralaje / profundidad.
- Cada escena (intro, ciudad, noche, universo, jardin, pintura, fin) debería poder moverse como bloque, similar a las secciones originales, pero sin necesidad de fragmentar el DOM en múltiples secciones.

## Cómo pensamos lograrlo
- Generar una estructura mínima en HTML con una sola `story-stage` y tres contenedores de capa vacíos.
- En JavaScript, tomar la lista de assets (las imágenes en `recortadas/`), interpretar la etiqueta `escena-nivel-nombre` y crear dinámicamente los nodos `<figure>` en la capa correspondiente.
- Mantener un “layout manager” que permita:
  - Posicionar manualmente ciertos elementos clave (por ejemplo `intro-front-hoyo`, `intro-front-llave`).
  - Calcular posiciones por defecto para el resto (por escena y por capa), de forma que podamos desplazarlos juntos más adelante.
- Pensar en una capa de animación que aplique parallax sobre la posición base de cada capa (por ejemplo, usando `ScrollTrigger` con offsets diferentes para `bg`, `mid`, `front`).

## Preguntas abiertas / próximos pasos
1. ¿Queremos seguir usando `ScrollTrigger`? Se puede trabajar con una sola sección “pinneda” y animar los offsets de cada escena, o bien con timelines que muevan grupos completos sin dividir el DOM en múltiples secciones.
2. Definir exactamente cómo se agrupan y mueven las escenas. Una idea es encapsular cada escena en un contenedor virtual (por ejemplo, un objeto con `items` + posición base) y mover todo ese grupo sumando offsets.
3. Necesitamos decidir si habrá auto-scroll o interacción manual, para dimensionar el loop de animaciones.
4. Falta acordar el layout base (posición X/Y y escala) de cada escena para que no se empalmen.

## Estado actual (14/03)
- Stage única con contenedores `bg/mid/front` en `index.html`; `app.js` genera dinámicamente todas las escenas listadas en `tiny-imagenes/manifest.json`.
- `tiny-imagenes/manifest.json` incluye las escenas `intro` y `ciudad`; los assets se copian ahí con el patrón `escena-capa-nombre`.
- `config-layout.json` guarda posiciones/escala por escena, permite comentarios (`// Escena`, `// Capa`) y se alinea con el formato que copia el modo layout.
- Modo layout: arrastre + handles de escala proporcional, panel oculto pero se copia automáticamente el JSON al salir del modo. Altura del stage se ajusta sola según los items.

## Recordatorios
- Rama: `stage-refactor`. Último commit previo `Simplify stage prototype layout`.
- Archivos clave: `index.html`, `styles.css`, `app.js`, `tiny-imagenes/manifest.json`, `config-layout.json`.
- Las escenas deben declararse tanto en el `manifest` como en el `config` para que se rendericen; al borrar/renombrar assets hay que sincronizar ambos.

## Para mañana
1. Ordenar/posicionar la escena `ciudad` usando el modo layout y copiar los valores definitivos al config.
2. Definir si seguimos con la siguiente escena (`noche`, `universo`, etc.) y preparar sus assets en `tiny-imagenes/`.
3. Evaluar automatizar la generación de `manifest.json` / `config-layout.json` (script dev) para futuras iteraciones.
4. Revisar cómo queremos agrupar escenas y offsets globales (`SCENE_OFFSETS`) de cara al scrollytelling.
