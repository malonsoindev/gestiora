import { Component, input } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-section-toolbar',
  standalone: true,
  imports: [MatToolbarModule],
  templateUrl: './section-toolbar.component.html',
  styleUrl: './section-toolbar.component.scss',
})
export class SectionToolbarComponent {
  readonly title = input.required<string>();
}
