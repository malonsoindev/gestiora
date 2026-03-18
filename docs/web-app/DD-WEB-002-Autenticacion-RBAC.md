# Design Doc — DD-WEB-002 Autenticación y Control de Acceso (RBAC)

## 1. Contexto y Objetivos
Este documento define la estrategia de seguridad del cliente web de Gestiora en Angular. Aborda el ciclo de vida de la sesión (Login, Manejo de JWT, Refresco de Tokens) y el Control de Acceso Basado en Roles (RBAC), asegurando que la UI actúe en estricta sincronía con las políticas de seguridad ya establecidas en el Backend.

## 2. Flujo de Autenticación (Ciclo de Vida de Sesión)

La aplicación funcionará mediante el esquema estándar de **Access Token** (corta duración) y **Refresh Token** (larga duración o rotativo).

### 2.1. Almacenamiento de Tokens
El cliente web almacenará ambos tokens en el navegador. Por diseño y conveniencia para el MVP:
*   **Access Token:** Almacenado en `localStorage`. Será inyectado en todas las llamadas HTTP autorizadas.
*   **Refresh Token:** Almacenado en `localStorage` (junto al anterior, o gestionado automáticamente si el backend lo devuelve como cookie HttpOnly, dependiendo del contrato vigente). En nuestro caso actual, el backend devuelve ambos en el payload, por lo que residirán manejados por el `StorageService` de Infrastructure.

### 2.2. Login
1.  El usuario envía credenciales desde `app/modules/auth/login.component`.
2.  El componente invoca `LoginUseCase.execute(email, password)`.
3.  Si es exitoso, el caso de uso delega al puerto pertinente para almacenar la sesión.
4.  La capa de dominio notifica a la aplicación entera que hay un usuario activo (`SessionState`).
5.  El router redirige al `/dashboard`.

### 2.3. Interceptors (Inyección y Refresco)
En la capa de infraestructura de Angular configuraremos un `HttpInterceptor`:
*   **Inyección de Bearer:** Toda petición HTTP (excepto `/auth/login` y `/auth/refresh`) será interceptada para inyectarle la cabecera `Authorization: Bearer <AccessToken>`.
*   **Manejo de Errores `401 Unauthorized`:**
    *   Si una petición falla con `401`, el Interceptor pausará las peticiones subsiguientes.
    *   Llamará al endpoint `/auth/refresh` enviando el Refresh Token.
    *   Si el refresco tiene éxito, actualizará el Access Token en `localStorage` y repetirá la petición encolada.
    *   Si el refresco falla (Refresh Token expirado, revocado o sesión inválida), el interceptor forzará el comportamiento de *Logout*: limpiará el `localStorage` y redirigirá al `/login` forzosamente.

### 2.4. Logout
*   Se ofrece un botón "Cerrar Sesión".
*   Este invocará al respectivo caso de uso.
*   Enviará una petición `/auth/logout` al backend para invalidar el Refresh Token por seguridad.
*   Limpia el estado local y redirige al Layout "público" de login.

---

## 3. Control de Acceso Basado en Roles (RBAC)

La aplicación tiene dos roles diferenciados que dicta el Backend (el token contiene la autoridad del usuario). El estado reactivo de Angular siempre conocerá el rol del titular de la sesión activa.

*   `Role.ADMIN`
*   `Role.USER`

### 3.1. Protección Estratégica (Routing Guards)
Angular enrutará de manera segura utilizando las funciones Guard introducidas en versiones modernas (`CanActivateFn`).

1.  **`AuthGuard`:** Protege toda la rama `/dashboard`. Verifica si el Storage contiene un AccessToken válido. Si no lo hay, aborta la navegación y redirige a `/login`.
2.  **`AdminGuard`:** Protege las ramas organizativas (ej. `/dashboard/users`). Verifica dentro del perfil de usuario cargado (o descodificando el JWT) que el rol contiene "Administrador". Si el usuario es tipo "User", se detiene la navegación y se relocaliza al Home o se muestra un Toast "Acceso Denegado".
3.  **`GuestGuard`:** Protege la ruta `/login`. Evita que un usuario logueado pueda ver el formulario de login (lo redirige de vuelta al dashboard).

### 3.2. Renderizado Condicional en UI (*Structural Directives* / NgIf)
Para evitar que los usuarios sin privilegios vean siquiera botones que no pueden pulsar (aunque estén protegidos por la API y enrutamiento), crearemos mecanismos reactivos visuales:

*   **Ocultación de Menús:** En el Sidebar, el botón de «Usuarios» llevará una condición de estado. Solo se sumará al DOM si el usuario autenticado tiene el rol `ADMIN`.
*   *(Opcional a futuro)*: Se puede construir una directiva estructural custom como `*appHasRole="['ADMIN']"` para ocultar trozos del DOM limpiamente. Para el MVP bastará con un simple `*ngIf="isAdmin$ | async"`.

---

## 4. Estado Global de la Sesión

Para que toda la web sepa "Quién soy, si estoy logueado y qué rol tengo" mantendremos un Servicio Central con origen en _Shared/Core_.

Dicho servicio exportará *Signals* (o un *BehaviorSubject*) observables:
*   `isAuthenticated()`: boolean
*   `currentUser()`: Datos del perfil `{ id, email, name, role }`

Tan pronto como el usuario carga la web o hace F5:
1. El inicializador de Angular interactuará con un *UseCase* para restaurar la sesión mirando el Storage.
2. Si existe un token, se decodificará para poblar el perfil, o alternativamente (si el sistema lo requiere) invocar al endpoint GET `/profile` para disponer de los datos frescos del usuario en la parte alta del Dashboard.