# Release 1.0.1

Fecha: 2026-02-12
Version: 1.0.1
Tipo: Patch release

## Resumen
- Ajustes de build para separar tests y copiar prompts.
- Alineacion de imports con alias en tests.
- Configuracion de alias `@tests` para TS y Vitest.

## Validaciones
- Build: `npm run build` (ok)
- Tests: `npm test` (ok)

## Artefactos
- `dist/` generado por `tsc -p tsconfig.build.json`
- `dist/prompts/` copiado por `scripts/copy-prompts.mjs`

## Notas de despliegue
- Asegurar `RAG_PROMPT_DIR` apuntando a `prompts` (por defecto).
- Si se ejecuta desde `dist`, el prompt queda en `dist/prompts`.
