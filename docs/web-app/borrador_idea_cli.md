# Especificaciones del MVP - Cliente Web (Dashboard) Gestiora

## 1. Visión General
Desarrollo del cliente web principal para la gestión de facturas de proveedores. El objetivo es obtener un Producto Mínimo Viable (MVP) operativo, estable y altamente funcional.

## 2. Stack Tecnológico y Arquitectura
- **Framework:** Angular con TypeScript.
- **Arquitectura:** Clean Architecture combinada con Diseño Guiado por el Dominio (DDD).
- **Principios de Diseño:** Cumplimiento estricto de los principios SOLID.
- **Rendimiento:** Carga diferida de módulos (*Lazy Loading*) para optimizar el rendimiento inicial. Se cargarán únicamente los componentes necesarios en tiempo de ejecución.
- **Reusabilidad:** Alta componetización de la interfaz para maximizar la reutilización de elementos visuales y funcionales en toda la aplicación.

## 3. Seguridad y Control de Acceso (RBAC)
La seguridad es un pilar fundamental y de carácter imperativo:
- **Autenticación:** Todo acceso requiere un inicio de sesión previo a través de la vista de **Login**.
- **Gestión de Sesión:** Si un token caduca o es revocado, la sesión del usuario se cerrará automáticamente, redirigiéndolo a la ventana de login.
- **Roles de Usuario:**
  - **Administrador:** Tiene acceso total al sistema. Puede interactuar con todas las entidades y posee acceso exclusivo a la gestión de usuarios de la plataforma.
  - **Usuario Estándar:** Puede gestionar sus datos personales, cambiar su contraseña, gestionar facturas y realizar consultas a la IA. No tiene permisos de administración de usuarios.
- **Autorización:** Un usuario sin permisos administrativos no tendrá acceso (ni visual ni lógico) a funcionalidades reservadas para el rol de administrador.

## 4. Estructura de la Interfaz (UI/UX)
La aplicación mantendrá una imagen corporativa unificada, estandarizando estética y operativamente todas las pantallas (listados y fichas de edición).

- **Barra Superior (Topbar):** Mostrará el título "Gestiora" a la izquierda y el avatar/perfil del usuario activo en la parte derecha.
- **Menú Lateral (Sidebar):** Contendrá la navegación principal del sistema.
- **Área Principal:** El lienzo central que renderizará dinámicamente las características y datos del módulo seleccionado en el menú lateral.

## 5. Módulos y Navegación (Menú Lateral)

### 5.1. Perfil de Usuario
- Visualización de datos personales del usuario autenticado.
- Formulario de edición para campos modificables.
- Gestión de cambio de contraseña.

### 5.2. Proveedores
- **Vista principal:** Listado estandarizado de proveedores.
- **Acciones generales:** Botón para crear un "Nuevo proveedor".
- **Acciones por registro:** Botones individuales para acceder al modo edición o eliminar el proveedor.
- **Vista de detalle/edición:** Formulario en formato ficha que cargará los datos del proveedor para su modificación.

### 5.3. Facturas
- **Vista principal:** Listado estandarizado de facturas (misma filosofía UX que Proveedores).
- **Acciones generales:** Botón para añadir una "Nueva factura".
- **Acciones por registro:** Botones para editar o eliminar el documento seleccionado.

### 5.4. Consulta IA
- Interfaz de chat interactivo.
- Permite la comunicación en lenguaje natural con el modelo de Inteligencia Artificial para realizar consultas específicas sobre de las facturas ingestadas.

### 5.5. Usuarios *(Solo Administradores)*
- **Vista principal:** Listado estandarizado de usuarios del sistema.
- **Flujo:** Permite crear, visualizar, editar y eliminar usuarios manteniendo la misma estructura funcional detallada en la sección de Proveedores.

### 5.6. Cerrar Sesión
- Acción que finaliza la sesión activa del usuario de forma segura.
- Redirige inmediatamente a la pantalla de Login tras destruir el contexto de seguridad en el cliente.