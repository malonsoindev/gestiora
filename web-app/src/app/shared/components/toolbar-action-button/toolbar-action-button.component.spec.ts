import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToolbarActionButtonComponent } from './toolbar-action-button.component';

describe('ToolbarActionButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolbarActionButtonComponent],
      // provideAnimations is deprecated since Angular 20.2 but required by Material CDK
      providers: [provideAnimations()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ToolbarActionButtonComponent);
    fixture.componentRef.setInput('icon', 'add');
    fixture.componentRef.setInput('label', 'Nuevo proveedor');
    fixture.componentRef.setInput('tooltip', 'Nuevo proveedor');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit action when clicked', () => {
    const fixture = TestBed.createComponent(ToolbarActionButtonComponent);
    fixture.componentRef.setInput('icon', 'refresh');
    fixture.componentRef.setInput('label', 'Refrescar lista');
    fixture.componentRef.setInput('tooltip', 'Refrescar lista');
    const emitSpy = vi.spyOn(fixture.componentInstance.action, 'emit');

    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitSpy).toHaveBeenCalledOnce();
  });
});
