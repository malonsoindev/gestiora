# Release 1.0.6

Fecha: 2026-02-18
Version: 1.0.6
Tipo: Minor release (Feature)

## Resumen
Implementacion de sistema de logging tecnico con soporte de colores y formato profesional.
Este release introduce un logger configurable siguiendo Clean Architecture, con adaptadores
para consola (desarrollo/produccion) y noop (tests).

- Sistema de logging tecnico completo.
- Colores por nivel de log usando chalk.
- Iconos visuales para identificacion rapida.
- Logs de arranque del servidor con informacion de persistencia.

## Cambios

### Nuevo Puerto Logger
- `src/application/ports/logger.ts` - Interfaz Logger con niveles debug/info/warn/error.
- Define tipos LogLevel y LogContext para tipado estricto.

### Adaptadores de Logging
- `src/infrastructure/adapters/logging/console-logger.ts` - Logger para consola con:
  - Colores por nivel (chalk): debug=gris, info=cyan, warn=amarillo, error=rojo.
  - Iconos por nivel: debug=○, info=●, warn=⚠, error=✖.
  - Timestamp en formato ISO.
  - Contexto JSON serializado.
  - Filtrado por nivel minimo configurable.
  - Stack traces coloreados para errores.
- `src/infrastructure/adapters/logging/noop-logger.ts` - Logger silencioso para tests.

### Integracion en Composition Root
- Logger inicializado antes de la configuracion de base de datos.
- Seleccion automatica: NoopLogger en tests, ConsoleLogger en otros entornos.
- Nivel minimo: debug en desarrollo, info en produccion.

### Logs de Arranque
- Log de tipo de persistencia: in-memory o postgres.
- Log de conexion a PostgreSQL con estado (connected: true/false).
- Log de servidor iniciado con puerto y host.

### Design Doc
- `docs/DD-00008.md` - Documentacion del sistema de logging.

## Ejemplo de Salida

```
● [2026-02-18T08:33:37.549Z] INFO : Database configuration {"type":"postgres"}
● [2026-02-18T08:33:37.875Z] INFO : PostgreSQL connection {"connected":true}
● [2026-02-18T08:33:38.123Z] INFO : Server started {"port":3000,"host":"0.0.0.0"}
```

## Tests

### Tests Unitarios Agregados
- `tests/infrastructure/adapters/logging/console-logger.spec.ts` - 11 tests.
- `tests/infrastructure/adapters/logging/noop-logger.spec.ts` - 5 tests.

### Metricas
- **Nuevos tests:** 16
- **Total tests:** 406+
- **Tests pasando:** OK

## Archivos Creados
- `src/application/ports/logger.ts`
- `src/infrastructure/adapters/logging/console-logger.ts`
- `src/infrastructure/adapters/logging/noop-logger.ts`
- `tests/infrastructure/adapters/logging/console-logger.spec.ts`
- `tests/infrastructure/adapters/logging/noop-logger.spec.ts`
- `docs/DD-00008.md`
- `docs/release-1.0.6.md`

## Archivos Modificados
- `src/composition/index.ts` - Integracion del logger y logs de arranque.
- `main.ts` - Log de servidor iniciado.
- `package.json` - Version 1.0.6.

## Dependencias
- Usa `chalk` (ya existente en el proyecto) para colores.
- No se agregaron nuevas dependencias.

## Validaciones
- Build: `npm run build` (OK)
- Tests: `npm test` (OK)
- TypeScript: Sin errores de compilacion.

## Notas de Despliegue
- No hay cambios de esquema en base de datos.
- No requiere configuracion adicional.
- Los logs aparecen automaticamente al arrancar el servidor.

## Compatibilidad
- Node.js >= 20
- PostgreSQL >= 14
- Compatible con versiones anteriores de la API.
