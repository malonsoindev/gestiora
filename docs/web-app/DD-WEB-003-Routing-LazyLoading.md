# Design Doc — DD-WEB-003 Enrutamiento y Lazy Loading

## 1. Contexto y Objetivos
Este documento establece la topología del enrutador de Angular para el cliente web de Gestiora. El objetivo principal es garantizar que ambas áreas principales (Pública/Login y Privada/Dashboard) se manejen con alta eficiencia mediante **Lazy Loading** (carga diferida de módulos), optimizando el tiempo de carga inicial (`First Contentful Paint`).

## 2. Estrategia de Layouts (Shell Pattern)

Para evitar recargas visuales innecesarias, la aplicación utilizará un sistema de Layouts o "Shells".
Habrá dos Layouts principales:

1.  **PublicLayout (Auth):** Capa "vacía", destinada a centrar formularios de inicio de sesión. No tieen menús ni barras laterales.
2.  **DashboardLayout:** Es la capa principal para usuarios autenticados. Contiene la barra superior (Topbar) y el menú lateral (Sidebar), y un `<router-outlet>` principal inyecta los contenidos seleccionables.

## 3. Definición del Árbol de Rutas

Para alinear la arquitectura expuesta en `DD-WEB-001`, emplearemos **Standalone Components** y la nueva API de rutas de Angular `loadChildren` o `loadComponent`.

### Tabla de Navegación

| Ruta Path | Componente Raíz a cargar | Guard Asignado | Acción / Propósito |
| :--- | :--- | :--- | :--- |
| **`/`** | *Redirección* | N/A | Redirige siempre a `/dashboard` (que delegará o no al login) |
| **`/auth`** | `PublicLayoutComponent` | `GuestGuard` | Layout vacío para procesos no logueados |
| ↳ `/auth/login` | `LoginComponent` | `GuestGuard` | Pantalla de credenciales de acceso |
| **`/dashboard`** | `DashboardLayoutComponent` | `AuthGuard` | Shell con Topbar y Sidebar. Requiere sesión activa |
| ↳ `/dashboard/home`* | `OverviewComponent` | N/A | Vista por defecto al entrar al dashboard (Dashboard vacío / Resumen) |
| ↳ `/dashboard/profile` | `ProfileComponent` | N/A | Consulta/Edición de la cuenta personal propia |
| ↳ `/dashboard/providers`| `ProvidersRoutes` | N/A | Funciones CRUD de Proveedores (Listado y Formulario) |
| ↳ `/dashboard/invoices` | `InvoicesRoutes` | N/A | Funciones CRUD de Facturas (Listado y Detalle) |
| ↳ `/dashboard/chat-ia` | `RagChatComponent` | N/A | Interfaz del Chat RAG IA |
| ↳ `/dashboard/users` | `UsersRoutes` | `AdminGuard` | Gestión administrativa de usuarios. **Sólo Administradores** |
| **`**` (Catch-all)** | `NotFoundComponent` | N/A | Capturador de página no encontrada (Error 404) |

## 4. Implementación del Lazy Loading

Usaremos las capacidades modernas de lazy loading apuntando directamente a achivos de rutas internas. Todo lo que esté anidado dentro de `/dashboard` cargará de manera diferida, minimizando el archivo JS compilado principal (`main.js`).

### Esquema Conceptual `app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  
  // Módulo Público (Lazy Loader sobre el Layout Auth)
  {
    path: 'auth',
    canActivate: [GuestGuard],
    loadComponent: () => import('./layout/public-layout/public-layout.component'),
    children: [
      { path: 'login', loadComponent: () => import('./modules/auth/login.component') },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Módulo Privado (Dashboard con Sidebar y Topbar)
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout.component'),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      
      // Feature Modules (Totalmente Diferidos)
      { 
        path: 'profile', 
        loadComponent: () => import('./modules/profile/profile.component') 
      },
      { 
        path: 'providers', 
        loadChildren: () => import('./modules/providers/providers.routes') 
      },
      { 
        path: 'invoices', 
        loadChildren: () => import('./modules/invoices/invoices.routes') 
      },
      { 
        path: 'chat-ia', 
        loadComponent: () => import('./modules/chat/chat.component') 
      },
      
      // Feature Module Restringido (Sub-lazy con Guard administrativo)
      { 
        path: 'users',
        canActivate: [AdminGuard],
        loadChildren: () => import('./modules/users/users.routes') 
      }
    ]
  },

  { path: '**', loadComponent: () => import('./core/components/not-found/not-found.component') }
];
```

## 5. Diseño de Sub-rutas CRUD (Ejemplo: `providers.routes.ts`)

Dentro de los grupos que lo requieran (Proveedores, Facturas, Usuarios), implementaremos sub-ruteos para mantener un modo lista y modo ficha bajo la misma base base de URL. Toda estela CRUD debe seguir la misma firma:

*   `/dashboard/providers` (Modo Lista: Visualiza todos)
*   `/dashboard/providers/new` (Modo Ficha/creación: Formulario en blanco)
*   `/dashboard/providers/:id` (Modo Ficha/edición: Pre-carga los datos de la entidad referida por el ID)

Mediante esta técnica, el framework manejará transparentemente la transición visual estandarizada mencionada en nuestro documento base de especificaciones MVP.