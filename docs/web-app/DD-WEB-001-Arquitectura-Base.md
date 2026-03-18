# Design Doc — DD-WEB-001 Arquitectura Base (Angular + Clean Architecture)

## 1. Contexto y Objetivos
Este documento define la arquitectura fundamental para el cliente web de Gestiora (Dashboard). El ecosistema elegido es **Angular** con **TypeScript**. 
Dado que Angular tiene una arquitectura propia muy opinada basada en módulos (o standalone components) e inyección de dependencias nativa, el objetivo aquí es adaptar el framework para que respete estrictamente la **Clean Architecture** y el **Diseño Guiado por el Dominio (DDD)**, tal como se hace en el Backend y la CLI.

## 2. Ubicación en el Monorepo
El proyecto residirá en el directorio raíz **`/web-app`** (o `/client`). Compartirá filosofía con las otras herramientas del monorepo, aunque sus dependencias (vía `package.json`) estarán aisladas del backend.

## 3. Disposición de Capas (Clean Architecture en Angular)

Para garantizar la independencia del marco de trabajo (en origen, Angular no debería "contaminar" nuestro dominio o casos de uso), el código dentro de `src/` se dividirá en las siguientes capas de adentro hacia afuera:

### 3.1. Domain (`src/core/domain/`)
Es el núcleo de la aplicación.
*   **Contenido:** Definiciones de tipo, Interfaces (Modelos / Entidades de lectura), Custom Errors y **Puertos** (Interfaces de repositorios que serán implementados por infraestructura).
*   **Restricciones:** **Cero** referencias a Angular (`@angular/core`, `@angular/common`, etc.). Es código TypeScript puro.

### 3.2. Application (`src/core/application/`)
Contiene las reglas de negocio específicas del lado del cliente y la orquestación.
*   **Contenido:** Casos de Uso (Use Cases). Ej: `LoginUseCase`, `GetInvoicesUseCase`. 
*   **Restricciones:** Cero referencias a Angular. Conocen el `Domain` y colaboran a través de los **Puertos**. No saben de HTTP.

### 3.3. Infrastructure (`src/infrastructure/`)
Donde ocurre el contacto con el "mundo exterior" y las APIs web.
*   **Contenido:** 
    *   **Adaptadores:** Implementaciones de los Puertos definidos en Domain. Por ejemplo, `UserApiRepository` que implementa `UserRepository` usando el `HttpClient` de Angular.
    *   **Estado / Core:** Gestores de almacenamiento local (Local Storage, Session Storage), Tokens JWT.
*   **Acoplamiento:** Aquí sí se permite importar módulos de Angular (`HttpClient`, `Injectable`, etc.).

### 3.4. Presentation / UI (`src/app/`)
Es la capa de interfaz de usuario de Angular.
*   **Contenido:** Componentes, directivas, pipes, ruteo (Router) y diseño visual (SCSS/HTML). 
*   **Acoplamiento:** Es código 100% Angular. Llama a los Casos de Uso (Application) o maneja el estado de UI. No inyecta adaptadores HTTP directamente en los componentes de las vistas.

---

## 4. Estructura de Directorios Propuesta

```text
/web-app/src
├── app/                      # [Capa: Presentation]
│   ├── core/                 # Inicialización de Angular, Interceptors, Guards
│   ├── layout/               # Componentes estructurales (Topbar, Sidebar, Main)
│   ├── modules/              # Funcionalidades (Auth, Users, Providers, Invoices, Chat)
│   ├── shared/               # Componentes UI reutilizables (Botones, Tablas, Modales)
│   └── app.routes.ts         # Enrutamiento raíz
├── core/
│   ├── domain/               # [Capa: Domain]
│   │   ├── auth/             # Entidades/Tipos de auth
│   │   ├── users/            # Entidades/Puertos de usuarios
│   │   ├── providers/        # Entidades/Puertos de proveedores
│   │   ├── invoices/         # Entidades/Puertos de facturas
│   │   └── base/             # Interfaces comunes, Custom Errors
│   └── application/          # [Capa: Application]
│       ├── auth/             # Ej: LoginUseCase.ts
│       ├── users/            # Ej: GetUsersUseCase.ts
│       ├── providers/        # Ej: CreateProviderUseCase.ts
│       └── invoices/         # Ej: GetInvoicesUseCase.ts
└── infrastructure/           # [Capa: Infrastructure]
    ├── api/                  # Implementación de repositorios consumiendo el Backend
    └── storage/              # Manejo de JWT, LocalStorage
```

## 5. Inyección de Dependencias: Mapeo Clean Architecture a Angular

Angular posee un poderoso sistema de Inyección de Dependencias (DI). Para mantener la capa de `Application` agnóstica de Angular, se debe emplear un patrón de factorías o inyección explícita mediante *Providers* a nivel de módulo o raíz.

### Ejemplo de Configuración de Inyección
En Angular, mapearemos la interfaz (Puerto) a su implementación (Adaptador) y pasaremos los repositorios a los Casos de Uso. Esto se gestionará típicamente en un archivo `providers.ts` o en los propios módulos/rutas (usaremos `InjectionToken` para las interfaces en TS puro que no emiten código a JS).

```typescript
// infrastructure/providers/auth.providers.ts
import { InjectionToken } from '@angular/core';
import { AuthUserRepository } from '../../core/domain/auth/AuthUserRepository';
import { AuthApiRepository } from '../api/auth/auth-api.repository';
import { LoginUseCase } from '../../core/application/auth/LoginUseCase';
import { HttpClient } from '@angular/common/http';

export const AUTH_REPOSITORY_TOKEN = new InjectionToken<AuthUserRepository>('AuthUserRepository');

export const authProviders = [
  {
    provide: AUTH_REPOSITORY_TOKEN,
    useClass: AuthApiRepository // Implementación concreta con HttpClient
  },
  {
    provide: LoginUseCase,
    useFactory: (repo: AuthUserRepository) => new LoginUseCase(repo),
    deps: [AUTH_REPOSITORY_TOKEN]
  }
];
```
*De este modo, los componentes de Angular podrán inyectar `LoginUseCase` en sus constructores sin importarles cómo está instanciado por debajo.*

## 6. Evolución del Framework (Standalone Components)
Se priorizará el ecosistema moderno de Angular (versión 16+ en adelante), estructurando la aplicación mediante **Standalone Components**. Esto reduce el boilerplate de los `NgModules`, optimiza el Lazy Loading y encaja muy bien con la segmentación natural sugerida en la presente Arquitectura.

## 7. Decisión de Estado de UI (State Management)
La gestión de estados no involucrará librerías externas pesadas (como NgRx o Akita) al menos en el MVP. Nos basaremos en los servicios reactivos estandarizados de Angular haciendo uso extensivo de `BehaviorSubject`, `Observables` y, cuando aplique, la nueva API de `Signals` para maximizar el rendimiento del renderizado en las vistas.
