# Gestiora Backend

Backend para la gestion inteligente de facturas de proveedores con IA. Centraliza proveedores, facturas y auditoria, permite consultas en lenguaje natural (RAG) y mantiene trazabilidad con una arquitectura limpia y escalable.

## Descripcion
API en Node.js + TypeScript orientada a procesos financieros. Implementa autenticacion, gestion documental y consultas con contexto, con enfasis en trazabilidad y consistencia del dominio.

## Propuesta de valor
- Unifica facturas y proveedores con trazabilidad completa.
- Reduce tareas manuales con extraccion asistida y RAG.
- Mantiene reglas de negocio estables gracias a Clean Architecture + DDD.

## Estado del proyecto
En desarrollo activo.

## Caracteristicas
- IAM Core: login, refresh, logout, RBAC, anti brute force.
- Gestion de proveedores y facturas mediante casos de uso.
- Extraccion de datos desde PDF.
- RAG: indexacion y consultas en lenguaje natural.
- Auditoria de acciones.

## Arquitectura
Se utiliza Clean Architecture + DDD para aislar el dominio de detalles de infraestructura. Esto permite evolucionar reglas de negocio sin acoplarlas a frameworks, y facilita pruebas unitarias y cambios de persistencia o delivery.

Las capas se organizan para que:
- `domain` sea el nucleo estable con entidades, value objects y errores.
- `application` orqueste casos de uso y puertos.
- `infrastructure` implemente adaptadores (HTTP, DB, servicios externos).
- `composition` ensamble dependencias.

Decisiones de diseno:
- Result<T, E> para manejar errores de forma explicita.
- Separacion estricta de puertos e implementaciones.
- Fastify por rendimiento y tipado consistente.

Principios de desarrollo:
- TDD obligatorio y SOLID en todas las capas.
- `strict: true` en TypeScript y `any` prohibido.
- No logica de negocio en controllers.

## Estructura de carpetas
```
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
```

## Requisitos
- Node.js 20+

## Instalacion
```bash
npm install
```

## Configuracion
Variables de entorno:

| Variable | Requerida | Descripcion | Default |
| --- | --- | --- | --- |
| JWT_ACCESS_SECRET | Si | Secreto para JWT de acceso | - |
| JWT_REFRESH_SECRET | Si | Secreto para JWT de refresh | - |
| PORT | No | Puerto del servidor | 3000 |
| NODE_ENV | No | Entorno de ejecucion | development |
| CORS | No | CORS (true, false, lista JSON o string) | - |
| SWAGGER | No | Expone Swagger UI en /docs | false |
| DATABASE_TYPE | No | in-memory o postgres | in-memory |
| DATABASE_URL | Condicional | Requerida si DATABASE_TYPE=postgres | - |
| STORAGE_TYPE | No | in-memory o local | in-memory |
| STORAGE_PATH | No | Ruta local de almacenamiento | storage |
| AI_AGENT_TYPE | No | stub, stub-error o genkit | stub |
| OAI_MODEL_NAME | No | Modelo para Genkit | - |
| RAG_INDEX_NAME | No | Nombre del indice RAG | gestiora-rag |
| RAG_PROMPT_DIR | No | Ruta base de prompts | prompts |
| RAG_EMBEDDER_MODEL | No | Modelo de embeddings | text-embedding-3-small |

## Ejecucion
Desarrollo:
```bash
npm run dev
```

Build:
```bash
npm run build
```

## Tests
```bash
npm test
```

Coverage:
```bash
npx vitest run --coverage
```

## Ejemplos de uso (curl)
Login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"AdminPass1!a\"}"
```

Refresh:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"refreshToken\":\"<REFRESH_TOKEN>\"}"
```

Subir factura PDF:
```bash
curl -X POST http://localhost:3000/documents \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/ruta/a/factura.pdf"
```

Flujo tipico (login -> subir documento -> consulta RAG):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"AdminPass1!a\"}"

curl -X POST http://localhost:3000/documents \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/ruta/a/factura.pdf"
```

## OpenAPI / Swagger
- Swagger UI: `/docs` (solo si `SWAGGER=true`)
- OpenAPI: `docs/openapi.yaml`

## Documentacion adicional
- Guia del equipo: `AGENTS.md`
- Reglas de calidad: `RULES.md`
- Diseno y decisiones: `docs/`

## Reglas de contribucion
- Respetar Clean Architecture + DDD.
- Mantener separacion de capas y puertos.
- No modificar tests para pasar implementaciones.
- Evitar `any` y duplicidad de imports.

## Seguridad
- Passwords con bcrypt.
- JWT con bearer auth.
- No filtrar errores internos al cliente.

## Licencia
ISC
