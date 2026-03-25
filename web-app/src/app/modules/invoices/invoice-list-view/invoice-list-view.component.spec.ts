import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { InvoiceListViewComponent } from './invoice-list-view.component';

describe('InvoiceListViewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceListViewComponent],
      providers: [provideAnimations()],
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
});
