# Épica A — Autenticación y Seguridad

## Contexto
Esta épica define los requisitos funcionales de autenticación, autorización y seguridad base del sistema Gestiora.

Modelo adoptado:
- **Access Token (JWT)** de corta duración.
- **Refresh Token** persistido en servidor y asociado a una **sesión revocable**.
- Control de acceso por roles (RBAC).
- Enfoque *Security by Design* y *Security by Default*.

---

## US-A01 — Inicio de sesión

**Como** usuario registrado  
**quiero** iniciar sesión con mis credenciales  
**para** acceder a la plataforma de forma segura.

### Criterios de aceptación (GWT)

**Escenario 1: Login exitoso**
- **Given** existe un usuario registrado y activo
- **And** el usuario no está bloqueado
- **When** el usuario envía credenciales válidas
- **Then** el sistema autentica al usuario
- **And** crea una sesión persistida asociada al usuario
- **And** devuelve un **access token** válido con expiración corta
- **And** devuelve un **refresh token** válido asociado a la sesión
- **And** registra el evento de login exitoso en auditoría

**Escenario 2: Credenciales inválidas**
- **Given** existe un usuario registrado
- **When** el usuario envía credenciales inválidas
- **Then** el sistema rechaza el acceso
- **And** responde con un mensaje genérico (sin indicar si usuario o contraseña es incorrecta)
- **And** registra el intento fallido en auditoría

**Escenario 3: Usuario inactivo o eliminado lógicamente**
- **Given** existe un usuario inactivo o eliminado lógicamente
- **When** el usuario envía credenciales válidas
- **Then** el sistema rechaza el acceso
- **And** responde con un mensaje genérico
- **And** registra el intento en auditoría

---

## US-A02 — Cierre de sesión

**Como** usuario autenticado  
**quiero** cerrar sesión  
**para** finalizar mi acceso de manera segura.

### Criterios de aceptación (GWT)

**Escenario 1: Logout exitoso**
- **Given** un usuario autenticado con una sesión activa
- **When** el usuario solicita cerrar sesión
- **Then** el sistema revoca la sesión asociada al refresh token
- **And** invalida el refresh token para futuras renovaciones
- **And** registra el evento de logout en auditoría

**Escenario 2: Refresh tras logout**
- **Given** un usuario que ha cerrado sesión (sesión revocada)
- **When** el cliente intenta renovar el access token con el refresh token revocado
- **Then** el sistema rechaza la operación con **401**
- **And** exige una nueva autenticación

---

## US-A03 — Protección de endpoints

**Como** sistema  
**quiero** que los endpoints privados requieran autenticación  
**para** evitar accesos no autorizados.

### Criterios de aceptación (GWT)

**Escenario 1: Acceso sin token**
- **Given** un endpoint marcado como privado
- **When** se realiza una petición sin access token
- **Then** el sistema responde **401**

**Escenario 2: Acceso con token inválido**
- **Given** un endpoint privado
- **When** se realiza una petición con un access token inválido o manipulado
- **Then** el sistema responde **401**

**Escenario 3: Acceso con token expirado**
- **Given** un endpoint privado
- **And** un access token expirado
- **When** se realiza una petición
- **Then** el sistema responde **401**

**Escenario 4: Acceso con token válido**
- **Given** un endpoint privado
- **And** un access token válido y no expirado
- **When** se realiza una petición
- **Then** el sistema procesa la petición según la lógica de negocio

**Escenario 5: Endpoint público**
- **Given** un endpoint marcado como público (p. ej. login)
- **When** se realiza una petición sin autenticación
- **Then** el sistema permite el acceso

---

## US-A04 — Control de acceso por rol (RBAC básico)

**Como** administrador  
**quiero** que ciertas acciones estén restringidas por rol  
**para** controlar qué puede hacer cada tipo de usuario.

### Criterios de aceptación (GWT)

**Escenario 1: Usuario con permisos suficientes**
- **Given** un usuario autenticado con rol **Administrador**
- **When** accede a un endpoint reservado para administración
- **Then** el sistema permite la operación

**Escenario 2: Usuario sin permisos suficientes**
- **Given** un usuario autenticado con rol **Usuario**
- **When** accede a un endpoint reservado para administración
- **Then** el sistema rechaza la operación con **403**

**Escenario 3: Rol presente en el token**
- **Given** un usuario autenticado
- **When** el sistema emite el access token
- **Then** el token incluye el rol del usuario (o claims equivalentes)
- **And** el backend utiliza ese rol para autorizar acciones

---

## US-A05 — Política de contraseñas y almacenamiento seguro

**Como** sistema  
**quiero** gestionar contraseñas de forma segura  
**para** proteger cuentas de usuario.

### Criterios de aceptación (GWT)

**Escenario 1: Almacenamiento seguro**
- **Given** que se crea o actualiza una contraseña de usuario
- **When** el sistema la persiste
- **Then** la contraseña se almacena únicamente como hash usando un algoritmo seguro (bcrypt/argon2 o equivalente)
- **And** nunca se almacena en texto plano

**Escenario 2: Política mínima**
- **Given** un usuario (o administrador) intenta establecer una contraseña
- **When** la contraseña no cumple la política mínima (p. ej. longitud mínima)
- **Then** el sistema rechaza la operación con un error de validación

**Escenario 3: No exposición en logs**
- **Given** que se producen eventos de autenticación o gestión de usuarios
- **When** el sistema registra logs o auditoría
- **Then** no registra contraseñas ni hashes

