import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-list-search-input',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './list-search-input.component.html',
  styleUrl: './list-search-input.component.scss',
})
export class ListSearchInputComponent {
  readonly label = input('Buscar');
  readonly placeholder = input('Buscar...');
  readonly tooltip = input('Buscar');
  readonly value = input('');

  readonly searchChange = output<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }

  clear(inputElement: HTMLInputElement): void {
    inputElement.value = '';
    this.searchChange.emit('');
  }
}
