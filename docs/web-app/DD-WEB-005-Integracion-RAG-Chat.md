# Design Doc — DD-WEB-005 Integración Módulo IA (RAG Chat)

## 1. Contexto y Objetivos
Uno de los valores fundamentales de Gestiora, tal y como dictan las especificaciones del MVP, es permitir a los usuarios (tanto Estándar como Administrador) realizar "Consultas IA" sobre los documentos (facturas) ingestados en la plataforma. 
Esta funcionalidad requiere una interfaz conversacional (estilo chat) conectada con el Backend (Genkit RAG/IA).

Dado que un chat tiene una dinámica técnica de lectura y carga muy distinta al clásico CRUD síncrono, este documento fija la estrategia de su implementación en Angular.

## 2. Anatomía de la Interfaz del Chat

El componente principal será el `RagChatComponent` (Smart Component), y su vista consistirá estructuralmente en tres bloques:

1.  **Panel de Historial de Mensajes (Chat Window):** El área central grande (scrollable).
2.  **Indicadores de Estado (Loading state):** Un sector visual transitorio que indicará al usuario cuando la inteligencia artificial esté procesando o buscando documentos ("La IA está pensando...").
3.  **Input de Texto y Envío (Prompt Field):** Una caja de texto bloqueada contra re-envíos rápidos en la parte inferior, con un botón o la capacidad de enviarse pulsando la tecla `Enter`.

## 3. Comportamiento y UX

### 3.1 Burbujas de Comunicación (Dumb Components)
Los mensajes dentro del historial se mapearán utilizando un componente presentacional `@Input() msg: ChatMessage`.
*   Alineación a la Derecha con fondo corporativo (ej: Azul/Verde) para las participaciones del **Usuario**.
*   Alineación a la Izquierda con fondo neutro (Gris/Blanco) para las respuestas de la **IA**.

### 3.2 Auto-Scrolling
Un requerimiento clásico de todo chat. Puesto que los dominios RAG pueden tardar algo en generar las respuestas, cuando llega una respuesta de la IA (Angular detecta un cambio sumando un string al estado), la vista principal de conversación forzará el DOM utilizando `ViewChild` para ejecutar un `.nativeElement.scrollTop = height` (y que la pantalla siempre le muestre lo último que se contestó). 

### 3.3 Markdown Rendering
Las respuestas de GenAI (y modelos de lenguaje natural) llegan formadas comúnmente en formato `Markdown` (con viñetas, bloques de código, tablas de texto o textos en **negrita** para resaltar claves de la factura). 
Para interpretar ese formato con fidelidad en la UI:
- La vista inyectará/importará de forma local una librería liviana para preprocesar o renderizar dicho texto a un HTML semántico y sanitizado, (por ejemplo, con `ngx-markdown` o procesando a través de funciones curadas).

## 4. Estrategia de Comunicación e Interacción con el Backend (Ports / HTTP)

La comunicación estándar (fase MVP) con la IA del backend Gestiora es **Request-Response (Sin estado completo entre llamadas)** mediante API REST HTTP estática, donde la memoria de conversación (Historial a corto plazo) recaerá potencialmente en que se le envíe el contexto o no. Sin embargo, para mantener el MVP muy enraizado a la simplicidad, haremos:

1.  **Modelo de Entidad de Dominio:** En `src/core/domain/chat/RagResponse.ts`
2.  **Flujo Observable:**
    *   Usuario pulsa "Enviar".
    *   `isLoading.set(true)` 
    *   La caja de texto queda temporalmente deshabilitada (Atributo `[disabled]`).
    *   Se inyecta el `RagChatUseCase` que ejecuta el Port que hace un `POST /api/rag/ask`.
    *   Una vez que se resuelve el `Observable`, se encola el mensaje nuevo al signal local del historial de charla, y `isLoading.set(false)`.

### 4.1. Manejo de Errores IA 
Si el modelo AI del backend está caído ("AI_AGENT_TYPE=stub-error"), o hay timeout desde Render, el UI Chat no debe romperse silenciosamente:
*   En vez de colgar, dibujará una burbuja estilo IA pero con estética en rojo semántico informando: "_Error de sistema: No pude establecer conexión con la Base Documental. Intenta de nuevo más tarde._" e inmediatamente `isLoading` volverá a su estado normal para recuperar interactividad.

---

## 5. Decisiones Post-MVP Evolutivas (No en Scope inicial)
A modo de registro de arquitectura, constan de las siguientes mejoras no prioritarias para el Sprint inicial (MVP):
*   **Persistencia de Historial:** Almacenar localmente en `IndexedDB` las sesiones de chat si el usuario cierra el navegador o se marcha a la vista de "Proveedores" para que la conversación no se pierda en el cambio de ruta. En el MVP inicial, destruir el componente (cambiar de pantalla) limpiará su chat a 0.
*   **Streaming de RAG (`Server Sent Events / SSE`):** El famoso "efecto tecleando..." a como va llegando palabra por palabra, típico de OpenAI/Anthropic. Queda descartado por complejidad para MVP, conformándonos por la recepción en bloque completo.