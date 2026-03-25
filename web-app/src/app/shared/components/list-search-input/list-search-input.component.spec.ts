import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ListSearchInputComponent } from './list-search-input.component';

describe('ListSearchInputComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListSearchInputComponent],
      // provideAnimations is deprecated since Angular 20.2 but required by Material CDK
      providers: [provideAnimations()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ListSearchInputComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit searchChange on typing', () => {
    const fixture = TestBed.createComponent(ListSearchInputComponent);
    const emitSpy = vi.spyOn(fixture.componentInstance.searchChange, 'emit');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'acme';
    input.dispatchEvent(new Event('input'));

    expect(emitSpy).toHaveBeenCalledWith('acme');
  });
});
