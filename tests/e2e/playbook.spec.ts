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
    await expect(page.getByText('Acessar Plataforma')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('Deve orientar recuperação pela gestão sem oferecer geração pública de acesso', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByText(/1º Acesso/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
    await expect(page.getByText('Recuperar acesso')).toBeVisible();
    await expect(page.getByText(/Entre em contato com André/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Gerar Token/i })).toHaveCount(0);
  });
});

