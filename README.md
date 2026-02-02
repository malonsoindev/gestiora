Gestiora Backend

Backend en Node.js + TypeScript con Clean Architecture y DDD. El foco actual es IAM Core
(login, refresh, logout, RBAC, anti brute force) con puertos y adaptadores in-memory.

Requisitos
- Node.js 20+

Instalacion
1) npm install

Ejecucion (dev)
1) npm run dev

Tests
1) npm test

Database schema
1) npm run db:apply

Variables de entorno
- PORT (por defecto 3000)

Credenciales de prueba (seed)
- admin@example.com / AdminPass1!a
- user@example.com / UserPass1!a

Endpoints (v1)
- POST /auth/login (publico)
- POST /auth/refresh (protegido)
- POST /auth/logout (protegido)

Ejemplos con curl

Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"AdminPass1!a\"}"

Refresh (requiere Bearer)
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"refreshToken\":\"<REFRESH_TOKEN>\"}"

Logout (requiere Bearer)
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d "{\"refreshToken\":\"<REFRESH_TOKEN>\"}"

Notas de arquitectura
- Domain no depende de infra.
- Application usa Result<T, E> en use cases y puertos.
- Infraestructura HTTP: Fastify con controladores separados.

Estructura de carpetas
src/
  domain/
    entities/
    value-objects/
    events/
    errors/
  application/
    use-cases/
    ports/
    dto/
    errors/
  infrastructure/
    delivery/http/
      controllers/
      routes/
      middlewares/
    persistence/
    adapters/
  composition/
  shared/
  config/
tests/
  domain/
  application/
  infrastructure/
  shared/
