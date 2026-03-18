# Composition Root

## Descripcion

El **Composition Root** es el unico punto de la aplicacion donde se ensamblan todas las dependencias. Siguiendo los principios de **Dependency Injection** y **Clean Architecture**, este archivo:

1. Crea todas las instancias de infraestructura (repositorios, adaptadores, servicios externos)
2. Inyecta las dependencias en los casos de uso
3. Exporta un objeto `compositionRoot` que contiene todos los componentes listos para usar

**Ubicacion:** `src/composition/index.ts`

## Por que un unico Composition Root

Segun Mark Seemann (autor de "Dependency Injection in .NET"), el Composition Root debe ser:
- **Unico**: Un solo lugar donde se configura todo el grafo de dependencias
- **Lo mas tarde posible**: En el punto de entrada de la aplicacion
- **Cercano a la raiz**: No disperso en multiples archivos

Esto garantiza:
- Visibilidad completa del grafo de dependencias
- Facilidad para cambiar implementaciones (ej: InMemory a Postgres)
- Testabilidad (los tests pueden crear su propio Composition Root con stubs)

## Estructura del archivo

```
src/composition/index.ts
|
+-- Imports (lineas 1-84)
|
+-- Constantes de configuracion (lineas 86-90)
|
+-- Infraestructura: Database & Repositories (lineas 92-141)
|
+-- Infraestructura: RAG/IA (lineas 143-198)
|
+-- Use Cases: Autenticacion (lineas 200-247)
|
+-- Use Cases: Usuarios (lineas 249-303)
|
+-- Use Cases: Proveedores (lineas 305-339)
|
+-- Use Cases: Facturas (lineas 341-399)
|
+-- Infraestructura: Extraccion PDF/IA (lineas 401-450)
|
+-- Export: compositionRoot (lineas 452-507)
|
+-- Funcion: seedUsers (lineas 509-575)
```

## Componentes por categoria

### 1. Constantes de configuracion

| Constante | Valor | Descripcion |
|-----------|-------|-------------|
| `ACCESS_TOKEN_TTL_SECONDS` | 900 | Tiempo de vida del access token (15 min) |
| `REFRESH_TOKEN_TTL_SECONDS` | 2,592,000 | Tiempo de vida del refresh token (30 dias) |
| `MAX_LOGIN_ATTEMPTS` | 5 | Intentos maximos antes de bloqueo |
| `LOGIN_WINDOW_MINUTES` | 15 | Ventana de tiempo para contar intentos |
| `LOGIN_LOCK_MINUTES` | 30 | Duracion del bloqueo por brute force |

### 2. Repositorios

Los repositorios se seleccionan segun la variable de entorno `DATABASE_TYPE`:

| Repositorio | In-Memory | PostgreSQL |
|-------------|-----------|------------|
| `userRepository` | `InMemoryUserRepository` | `PostgresUserRepository` |
| `sessionRepository` | `InMemorySessionRepository` | `PostgresSessionRepository` |
| `loginAttemptRepository` | `InMemoryLoginAttemptRepository` | `PostgresLoginAttemptRepository` |
| `providerRepository` | `InMemoryProviderRepository` | `PostgresProviderRepository` |
| `invoiceRepository` | `InMemoryInvoiceRepository` | `PostgresInvoiceRepository` |
| `searchQueryRepository` | `InMemorySearchQueryRepository` | `PostgresSearchQueryRepository` |

**Almacenamiento de archivos** (segun `STORAGE_TYPE`):

| Tipo | Implementacion |
|------|----------------|
| `in-memory` | `InMemoryFileStorage` |
| `local` | `LocalFileStorage` |

### 3. Adaptadores compartidos

