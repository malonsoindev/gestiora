# Release 1.0.5

Fecha: 2026-02-17
Version: 1.0.5
Tipo: Minor release (Production Ready)

## Resumen
Release de produccion con cobertura de tests comprehensiva y smoke tests corregidos.
Este release marca el punto final de puesta en produccion del proyecto Gestiora.

- Cobertura de tests ampliada significativamente.
- Tests de integracion para repositorios PostgreSQL.
- Tests unitarios para repositorios in-memory.
- Tests E2E para flujos de autenticacion.
- Correccion de smoke tests (35/35 endpoints pasan).

## Cambios

### Tests Unitarios
- `tests/infrastructure/in-memory/in-memory-user.repository.spec.ts` - Tests completos.
- `tests/infrastructure/in-memory/in-memory-session.repository.spec.ts` - Tests completos.
- `tests/infrastructure/in-memory/in-memory-login-attempt.repository.spec.ts` - Tests completos.

### Tests de Integracion (PostgreSQL)
- `tests/infrastructure/postgres/postgres-user.repository.spec.ts` - Tests completos.
- `tests/infrastructure/postgres/postgres-session.repository.spec.ts` - Tests completos.
- `tests/infrastructure/postgres/postgres-login-attempt.repository.spec.ts` - Tests completos.
- `tests/infrastructure/postgres/postgres-provider.repository.spec.ts` - Tests completos.
- `tests/infrastructure/postgres/postgres-invoice.repository.spec.ts` - Tests ampliados.

### Tests E2E
- `tests/e2e/auth-flow.e2e.spec.ts` - Flujo completo de autenticacion.
- `tests/e2e/server-health.e2e.spec.ts` - Verificacion de salud del servidor.
- `tests/e2e/setup.ts` - Utilidades de configuracion para tests E2E.

### Tests de Dominio
- `tests/domain/invoice-movement.spec.ts` - Entidad InvoiceMovement.
- `tests/domain/session.spec.ts` - Entidad Session.

### Tests de Casos de Uso
- Ampliados tests de error handling en:
  - `login-user.use-case.spec.ts`
  - `logout-user.use-case.spec.ts`
  - `refresh-access-token.use-case.spec.ts`
  - `upload-invoice-document.use-case.spec.ts`

### Smoke Tests
- Corregido `TEST_USER_PASSWORD` (minimo 12 caracteres requeridos por schema).
- Agregada activacion automatica de proveedores DRAFT antes de upload PDF.
- Configurado `.env.smoke.example` con documentacion actualizada.
- 35/35 endpoints pasan correctamente.

## Metricas de Tests

### Cobertura
- **Statements:** 71.45%
- **Branches:** 59.27%
- **Functions:** 78.19%
- **Lines:** 71.42%

### Piramide de Tests
- **Unit:** 268 tests
- **Integration:** 97 tests
- **E2E:** 25 tests
- **Total:** 390 tests

### Smoke Tests API
- **Total Endpoints:** 35
- **Exitosos:** 35
- **Fallidos:** 0
- **Tiempo:** ~23 segundos

## Validaciones
- Build: `npm run build` (OK)
- Tests: `npm test` (OK)
- Smoke: `npm run api:smoke` (OK - 35/35)

## Artefactos
- `tests/` - Suite completa de tests.
- `.env.smoke.example` - Plantilla para smoke tests.
- `scripts/api-smoke.ts` - Script de smoke tests corregido.

## Archivos Modificados
- 30 archivos
- ~5,100 lineas agregadas

## Notas de Despliegue
- No hay cambios de esquema en base de datos.
- Requiere variables de entorno para smoke tests (ver `.env.smoke.example`).
- El servidor debe estar corriendo para ejecutar smoke tests.
- Datos de seed: `admin@example.com / AdminPass1!a` y `user@example.com / UserPass1!a01`.

## Compatibilidad
- Node.js >= 20
- PostgreSQL >= 14
- Compatible con versiones anteriores de la API.
