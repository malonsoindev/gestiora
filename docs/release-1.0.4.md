# Release 1.0.4

Fecha: 2026-02-17
Version: 1.0.4
Tipo: Patch release

## Resumen
- Documentacion completa del proyecto (README.md con 18 variables de entorno).
- Landing page mejorada con stack tecnologico completo y dos videos demostrativos.
- Script de smoke test para los 34 endpoints de la API.
- Correccion de schemas Fastify para respuestas 400 en endpoints admin.
- Actualizacion del contrato OpenAPI con respuestas 400.

## Cambios

### Documentacion
- README.md ampliado con tabla de variables de entorno, credenciales seed y referencias.
- Creado `.env.example` con todas las variables organizadas por categoria.
- Seccion de videos demostrativos en README (Anatomia de un Plan, Demo Tecnica).

### Landing Page (public/index.html)
- Stack tecnologico completo: Vitest, OpenCode, GPT-5.2 Codex, Claude Opus 4.5.
- Seccion de video con dos videos en grid responsive.
- Estilos CSS para `.video-grid` y `.video-item`.

### Scripts
- `scripts/api-smoke.ts`: smoke test completo de 34 endpoints.
- Fix en `requestJson()`: solo envia Content-Type cuando hay body.
- Flujo admin reordenado: change password, login, revoke, update status, delete.
- Seguridad: credenciales movidas a variables de entorno (sin hard-coded passwords).

### Infraestructura
- `admin-users.schemas.ts`: respuestas 400 en `softDelete` y `revokeSessions`.
- `docs/openapi.yaml`: contrato actualizado con respuestas 400.

## Validaciones
- Build: OK
- Tests: OK

## Artefactos
- `public/index.html` - Landing page con videos.
- `public/assets/css/styles.css` - Estilos video-grid.
- `scripts/api-smoke.ts` - Smoke test API.
- `.env.example` - Plantilla de variables.

## Notas de despliegue
- No hay cambios de esquema en base de datos.
- Los videos estan alojados en YouTube (externos).
- El smoke test requiere variables de entorno para credenciales (ver cabecera del script).