| Adaptador | Implementacion | Proposito |
|-----------|----------------|-----------|
| `dateProvider` | `SystemDateProvider` | Proveer fecha/hora actual |
| `passwordHasher` | `BcryptPasswordHasher` | Hash de contrasenas |
| `refreshTokenHasher` | `SimpleRefreshTokenHasher` | Hash de refresh tokens |
| `tokenService` | `JwtTokenService` | Generar/verificar JWT |
| `auditLogger` | `InMemoryAuditLogger` | Registro de auditoria |
| `loginRateLimiter` | `InMemoryLoginRateLimiter` | Control anti brute force |

### 4. Generadores de ID

| Generador | Proposito |
|-----------|-----------|
| `userIdGenerator` | IDs para usuarios |
| `providerIdGenerator` | IDs para proveedores |
| `invoiceIdGenerator` | IDs para facturas |
| `invoiceMovementIdGenerator` | IDs para movimientos de factura |
| `sessionIdGenerator` | IDs para sesiones |
| `searchQueryIdGenerator` | IDs para consultas RAG |

### 5. Componentes RAG/IA

| Componente | Implementacion | Proposito |
|------------|----------------|-----------|
| `genkitRagClient` | Factory function | Cliente Genkit para RAG |
| `ragIndexer` | `DevLocalRagIndexer` | Indexar documentos |
| `ragRetriever` | `DevLocalRagRetriever` | Recuperar documentos relevantes |
| `ragAnswerGenerator` | `GenkitRagAnswerGenerator` | Generar respuestas |
| `extractionAgent` | Segun `AI_AGENT_TYPE` | Extraer datos de facturas |

**Tipos de agente de extraccion** (segun `AI_AGENT_TYPE`):

| Valor | Implementacion |
|-------|----------------|
| `stub` | `StubInvoiceExtractionAgent` (datos fijos) |
| `stub-error` | `StubErrorInvoiceExtractionAgent` (simula errores) |
| `genkit` | `GenkitInvoiceExtractionAgent` (IA real) |

### 6. Use Cases exportados

#### Autenticacion
- `loginUserUseCase` - Iniciar sesion
- `refreshAccessTokenUseCase` - Renovar access token
- `logoutUserUseCase` - Cerrar sesion
- `authorizeRequestUseCase` - Autorizar peticiones HTTP
- `antiBruteForceUseCase` - Proteccion contra ataques

#### Usuarios
- `createUserUseCase` - Crear usuario
- `listUsersUseCase` - Listar usuarios
- `getUserDetailUseCase` - Detalle de usuario
- `updateUserUseCase` - Actualizar usuario
- `updateUserStatusUseCase` - Cambiar estado
- `softDeleteUserUseCase` - Eliminar (soft delete)
- `updateOwnProfileUseCase` - Actualizar perfil propio
- `revokeUserSessionsUseCase` - Revocar sesiones
- `changeUserPasswordUseCase` - Cambiar contrasena (admin)
- `changeOwnPasswordUseCase` - Cambiar contrasena propia

#### Proveedores
- `createProviderUseCase` - Crear proveedor
- `listProvidersUseCase` - Listar proveedores
- `getProviderDetailUseCase` - Detalle de proveedor
- `updateProviderUseCase` - Actualizar proveedor
- `updateProviderStatusUseCase` - Cambiar estado
- `softDeleteProviderUseCase` - Eliminar (soft delete)

#### Facturas
- `createManualInvoiceUseCase` - Crear factura manual
- `uploadInvoiceDocumentUseCase` - Subir factura PDF
- `attachInvoiceFileUseCase` - Adjuntar archivo
- `updateManualInvoiceUseCase` - Actualizar factura
- `confirmInvoiceHeaderUseCase` - Confirmar cabecera
- `confirmInvoiceMovementsUseCase` - Confirmar movimientos
- `reprocessInvoiceExtractionUseCase` - Reprocesar extraccion
- `listInvoicesUseCase` - Listar facturas
- `getInvoiceDetailUseCase` - Detalle de factura
- `softDeleteInvoiceUseCase` - Eliminar (soft delete)
- `getInvoiceFileUseCase` - Obtener archivo

