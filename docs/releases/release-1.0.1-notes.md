# Release 1.0.1 - Notas explicativas

Esta version consolida el flujo de build y normaliza el uso de alias en tests.
El objetivo es evitar errores de resolucion y asegurar que los recursos de
prompts esten disponibles en produccion.

## Cambios principales
1) Build separado de tests
   - `tsconfig.build.json` compila solo `src/` y `main.ts`.
   - `tsconfig.json` incluye `tests/` para TS Server y alias.

2) Prompts disponibles en `dist`
   - Se agrega `scripts/copy-prompts.mjs`.
   - El build copia `prompts/` a `dist/prompts/`.

3) Alias en tests
   - Nuevo alias `@tests/*` en `tsconfig.json` y `vitest.config.ts`.
   - Imports relativos en tests migrados a `@tests/...`.

## Impacto
- No hay cambios funcionales en runtime.
- Mejora de DX en editores y coherencia de rutas.
- Build mas predecible y preparado para despliegue.

## Verificaciones recomendadas
- `npm run build`
- `npm test`
