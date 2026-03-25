import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FilterableListLayoutComponent } from './filterable-list-layout.component';

@Component({
  standalone: true,
  imports: [FilterableListLayoutComponent],
  template: `
    <app-filterable-list-layout
      title="Proveedores"
      searchLabel="Buscar proveedor"
      searchPlaceholder="Buscar..."
      searchTooltip="Buscar"
      searchTerm=""
      [isLoading]="false"
      createLabel="Nuevo proveedor"
      createTooltip="Nuevo proveedor"
    >
      <div list-content>contenido</div>
      <div list-pagination>paginador</div>
    </app-filterable-list-layout>
  `,
})
class HostComponent {}

describe('FilterableListLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideAnimations()],
    }).compileComponents();
  });

  it('should render title and projected content', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Proveedores');
    expect(el.textContent).toContain('contenido');
    expect(el.textContent).toContain('paginador');
  });
});
