import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { SectionToolbarComponent } from './section-toolbar.component';

@Component({
  standalone: true,
  imports: [SectionToolbarComponent],
  template: `
    <app-section-toolbar title="Proveedores">
      <button toolbar-actions type="button">Action</button>
    </app-section-toolbar>
  `,
})
class HostComponent {}

describe('SectionToolbarComponent', () => {
  it('should render title and projected actions', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [HostComponent],
    }).createComponent(HostComponent);

    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Proveedores');
    expect(el.querySelector('[toolbar-actions]')).toBeTruthy();
  });
});
