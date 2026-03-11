import { input, password as promptPassword } from '@inquirer/prompts';
import type { UserRepository } from '../../domain/ports.ts';
import { loginUseCase } from '../../application/login-use-case.ts';
import { AuthError } from '../../domain/errors.ts';

export async function runLoginMenu(repo: UserRepository): Promise<boolean> {
  console.log('\n=== Gestiora CLI ===\n');
  const email = await input({ message: 'Email:' });
  const pass = await promptPassword({ message: 'Contraseña:', mask: '*' });

  try {
    await loginUseCase(repo, email, pass);
    console.log('\n✓ Sesión iniciada correctamente\n');
    return true;
  } catch (e) {
    if (e instanceof AuthError) {
      console.error('\n✗ Credenciales incorrectas o cuenta bloqueada\n');
    } else {
      console.error('\n✗ Error al conectar con el servidor\n');
    }
    return false;
  }
}
