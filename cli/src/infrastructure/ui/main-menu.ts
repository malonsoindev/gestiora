import { input, password as promptPassword, select, confirm } from '@inquirer/prompts';
import type { UserRepository } from '../../domain/ports.ts';
import type { User, UpdateUserPayload } from '../../domain/user.ts';
import { CliError } from '../../domain/errors.ts';
import { printSuccess, printError } from './colors.ts';
import { listUsersUseCase } from '../../application/list-users-use-case.ts';
import { findUsersUseCase } from '../../application/find-users-use-case.ts';
import { updateUserUseCase } from '../../application/update-user-use-case.ts';
import { disableUserUseCase } from '../../application/disable-user-use-case.ts';
import { resetPasswordUseCase } from '../../application/reset-password-use-case.ts';
import { createUserUseCase } from '../../application/create-user-use-case.ts';
import { deleteUserUseCase } from '../../application/delete-user-use-case.ts';

type MenuAction = 'list' | 'find' | 'update' | 'disable' | 'reset-password' | 'create' | 'delete' | 'logout';

function displayUsers(users: User[]): void {
  if (users.length === 0) {
    console.log('\n  (No se encontraron usuarios)\n');
    return;
  }
  console.log(`\n  ${users.length} usuario(s):\n`);
  for (const u of users) {
    console.log(`  [${u.userId}] ${u.email} — ${u.name ?? ''} | ${u.roles.join(', ')} | ${u.status}`);
  }
  console.log('');
}

export async function handleListUsers(repo: UserRepository): Promise<void> {
  const users = await listUsersUseCase(repo);
  displayUsers(users);
}

export async function handleFindUsers(repo: UserRepository): Promise<void> {
  const query = await input({ message: 'Buscar usuarios:' });
  const users = await findUsersUseCase(repo, query);
  displayUsers(users);
}

export async function handleUpdateUser(repo: UserRepository): Promise<void> {
  const id = await input({ message: 'ID del usuario a actualizar:' });
  const name = await input({ message: 'Nuevo nombre (enter para omitir):' });
  const avatar = await input({ message: 'URL del avatar (enter para omitir):' });

  const payload: UpdateUserPayload = {};
  if (name) payload.name = name;
  if (avatar) payload.avatar = avatar;

  await updateUserUseCase(repo, id, payload);
  printSuccess('\n✓ Usuario actualizado correctamente\n');
}

export async function handleDisableUser(repo: UserRepository): Promise<void> {
  const id = await input({ message: 'ID del usuario a deshabilitar:' });
  const ok = await confirm({ message: `¿Deshabilitar usuario ${id}?`, default: false });
  if (!ok) {
    console.log('\n  Operación cancelada\n');
    return;
  }
  await disableUserUseCase(repo, id);
  printSuccess('\n✓ Usuario deshabilitado correctamente\n');
}

export async function handleResetPassword(repo: UserRepository): Promise<void> {
  const id = await input({ message: 'ID del usuario:' });
  const newPassword = await promptPassword({ message: 'Nueva contraseña:', mask: '*' });
  const confirmPass = await promptPassword({ message: 'Confirmar contraseña:', mask: '*' });
  await resetPasswordUseCase(repo, id, newPassword, confirmPass);
  printSuccess('\n✓ Contraseña actualizada correctamente\n');
}

export async function handleCreateUser(repo: UserRepository): Promise<void> {
  const email = await input({ message: 'Email del nuevo usuario:' });
  const newPassword = await promptPassword({ message: 'Contraseña inicial:', mask: '*' });
  const confirmPass = await promptPassword({ message: 'Confirmar contraseña:', mask: '*' });
  if (newPassword !== confirmPass) {
    throw new CliError('Las contraseñas no coinciden.');
  }
  const name = await input({ message: 'Nombre (enter para omitir):' });
  const role = await select<'Usuario' | 'Administrador'>({
    message: 'Rol:',
    choices: [
      { name: 'Usuario', value: 'Usuario' },
      { name: 'Administrador', value: 'Administrador' },
    ],
  });
  const user = await createUserUseCase(repo, {
    email,
    password: newPassword,
    ...(name ? { name } : {}),
    roles: [role],
  });
  printSuccess(`\n✓ Usuario creado: [${user.userId}] ${email}\n`);
}

export async function handleDeleteUser(repo: UserRepository): Promise<void> {
  const id = await input({ message: 'ID del usuario a eliminar:' });
  const ok = await confirm({
    message: `¿Eliminar usuario ${id}? Esta acción es irreversible.`,
    default: false,
  });
  if (!ok) {
    console.log('\n  Operación cancelada\n');
    return;
  }
  await deleteUserUseCase(repo, id);
  printSuccess('\n✓ Usuario eliminado correctamente\n');
}

const ACTION_HANDLERS: Partial<Record<MenuAction, (repo: UserRepository) => Promise<void>>> = {
  list: handleListUsers,
  find: handleFindUsers,
  update: handleUpdateUser,
  disable: handleDisableUser,
  'reset-password': handleResetPassword,
  create: handleCreateUser,
  delete: handleDeleteUser,
};

async function dispatchAction(repo: UserRepository, action: MenuAction): Promise<void> {
  try {
    await ACTION_HANDLERS[action]?.(repo);
  } catch (e) {
    if (e instanceof CliError) {
      printError(`\n✗ ${e.message}\n`);
    } else {
      throw e;
    }
  }
}

export async function runMainMenu(repo: UserRepository): Promise<void> {
  const choices: Array<{ name: string; value: MenuAction }> = [
    { name: 'Listar todos los usuarios', value: 'list' },
    { name: 'Buscar usuarios', value: 'find' },
    { name: 'Actualizar usuario', value: 'update' },
    { name: 'Deshabilitar usuario', value: 'disable' },
    { name: 'Cambiar contraseña de usuario', value: 'reset-password' },
    { name: 'Crear usuario', value: 'create' },
    { name: 'Eliminar usuario', value: 'delete' },
    { name: 'Cerrar sesión', value: 'logout' },
  ];

  while (true) {
    const action = await select<MenuAction>({ 
      message: 'Selecciona una acción:', 
      choices,
      pageSize: choices.length 
    });

    if (action === 'logout') {
      console.log('\nHasta luego!\n');
      break;
    }

    await dispatchAction(repo, action);
  }
}
