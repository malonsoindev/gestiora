import { TestBed } from '@angular/core/testing';
import { PdfViewerComponent } from './pdf-viewer.component';

describe('PdfViewerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfViewerComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit download action', () => {
    const fixture = TestBed.createComponent(PdfViewerComponent);
    const downloadSpy = vi.spyOn(fixture.componentInstance.download, 'emit');
    fixture.componentRef.setInput('hasFile', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(downloadSpy).toHaveBeenCalledOnce();
  });
});
