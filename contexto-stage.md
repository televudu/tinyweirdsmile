# Contexto · Tiny Weird Smile (branch `stage-refactor`)

## Qué se busca
- Scrollytelling con una única `story-stage` y capas `bg`, `mid`, `front` generadas dinámicamente.
- Mantenimiento del layout desde un modo visual (drag/scale) con export a JSON (`config-layout.json`).
- Preparar herramientas utilitarias: indicadores de escena, potencial selección múltiple y duplicado manual.

## Estado del layout
- Se restauraron las posiciones originales (`config-layout.json`) para `intro`, `ciudad`, `noche`. Las entradas conservan `scalePercent` y `zIndex`; `scaleYPercent` ya no se usa.
- `fillWidth` sigue disponible: fuerza el ancho a 1920 px, ignora la escala manual y deja mover sólo en `y`.
- Estructura actual del JSON: escenas ordenadas con sus capas; `triniti` ahora es parte de `noche`.

## Cambios recientes
- Eliminada la escala vertical independiente; los handles sólo escalan proporcionalmente desde el centro.
- `applyLayout` aplica `translate` + `scale`; si `fillWidth` está activo, define `width = 1920px` e ignora la escala.
- `updateStageHeightFromItems` usa el alto calculado tras aplicar `fillWidth` para ajustar la altura total.
- `styles.css` mantiene el stage alineado a la izquierda (`justify-content: flex-start`) con fondo plano negro.

## Herramientas pendientes / ideas
- Selección múltiple con overlay estilo indicador de escena para mover varios ítems juntos.
- Duplicar ítems: por ahora se puede copiar entradas en `config-layout.json`; resta decidir si vale la pena exponerlo en UI.

## Qué revisar mañana
1. Decidir si implementamos selección múltiple con overlay antes de duplicado.
2. Ajustar `fillWidth` según flujo real (¿necesitamos bloquear `x` completamente? ¿mostrar que ignora escala?).
3. Seguir acomodando `noche` con los valores restaurados.
4. Si se define la herramienta de duplicado, decidir formato de IDs (`copy`, `clone`, etc.) y si se editarán archivos.

## Recordatorios
- Manifest y config deben mantenerse sincronizados (para cada asset usado debe existir una entrada en `config`).
- El modo layout copia automáticamente el JSON al salir; mantenerlo como fuente de verdad.
- Si se usa `fillWidth`, el asset se posiciona mediante `y` y `zIndex`; no arrastrar en `x` para evitar confusión.
