# Gestiora Backend - Guia del equipo

## Proposito
Gestiora es una plataforma para gestionar facturas de proveedores con apoyo de IA.
Este backend ofrece autenticacion segura, gestion documental, y consultas en lenguaje
natural (RAG). El objetivo es acelerar la operativa financiera con trazabilidad,
seguridad y escalabilidad.

Este documento es la referencia principal para:
- Presentar el producto y su propuesta de valor.
- Entender la arquitectura y las decisiones clave.
- Arrancar el proyecto en local o en produccion.
- Establecer reglas de contribucion (humanos y agentes).

## Propuesta de valor
- Automatiza la carga y analisis de facturas.
- Centraliza proveedores, facturas y auditoria.
- Permite consultas con lenguaje natural.
- Aplica Clean Architecture + DDD para mantener el dominio estable.

## Funcionalidades principales
- IAM Core: login, refresh, logout, RBAC, anti brute force.
- Gestion de proveedores y facturas (CRUD controlado por casos de uso).
- Extraccion de datos desde PDF y normalizacion.
- Indexacion RAG y consultas con contexto.
- Auditoria de acciones.

## Stack tecnico
- Node.js + TypeScript (strict).
- Fastify como servidor HTTP.
- PostgreSQL o In-Memory segun entorno.
- Genkit para RAG/IA (opcional).
- Vitest para pruebas.

## Arquitectura
Clean Architecture + DDD con capas estrictas:
- domain: entidades, value objects, errores de dominio.
- application: casos de uso y puertos.
- infrastructure: HTTP, DB, adapters externos.

Reglas:
- Domain no depende de infrastructure.
- Application depende solo de domain y ports.
- Infrastructure implementa ports y no define reglas de negocio.

## Estructura de carpetas
src/
  domain/
  application/
  infrastructure/
  composition/
  shared/
  config/
tests/
  domain/
  application/
  infrastructure/
  shared/
docs/
prompts/

## Arranque rapido
1) Instalar dependencias
   - `npm install`
2) Ejecutar en desarrollo
   - `npm run dev`

## Build
- `npm run build`
- Salida: `dist/`
- Prompts: se copian a `dist/prompts/`

## Tests
- `npm test`
- Coverage: `npx vitest run --coverage`

## Variables de entorno
Minimas:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Opcionales:
- `PORT` (default 3000)
- `NODE_ENV` (development | production | test)
- `CORS` (true | false | lista JSON | string)
- `SWAGGER` (true | false)
- `DATABASE_TYPE` (in-memory | postgres)
- `DATABASE_URL` (requerida si DATABASE_TYPE=postgres)
- `STORAGE_TYPE` (in-memory | local)
- `STORAGE_PATH` (default storage)
- `AI_AGENT_TYPE` (stub | stub-error | genkit)
- `OAI_MODEL_NAME`
- `RAG_INDEX_NAME`
- `RAG_PROMPT_DIR` (default prompts)
- `RAG_EMBEDDER_MODEL`

## Swagger / OpenAPI
- Swagger UI solo se expone si `SWAGGER=true`.
- Endpoint: `/docs`
- Especificacion: `docs/openapi.yaml`

## Documentacion
- `docs/` contiene ADRs, design docs, user stories y diagramas.
- `docs/openapi.yaml` es el contrato de la API.
- `docs/release-1.0.1.md` y notas de release en `docs/`.

## Scripts utiles
- `npm run db:deploy`
- `npm run db:apply`
- `npm run db:seed`
- `npm run api:smoke`

## Datos de prueba (seed)
- admin@example.com / AdminPass1!a
- user@example.com / UserPass1!a

## RAG y prompts
- Los prompts viven en `prompts/`.
- En build, se copian a `dist/prompts/`.
- `RAG_PROMPT_DIR` controla la ruta base.

## Reglas para contribucion (humanos y agentes)
Estas reglas son obligatorias para cambios en el codigo.

### Arquitectura y DDD
- Domain no importa infrastructure ni frameworks.
- Application usa solo domain + ports.
- Infrastructure implementa ports y evita logica de negocio.

### TDD
- Tests definen el comportamiento.
- No se cambia un test para hacer pasar el codigo.

### SOLID
- SRP, OCP, LSP, ISP, DIP obligatorios.

### TypeScript
- `strict: true`
- `any` prohibido.

### Naming
- camelCase para variables y funciones.
- PascalCase para clases y tipos.
- kebab-case para archivos.
- No prefijar interfaces con `I`.

### Calidad (RULES.md)
- `replaceAll` para reemplazos de strings.
- Evitar complejidad alta (extraer helpers).
- Usar optional chaining cuando aplique.
- No usar `void` para parametros no usados; usar `_`.
- No duplicar imports del mismo modulo.
- No usar `Math.random()` para IDs; usar `crypto`.

### Seguridad
- Passwords con bcrypt.
- JWT con bearer auth.
- No filtrar errores internos al cliente.

### OpenAPI
- El contrato es `docs/openapi.yaml`.
- Endpoints deben respetar el contrato.

### Prohibido
- Romper la separacion de capas.
- Introducir logica de negocio en controllers.
- Bypassear ports.
- Cambiar tests para evitar fallos.

## Regla final
Si hay duda, priorizar claridad, consistencia y arquitectura.