---

## US-A06 — Límite de intentos y mitigación de fuerza bruta

**Como** sistema  
**quiero** limitar intentos de login fallidos  
**para** reducir ataques por fuerza bruta.

### Criterios de aceptación (GWT)

**Escenario 1: Bloqueo tras N intentos fallidos**
- **Given** un usuario con credenciales incorrectas repetidas
- **And** una política configurada de límite de intentos en una ventana de tiempo
- **When** el usuario supera el número máximo de intentos fallidos
- **Then** el sistema bloquea temporalmente al usuario (o el origen, según política)
- **And** registra el bloqueo en auditoría

**Escenario 2: Intento de login durante el bloqueo**
- **Given** un usuario bloqueado temporalmente
- **When** intenta iniciar sesión (incluso con credenciales válidas)
- **Then** el sistema rechaza el acceso con un mensaje genérico
- **And** registra el intento en auditoría

**Escenario 3: Expiración del bloqueo**
- **Given** un usuario bloqueado temporalmente
- **When** expira el tiempo de bloqueo configurado
- **Then** el usuario puede volver a intentar iniciar sesión
- **And** el sistema registra el desbloqueo (si aplica)

**Escenario 4: Revocación de sesiones por bloqueo (si aplica)**
- **Given** un usuario con sesiones activas
- **When** el sistema aplica un bloqueo por seguridad
- **Then** el sistema puede revocar las sesiones activas del usuario
- **And** registra la revocación en auditoría

---

## US-A07 — Renovación de sesión (Refresh token)

**Como** usuario autenticado  
**quiero** renovar mi sesión sin volver a introducir credenciales  
**para** mantener el acceso de forma segura.

### Criterios de aceptación (GWT)

**Escenario 1: Refresh exitoso**
- **Given** un usuario con una sesión activa no revocada
- **And** un refresh token válido y no expirado
- **When** el cliente solicita renovar sesión usando el refresh token
- **Then** el sistema emite un nuevo access token válido
- **And** registra el evento de refresh en auditoría

**Escenario 2: Refresh inválido**
- **Given** un refresh token inválido o manipulado
- **When** el cliente solicita renovar sesión
- **Then** el sistema responde **401**
- **And** no emite nuevos tokens

**Escenario 3: Refresh expirado**
- **Given** un refresh token expirado
- **When** el cliente solicita renovar sesión
- **Then** el sistema responde **401**
- **And** requiere nueva autenticación

**Escenario 4: Refresh revocado**
- **Given** un refresh token asociado a una sesión revocada
- **When** el cliente solicita renovar sesión
- **Then** el sistema responde **401**
- **And** requiere nueva autenticación

**Escenario 5: Rotación de refresh (opcional)**
- **Given** una política de rotación de refresh tokens activa
- **And** un refresh token válido
- **When** el cliente solicita renovar sesión
- **Then** el sistema emite un nuevo refresh token
- **And** revoca el refresh token anterior
- **And** registra la rotación en auditoría

---

## Notas técnicas
- El access token tiene expiración corta (p. ej. 10–15 minutos).
- El refresh token tiene expiración mayor (p. ej. 7–30 días).
- El refresh token se persiste en servidor como **hash** y se asocia a una **sesión revocable**.
- Se recomienda un proceso de limpieza de sesiones expiradas.


# Épica B — Administración de Usuarios y Roles

## Contexto
Esta épica define las capacidades para que un **Administrador** pueda gestionar usuarios y roles del sistema Gestiora.

Precondiciones:
- Autenticación operativa (Épica A).
- RBAC básico: roles **Administrador** y **Usuario**.
- Sesiones revocables (refresh token persistido y revocable).
- Auditoría de acciones administrativas.

---

## US-B01 — Creación de usuario

**Como** administrador  
**quiero** crear nuevos usuarios  
**para** permitir el acceso a la plataforma.

### Criterios de aceptación (GWT)

**Escenario 1: Creación exitosa**
- **Given** un administrador autenticado
- **And** un identificador de usuario (email/username) que no existe
- **When** el administrador crea un usuario con rol inicial y estado activo
- **Then** el sistema persiste el usuario con un identificador único
- **And** asigna el rol indicado
- **And** establece el usuario como activo
- **And** registra la acción en auditoría

**Escenario 2: Identificador duplicado**
- **Given** un administrador autenticado
- **And** un identificador de usuario ya existente
- **When** el administrador intenta crear un usuario con ese identificador
- **Then** el sistema rechaza la operación con error de validación
- **And** no crea un nuevo usuario
- **And** registra el intento fallido en auditoría

**Escenario 3: Acceso no autorizado**
- **Given** un usuario autenticado sin rol Administrador
- **When** intenta crear un usuario
- **Then** el sistema rechaza la operación con **403**

---

## US-B02 — Consulta y listado de usuarios

**Como** administrador  
**quiero** listar y consultar usuarios existentes  
**para** gestionar el acceso al sistema.

### Criterios de aceptación (GWT)

**Escenario 1: Listado de usuarios**
- **Given** un administrador autenticado
- **When** solicita el listado de usuarios
- **Then** el sistema devuelve la lista paginada (si aplica)
- **And** cada elemento incluye al menos: identificador, rol, estado, fecha de creación
- **And** el sistema no expone contraseñas, hashes ni tokens

