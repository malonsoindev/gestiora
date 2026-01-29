# Descripción de la idea

Se desea desarrollar un producto en dos fases:

- **Primera fase:** desarrollo del backend.  
- **Segunda fase:** desarrollo del frontend.

El producto consiste en una plataforma para la generación de facturas de proveedores, que permitirá tanto la creación manual como la carga de archivos PDF y la extracción de información mediante inteligencia artificial.

La plataforma también tendrá la capacidad de realizar servicios de búsqueda en los documentos utilizando inteligencia artificial y lenguaje natural.

La plataforma será segura; todas las peticiones se atenderán de manera securizada mediante un sistema de login de usuario.

La plataforma gestionará proveedores, a los que quedarán vinculados las facturas (esto es importante por si luego se integra con algun servicio adicional de la empresa, ERP, Contabilidad, Mensajeria, etc etc.)

## Frontend

El frontend podrá implementarse de dos formas, en función del tipo de usuario:

- Una **aplicación web** para los usuarios.  
- Una **CLI (Command Line Interface)** para el administrador.

## Roles del sistema

Inicialmente existirán dos roles:

- **Usuario**
- **Administrador**

### Usuario

El usuario tendrá acceso a la plataforma y podrá realizar las siguientes acciones:

- Administración de proveedores: Litado, Alta, Baja, Modificación.
- Carga y consulta de documentos.  
- Subida, creación, actualización y baja de documentos.  
- Listado de documentos existentes.  
- Búsqueda de contenido dentro de los documentos.  
- Gestión de la generación de nueva información y de la información existente.

### Administrador

El administrador tendrá la capacidad de:

- Crear nuevos usuarios.  
- Modificar usuarios existentes.  
- Eliminar usuarios existentes.
