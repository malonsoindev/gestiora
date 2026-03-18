# Design Doc — DD-WEB-006 Estrategia de Testing en Angular

## 1. Contexto y Objetivos

Alinear el desarrollo de la aplicación web de Angular con los requisitos establecidos en las políticas generales y el AGENTS.md (`No se cambia un test para hacer pasar el código`, `TDD`, etc.). 

Tradicionalmente, Angular viene empacado con Jasmine y Karma, pero en Gestiora utilizamos **Vitest** en el Backend y la CLI. El objetivo de este documento es definir el "stack" final de testing (convergencia o aislamiento) y delimitar claramente **qué se testea, dónde y cómo**, dividiendo el esfuerzo de QA desde la arquitectura Clean Architecture.

## 2. Herramientas Recomendadas

Para mantener una sola forma de abordar el CI/CD en todo el monorepo y maximizar la compatibilidad en un entorno NodeJS moderno (Node 24):

*   **Motor de Pruebas y Aserción:** **Vitest** en lugar de Jasmine/Karma.
    *   *Razón:* Es significativamente más rápido, descarta la sobrecarga visual de tener Karma abriendo un navegador constantemente para tests de lógica y unifica los comandos de nuestro monorepo (`npm run test`).
*   **Testeo de Interfaz:** `@testing-library/angular` o utilizando nativamente el `TestBed` de Angular asistido por los DOM rendering puros de Vitest.
*   **Cobertura (Coverage):** Motor V8 (`vitest run --coverage`) integrado.

## 3. División de la Estrategia de Testing (La "Pirámide")

No todo el código en Angular debe ser probado de la misma manera ni requiere el `TestBed`. Siguiendo el Clean Architecture, diseñaremos una pirámide invertida donde la máxima prioridad (y la ejecución más veloz) estará en el núcleo.

### Nivel 1: Capa de Dominio y Casos de Uso (TypeScript Puro)
**Regla Estricta:** Las carpetas `src/core/domain` y `src/core/application` **NUNCA** cargarán módulos de Angular.
*   **Tipo de Prueba:** Pruebas Unitarias Aisladas (Unit Tests).
*   **Método:** Se instanciarán las clases `UseCase` inyectándoles instancias falsas (Mocks) generadas con Vitest (`vi.mock` o `vi.fn()`) de los Repositorios que representan los Puertos.
*   **Por qué:** Son las reglas de negocio reales. Deben ejecutarse en sub-milisegundos simulando condiciones (error de red o datos corruptos) para comprobar qué arroja el Caso de Uso a las capas superiores.

### Nivel 2: Capa de Infraestructura (Servicios, Repositorios)
**Regla:** Testear que la adaptación del HTTP y las conversiones de nuestros DTO de Frontend mapeen las respuestas JSON al `Entity` de Domain.
*   **Tipo de Prueba:** Pruebas Unitarias de Integración (Angular).
*   **Método:** Uso del `HttpClientTestingModule` proporcionado por Angular.
*   **Por qué:** Es fundamental asegurar que si el backend cambia un `status_code` a `statusCode` en la base de datos, el Adaptador/Repositorio levante la advertencia e intercepte la respuesta sin romper las vistas.

### Nivel 3: Capa de Presentación (Smart Components / Rutas)
**Regla:** Aquí probaremos que el DOM reaccione correctamente a la actividad del usuario.
*   **Tipo de Prueba:** Pruebas de Componente con `TestBed`.
*   **Método:** No realizamos llamadas HTTP en componentes. Si testeamos el componente `LoginComponent`, interceptaremos su Inyección y brindaremos una clase `MockLoginUseCase`. El Test comprobará: "Si un caso de Uso responde OK, ¿Redirijo a mi enrutador hacia `/dashboard`?".
*   **Por qué:** Asegura que los formularios arrojan validaciones asíncronas de Reactive Forms (correo incorrecto, contraseña vacía) al pulsar "Enviar" sin ensuciar la base de datos ni depender de la latencia.

### Nivel 4: Capa de Presentación (Dumb Components)
**Regla:** Estos componentes (las tarjetas visuales y los botones compartidos) son la vista pura en su clímax. No importan Casos de uso de Angular. Sólo reciben inputs y emiten outputs.
*   **Tipo de Prueba:** Pruebas Visuales Básicas (Snapshots o Aserción DOM).
*   **Método:** Inyectar una variable tipo `@Input` y comprobar que en el HTML renderizado aparezca ese texto, probando además que al simular el evento `.click()` en un punto, produzca el `@Output`.

---

## 4. Archivos Auxiliares y Mocking Global

Dada la estricta naturaleza del RBAC y la protección en este tipo de producto, muchas vistas requerirán de un usuario simulado. Para no romper el principio *DRY*, se configurará en la capa `tests/` un set de archivos de factorías/Mocks:

*   `mock-user.factory.ts`: Constructor en cadena que permite instanciar entidades tipo `new User(Role.USER)` rápidamente para los perfiles.
*   `test-setup.ts`: Auto-inyección de librerías visuales vitales como Material sin tener que cargar toda la pesada arquitectura app-root repetidas veces.

## 5. Criterios de Aceptación (Thresholds)
Dado que nos encontramos en la fase MVP, se considerará que una rama es válida cuando supere el comportamiento exitoso predefinido. A mediano plazo, todo el core y application debe reportar un umbral (coverage) de pruebas unitarias superior al **85%**.