**Escenario 2: Consulta de detalle**
- **Given** un administrador autenticado
- **And** un usuario existente
- **When** solicita el detalle del usuario
- **Then** el sistema devuelve la información del usuario
- **And** no expone credenciales sensibles

**Escenario 3: Usuario inexistente**
- **Given** un administrador autenticado
- **When** solicita el detalle de un usuario inexistente
- **Then** el sistema responde con **404**

**Escenario 4: Acceso no autorizado**
- **Given** un usuario autenticado sin rol Administrador
- **When** solicita el listado o detalle de usuarios
- **Then** el sistema responde **403**

---

## US-B03 — Modificación de usuario

**Como** administrador  
**quiero** modificar los datos de un usuario  
**para** mantener la información actualizada.

### Criterios de aceptación (GWT)

**Escenario 1: Modificación exitosa**
- **Given** un administrador autenticado
- **And** un usuario existente
- **When** el administrador actualiza campos permitidos del usuario (p. ej. rol, estado)
- **Then** el sistema persiste los cambios
- **And** los cambios tienen efecto inmediato
- **And** registra la modificación en auditoría

**Escenario 2: Usuario inexistente**
- **Given** un administrador autenticado
- **When** intenta modificar un usuario inexistente
- **Then** el sistema responde **404**
- **And** no realiza cambios

**Escenario 3: Campos no permitidos**
- **Given** un administrador autenticado
- **And** un usuario existente
- **When** intenta modificar un campo no permitido (p. ej. identificador interno)
- **Then** el sistema rechaza la operación con error de validación
- **And** no realiza cambios sobre ese campo
- **And** registra el intento en auditoría

---

## US-B04 — Activación y desactivación de usuarios

**Como** administrador  
**quiero** activar o desactivar usuarios  
**para** controlar el acceso al sistema.

### Criterios de aceptación (GWT)

**Escenario 1: Desactivación exitosa**
- **Given** un administrador autenticado
- **And** un usuario activo con sesiones activas o no
- **When** el administrador desactiva al usuario
- **Then** el sistema marca el usuario como inactivo
- **And** el usuario no puede iniciar sesión
- **And** el usuario no puede renovar sesión con refresh tokens existentes
- **And** el sistema revoca las sesiones activas del usuario (si aplica por política)
- **And** registra la acción en auditoría

**Escenario 2: Reactivación exitosa**
- **Given** un administrador autenticado
- **And** un usuario inactivo
- **When** el administrador reactiva al usuario
- **Then** el sistema marca el usuario como activo
- **And** el usuario puede iniciar sesión nuevamente
- **And** registra la acción en auditoría

**Escenario 3: Acceso no autorizado**
- **Given** un usuario autenticado sin rol Administrador
- **When** intenta activar o desactivar un usuario
- **Then** el sistema responde **403**

---

## US-B05 — Eliminación lógica de usuario (Soft delete)

**Como** administrador  
**quiero** eliminar usuarios de forma lógica  
**para** mantener la integridad histórica del sistema.

### Criterios de aceptación (GWT)

**Escenario 1: Eliminación lógica exitosa**
- **Given** un administrador autenticado
- **And** un usuario existente
- **When** el administrador elimina lógicamente al usuario
- **Then** el sistema marca el usuario como eliminado lógicamente
- **And** el usuario no puede iniciar sesión
- **And** el usuario no puede renovar sesión
- **And** el sistema revoca las sesiones activas del usuario
- **And** el usuario no aparece en listados operativos por defecto
- **And** la información histórica asociada se conserva
- **And** registra la acción en auditoría

**Escenario 2: Usuario inexistente**
- **Given** un administrador autenticado
- **When** intenta eliminar un usuario inexistente
- **Then** el sistema responde **404**

---

## US-B06 — Revocación de sesiones de un usuario

**Como** administrador  
**quiero** revocar las sesiones activas de un usuario  
**para** cortar el acceso de forma inmediata.

### Criterios de aceptación (GWT)

**Escenario 1: Revocar todas las sesiones**
- **Given** un administrador autenticado
- **And** un usuario existente con una o más sesiones activas
- **When** el administrador solicita revocar todas las sesiones del usuario
- **Then** el sistema revoca todas las sesiones activas
- **And** invalida los refresh tokens asociados
- **And** a partir de ese momento no es posible renovar access tokens
- **And** registra la acción en auditoría

**Escenario 2: Usuario sin sesiones**
- **Given** un administrador autenticado
- **And** un usuario existente sin sesiones activas
- **When** el administrador solicita revocar sesiones
- **Then** el sistema completa la operación sin error
- **And** registra la acción en auditoría

**Escenario 3: Usuario inexistente**
- **Given** un administrador autenticado
- **When** intenta revocar sesiones de un usuario inexistente
- **Then** el sistema responde **404**

---

## Notas técnicas
- Todas las operaciones requieren rol **Administrador**.
- No se exponen contraseñas, hashes ni tokens en ninguna respuesta.
- Auditoría mínima recomendada:
  - actor (admin), acción, usuario afectado, timestamp, resultado (éxito/fallo).
- La recuperación/cambio de contraseña se definirá en una épica específica (si aplica).


# Épica C — Gestión de Proveedores

## Contexto
Esta épica define las funcionalidades necesarias para la **gestión manual de proveedores**, entidad central del dominio Gestiora.  
Todos los documentos y facturas deben estar vinculados a un proveedor.  
La creación automática/asistida por IA se abordará en épicas posteriores.

