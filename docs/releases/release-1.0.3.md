# Release 1.0.3

Fecha: 2026-02-13
Version: 1.0.3
Tipo: Patch release

## Resumen
- Reindexado global del RAG al arrancar el servicio.
- Nuevo servicio de reindexado total de facturas con paginado.

## Validaciones
- Build: no ejecutado (pendiente).
- Tests: no ejecutado (pendiente).

## Artefactos
- Sin cambios adicionales.

## Notas de despliegue
- El arranque falla si el reindexado RAG falla; revisar credenciales y acceso al modelo.
- Considerar el tiempo de reindexado si hay volumen alto de facturas.
