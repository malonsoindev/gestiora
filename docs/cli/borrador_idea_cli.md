# Borrador Funcional: CLI de Gestión de Usuarios

Este documento describe el desarrollo de una interfaz de línea de comandos (CLI) para la gestión de usuarios en el sistema Gestiora.

## 1. Autenticación y Privacidad

- **Acceso Restringido:** El CLI dispondrá de un inicio de sesión (*Login*) exclusivo para administradores.
- **Privacidad Estricta:** Nunca se mostrarán las contraseñas de los usuarios por pantalla en ninguna de las operativas.

## 2. Menú Principal

Una vez iniciada la sesión, el administrador tendrá acceso a un menú principal con las siguientes opciones:

1. **Listar usuarios**
2. **Buscar usuario**
3. **Modificar usuario**
   - Modificar datos
   - Deshabilitar estado
4. **Restablecer contraseña**
5. **Salir**

---

## 3. Descripción de las Opciones

### 3.1. Listar usuarios
Se mostrará un listado, **ordenado alfabéticamente**, con la información principal de todos los usuarios del sistema (excluyendo contraseñas).

### 3.2. Buscar usuario
El sistema pedirá un término de búsqueda (una cadena de texto) y listará los usuarios que contengan dicho valor en alguno de sus campos principales.

### 3.3. Modificar usuario
Al elegir esta opción, se mostrará un submenú preguntando qué aspecto se desea editar: los **datos** o el **estado**. Seguidamente, se pedirá el identificador del usuario.

- **Opción "Deshabilitar" (Estado):**
  - Se le cambiará el estado al usuario a deshabilitado.
  - *Acción automática:* Se revocarán las sesiones abiertas de este usuario para que pierda el acceso inmediatamente.
  
- **Opción "Datos":**
  - Se mostrarán por pantalla los datos actuales del usuario (sin contraseñas).
  - Se solicitará el nombre del campo a editar y el nuevo valor.
  - Se requerirá confirmación antes de guardar. 
  - Una vez guardado, se mostrará en pantalla el resultado final.
  - Se deberá pulsar cualquier tecla para regresar al menú principal.

### 3.4. Restablecer contraseña
El proceso solicitará el identificador del usuario y, a continuación, pedirá ingresar la **nueva contraseña dos veces** (para validación).

- **Comportamiento de sesiones según el usuario:**
  - Si el administrador restablece la contraseña de **otro usuario**, se revocarán todas las sesiones abiertas de dicho usuario, forzándolo a iniciar sesión nuevamente.
  - Si el administrador restablece **su propia contraseña**, las sesiones actuales no se revocarán.

### 3.5. Salir
Esta opción finaliza el programa CLI.