Precondiciones:
- Usuario autenticado (Épica A).
- Gestión de usuarios operativa (Épica B).

---

## US-C01 — Creación de proveedor

**Como** usuario  
**quiero** crear un proveedor  
**para** poder asociar facturas y documentos.

### Criterios de aceptación (GWT)

**Escenario 1: Creación exitosa**
- **Given** un usuario autenticado
- **And** los datos mínimos del proveedor (p. ej. nombre/razón social)
- **When** el usuario crea un proveedor
- **Then** el sistema persiste el proveedor con un identificador único
- **And** establece el proveedor en estado activo
- **And** el proveedor puede ser usado para asociar documentos
- **And** registra la creación en auditoría

**Escenario 2: Proveedor duplicado**
- **Given** un usuario autenticado
- **And** existe un proveedor con el mismo identificador clave (p. ej. CIF/NIF o nombre normalizado)
- **When** el usuario intenta crear el proveedor
- **Then** el sistema rechaza la operación con error de validación
- **And** no crea un nuevo proveedor
- **And** registra el intento en auditoría

---

## US-C02 — Consulta y listado de proveedores

**Como** usuario  
**quiero** consultar y listar proveedores  
**para** localizar y gestionar los existentes.

### Criterios de aceptación (GWT)

**Escenario 1: Listado de proveedores**
- **Given** un usuario autenticado
- **When** solicita el listado de proveedores
- **Then** el sistema devuelve la lista de proveedores
- **And** cada proveedor incluye información básica (nombre, identificadores, estado)
- **And** no se exponen datos sensibles innecesarios

**Escenario 2: Consulta de detalle**
- **Given** un usuario autenticado
- **And** un proveedor existente
- **When** solicita el detalle del proveedor
- **Then** el sistema devuelve la información completa del proveedor

**Escenario 3: Proveedor inexistente**
- **Given** un usuario autenticado
- **When** solicita el detalle de un proveedor inexistente
- **Then** el sistema responde **404**

---

## US-C03 — Modificación de proveedor

**Como** usuario  
**quiero** modificar los datos de un proveedor  
**para** mantener la información actualizada.

### Criterios de aceptación (GWT)

**Escenario 1: Modificación exitosa**
- **Given** un usuario autenticado
- **And** un proveedor existente
- **When** el usuario modifica los datos permitidos del proveedor
- **Then** el sistema persiste los cambios
- **And** los cambios tienen efecto inmediato
- **And** registra la modificación en auditoría

**Escenario 2: Proveedor inexistente**
- **Given** un usuario autenticado
- **When** intenta modificar un proveedor inexistente
- **Then** el sistema responde **404**

**Escenario 3: Campos no permitidos**
- **Given** un usuario autenticado
- **And** un proveedor existente
- **When** intenta modificar un campo no permitido (p. ej. identificador interno)
- **Then** el sistema rechaza la operación con error de validación
- **And** no aplica el cambio
- **And** registra el intento en auditoría

---

## US-C04 — Activación y desactivación de proveedor

**Como** usuario  
**quiero** activar o desactivar proveedores  
**para** controlar su disponibilidad operativa.

### Criterios de aceptación (GWT)

**Escenario 1: Desactivación**
- **Given** un usuario autenticado
- **And** un proveedor activo
- **When** el usuario desactiva el proveedor
- **Then** el sistema marca el proveedor como inactivo
- **And** el proveedor no puede ser asignado a nuevos documentos
- **And** el proveedor sigue visible en consultas históricas
- **And** registra la acción en auditoría

**Escenario 2: Reactivación**
- **Given** un usuario autenticado
- **And** un proveedor inactivo
- **When** el usuario reactiva el proveedor
- **Then** el sistema marca el proveedor como activo
- **And** el proveedor puede volver a asociarse a documentos
- **And** registra la acción en auditoría

---

## US-C05 — Eliminación lógica de proveedor (Soft delete)

**Como** usuario  
**quiero** eliminar proveedores de forma lógica  
**para** mantener la integridad histórica del sistema.

### Criterios de aceptación (GWT)

**Escenario 1: Eliminación lógica exitosa**
- **Given** un usuario autenticado
- **And** un proveedor existente
- **When** el usuario elimina lógicamente el proveedor
- **Then** el sistema marca el proveedor como eliminado lógicamente
- **And** el proveedor no aparece en listados operativos por defecto
- **And** el proveedor no puede asociarse a nuevos documentos
- **And** los documentos históricos asociados se conservan
- **And** registra la acción en auditoría

**Escenario 2: Proveedor inexistente**
- **Given** un usuario autenticado
- **When** intenta eliminar un proveedor inexistente
- **Then** el sistema responde **404**

---

## US-C06 — Prevención de duplicados de proveedores

**Como** sistema  
**quiero** prevenir la creación de proveedores duplicados  
**para** evitar inconsistencias en los datos.

### Criterios de aceptación (GWT)

**Escenario 1: Validación previa a la creación**
- **Given** un usuario autenticado
- **And** reglas de duplicidad configuradas (p. ej. CIF/NIF, nombre normalizado)
- **When** el usuario intenta crear un proveedor
- **Then** el sistema valida la posible duplicidad antes de persistir

**Escenario 2: Duplicado detectado**
- **Given** un proveedor existente que coincide con las reglas de duplicidad
- **When** el usuario intenta crear un proveedor duplicado
- **Then** el sistema rechaza la creación
- **And** informa del conflicto mediante error de validación
- **And** no persiste el proveedor

