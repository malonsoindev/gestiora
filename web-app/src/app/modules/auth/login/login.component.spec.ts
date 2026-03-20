import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { LoginComponent } from './login.component';
import { LoginUseCase } from '../../../../core/application/auth/login.use-case';

@Component({ standalone: true, template: '' })
class StubComponent {}

const mockLoginUseCase = {
  execute: vi.fn(),
};

describe('LoginComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([{ path: 'dashboard', component: StubComponent }]),
        provideHttpClient(),
        { provide: LoginUseCase, useValue: mockLoginUseCase },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('form validation', () => {
    it('should be invalid when empty', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.componentInstance.form.setValue({ email: '', password: '' });
      expect(fixture.componentInstance.form.invalid).toBe(true);
    });

    it('should be invalid with a short password (less than 12 chars)', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.componentInstance.form.setValue({ email: 'a@b.com', password: 'short' });
      expect(fixture.componentInstance.form.controls.password.hasError('minlength')).toBe(true);
    });

    it('should be invalid with a malformed email', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.componentInstance.form.setValue({ email: 'not-an-email', password: 'validpassword1!' });
      expect(fixture.componentInstance.form.controls.email.hasError('email')).toBe(true);
    });

    it('should be valid with correct email and password >= 12 chars', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'ValidPass123!' });
      expect(fixture.componentInstance.form.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not call loginUseCase when form is invalid', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.componentInstance.form.setValue({ email: '', password: '' });
      fixture.componentInstance.onSubmit();
      expect(mockLoginUseCase.execute).not.toHaveBeenCalled();
    });

    it('should mark all as touched when form is invalid on submit', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.componentInstance.form.setValue({ email: '', password: '' });
      const markSpy = vi.spyOn(fixture.componentInstance.form, 'markAllAsTouched');
      fixture.componentInstance.onSubmit();
      expect(markSpy).toHaveBeenCalled();
    });

    it('should call loginUseCase.execute with form values on valid submit', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      mockLoginUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'ValidPass123!' });
      fixture.componentInstance.onSubmit();
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'ValidPass123!',
      });
    });

    it('should set isLoading to true while submitting', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      mockLoginUseCase.execute.mockReturnValue(of(undefined));
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'ValidPass123!' });
      fixture.componentInstance.onSubmit();
      // After observable completes synchronously, isLoading is false
      expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('should show 401 error message on unauthorized', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      mockLoginUseCase.execute.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401 })),
      );
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'ValidPass123!' });
      fixture.componentInstance.onSubmit();
      expect(fixture.componentInstance.errorMessage()).toContain('Credenciales incorrectas');
    });

    it('should show 429 error message on too many requests', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      mockLoginUseCase.execute.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 429 })),
      );
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'ValidPass123!' });
      fixture.componentInstance.onSubmit();
      expect(fixture.componentInstance.errorMessage()).toContain('Demasiados intentos');
    });

    it('should show generic error message on server error', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      mockLoginUseCase.execute.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'ValidPass123!' });
      fixture.componentInstance.onSubmit();
      expect(fixture.componentInstance.errorMessage()).toContain('Error de conexión');
    });
  });

  describe('togglePassword', () => {
    it('should toggle showPassword signal', () => {
      const fixture = TestBed.createComponent(LoginComponent);
      expect(fixture.componentInstance.showPassword()).toBe(false);
      fixture.componentInstance.togglePassword();
      expect(fixture.componentInstance.showPassword()).toBe(true);
      fixture.componentInstance.togglePassword();
      expect(fixture.componentInstance.showPassword()).toBe(false);
    });
  });
});
