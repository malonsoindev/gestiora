---
config:
  layout: elk
---
flowchart TB
  subgraph Gestiora["Gestiora"]
    %% Auth
    UC_Login["Iniciar sesión"]
    UC_Logout["Cerrar sesión"]

    %% Proveedores
    UC_Prov["Gestionar proveedores"]
    UC_Prov_List["Listar proveedores"]
    UC_Prov_Create["Crear proveedor"]
    UC_Prov_Update["Modificar proveedor"]
    UC_Prov_Delete["Eliminar proveedor"]
    UC_Prov_Draft["Revisar borrador de proveedor (IA)"]

    %% Documentos / Facturas
    UC_Docs["Gestionar documentos"]
    UC_Doc_Create_Manual["Crear documento manual"]
    UC_Doc_Upload["Subir factura PDF"]
    UC_Doc_List["Listar documentos"]
    UC_Doc_View["Consultar/Descargar documento"]
    UC_Doc_Update["Actualizar metadatos"]
    UC_Doc_Delete["Eliminar documento"]

    %% IA Extracción
    UC_Extract["Extraer información con IA"]
    UC_Extract_Review["Revisar/Corregir datos extraídos"]

    %% Búsqueda RAG
    UC_Search["Buscar en documentos con lenguaje natural"]
    UC_Search_Evidence["Ver evidencias y enlace al documento"]

    %% Administración usuarios
    UC_Users["Administrar usuarios"]
    UC_User_Create["Crear usuario"]
    UC_User_Update["Modificar usuario"]
    UC_User_Delete["Eliminar usuario"]
  end

  %% Actores
  U["Usuario"]
  A["Administrador"]

  %% Generalización actor (Admin es Usuario)
  A --> U

  %% Accesos principales
  U --> UC_Login
  U --> UC_Logout
  U --> UC_Prov
  U --> UC_Docs
  U --> UC_Search

  A --> UC_Users

  %% Includes: siempre que "Gestionar" sucede, incluye operaciones
  UC_Prov -. include .-> UC_Prov_List
  UC_Prov -. include .-> UC_Prov_Create
  UC_Prov -. include .-> UC_Prov_Update
  UC_Prov -. include .-> UC_Prov_Delete

  UC_Docs -. include .-> UC_Doc_List
  UC_Docs -. include .-> UC_Doc_View
  UC_Docs -. include .-> UC_Doc_Update
  UC_Docs -. include .-> UC_Doc_Delete
  UC_Docs -. include .-> UC_Doc_Create_Manual
  UC_Docs -. include .-> UC_Doc_Upload

  %% IA: extracción es opcional/condicional según configuración o tipo documento
  UC_Doc_Upload -. extend .-> UC_Extract
  UC_Extract -. include .-> UC_Extract_Review

  %% Draft proveedor: aparece si la IA detecta proveedor no existente
  UC_Extract -. extend .-> UC_Prov_Draft

  %% RAG: siempre muestra evidencias; ver documento es accesible desde evidencias
  UC_Search -. include .-> UC_Search_Evidence
  UC_Search_Evidence -. include .-> UC_Doc_View

  %% Admin users
  UC_Users -. include .-> UC_User_Create
  UC_Users -. include .-> UC_User_Update
  UC_Users -. include .-> UC_User_Delete

  title["Gestiora — Casos de uso (alto nivel)"]
