import { InjectionToken } from '@angular/core';
import { IInvoicesPort } from '../../domain/invoices/invoices.port';

export const INVOICES_PORT = new InjectionToken<IInvoicesPort>('INVOICES_PORT');
