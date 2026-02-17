# Gestiora: Gestión inteligente que avanza contigo

**Gestiora** es una plataforma de backend profesional diseñada para centralizar y automatizar la **gestión de facturas de compra**. Actúa como un motor de integración inteligente que transforma documentos estáticos en datos accionables, permitiendo a las empresas optimizar sus procesos administrativos y financieros mediante el uso de Inteligencia Artificial avanzada.

## 🔗 Enlaces
*   **🌐 Web de presentación:** [https://gestiora.onrender.com/](https://gestiora.onrender.com/)
*   **💻 Repositorio:** [https://github.com/malonsoindev/gestiora.git](https://github.com/malonsoindev/gestiora.git)
*   **🚀 Producción:** [https://gestiora.onrender.com/](https://gestiora.onrender.com/)
*   **📄 Documentación de la API (Swagger):** [(https://gestiora.onrender.com/docs](https://gestiora.onrender.com/docs)
*   **📊 Slides:** [https://docs.google.com/presentation/d/1TUj86iuQ77tMXcwZqaT1rPWroCIgmve71ZtBmObPsJw/edit?usp=sharing](https://docs.google.com/presentation/d/1TUj86iuQ77tMXcwZqaT1rPWroCIgmve71ZtBmObPsJw/edit?usp=sharing)

### Videos demostrativos
La web de presentación incluye dos videos que documentan el desarrollo del proyecto:
*   **Anatomía de un Plan:** Explica la planificación, arquitectura y decisiones de diseño del proyecto.
*   **Demo Técnica:** Demuestra el funcionamiento de la API y sus capacidades.

> **Tip:** El servidor en Render entra en modo de suspension tras un periodo de inactividad. La primera peticion puede tardar entre 30-60 segundos mientras el servicio se reactiva. Las siguientes peticiones responderan con normalidad.

## 💡 Idea General
El proyecto nace para resolver la lentitud de los procesos manuales y la dispersión de información en documentos no estructurados. Gestiora permite gestionar el ciclo de vida de una factura (desde su recepción hasta su archivo histórico), asegurando que los datos sean siempre accesibles y veraces, ya sean procesados por una IA o introducidos manualmente. La idea surge al observar cuellos de botella recurrentes en administracion financiera: demasiado tiempo perdido en tareas repetitivas, baja trazabilidad y errores en la captura de datos.

El valor diferenciador es la combinacion de IA asistida con control humano estricto y una arquitectura limpia que garantiza escalabilidad y mantenibilidad.

## ✨ Funcionalidades y Metodología
Gestiora destaca por su flexibilidad, permitiendo que la operativa del negocio nunca se detenga bajo el principio de que **el humano siempre tiene el control**. La IA propone, el usuario valida y corrige: la supervisión humana es obligatoria antes de consolidar datos. En la practica, los datos extraidos por IA quedan en estado propuesto hasta su confirmacion; cualquier correccion humana marca el origen como manual y fija el estado como confirmado.

### 1. Procesamiento Dual (Manual y Automático)
*   **Vía Automática (Asistida por IA):** Al recibir un PDF, el sistema utiliza modelos de extracción semántica para identificar automáticamente al proveedor, fechas, importes e impuestos. La IA actúa como un asistente: propone los datos para que el usuario los valide o corrija.
*   **Vía Manual (Estado DRAFT):** El usuario puede dar de alta la cabecera y los movimientos de una factura de forma manual sin necesidad de disponer del archivo PDF en ese momento. 
*   **Vinculación de Fuente de Verdad:** Cualquier factura creada manualmente puede vincularse posteriormente con su archivo PDF original. Una vez vinculado, el documento pasa a estado **ACTIVO** y el archivo se convierte en la fuente de verdad inmutable para consultas y auditorías.

### 2. Gestión de Proveedores
*   Registro centralizado de proveedores con prevención de duplicados.
*   **Borradores Inteligentes:** Si la IA detecta una factura de un proveedor no registrado, crea automáticamente un borrador de proveedor para facilitar su alta definitiva.

### 3. Consulta Inteligente (RAG)
*   Implementación de **Retrieval-Augmented Generation (RAG)** para realizar búsquedas en lenguaje natural sobre el histórico documental.
*   Respuestas precisas basadas exclusivamente en los documentos autorizados, con referencias directas para visualizar o descargar el archivo original.

## 🛡️ Seguridad y Protección Activa
La plataforma aplica el enfoque de **Security by Design** para garantizar la integridad de la información:

*   **Seguridad de Credenciales:** Las contraseñas se protegen mediante el algoritmo de hasheo **bcrypt (con salt)**, asegurando que nunca se almacenen en texto plano.
*   **Mitigación de Fuerza Bruta:** Implementación de un sistema de *rate-limiting* que permite un máximo de **5 intentos fallidos en una ventana de 15 minutos**. Se aplica una limitación temporal por ventana (sin bloqueo permanente de cuenta) para no penalizar la experiencia de usuario.
*   **Trazabilidad Completa:** Cada intento de inicio de sesión (exitoso o fallido) se registra en la tabla de persistencia `login_attempts`, permitiendo una auditoría detallada de la seguridad del sistema.

## 🏗️ Arquitectura del Software
El backend está construido siguiendo un patrón de **Monolito Modular** bajo los estándares de **Clean Architecture** y principios de **Domain-Driven Design (DDD)**:

*   **Domain:** Contiene las reglas de negocio, entidades y objetos de valor, totalmente aislados de la tecnología.
*   **Application:** Implementa los casos de uso y orquesta el flujo de la información.
*   **Infrastructure:** Adaptadores técnicos para la comunicación (Fastify), la persistencia y los servicios de IA (Genkit).
*   **Principios y calidad:** Diseño guiado por SOLID, desarrollo con TDD (tests marcan el avance), buenas prácticas continuas, enfoque **Security by Design** desde el arranque y documentación tratada como código desde el inicio del repositorio.

## 🧩 Estructura del Proyecto
La organizacion del codigo refleja Clean Architecture, separando responsabilidades y evitando acoplamientos:

*   `src/domain`: Entidades, value objects y reglas de negocio puras.
*   `src/application`: Casos de uso y puertos (interfaces) que orquestan la logica.
*   `src/infrastructure`: Adaptadores tecnicos (HTTP, DB, storage, IA).
*   `src/composition`: Composicion y wiring de dependencias.

## 🛠️ Stack Tecnológico
*   **Lenguaje:** TypeScript (strict mode).
*   **Entorno:** Node.js.
*   **Framework Web:** Fastify.
*   **Persistencia de datos:**
    *   **Desarrollo:** Repositorios **in-memory** para un prototipado y testeo ágil de la lógica de negocio.
    *   **Producción:** Base de datos **PostgreSQL** en **Supabase** (nuestro despliegue actual).
*   **Testing:** Vitest.
*   **Seguridad:** JSON Web Tokens (JWT) y Bcrypt.
*   **IA:** **Genkit** para la extracción estructurada de datos y motor RAG.
*   **Cliente IA:** OpenCode para asistencia en desarrollo.
*   **Modelos IA:**
    *   **GPT-5.2 Codex** — Desarrollo principal en local y tareas automaticas en segundo plano (web).
    *   **Claude Opus 4.5** — Analisis, refactorizacion y optimizacion de codigo.

## ⚙️ Instalación y Ejecución
1.  Clonar el repositorio.
2.  Instalar dependencias: `npm install`.
3.  Copiar `.env.example` a `.env` y configurar las variables necesarias (ver tabla abajo).
4.  **Desplegar la base de datos:** `npm run db:deploy`.
5.  **Cargar datos iniciales (seed):** `npm run db:seed`.
6.  Iniciar el servidor en desarrollo: `npm run dev`.

> **Importante:** Los pasos 4 y 5 son obligatorios si usas `DATABASE_TYPE=postgres`.
> - `db:deploy` crea las tablas y estructura de la base de datos.
> - `db:seed` genera dos usuarios de prueba, uno por cada rol.
>
> **Nota:** Si usas `DATABASE_TYPE=in-memory`, el seed se ejecuta automaticamente al iniciar el servidor. No es necesario ejecutar `db:deploy` ni `db:seed`.

### Variables de entorno

| Variable | Requerida | Valor por defecto | Descripcion |
|----------|-----------|-------------------|-------------|
| `JWT_ACCESS_SECRET` | **Si** | - | Clave secreta para firmar tokens de acceso JWT |
| `JWT_REFRESH_SECRET` | **Si** | - | Clave secreta para firmar tokens de refresco JWT |
| `PORT` | No | `3000` | Puerto en el que escucha el servidor |
| `NODE_ENV` | No | `development` | Entorno de ejecucion (`development`, `production`, `test`) |
| `CORS` | No | `false` | Habilitar CORS (`true`, `false`, lista JSON de origenes, o string) |
| `SWAGGER` | No | `false` | Exponer Swagger UI en `/docs` (`true`, `false`) |
| `DATABASE_TYPE` | No | `in-memory` | Tipo de base de datos (`in-memory`, `postgres`) |
| `DATABASE_URL` | Condicional | - | URL de conexion PostgreSQL. **Requerida si `DATABASE_TYPE=postgres`** |
| `STORAGE_TYPE` | No | `in-memory` | Tipo de almacenamiento de archivos (`in-memory`, `local`) |
| `STORAGE_PATH` | No | `storage` | Ruta para almacenamiento local de archivos |
| `AI_AGENT_TYPE` | No | `stub` | Tipo de agente IA (`stub`, `stub-error`, `genkit`) |
| `OPENAI_API_KEY` | Condicional | - | API Key de OpenAI. **Requerida si `AI_AGENT_TYPE=genkit`** |
| `OAI_MODEL_NAME` | No | - | Nombre del modelo OpenAI a utilizar |
| `PROVIDER_NAME` | No | - | Proveedor de IA (`OpenAI`, `Gemini`) |
| `IA_TYPE` | No | `oai` | Tipo de cliente IA (`oai`, `local`, `google`) |
| `RAG_INDEX_NAME` | No | - | Nombre del indice para RAG |
| `RAG_PROMPT_DIR` | No | `prompts` | Directorio donde se encuentran los prompts |
| `RAG_EMBEDDER_MODEL` | No | - | Modelo de embeddings para RAG |

> **Minimas recomendadas:** `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son obligatorias para que el servidor arranque. Si usas PostgreSQL, tambien necesitas `DATABASE_URL`.

### Credenciales por defecto (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@example.com | AdminPass1!a |
| Usuario | user@example.com | UserPass1!a |

### Plantilla de llamadas a la API

En la carpeta `docs/` se encuentra el fichero [`curl.md`](docs/curl.md) con la plantilla completa de llamadas a todos los endpoints de la API (34 en total), incluyendo ejemplos para **Bash** y **PowerShell**.

### Documentos de prueba

En la carpeta [`demo/`](demo/) se incluyen facturas PDF de ejemplo para testear el producto:
*   `ficticia1.pdf`
*   `ficticia2.pdf`
*   `ficticia3.pdf`
