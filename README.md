# Tiny Weird Smile - Visor de PDF

Página estática enfocada exclusivamente en mostrar un único PDF largo ocupando todo el ancho disponible.

## Uso

1. Copia tu archivo en `assets/documento.pdf` (reemplaza el archivo existente si es necesario).
2. Abre `index.html` en el navegador. El PDF se incrusta en un `iframe` a pantalla completa sin controles visibles.
3. El documento se adapta automáticamente al ancho de la ventana. Basta con hacer scroll (aunque la barra no sea visible) para recorrerlo.

Si necesitas usar otro nombre o ruta para el archivo, actualiza el atributo `src` del `iframe` en `index.html`.

## Despliegue

Funciona en cualquier hosting de archivos estáticos (GitHub Pages, Netlify, Vercel, etc.). Solo sube `index.html` y la carpeta `assets/` con tu PDF.
