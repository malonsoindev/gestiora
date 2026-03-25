import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';
import { InvoicesListComponent } from './invoices-list.component';
import { GetInvoicesUseCase } from '../../../../core/application/invoices/get-invoices.use-case';
import { InvoiceListResponse } from '../../../../core/domain/invoices/invoice-list-params.model';

const mockListResponse: InvoiceListResponse = {
  items: [
    {
      invoiceId: 'inv-1',
      providerId: 'prov-1',
      status: 'DRAFT',
      createdAt: '2026-03-20T10:00:00.000Z',
    },
    {
      invoiceId: 'inv-2',
      providerId: 'prov-2',
      status: 'ACTIVE',
      createdAt: '2026-03-24T10:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

const mockGetInvoices = { execute: vi.fn() };

describe('InvoicesListComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetInvoices.execute.mockReturnValue(of(mockListResponse));

    await TestBed.configureTestingModule({
      imports: [InvoicesListComponent],
      providers: [
        provideAnimations(),
        { provide: GetInvoicesUseCase, useValue: mockGetInvoices },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load invoices on init', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    expect(mockGetInvoices.execute).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.invoices()).toHaveLength(2);
  });

  it('should sort invoices by createdAt descending', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.invoices().map((invoice) => invoice.invoiceId)).toEqual([
      'inv-2',
      'inv-1',
    ]);
  });

  it('should expose total count from the response', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.totalInvoices()).toBe(2);
  });

  it('should reload invoices with new page and pageSize', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    const pageEvent: PageEvent = {
      pageIndex: 2,
      pageSize: 25,
      length: 50,
      previousPageIndex: 1,
    };

    fixture.componentInstance.onPageChange(pageEvent);

    const lastCall = mockGetInvoices.execute.mock.calls.at(-1)?.[0] as {
      page: number;
      pageSize: number;
    };
    expect(lastCall.page).toBe(3);
    expect(lastCall.pageSize).toBe(25);
  });

  it('should filter visible invoices by search term', () => {
    const fixture = TestBed.createComponent(InvoicesListComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSearchChange('prov-2');
    expect(fixture.componentInstance.visibleInvoices()).toHaveLength(1);
    expect(fixture.componentInstance.visibleInvoices()[0]?.invoiceId).toBe('inv-2');
  });
});
