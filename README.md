# Gestiora: Gestión inteligente que avanza contigo

**Gestiora** es una plataforma de backend profesional diseñada para centralizar y automatizar la **gestión de facturas de compra**. Actúa como un motor de integración inteligente que transforma documentos estáticos en datos accionables, permitiendo a las empresas optimizar sus procesos administrativos y financieros mediante el uso de Inteligencia Artificial avanzada.

## 🔗 Enlaces
*   **Repositorio:** [GitHub](<URL_PENDIENTE>)
*   **Producción:** [Demo](<URL_PENDIENTE>)
*   **Slides:** [Presentación](<URL_PENDIENTE>)

## 💡 Idea General
El proyecto nace para resolver la lentitud de los procesos manuales y la dispersión de información en documentos no estructurados. Gestiora permite gestionar el ciclo de vida de una factura (desde su recepción hasta su archivo histórico), asegurando que los datos sean siempre accesibles y veraces, ya sean procesados por una IA o introducidos manualmente. La idea surge al observar cuellos de botella recurrentes en administracion financiera: demasiado tiempo perdido en tareas repetitivas, baja trazabilidad y errores en la captura de datos.

El valor diferenciador es la combinacion de IA asistida con control humano estricto y una arquitectura limpia que garantiza escalabilidad y mantenibilidad.

## ✨ Funcionalidades y Metodología
Gestiora destaca por su flexibilidad, permitiendo que la operativa del negocio nunca se detenga bajo el principio de que **el humano siempre tiene el control**. La IA propone, el usuario valida y corrige: la supervisión humana es obligatoria antes de consolidar datos.

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

## 🧩 Estructura del Proyecto
La organizacion del codigo refleja Clean Architecture, separando responsabilidades y evitando acoplamientos:

*   `src/domain`: Entidades, value objects y reglas de negocio puras.
*   `src/application`: Casos de uso y puertos (interfaces) que orquestan la logica.
*   `src/infrastructure`: Adaptadores tecnicos (HTTP, DB, storage, IA).
*   `src/composition`: Composicion y wiring de dependencias.

## 🛠️ Stack Tecnológico
*   **Entorno:** Node.js.
*   **Framework Web:** Fastify.
*   **Persistencia de datos:**
    *   **Desarrollo:** Repositorios **in-memory** para un prototipado y testeo ágil de la lógica de negocio.
    *   **Producción:** Base de datos **PostgreSQL** en **Supabase** (nuestro despliegue actual).
*   **IA:** **Genkit** para la extracción estructurada de datos y motor RAG.
*   **Seguridad:** JSON Web Tokens (JWT) y Bcrypt.

## ⚙️ Instalación y Ejecución
1.  Clonar el repositorio.
2.  Instalar dependencias: `npm install`.
3.  Copiar `.env.example` a `.env` y configurar las variables necesarias.
4.  Variables minimas recomendadas:
    *   `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.
    *   `DATABASE_TYPE` (in-memory o postgres) y `DATABASE_URL` si usas Postgres.
    *   `AI_AGENT_TYPE=genkit` y las credenciales del proveedor (`OPENAI_API_KEY`/`PROVIDER_NAME`) si activas IA.
5.  Iniciar el servidor en desarrollo: `npm run dev`.
