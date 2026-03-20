import { Component, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoginUseCase } from '../../../../core/application/auth/login.use-case';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly router = inject(Router);

  @ViewChild('emailInput') emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInputRef!: ElementRef<HTMLInputElement>;

  readonly form = new FormGroup({
    email: new FormControl(
      // TODO: remove default credentials before production
      'admin@example.com',
      {
        validators: [Validators.required, Validators.email],
        nonNullable: true,
      },
    ),
    password: new FormControl(
      // TODO: remove default credentials before production
      'AdminPass1!a',
      {
        validators: [Validators.required, Validators.minLength(12)],
        nonNullable: true,
      },
    ),
  });

  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();

    this.loginUseCase.execute({ email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else if (err.status === 429) {
          this.errorMessage.set('Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.');
        } else {
          this.errorMessage.set('Error de conexión. Inténtalo de nuevo más tarde.');
        }
      },
    });
  }

  private focusFirstInvalidField(): void {
    if (this.form.controls.email.invalid) {
      this.emailInputRef?.nativeElement.focus();
    } else if (this.form.controls.password.invalid) {
      this.passwordInputRef?.nativeElement.focus();
    }
  }
}