---

## Notas técnicas
- El proveedor es una **entidad del dominio**.
- Los documentos siempre se relacionan con un proveedor.
- Esta épica no contempla:
  - fusión de proveedores,
  - enriquecimiento automático,
  - creación por IA.
  Estas capacidades se abordarán en épicas futuras.


# Épica D — Gestión Documental y Facturas (Manual)

## Contexto
Esta épica define las funcionalidades necesarias para la **gestión manual de facturas** en Gestiora.

Principios:
- El **documento original** es la fuente de verdad.
- La gestión es **manual** en esta fase (sin IA).
- Toda factura debe estar asociada a un **proveedor activo**.
- El acceso a facturas está protegido por autenticación y permisos.

Precondiciones:
- Usuario autenticado (Épica A).
- Proveedores gestionados (Épica C).

---

## US-D01 — Carga de factura (PDF)

**Como** usuario  
**quiero** subir una factura en formato PDF  
**para** almacenarlo y gestionarlo en la plataforma.

### Criterios de aceptación (GWT)

**Escenario 1: Carga exitosa**
- **Given** un usuario autenticado
- **And** un archivo en formato PDF válido
- **And** el tamaño del archivo está dentro del límite permitido
- **When** el usuario sube la factura
- **Then** el sistema almacena el archivo de forma segura
- **And** genera un identificador único para la factura
- **And** registra la carga en auditoría

**Escenario 2: Formato no permitido**
- **Given** un usuario autenticado
- **When** intenta subir un archivo con formato no permitido
- **Then** el sistema rechaza la operación con error de validación
- **And** no almacena la factura

**Escenario 3: Tamaño excedido**
- **Given** un usuario autenticado
- **When** intenta subir un archivo que excede el tamaño máximo permitido
- **Then** el sistema rechaza la operación con error de validación
- **And** no almacena la factura

---

## US-D02 — Asociación de factura a proveedor

**Como** usuario  
**quiero** asociar una factura a un proveedor  
**para** mantener la trazabilidad.

### Criterios de aceptación (GWT)

**Escenario 1: Asociación exitosa**
- **Given** un usuario autenticado
- **And** una factura existente
- **And** un proveedor activo existente
- **When** el usuario asocia la factura al proveedor
- **Then** el sistema guarda la asociación
- **And** la factura queda correctamente vinculada al proveedor
- **And** registra la acción en auditoría

**Escenario 2: Proveedor inactivo**
- **Given** un usuario autenticado
- **And** un proveedor inactivo o eliminado
- **When** intenta asociar la factura a ese proveedor
- **Then** el sistema rechaza la operación con error de validación
- **And** no guarda la asociación

---

## US-D03 — Registro manual de metadatos de factura

**Como** usuario  
**quiero** registrar manualmente los datos clave de una factura  
**para** poder consultarlos posteriormente.

### Criterios de aceptación (GWT)

**Escenario 1: Registro de metadatos**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** el usuario introduce los datos de la factura
- **Then** el sistema guarda los metadatos de la factura
- **And** valida los campos obligatorios
- **And** registra la acción en auditoría

**Escenario 2: Validación de campos obligatorios**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** el usuario omite campos obligatorios
- **Then** el sistema rechaza la operación con error de validación
- **And** no guarda los cambios

---

## US-D04 — Consulta y listado de facturas

**Como** usuario  
**quiero** listar y consultar facturas  
**para** localizar facturas existentes.

### Criterios de aceptación (GWT)

**Escenario 1: Listado de facturas**
- **Given** un usuario autenticado
- **When** solicita el listado de facturas
- **Then** el sistema devuelve la lista de facturas disponibles
- **And** permite aplicar filtros básicos (proveedor, fechas, importe)

**Escenario 2: Consulta de detalle**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** solicita el detalle de la factura
- **Then** el sistema devuelve los metadatos y la referencia al archivo

**Escenario 3: Factura inexistente**
- **Given** un usuario autenticado
- **When** solicita una factura inexistente
- **Then** el sistema responde **404**

---

## US-D05 — Visualización y descarga de factura

**Como** usuario  
**quiero** visualizar y descargar una factura  
**para** revisar su contenido original.

### Criterios de aceptación (GWT)

**Escenario 1: Visualización**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** solicita visualizar la factura
- **Then** el sistema permite el acceso al archivo

**Escenario 2: Descarga**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** solicita descargar la factura
- **Then** el sistema entrega el archivo original

**Escenario 3: Acceso no autorizado**
- **Given** un usuario no autenticado
- **When** intenta acceder a una factura
- **Then** el sistema responde **401**

---

## US-D06 — Modificación de metadatos de factura

**Como** usuario  
**quiero** modificar los metadatos de una factura  
**para** corregir o actualizar información.

### Criterios de aceptación (GWT)

**Escenario 1: Modificación exitosa**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** el usuario modifica los metadatos permitidos
- **Then** el sistema guarda los cambios
- **And** registra la modificación en auditoría

**Escenario 2: Factura eliminada**
- **Given** un usuario autenticado
- **And** una factura eliminada
- **When** intenta modificar sus metadatos
- **Then** el sistema rechaza la operación

---

## US-D07 — Eliminación lógica de factura (Soft delete)

**Como** usuario  
**quiero** eliminar facturas de forma lógica  
**para** mantener el sistema limpio sin perder trazabilidad.

