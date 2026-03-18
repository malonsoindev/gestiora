# Release 1.0.7

Fecha: 2026-03-12
Version: 1.0.7
Tipo: Minor release (Documentacion)

## Resumen
Actualizacion de la documentacion principal del proyecto para reflejar la incorporacion
de la CLI de administracion como herramienta del ecosistema Gestiora.

- Inclusion de la CLI en la seccion de funcionalidades del README principal.
- Actualizacion de la estructura del proyecto para reflejar el formato monorepo (API + CLI).
- Instrucciones de ejecucion de la CLI con referencia al README y Design Document.
- Actualizacion de la web de presentacion (index.html) con tarjeta de la CLI.
- Grid de funcionalidades ampliado a 4 columnas responsive.

## Cambios

### README.md
- Nueva seccion "CLI de Administracion y Gestion" en Funcionalidades.
- Estructura del proyecto actualizada para mostrar el nodo `cli/`.
- Nuevo apartado "Ejecucion de la CLI" con comandos e instrucciones de entorno.
- Referencia cruzada al README de la CLI y al Design Document DD-CLI-001.

### Web de Presentacion (public/index.html)
- Añadida tarjeta "CLI de Administracion" con icono de terminal SVG.
- Seccion de funcionalidades ampliada a full-width para alojar 4 tarjetas.

### Estilos (public/assets/css/styles.css)
- Nuevo modificador `.full-width-section` con contenedor de 1600px.
- Grid de 4 columnas con breakpoints responsive (2 columnas en tablet, 1 en movil).

## Archivos Modificados
- `README.md` — Documentacion de la CLI integrada.
- `public/index.html` — Tarjeta de funcionalidad y layout ampliado.
- `public/assets/css/styles.css` — Estilos responsive para 4 columnas.
- `package.json` — Version 1.0.7.
