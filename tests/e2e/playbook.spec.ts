import { test, expect } from '@playwright/test';

test.describe('Playbook de Vendas Quest — Testes E2E e Responsividade (Desktop, Tablet e Mobile)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  });
  test('Deve bloquear acesso direto sem sessão e exibir tela de login oficial QUEST 2026', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar na plataforma' })).toBeVisible();
  });

  test('Deve orientar recuperação pela gestão sem oferecer geração pública de acesso', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByText(/1º Acesso/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Esqueceu sua senha?' }).click();
    await expect(page.getByText('Recuperar acesso')).toBeVisible();
    await expect(page.getByText(/Entre em contato com André/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Gerar Token/i })).toHaveCount(0);
  });

  test('Deve enviar as credenciais e apresentar o erro de autenticação', async ({ page }) => {
    let credentials: any;
    await page.route('**/api/v1/auth/login', async (route) => {
      credentials = route.request().postDataJSON();
      await route.fulfill({ status: 401, json: { message: 'Credenciais inválidas.', error: 'INVALID_CREDENTIALS' } });
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('consultor@example.test');
    await page.getByLabel('Senha', { exact: true }).fill('SenhaTeste2026!');
    await page.getByRole('button', { name: 'Entrar na plataforma', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Credenciais inválidas.');
    expect(credentials).toEqual({ email: 'consultor@example.test', password: 'SenhaTeste2026!' });
    await expect(page.getByRole('button', { name: 'Entrar na plataforma', exact: true })).toBeEnabled();
  });
});