### Criterios de aceptación (GWT)

**Escenario 1: Eliminación lógica**
- **Given** un usuario autenticado
- **And** una factura existente
- **When** el usuario elimina lógicamente la factura
- **Then** el sistema marca la factura como eliminada
- **And** la factura no aparece en listados operativos
- **And** el archivo original se conserva
- **And** registra la acción en auditoría

---

## US-D08 — Control de acceso a facturas

**Como** sistema  
**quiero** controlar el acceso a facturas  
**para** proteger la información.

### Criterios de aceptación (GWT)

**Escenario 1: Acceso permitido**
- **Given** un usuario autenticado
- **And** permisos suficientes
- **When** accede a una factura
- **Then** el sistema permite la operación

**Escenario 2: Acceso denegado**
- **Given** un usuario autenticado sin permisos suficientes
- **When** intenta acceder a una factura
- **Then** el sistema responde **403**

---

## US-D09 — Creación manual de factura (sin PDF)

**Como** usuario  
**quiero** crear una factura de manera manual con cabecera y movimientos  
**para** registrar facturas sin necesidad de adjuntar un PDF en el momento.

### Criterios de aceptación (GWT)

**Escenario 1: Creación manual exitosa sin PDF**
- **Given** un usuario autenticado
- **And** un proveedor activo existente
- **When** el usuario crea la factura con cabecera y movimientos
- **Then** el sistema crea una factura en estado **DRAFT**
- **And** persiste cabecera y movimientos en una sola operación
- **And** registra la acción en auditoría

**Escenario 2: Proveedor inactivo o eliminado**
- **Given** un usuario autenticado
- **And** un proveedor inactivo o eliminado
- **When** el usuario intenta crear la factura manual
- **Then** el sistema rechaza la operación con error de validación

**Escenario 3: Campos obligatorios o totales inválidos**
- **Given** un usuario autenticado
- **When** el usuario omite campos obligatorios o los totales no son coherentes
- **Then** el sistema rechaza la operación con error de validación

---

## US-D10 — Adjuntar PDF a factura manual

**Como** usuario  
**quiero** adjuntar un PDF a una factura creada manualmente  
**para** completar el registro con el archivo original.

### Criterios de aceptación (GWT)

**Escenario 1: Adjuntar PDF exitoso**
- **Given** un usuario autenticado
- **And** una factura en estado **DRAFT** existente
- **When** el usuario adjunta un PDF válido
- **Then** el sistema almacena el archivo de forma segura
- **And** crea el FileRef asociado
- **And** cambia el estado de la factura a **ACTIVO**
- **And** registra la acción en auditoría

**Escenario 2: Factura inexistente o eliminada**
- **Given** un usuario autenticado
- **When** intenta adjuntar un PDF a una factura inexistente o eliminada
- **Then** el sistema responde con **404** o error de validación

**Escenario 3: PDF inválido o tamaño excedido**
- **Given** un usuario autenticado
- **When** adjunta un archivo no permitido o demasiado grande
- **Then** el sistema rechaza la operación con error de validación

---

## US-D11 — Modificación de factura manual (cabecera y movimientos)

**Como** usuario  
**quiero** modificar la cabecera y movimientos de una factura manual  
**para** corregir o actualizar la información registrada.

### Criterios de aceptación (GWT)

**Escenario 1: Modificación exitosa**
- **Given** un usuario autenticado
- **And** una factura manual existente y no eliminada
- **When** el usuario actualiza cabecera y movimientos
- **Then** el sistema persiste los cambios como conjunto
- **And** registra la acción en auditoría

**Escenario 2: Factura eliminada**
- **Given** un usuario autenticado
- **And** una factura eliminada
- **When** intenta modificar la factura
- **Then** el sistema rechaza la operación

**Escenario 3: Inconsistencias de datos**
- **Given** un usuario autenticado
- **When** los movimientos no cuadran con los totales o faltan campos
- **Then** el sistema rechaza la operación con error de validación

---

## Notas técnicas
- La factura es el **aggregate root** del dominio.
- El archivo (PDF) y los metadatos se gestionan de forma separada.
- El documento original nunca se modifica.
- La extracción automática y búsqueda semántica se abordan en épicas posteriores.
- Se permite crear facturas manuales en estado **DRAFT** sin PDF asociado.
- La factura manual incluye cabecera y movimientos en una sola llamada.
- Las facturas manuales forman parte de la fuente de conocimiento.


# Épica E — Extracción de Información mediante Inteligencia Artificial

## Contexto
Esta épica introduce capacidades de **extracción automática de información** a partir de documentos (facturas) mediante inteligencia artificial.

Principios:
- La IA actúa como **asistente**, no como fuente de verdad.
- El documento original sigue siendo la referencia principal.
- Los datos extraídos deben ser **revisables y corregibles** por el usuario.
- Los procesos de extracción se ejecutan de forma **asíncrona**.

Precondiciones:
- Gestión documental operativa (Épica D).
- Proveedores gestionados (Épica C).

---

## US-E01 — Extracción automática al subir un documento

**Como** usuario  
**quiero** que el sistema extraiga automáticamente información de una factura  
**para** reducir el trabajo manual de registro.

### Criterios de aceptación (GWT)

