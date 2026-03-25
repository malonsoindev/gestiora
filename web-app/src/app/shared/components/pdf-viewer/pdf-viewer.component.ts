import { Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss',
})
export class PdfViewerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly src = input<string | null>(null);
  readonly loading = input(false);
  readonly hasFile = input(false);
  readonly title = input('Documento PDF');

  readonly download = output<void>();

  readonly safeSrc = computed<SafeResourceUrl | null>(() => {
    const source = this.src();
    if (!source) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(source);
  });

  onDownload(): void {
    this.download.emit();
  }
}
