# Contexto · Tiny Weird Smile (branch `stage-refactor`)

## Qué se busca
- Scrollytelling con una única `story-stage` y capas `bg`, `mid`, `front` generadas dinámicamente.
- Mantenimiento del layout desde un modo visual (drag/scale) con export a JSON (`config-layout.json`).
- Preparar herramientas utilitarias: indicadores de escena, potencial selección múltiple y duplicado manual.

## Estado del layout
- Se restauraron las posiciones originales (`config-layout.json`) para `intro`, `ciudad`, `noche`. Las entradas conservan `scalePercent` y `zIndex`; `scaleYPercent` ya no se usa.
- `universo` se agregó debajo de `noche` con todos los assets alineados en `x` y espaciados en `y` para edición rápida.
- `jardin` ya está montado después de `universo` con separaciones verticales similares para facilitar ajustes.
- `fin` quedó al final con todas las piezas alineadas en `x` y separadas verticalmente.
- Estructura actual del JSON: escenas ordenadas con sus capas; `triniti` ahora es parte de `noche`.

## Cambios recientes
- Eliminada la escala vertical independiente; los handles sólo escalan proporcionalmente desde el centro.
- `applyLayout` aplica `translate` + `scale` en todos los elementos.
- Se agregó soporte a duplicado lógico mediante `duplicateOf` en `config-layout.json` para reutilizar assets existentes.
- `styles.css` mantiene el stage alineado a la izquierda (`justify-content: flex-start`) con fondo plano negro.
- Pantalla de título con botón "Entrar" que activa el track y centra `intro:hoyo`; el botón de audio queda disponible después.
- Fade rápido al final del scroll: cubre el retorno al inicio sin mostrar el salto.
- Paralaje por capa (`bg` más lento, `mid` intermedio, `front` full); cada item puede sobrescribir con `parallaxFactor` en el layout.
- Overlay de glow (`screen-glow`) fijo con pulso verde tenue para ambientar.

## Herramientas pendientes / ideas
- Selección múltiple con overlay estilo indicador de escena para mover varios ítems juntos.
- Duplicar ítems: por ahora se puede copiar entradas en `config-layout.json`; resta decidir si vale la pena exponerlo en UI.

## Qué revisar mañana
1. Decidir si implementamos selección múltiple con overlay antes de duplicado.
2. Ajustar detalles de `noche`, `universo`, `jardin` y `fin` según feedback visual.
3. Validar la sensación del loop con fade (timings, easing) y la mezcla de audio antes del release.

## Recordatorios
- Manifest y config deben mantenerse sincronizados (para cada asset usado debe existir una entrada en `config`).
- El modo layout copia automáticamente el JSON al salir; mantenerlo como fuente de verdad.