**Escenario 1: Extracción iniciada correctamente**
- **Given** un usuario autenticado
- **And** un documento PDF recién subido
- **When** el sistema inicia el proceso de extracción automática
- **Then** el documento queda disponible inmediatamente
- **And** el proceso de extracción se ejecuta de forma asíncrona
- **And** el estado de extracción se marca como *pendiente* o *en proceso*
- **And** el evento queda registrado

**Escenario 2: Extracción no bloqueante**
- **Given** un documento con extracción en proceso
- **When** el usuario accede al documento
- **Then** el sistema permite su consulta y gestión manual

---

## US-E02 — Datos mínimos extraídos de la factura

**Como** sistema  
**quiero** extraer automáticamente los datos clave de una factura  
**para** estructurar la información.

### Criterios de aceptación (GWT)

**Escenario 1: Extracción de campos mínimos**
- **Given** un documento válido
- **When** el sistema procesa la extracción
- **Then** intenta extraer al menos:
  - proveedor
  - número de factura
  - fecha de factura
  - importe total
  - impuestos
  - conceptos principales

**Escenario 2: Almacenamiento estructurado**
- **Given** datos extraídos por IA
- **When** el sistema los persiste
- **Then** los guarda como datos estructurados
- **And** marca cada campo como *extraído automáticamente*
- **And** asocia un indicador de confianza o estado

---

## US-E03 — Asociación automática de proveedor

**Como** usuario  
**quiero** que el sistema asocie automáticamente el proveedor detectado  
**para** agilizar la gestión del documento.

### Criterios de aceptación (GWT)

**Escenario 1: Proveedor existente**
- **Given** un proveedor existente en el sistema
- **And** el proveedor es detectado durante la extracción
- **When** finaliza el proceso de extracción
- **Then** el documento queda asociado automáticamente al proveedor

**Escenario 2: Proveedor no existente**
- **Given** que el proveedor detectado no existe
- **When** finaliza el proceso de extracción
- **Then** el sistema crea un proveedor en estado *borrador*
- **And** asocia el documento a dicho borrador
- **And** marca el proveedor como pendiente de revisión

---

## US-E04 — Revisión y validación de datos extraídos

**Como** usuario  
**quiero** revisar y validar los datos extraídos por IA  
**para** asegurar su corrección.

### Criterios de aceptación (GWT)

**Escenario 1: Revisión de datos**
- **Given** un documento con datos extraídos por IA
- **When** el usuario accede a la vista de revisión
- **Then** el sistema muestra claramente:
  - datos introducidos manualmente
  - datos extraídos automáticamente

**Escenario 2: Validación de datos**
- **Given** datos extraídos pendientes de validación
- **When** el usuario confirma o corrige los datos
- **Then** el sistema guarda los datos como *confirmados*
- **And** no sobrescribe datos manuales sin confirmación
- **And** registra la acción en auditoría

---

## US-E05 — Reprocesado de extracción

**Como** usuario  
**quiero** reprocesar la extracción de un documento  
**para** mejorar resultados o corregir errores.

### Criterios de aceptación (GWT)

**Escenario 1: Reprocesado iniciado**
- **Given** un documento existente
- **When** el usuario solicita reprocesar la extracción
- **Then** el sistema inicia un nuevo proceso de extracción
- **And** mantiene los datos confirmados existentes
- **And** actualiza el estado de extracción

**Escenario 2: Trazabilidad del reprocesado**
- **Given** múltiples reprocesados sobre un documento
- **When** se consulta el historial
- **Then** el sistema mantiene trazabilidad de los reprocesados

---

## US-E06 — Gestión de estados de extracción

**Como** sistema  
**quiero** gestionar el estado del proceso de extracción  
**para** informar correctamente al usuario.

### Criterios de aceptación (GWT)

**Escenario 1: Estados definidos**
- **Given** un documento con extracción
- **Then** el sistema gestiona estados como:
  - pendiente
  - en proceso
  - completado
  - fallido

**Escenario 2: Fallo de extracción**
- **Given** un error durante la extracción
- **When** el proceso falla
- **Then** el sistema marca el estado como *fallido*
- **And** permite la gestión manual del documento

---

## US-E07 — Trazabilidad y explicabilidad de la extracción

**Como** usuario  
**quiero** entender el origen de los datos extraídos  
**para** confiar en la información presentada.

### Criterios de aceptación (GWT)

**Escenario 1: Origen de datos**
- **Given** un documento con datos extraídos
- **When** el usuario consulta los datos
- **Then** el sistema indica qué campos fueron:
  - extraídos automáticamente
  - introducidos manualmente

**Escenario 2: Referencia al documento original**
- **Given** datos extraídos por IA
- **Then** el sistema mantiene referencia directa al documento original
- **And** no presenta inferencias como datos confirmados

---

## Notas técnicas
- La extracción se ejecuta mediante procesos asíncronos (colas, workers).
- La IA no modifica el documento original.
- Los datos extraídos siempre pueden ser revisados.
- No se contempla aprendizaje automático continuo en esta épica.


# Épica F — Búsqueda y Consultas en Lenguaje Natural (RAG)

## Contexto
Esta épica introduce capacidades de **búsqueda avanzada y consultas en lenguaje natural** sobre documentos y datos del sistema Gestiora mediante un enfoque de **Retrieval-Augmented Generation (RAG)**.

Principios:
- La búsqueda respeta **autenticación, roles y permisos**.
- Las respuestas generadas deben estar **respaldadas por documentos**.
- El sistema prioriza **precisión y trazabilidad** frente a creatividad.
- El usuario siempre puede acceder a la **fuente original**.

