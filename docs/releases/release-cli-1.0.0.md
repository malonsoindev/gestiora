# Release CLI 1.0.0

Fecha: 2026-03-12
Version: 1.0.0
Tipo: Major release (Primera version estable)

## Resumen
Primera version estable de la CLI de administracion de usuarios para la plataforma Gestiora.
Herramienta de consola interactiva (REPL) exclusiva para administradores, que opera como
cliente HTTP independiente contra la API de Gestiora (local o produccion).

## Funcionalidades

| US | Descripcion | Estado |
|---|---|---|
| US-CLI-01 | Login seguro con ocultacion de contraseña | Done |
| US-CLI-02 | Listado de usuarios ordenado por email | Done |
| US-CLI-03 | Busqueda de usuarios por texto libre | Done |
| US-CLI-04 | Actualizacion de perfil (nombre, avatar) | Done |
| US-CLI-05 | Deshabilitacion de usuario con confirmacion | Done |
| US-CLI-06 | Reset de contraseña con doble confirmacion | Done |
| US-CLI-07 | Creacion de usuario con asignacion de roles | Done |
| US-CLI-08 | Eliminacion logica de usuario con confirmacion | Done |

## Arquitectura
- Clean Architecture con capas domain, application e infrastructure.
- Cliente HTTP independiente usando fetch nativo (Node 24+).
- JWT gestionado in-memory (stateless, sin persistencia en disco).
- Interfaz interactiva basada en @inquirer/prompts.

## Stack
- TypeScript 5.9+ (strict mode)
- Node.js 24+
- tsx 4.x (runner de desarrollo)
- @inquirer/prompts 7.x
- dotenv 17.x
- vitest 4.x

## Tests
- **Archivos de test:** 11
- **Tests totales:** 67
- **Estado:** 100% verde

| Capa | Fichero | Tests |
|------|---------|-------|
| Application | login-use-case.test.ts | 4 |
| Application | list-users-use-case.test.ts | 3 |
| Application | find-users-use-case.test.ts | 4 |
| Application | update-user-use-case.test.ts | 4 |
| Application | disable-user-use-case.test.ts | 4 |
| Application | reset-password-use-case.test.ts | 5 |
| Application | create-user-use-case.test.ts | 6 |
| Application | delete-user-use-case.test.ts | 4 |
| Infrastructure | user-api-repository.test.ts | 18 |
| Infrastructure | login-menu.test.ts | 5 |
| Infrastructure | main-menu.test.ts | 10 |

## Estructura de archivos

### Source (cli/src/)
- `index.ts` — Composition Root y bucle REPL.
- `domain/user.ts` — Entidades e interfaces.
- `domain/errors.ts` — Jerarquia de errores (CliError, AuthError, NotFoundError, ForbiddenError).
- `domain/ports.ts` — Interfaz UserRepository (puerto).
- `core/token-store.ts` — Singleton JWT en memoria.
- `application/login-use-case.ts` — US-CLI-01.
- `application/list-users-use-case.ts` — US-CLI-02.
- `application/find-users-use-case.ts` — US-CLI-03.
- `application/update-user-use-case.ts` — US-CLI-04.
- `application/disable-user-use-case.ts` — US-CLI-05.
- `application/reset-password-use-case.ts` — US-CLI-06.
- `application/create-user-use-case.ts` — US-CLI-07.
- `application/delete-user-use-case.ts` — US-CLI-08.
- `application/index.ts` — Barrel de re-exports.
- `infrastructure/api/user-api-repository.ts` — Adaptador HTTP (fetch nativo).
- `infrastructure/ui/login-menu.ts` — Menu de login.
- `infrastructure/ui/main-menu.ts` — Menu principal y handlers.
- `infrastructure/ui/colors.ts` — Utilidades de color para la consola.

## Documentacion
- `cli/README.md` — Documentacion completa del modulo.
- `docs/cli/DD-CLI-001.md` — Design Document con arquitectura y decisiones.
