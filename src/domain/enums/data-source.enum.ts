/**
 * Indica el origen de los datos: manual (usuario) o IA (extraccion automatica).
 * Se usa tanto para cabeceras de factura como para movimientos.
 */
export enum DataSource {
    Manual = 'MANUAL',
    Ai = 'AI',
}
