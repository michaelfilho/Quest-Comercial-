import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('Atualiza um banco existente sem perder usuários e permite reaplicar a migration de exclusão', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(readFileSync(new URL('../prisma/migrations/0001_init/migration.sql', import.meta.url), 'utf8'));
    await pg.query("INSERT INTO users (id, name, email, cargo) VALUES ('00000000-0000-4000-8000-000000000001', 'Usuário existente', 'existente@example.test', 'Comercial')");
    const migration = readFileSync(new URL('../prisma/migrations/0002_user_deletion/migration.sql', import.meta.url), 'utf8');
    await pg.exec(migration);
    await pg.exec(migration);
    const result = await pg.query('SELECT name, email, active, deleted_at FROM users');
    expect(result.rows).toEqual([{ name: 'Usuário existente', email: 'existente@example.test', active: true, deleted_at: null }]);
  } finally { await pg.close(); }
}, 15000);
