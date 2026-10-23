import { test, expect } from '@playwright/test';

test.describe('Playbook de Vendas Quest — Testes E2E e Responsividade (Desktop, Tablet e Mobile)', () => {
  test('Deve bloquear acesso direto sem sessão e exibir tela de login oficial QUEST 2026', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Acessar Plataforma')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('Deve permitir ativar conta inicial (André Maciel — Gestor), autenticar e navegar pelos módulos', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByText('Esqueci minha senha / 1º Acesso').click();
    await page.locator('input[type="email"]').fill('andre.maciel@questcomunicacao.com.br');
    await page.getByRole('button', { name: /Gerar Token/i }).click();

    await expect(page.getByText('Definir Senha Segura')).toBeVisible();
    await page.locator('input[type="password"]').fill('QuestGestor2026!Strong');
    await page.getByRole('button', { name: /Confirmar e Ativar Senha/i }).click();

    await page.locator('#login-password').fill('QuestGestor2026!Strong');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Visão Geral').first()).toBeVisible();
  });
});

