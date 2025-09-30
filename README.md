# Tiny Weird Smile · Stage Prototype

Experiencia scrollytelling construida para explorar el universo visual de *Tiny Weird Smile*. El escenario se genera dinámicamente a partir de un manifiesto de assets y un layout exportable desde un modo de edición visual.

## Visión general

- **Stage única** con capas `bg`, `mid`, `front` renderizadas mediante JavaScript.
- **Modo layout** (draggable/scale) que permite ajustar posiciones, escala, z-index y duplicados, exportando un JSON (`config-layout.json`).
- **Paralaje y loop de scroll** automatizados para dar continuidad a la narrativa.
- **Soporte multimedia mixto**: imágenes (PNG/JPG/WebP) y clips WebM/MP4 silenciosos que se inyectan como `<video>` en loop.
- **Banda sonora** en rotación (`tinyweirdsmile.mp3`, `tinyweirdsmile-b.mp3`, `tinyweirdsmile-c.mp3`).

## Arquitectura rápida

| Archivo | Descripción |
| --- | --- |
| `index.html` | Monta la estructura base (stage, capas y overlays). |
| `styles.css` | Estilos principales del stage, modo layout e indicadores. |
| `app.js` | Runtime: carga manifiesto/layout, crea items, aplica paralaje, loop de scroll y controles de audio. |
| `config-layout.json` | Layout editable por escena (posiciones, escala, duplicados, parallax). |
| `tiny-imagenes/manifest.json` | Lista de assets disponibles; el loader genera cada item a partir de aquí. |
| `contexto-stage.md` | Documentación viva del estado actual y siguientes pasos. |

## Flujo de trabajo

1. **Preparar assets**
   - Nombres de archivo: `<escena>-<capa>-<id>.<ext>` (ej. `noche-front-ninja3.jpg`).
   - Agregar el nombre al `tiny-imagenes/manifest.json` en la sección correcta.

2. **Ajustar layout**
   - Ingresar al modo layout (botón opcional o atajo manual) para arrastrar y escalar.
   - Salir del modo para que el layout actualizado se copie al portapapeles; pegar cambios en `config-layout.json`.

3. **Duplicados y extras**
   - Usar `duplicateOf` cuando se reutiliza un asset con distinto posicionamiento.
   - `config-layout.json` admite `hidden`, `parallaxFactor` y overrides de capa/zIndex.

4. **Audio**
   - Colocar nuevas pistas en `audio/` y sumarlas a `AUDIO_TRACKS` en `app.js`.

## Roadmap

- Exponer nuevamente el toggle de modo layout como parte de la UI final.
- Ajustar posiciones/escala de los nuevos assets (`universo` y `fin`).
- Evaluar editor visual o CLI para automatizar altas de assets.
- Validar autoplay del WebM en los navegadores objetivo y definir fallback si es necesario.

## Branches

- Trabajo en curso: `feature-media-updates` (incluye soporte de video, nuevos assets y playlist extendida).
- Base original: `stage-refactor`.

## Requisitos

- Navegador moderno con soporte para WebM (VP9) y Web Audio.
- Para edición, habilitar el modo layout y contar con `navigator.clipboard` (HTTPS o localhost).

## Créditos

Proyecto experimental para *Tiny Weird Smile*; assets y audio provienen del equipo creativo. El runtime es custom (Vanilla JS + CSS), sin dependencias externas.
