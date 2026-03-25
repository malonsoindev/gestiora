export type InvoiceStatus = 'DRAFT' | 'ACTIVE' | 'INCONSISTENT' | 'DELETED';

export interface InvoiceSummary {
  invoiceId: string;
  providerId: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface InvoiceMovement {
  id?: string;
  concepto: string;
  cantidad: number;
  precio: number;
  baseImponible?: number;
  iva?: number;
  total: number;
  source?: 'MANUAL' | 'AI';
  status?: 'PROPOSED' | 'CONFIRMED' | 'REJECTED';
}

export interface InvoiceDetail {
  invoiceId: string;
  providerId: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  numeroFactura?: string;
  fechaOperacion?: string;
  fechaVencimiento?: string;
  baseImponible?: number;
  iva?: number;
  total?: number;
  movements?: InvoiceMovement[];
}

export interface InvoiceUpdateRequest {
  numeroFactura?: string;
  fechaOperacion?: string;
  fechaVencimiento?: string;
  baseImponible?: number;
  iva?: number;
  total?: number;
  movements?: InvoiceMovement[];
}
