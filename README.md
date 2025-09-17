# Tiny Weird Smile - Visor de PDF

Página estática enfocada exclusivamente en mostrar un único PDF largo ocupando todo el ancho disponible.

## Uso

1. Copia tu archivo en `assets/documento.pdf` (reemplaza el archivo existente si es necesario).
2. Abre `index.html` en el navegador. La aplicación usa [PDF.js](https://mozilla.github.io/pdf.js/) para renderizar el PDF sin interfaz adicional.
3. El documento se adapta automáticamente al ancho de la ventana. Basta con hacer scroll (aunque la barra no sea visible) para recorrerlo.

Si necesitas usar otro nombre o ruta para el archivo, edita la constante `source` en `index.html`.

## Despliegue

Funciona en cualquier hosting de archivos estáticos (GitHub Pages, Netlify, Vercel, etc.). Solo sube `index.html`, la carpeta `assets/` con tu PDF y asegúrate de tener acceso a Internet para que cargue las dependencias de PDF.js desde el CDN.
