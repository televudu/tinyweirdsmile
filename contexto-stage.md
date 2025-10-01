# Contexto · Tiny Weird Smile (branch `stage-refactor`)

## Qué se busca
- Scrollytelling con una única `story-stage` y capas `bg`, `mid`, `front` generadas dinámicamente.
- Mantenimiento del layout desde un modo visual (drag/scale) con export a JSON (`config-layout.json`).
- Preparar herramientas utilitarias: indicadores de escena, potencial selección múltiple y duplicado manual.

## Estado del layout
- Se restauraron las posiciones originales (`config-layout.json`) para `intro`, `ciudad`, `noche`. Las entradas conservan `scalePercent` y `zIndex`; `scaleYPercent` ya no se usa.
- `universo` se amplió con nuevos ítems front (`lynch`, `mano`) y mantiene la alineación vertical para edición rápida.
- `jardin` continúa después de `universo` con separaciones similares; sin cambios de contenido.
- `fin` incorpora la nueva capa `mid:trace` y el elemento `front:shadow`, manteniendo el resto alineado en `x`.
- Estructura del JSON: escenas ordenadas con sus capas; `triniti` sigue dentro de `noche`.

## Cambios recientes
- Eliminada la escala vertical independiente; los handles sólo escalan proporcionalmente desde el centro.
- `applyLayout` aplica `translate` + `scale` en todos los elementos.
- Se agregó soporte a duplicado lógico mediante `duplicateOf` en `config-layout.json` para reutilizar assets existentes.
- `app.js` ahora crea `<video>` para assets `.webm/.mp4`, reproduce en loop silencioso y respeta el mismo flujo de layout que las imágenes.
- `tiny-imagenes/manifest.json` incluye los nuevos assets (`universo-front-lynch`, `universo-front-mano.webm`, `fin-front-shadow`, `fin-mid-trace`).
- Se retiró `universo-front-back` del manifiesto y del layout, sin alterar el resto de escenas.
- Playlist de audio extendida con `tinyweirdsmile-c.mp3`; la rotación ahora es A→B→C.
- `styles.css` eleva `scene-indicator-layer` (z-index 9999) para que los indicadores nunca queden ocultos en modo layout.
- Botón de modo layout presente en el DOM para activar/desactivar la edición.
- Fade rápido al final del scroll: cubre el retorno al inicio sin mostrar el salto.
- Paralaje por capa (`bg` más lento, `mid` intermedio, `front` full); cada item puede sobrescribir con `parallaxFactor` en el layout.
- Los ítems aceptan `hidden` y `parallaxFactor` en `config-layout.json` para ocultarlos o ajustar su desplazamiento.

## Herramientas pendientes / ideas
- Selección múltiple con overlay estilo indicador de escena para mover varios ítems juntos.
- Duplicar ítems: por ahora se puede copiar entradas en `config-layout.json`; resta decidir si vale la pena exponerlo en UI.

## Qué revisar mañana
1. Probar el nuevo `universo-front-mano.webm` en navegadores objetivo (autoplay vs. políticas de sonido) y ajustar si requiere fallback.
2. Auditar la mezcla de audio con la tercera pista (`tinyweirdsmile-c.mp3`) para balancear niveles y transición.
3. Ajustar posiciones/escala de los nuevos assets (`universo` y `fin`) usando el modo layout con el toggle reactivado.
4. Revisar si conviene exponer un editor visual independiente o automatizar el alta de assets (CLI/plantilla).

## Recordatorios
- Manifest y config deben mantenerse sincronizados (para cada asset usado debe existir una entrada en `config`).
- El modo layout copia automáticamente el JSON al salir; mantenerlo como fuente de verdad.
- Capa `ninja3` tiene clones `ghost1-3` ocultos (`hidden: true`); activar manualmente si se reintroduce el efecto.
- Paralaje normalizado: desplazamientos basados en scroll base para compatibilidad cross-browser.
- Música reproduce `tinyweirdsmile.mp3` seguido de `tinyweirdsmile-b.mp3` en bucle.
- Trabajo en curso en la rama `feature-media-updates`; la rama `stage-refactor` quedó sin tocar desde esta iteración.
