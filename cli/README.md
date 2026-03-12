# Gestiora CLI

> Herramienta de administración de usuarios para la plataforma Gestiora, completamente interactiva y segura.

---

## ¿Qué es esto?

**Gestiora CLI** es una interfaz de línea de comandos dirigida exclusivamente a **administradores** de la plataforma Gestiora. Permite gestionar usuarios en tiempo real a través de menús interactivos, sin necesidad de aprender flags ni sintaxis compleja.

Opera como un cliente HTTP independiente: se autentica contra la API de Gestiora (local o producción), mantiene el token JWT en memoria durante la sesión y expone todas las operaciones de gestión de usuarios en un bucle REPL guiado.

---

## Funcionalidades

| # | Acción | Descripción |
|---|--------|-------------|
| 01 | **Login** | Autenticación segura con ocultación de contraseña |
| 02 | **Listar usuarios** | Listado completo ordenado alfabéticamente por email |
| 03 | **Buscar usuarios** | Búsqueda por texto libre |
| 04 | **Actualizar perfil** | Edición de nombre, apellido y email |
| 05 | **Deshabilitar usuario** | Cambio de estado a `INACTIVE` con confirmación previa |
| 06 | **Cambiar contraseña** | Reset de contraseña con doble confirmación |
| 07 | **Crear usuario** | Alta de un nuevo usuario en el sistema con asignación de roles |
| 08 | **Eliminar usuario** | Borrado lógico (`DELETED`) de un usuario con confirmación explícita |

---

## Requisitos

- **Node.js** v24 o superior
- **npm** v10 o superior
- Acceso a una instancia de la API de Gestiora (local o producción)

---

## Instalación

```bash
# Desde la raíz del monorepo
cd cli
npm install
```

---

## Configuración

Copia el fichero de ejemplo y ajusta la URL de la API:

```bash
cp .env.example .env
```

Edita `.env`:

```env
API_BASE_URL=http://localhost:3000   # o la URL de producción
```

> Si no se define `API_BASE_URL`, el CLI usa `http://localhost:3000` por defecto.

---

## Uso

### Modo desarrollo (con recarga automática)

```bash
npm run dev
```

### Modo producción

```bash
npm run build
npm start
```

### Flujo de uso

```
=== Gestiora CLI ===

? Email: admin@example.com
? Contraseña: ********

✓ Sesión iniciada correctamente

? Selecciona una acción:
  ❯ Listar todos los usuarios
    Buscar usuarios
    Actualizar usuario
    Deshabilitar usuario
    Cambiar contraseña de usuario
    Cerrar sesión
```

---

## Tests

```bash
# Ejecutar todos los tests
npm test

# Modo watch
npm run test:watch
```

**Cobertura actual:** 11 ficheros de test · **67 tests** · 100% verde

| Capa | Fichero de test | Tests |
|------|----------------|-------|
| Application | `login-use-case.test.ts` | 4 |
| Application | `list-users-use-case.test.ts` | 3 |
| Application | `find-users-use-case.test.ts` | 4 |
| Application | `update-user-use-case.test.ts` | 4 |
| Application | `disable-user-use-case.test.ts` | 4 |
| Application | `reset-password-use-case.test.ts` | 5 |
| Application | `create-user-use-case.test.ts` | 6 |
| Application | `delete-user-use-case.test.ts` | 4 |
| Infrastructure | `user-api-repository.test.ts` | 18 |
| Infrastructure | `login-menu.test.ts` | 5 |
| Infrastructure | `main-menu.test.ts` | 10 |

---

## Arquitectura

El proyecto sigue **Clean Architecture** con separación estricta de capas:

```
cli/
├── src/
│   ├── index.ts                      # Composition Root + bucle REPL
│   ├── domain/
│   │   ├── user.ts                   # Entidades e interfaces (User, UpdateUserPayload…)
│   │   ├── errors.ts                 # CliError, AuthError, NotFoundError
│   │   └── ports.ts                  # Interfaz UserRepository (puerto)
│   ├── core/
│   │   └── token-store.ts            # Singleton JWT en memoria (stateless)
│   ├── application/
│   │   ├── login-use-case.ts         # US-CLI-01
│   │   ├── list-users-use-case.ts    # US-CLI-02
│   │   ├── find-users-use-case.ts    # US-CLI-03
│   │   ├── update-user-use-case.ts   # US-CLI-04
│   │   ├── disable-user-use-case.ts  # US-CLI-05
│   │   ├── reset-password-use-case.ts # US-CLI-06
│   │   ├── create-user-use-case.ts   # US-CLI-07
│   │   ├── delete-user-use-case.ts   # US-CLI-08
│   │   └── index.ts                  # Barrel de re-exports
│   └── infrastructure/
│       ├── api/
│       │   └── user-api-repository.ts  # Adaptador HTTP (fetch nativo)
│       └── ui/
│           ├── login-menu.ts           # Menú de login (@inquirer/prompts)
│           └── main-menu.ts            # Menú principal + handlers
└── tests/
    ├── application/                   # Tests de casos de uso
    └── infrastructure/                # Tests del repositorio HTTP y menús
```

### Diagrama de capas

```
┌──────────────────────────────────────────────┐
│              src/index.ts                    │  ← Composition Root
│         (instancia + bucle REPL)             │
└────────────────────┬─────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────┐        ┌──────────────────────┐
│  ui/         │        │  api/                │
│  login-menu  │        │  UserApiRepository   │
│  main-menu   │        │  (fetch + tokenStore)│
└──────┬───────┘        └──────────┬───────────┘
       │                           │
       └────────────┬──────────────┘
                    ▼
        ┌───────────────────────┐
        │  application/         │
        │  (casos de uso)       │
        └──────────┬────────────┘
                   ▼
        ┌───────────────────────┐
        │  domain/              │
        │  user · errors · ports│
        └───────────────────────┘
```

### Decisiones de diseño

- **Funciones, no clases** para los casos de uso: una sola dependencia (`UserRepository`), más simple de testear con `vi.fn()`.
- **Sin patrón `Result<T,E>`**: los errores se propagan con `throw`/`try-catch` en la capa UI.
- **JWT en memoria**: el `tokenStore` es un singleton efímero — nada se persiste en disco.
- **`fetch` nativo**: Node 24+ lo incluye de serie, sin dependencias externas.
- **`moduleResolution: bundler`** + **`allowImportingTsExtensions`**: permite importar `.ts` directamente; `tsx` actúa como runtime en desarrollo.

---

## Stack

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| TypeScript | 5.9+ | Lenguaje (strict mode) |
| Node.js | 24+ | Runtime |
| tsx | 4.x | Runner de desarrollo |
| @inquirer/prompts | 7.x | Menús interactivos |
| dotenv | 17.x | Variables de entorno |
| vitest | 4.x | Tests (TDD) |

---

## Datos de prueba

Con el backend arrancado en modo `in-memory` (`npm run dev` en la raíz del proyecto):

```
Email:      admin@example.com
Contraseña: AdminPass1!a
```

---

## Decisión arquitectónica completa

La arquitectura, alternativas evaluadas y decisiones de diseño están documentadas en:

[`docs/cli/DD-CLI-001.md`](../docs/cli/DD-CLI-001.md)
