import { input, password as promptPassword } from '@inquirer/prompts';
import type { UserRepository } from '../../domain/ports.ts';
import { loginUseCase } from '../../application/login-use-case.ts';
import { AuthError, ForbiddenError } from '../../domain/errors.ts';
import { printSuccess, printError } from './colors.ts';

export async function runLoginMenu(repo: UserRepository): Promise<boolean> {
  console.log('\n=== Gestiora CLI ===\n');
  const email = await input({ message: 'Email:' });
  const pass = await promptPassword({ message: 'Contraseña:', mask: '*' });

  try {
    await loginUseCase(repo, email, pass);
    printSuccess('\n✓ Sesión iniciada correctamente\n');
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) {
      printError('\n✗ Acceso denegado. Esta aplicación es solo para administradores.\n');
    } else if (e instanceof AuthError) {
      printError('\n✗ Credenciales incorrectas o cuenta bloqueada\n');
    } else {
      printError('\n✗ Error al conectar con el servidor\n');
    }
    return false;
  }
}
