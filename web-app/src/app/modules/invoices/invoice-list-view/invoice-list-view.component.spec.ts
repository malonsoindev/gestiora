import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { InvoiceListViewComponent } from './invoice-list-view.component';

describe('InvoiceListViewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceListViewComponent],
      providers: [provideAnimations(), provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InvoiceListViewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render section title', () => {
    const fixture = TestBed.createComponent(InvoiceListViewComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Facturas');
  });

  it('should emit create action', () => {
    const fixture = TestBed.createComponent(InvoiceListViewComponent);
    const createSpy = vi.spyOn(fixture.componentInstance.create, 'emit');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button[aria-label]',
    ) as NodeListOf<HTMLButtonElement>;
    const createButton = Array.from(buttons).find(
      (b) => b.getAttribute('aria-label') === 'Nueva factura',
    );

    createButton?.click();
    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('should render localized status and formatted creation date', () => {
    const fixture = TestBed.createComponent(InvoiceListViewComponent);

    fixture.componentRef.setInput('invoices', [
      {
        invoiceId: 'inv-1',
        providerId: 'prov-1',
        status: 'DRAFT',
        createdAt: '2026-03-24T10:30:00.000Z',
      },
    ]);

    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Borrador');
    expect(el.textContent).toContain('Fecha');
    expect(el.textContent).toContain('24-03-2026');
  });

  it('should provide detail route and emit download/delete row actions', () => {
    const fixture = TestBed.createComponent(InvoiceListViewComponent);
    const downloadSpy = vi.spyOn(fixture.componentInstance.download, 'emit');
    const deleteSpy = vi.spyOn(fixture.componentInstance.delete, 'emit');

    fixture.componentRef.setInput('invoices', [
      {
        invoiceId: 'inv-1',
        providerId: 'prov-1',
        status: 'DRAFT',
        createdAt: '2026-03-24T10:30:00.000Z',
      },
    ]);

    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    const viewButton = buttons.find((button) => button.textContent?.includes('visibility'));
    const downloadButton = buttons.find((button) => button.textContent?.includes('download'));
    const deleteButton = buttons.find((button) => button.textContent?.includes('delete'));

    expect(viewButton).toBeTruthy();
    downloadButton?.click();
    deleteButton?.click();

    expect(downloadSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});