#### RAG/Busqueda
- `indexInvoicesForRagUseCase` - Indexar facturas
- `queryInvoicesRagUseCase` - Consultar con lenguaje natural
- `processSearchQueryUseCase` - Procesar consulta
- `getSearchResultUseCase` - Obtener resultado de busqueda

#### Servicios
- `ragReindexAllInvoicesService` - Reindexar todas las facturas

## Funcion seedUsers

La funcion `seedUsers()` crea datos de prueba cuando se usa almacenamiento in-memory:

```typescript
export const seedUsers = async (): Promise<void> => { ... }
```

**Usuarios creados:**

| Email | Password | Rol |
|-------|----------|-----|
| admin@example.com | AdminPass1!a | ADMIN |
| user@example.com | UserPass1!a01 | USER |

**Proveedores creados:**

| Razon Social | CIF | Ubicacion |
|--------------|-----|-----------|
| Proveedor Alpha SL | B12345678 | Madrid |
| Proveedor Beta SL | A87654321 | Barcelona |

## Como usar el Composition Root

### En el servidor HTTP

```typescript
import { compositionRoot } from '@composition/index.js';

// Usar un use case
const result = await compositionRoot.loginUserUseCase.execute({
    email: 'admin@example.com',
    password: 'AdminPass1!a',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
});
```

### En tests

Los tests NO deben importar el Composition Root real. En su lugar, crean sus propias dependencias con stubs:

```typescript
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';

const fixedNow = new Date('2026-01-01T00:00:00Z');
const dateProvider = new DateProviderStub(fixedNow);

const useCase = new UpdateUserUseCase({
    userRepository: new InMemoryUserRepository(),
    dateProvider,
});
```

## Variables de entorno relacionadas

| Variable | Valores | Efecto en Composition Root |
|----------|---------|----------------------------|
| `DATABASE_TYPE` | `in-memory`, `postgres` | Selecciona repositorios |
| `DATABASE_URL` | Connection string | Conexion a PostgreSQL |
| `STORAGE_TYPE` | `in-memory`, `local` | Selecciona almacenamiento |
| `STORAGE_PATH` | Ruta | Directorio para archivos |
| `AI_AGENT_TYPE` | `stub`, `stub-error`, `genkit` | Selecciona agente IA |
| `JWT_ACCESS_SECRET` | String | Secreto para access tokens |
| `JWT_REFRESH_SECRET` | String | Secreto para refresh tokens |
| `OAI_MODEL_NAME` | `gpt-4o-mini`, etc. | Modelo de IA |
| `RAG_INDEX_NAME` | String | Nombre del indice RAG |
| `RAG_PROMPT_DIR` | Ruta | Directorio de prompts |
| `RAG_EMBEDDER_MODEL` | String | Modelo de embeddings |

## Diagrama de dependencias

```
                    compositionRoot
                          |
         +----------------+----------------+
         |                |                |
    Repositories      Adapters        Use Cases
         |                |                |
    +----+----+      +----+----+      +----+----+
    |         |      |         |      |         |
  User    Invoice  Date    Password  Login   Create
  Repo     Repo   Provider  Hasher   User    Invoice
    |         |      |         |        |       |
    +---------+------+---------+--------+-------+
                          |
                      Ports
                  (interfaces)
```

## Principios aplicados

1. **Dependency Inversion Principle**: Los use cases dependen de interfaces (ports), no de implementaciones concretas.

2. **Single Responsibility**: El Composition Root solo tiene una responsabilidad: ensamblar dependencias.

3. **Open/Closed Principle**: Para cambiar de InMemory a Postgres, solo se modifica la condicion `usePostgres`, sin tocar los use cases.

4. **Constructor Injection**: Todas las dependencias se inyectan via constructor.

5. **Composition over Inheritance**: Los use cases reciben colaboradores, no heredan de clases base.