Precondiciones:
- Gestión documental operativa (Épica D).
- Datos estructurados disponibles (Épica D / E).
- Extracción IA operativa (Épica E).

---

## US-F01 — Consulta en lenguaje natural

**Como** usuario  
**quiero** realizar consultas en lenguaje natural  
**para** obtener información sobre mis facturas y documentos.

### Criterios de aceptación (GWT)

**Escenario 1: Consulta válida**
- **Given** un usuario autenticado
- **When** introduce una consulta en lenguaje natural
- **Then** el sistema procesa la consulta
- **And** devuelve una respuesta en lenguaje natural
- **And** la respuesta se basa únicamente en información accesible al usuario

**Escenario 2: Usuario no autenticado**
- **Given** un usuario no autenticado
- **When** intenta realizar una consulta
- **Then** el sistema responde **401**

---

## US-F02 — Recuperación de documentos relevantes (Retrieval)

**Como** sistema  
**quiero** recuperar los documentos más relevantes  
**para** responder a la consulta del usuario.

### Criterios de aceptación (GWT)

**Escenario 1: Recuperación limitada por permisos**
- **Given** una consulta realizada por un usuario autenticado
- **When** el sistema recupera documentos candidatos
- **Then** solo considera documentos accesibles según permisos del usuario

**Escenario 2: Conjunto limitado de documentos**
- **Given** documentos relevantes disponibles
- **When** el sistema selecciona documentos para la respuesta
- **Then** limita el número de documentos utilizados
- **And** mantiene referencia explícita a cada documento seleccionado

---

## US-F03 — Generación de respuesta con referencias

**Como** usuario  
**quiero** recibir respuestas con referencias a documentos  
**para** poder verificar la información.

### Criterios de aceptación (GWT)

**Escenario 1: Respuesta respaldada**
- **Given** documentos relevantes recuperados
- **When** el sistema genera la respuesta
- **Then** la respuesta incluye referencias a los documentos utilizados
- **And** cada referencia permite acceder al documento original

**Escenario 2: Sin respaldo suficiente**
- **Given** que no existen documentos relevantes suficientes
- **When** el sistema intenta generar una respuesta
- **Then** el sistema informa de que no puede generar una respuesta fiable
- **And** no genera información no respaldada

---

## US-F04 — Filtros implícitos y explícitos en consultas

**Como** usuario  
**quiero** aplicar filtros en mis consultas  
**para** acotar los resultados obtenidos.

### Criterios de aceptación (GWT)

**Escenario 1: Filtros implícitos**
- **Given** una consulta con referencias implícitas (fechas, proveedores, importes)
- **When** el sistema interpreta la consulta
- **Then** aplica los filtros detectados automáticamente antes de recuperar documentos

**Escenario 2: Filtros explícitos**
- **Given** una consulta con filtros explícitos definidos
- **When** el sistema procesa la consulta
- **Then** aplica los filtros indicados por el usuario

---

## US-F05 — Acceso directo a documentos desde resultados

**Como** usuario  
**quiero** acceder directamente a los documentos relacionados  
**para** revisar la fuente original.

### Criterios de aceptación (GWT)

**Escenario 1: Acceso desde la respuesta**
- **Given** una respuesta con referencias a documentos
- **When** el usuario selecciona una referencia
- **Then** el sistema permite acceder al documento original
- **And** aplica las reglas de autenticación y permisos

---

## US-F06 — Gestión de ambigüedad y respuestas parciales

**Como** sistema  
**quiero** gestionar consultas ambiguas o incompletas  
**para** evitar respuestas incorrectas.

### Criterios de aceptación (GWT)

**Escenario 1: Consulta ambigua**
- **Given** una consulta ambigua
- **When** el sistema no puede interpretarla con precisión
- **Then** solicita aclaración al usuario
- **Or** devuelve una respuesta parcial indicando limitaciones

**Escenario 2: Priorización de precisión**
- **Given** información incompleta
- **When** el sistema genera una respuesta
- **Then** prioriza la precisión frente a la exhaustividad

---

## US-F07 — Control de contenido de respuestas generadas

**Como** sistema  
**quiero** controlar el contenido de las respuestas generadas  
**para** evitar información errónea o sensible.

### Criterios de aceptación (GWT)

**Escenario 1: No generación de datos inexistentes**
- **Given** una consulta del usuario
- **When** el sistema genera la respuesta
- **Then** no incluye datos que no existan en el sistema

**Escenario 2: Limitación del contenido**
- **Given** una consulta válida
- **When** el sistema genera la respuesta
- **Then** respeta límites de longitud y contenido configurados

---

## US-F08 — Trazabilidad y auditoría de consultas

**Como** administrador  
**quiero** disponer de trazabilidad de las consultas realizadas  
**para** auditoría y mejora del sistema.

### Criterios de aceptación (GWT)

**Escenario 1: Registro de consultas**
- **Given** una consulta realizada por un usuario autenticado
- **When** la consulta es procesada
- **Then** el sistema registra:
  - usuario
  - timestamp
  - tipo de consulta
- **And** no almacena el contenido completo si contiene datos sensibles (según configuración)

---

## Notas técnicas
- El sistema RAG no tiene acceso directo a la base de datos.
- El modelo solo recibe contexto previamente recuperado.
- Todas las respuestas deben poder ser trazadas a documentos concretos.
- No se contempla chat conversacional persistente en esta épica.
