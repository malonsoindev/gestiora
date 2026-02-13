# Release 1.0.2

Fecha: 2026-02-13
Version: 1.0.2
Tipo: Patch release

## Resumen
- Ajustes de build para usar `tsc-alias` y el script `copy-assets`.
- Limpieza de dependencias en `package.json` (duplicados y organizacion).

## Validaciones
- Build: no ejecutado (pendiente).
- Tests: no ejecutado (pendiente).

## Artefactos
- `dist/` generado por `tsc -p tsconfig.build.json`.
- `dist/prompts/` copiado por `scripts/copy-assets.mjs`.

## Notas de despliegue
- Verificar que `tsc-alias` queda disponible en entorno de build.
- Mantener `RAG_PROMPT_DIR` apuntando a `prompts` (por defecto).
