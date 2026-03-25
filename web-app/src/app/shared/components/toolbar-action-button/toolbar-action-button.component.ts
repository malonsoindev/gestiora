import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-toolbar-action-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './toolbar-action-button.component.html',
  styleUrl: './toolbar-action-button.component.scss',
})
export class ToolbarActionButtonComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly tooltip = input.required<string>();
  readonly disabled = input(false);

  readonly action = output<void>();

  onClick(): void {
    this.action.emit();
  }
}
