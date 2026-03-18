# Design Doc — DD-WEB-004 Sistema de Diseño y UI 

## 1. Contexto y Objetivos
Las especificaciones del MVP establecen que _"todas las vistas de la aplicación tanto de lista como de ficha estarán estandarizadas para mantener una imagen corporativa"_ y que se debe _"tender a la componentización de las funcionalidades para su reutilización"_. 
Este documento define las reglas de diseño de interfaz (UI), el sistema de componentes (Smart vs Dummy) y las directrices visuales/CSS.

## 2. Decisión de Estilos y Librería (CSS/SCSS vs Frameworks Web)

Para priorizar un desarrollo ágil y profesional (como marca el MVP) sin reinventar la rueda de la accesibilidad y los listados base, la aplicación integrará **Angular Material** (junto al uso de SCSS).
*   **Por qué Angular Material:** Provee componentes robustos de tablas (MatTable con paginación integrada), Modales (MatDialog) y Formularios (MatInput) que permitirán alcanzar los objetivos de "Homogeneización visual " con muy bajo mantenimiento.
*   **Personalización:** Se anulará el *tema* estricto de Material ajustando los `colors` e `typography` nativos de SCSS para adaptarlo a la marca corporativa de *Gestiora* (Ej: botones primarios con el color índigo corporativo).

## 3. Patrón Smart vs. Dumb Components

Para cumplir los requisitos de Clean Architecture en la capa de Presentación, dividiremos la lógica visual bajo el patrón Contenedor–Presentacional (*Smart vs Dumb*).

### 3.1. Smart Components (Contenedores)
Son los componentes que registramos en nuestras *Rutas* (ej: `ProviderListComponent`, `ProviderDetailComponent`).
*   **Responsabilidades:** Mantienen el estado reactivo, inyectan y llaman a los Casos de Uso (`Application/UseCases`), reaccionan a las excepciones (Alertas) e instruyen el *routing*. 
*   **Regla de Oro:** **Tienen el mínimo HTML posible**. Solo extraen los datos observables y se los pasan a los componentes visuales hijos.

### 3.2. Dumb Components (Presentacionales / "Shared")
Están alojados en `app/shared/components`. No saben que existe un backend ni casos de uso.
*   **Responsabilidades:** Dibujar en pantalla lo que reciben a través de `@Input()`, y notificar acciones que pulsa el usuario enviándolas "hacia arriba" con `@Output(EventEmitter)`.
*   **Ejemplos Reutilizables:**
    *   `CrudTableComponent`: Una tabla lista para recibir arreglos dinámicos y escupir eventos de _"Click en el botón editar ID 5"_ o _"Click en Eliminar ID 5"_.
    *   `ConfirmModalComponent`: Un diálogo de advertencia estándar utilizado al apretar cualquier "eliminar".

## 4. Estandarización de las Vistas CRUD

Como indica el borrador, Proveedores, Facturas y Usuarios compartirán **la misma filosofía y apariencia.**

### 4.1. El Modo Lista (List View)
Toso listado en Gestiora compartirá este marco de referencia corporativo visual y de experiencia de usuario:
1.  **Cabecera de vista (`PageHeader`):** 
    *   Izquierda: Título descriptivo (Ej. *"Gestión de Proveedores"*).
    *   Derecha: **Botón de Acción Principal** (Ej: _"+ Nuevo Proveedor"_).
2.  **Cuerpo:** 
    *   Una instancia de Angular `MatTable` ocupando la totalidad del ancho residual. 
    *   Última columna a la derecha siempre destinada para las "Acciones" (Íconos estándar: Lápiz para "Editar", Papelera roja para "Eliminar").
    *   Paginador automático al pie (MatPaginator).

### 4.2. El Modo Ficha (Detail / Edición View)
La pantalla para procesar el desglose de un elemento o dar de alta algo nuevo:
1.  **Cabecera de vista (`PageHeader`):** 
    *   Tendrá un botón o enlace de **"Volver atrás"** al lado del título indicando contextualmente qué se edita (Ej. *"« Volver / Editando Proveedor: ACME Corp"*).
2.  **Cuerpo:**
    *   Se utilizará un contenedor en forma de "Tarjeta Blanca" (`mat-card` o clase `.gestiora-card`) centralizado en pantalla para focalizar la visual.
    *   Se utilizará **Reactive Forms** nativos de Angular para el control rápido de validaciones locales y validadores propios síncronos o asíncronos antes de enviarle comandos a los Casos de Uso.
    *   Pie de la tarjeta contendrá dos botones: **"Guardar"** y **"Cancelar"**.

### 4.3. Proceso de Borrado ("Soft Delete")
Tal como dictan las especificaciones, las acciones siempre requieren confirmación. Por tanto la lógica para eliminar siempre activará este protocolo visual de seguridad:
*   Click en ícono "Papelera" -> **No hace nada todavía.**
*   Abre visualmente `ConfirmModalComponent` con texto: _"¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible."_
*   Solo el click secundario afirmativo disparará hacia nuestro caso de uso.

## 5. El Layout Maestro (Topbar y Sidebar)

*   **Responsive:** Toda la vista principal, incluyendo Sidebar y Tablas, integrarán reglas SCSS con Media Queries para flexibilizarse en dispositivos móviles y tabletas (`@media(max-width: 768px)`, donde el Sidebar se convierta en un menú hamburguesa desplegable `mat-sidenav`).
*   **Sidebar:** Ocupará el 100% de la altura disponible y su `background-color` permanecerá oscuro y opaco garantizando profesionalidad. Almacenará los enlaces reactivos.
*   **Topbar / Header:** Mantendrá un diseño minimalista (borde divisor inferior) donde se alojará un Menú de Avatar. Al pulsarlo bajará un globo (dropdown `mat-menu`) con las opciones de: *Mi Perfil* y *Cerrar Sesión*.
