import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ProviderListViewComponent } from './provider-list-view.component';

describe('ProviderListViewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderListViewComponent],
      // provideAnimations is deprecated since Angular 20.2 but required by Material CDK
      providers: [provideAnimations()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ProviderListViewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit create action', () => {
    const fixture = TestBed.createComponent(ProviderListViewComponent);
    const createSpy = vi.spyOn(fixture.componentInstance.create, 'emit');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button[aria-label]') as NodeListOf<HTMLButtonElement>;
    const createButton = Array.from(buttons).find((b) => b.getAttribute('aria-label') === 'Nuevo proveedor');
    createButton?.click();

    expect(createSpy).toHaveBeenCalledOnce();
  });
});
