import { test, expect } from '@playwright/test';

test('Playbook Inbound: copiar, editar texto compartilhado e manter acordeão aberto ao salvar', async ({ page, context }) => {
  // Interface com API controlada; persistência PostgreSQL coberta pela integração backend.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const values: Record<string, string> = {};
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: any = {};
    if (path.endsWith('/auth/me')) body = { user: { id: 'consultor', name: 'Consultor', role: 'VENDEDOR', cargo: 'Comercial', active: true } };
    if (path.endsWith('/playbook-inbound')) body = { secoes: [], reference_overrides: values };
    if (path.includes('/playbook-inbound/reference/')) {
      const key = path.split('/').pop()!;
      values[key] = route.request().postDataJSON().conteudo;
      body = { bloco: { conteudo: values[key] } };
    }
    await route.fulfill({ json: body });
  });
  await page.goto('/playbook-inbound');
  await page.locator('#ib-call').getByRole('button', { name: 'Copiar texto', exact: true }).click();
  const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
  expect(copied).toContain('[Nome do Decisor]');
  expect(copied).toContain('\n\nEstava analisando');
  expect(copied).not.toContain('Editar');

  await page.getByRole('button', { name: 'Editar Template de e-mail', exact: true }).click();
  await page.getByLabel('Conteúdo', { exact: true }).fill('Olá, [Nome]. Próxima reunião confirmada.');
  await page.getByRole('button', { name: 'Salvar texto', exact: true }).click();
  await page.reload();
  await expect(page.locator('#ib-email')).toContainText('Olá, [Nome]. Próxima reunião confirmada.');
  await page.locator('.ib-objections summary').first().click();
  await page.getByRole('button', { name: 'Editar Resposta à objeção 1', exact: true }).click();
  await page.getByLabel('Conteúdo', { exact: true }).fill('Resposta revisada e cadastrada pela equipe.');
  await page.getByRole('button', { name: 'Salvar texto', exact: true }).click();
  await expect(page.locator('.ib-objections details').first()).toHaveAttribute('open', '');
  await expect(page.locator('.ib-objections details').first()).toContainText('Resposta revisada e cadastrada pela equipe.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
