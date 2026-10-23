import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { formatBRL, formatPct, getInitials } from '../lib/utils';
import { QUEST_BRAND_2026 } from '../assets/brand';

describe('Playbook de Vendas Quest — Testes Unitários e de Interface (Frontend)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accounts: [
            {
              id: '1',
              name: 'André Maciel',
              email: 'andre.maciel@questcomunicacao.com.br',
              role: 'GESTOR',
              cargo: 'Gestor Comercial',
              activated: false,
            },
            {
              id: '2',
              name: 'Tiago Hilário',
              email: 'tiago.hilario@questcomunicacao.com.br',
              role: 'VENDEDOR',
              cargo: 'Vendas Inbound / Consultoria',
              activated: false,
            },
          ],
        }),
      })
    );
  });

  it('1. Deve validar a identidade visual oficial QUEST 2026 e formatadores monetários BRL', () => {
    expect(QUEST_BRAND_2026.colors.orange).toBe('#FF5A00');
    expect(QUEST_BRAND_2026.colors.black).toBe('#111111');
    expect(QUEST_BRAND_2026.colors.white).toBe('#FFFFFF');
    expect(QUEST_BRAND_2026.colors.grayLight).toBe('#F5F5F5');
    expect(QUEST_BRAND_2026.colors.grayDark).toBe('#333333');
    expect(QUEST_BRAND_2026.fontFamily).toBe('Inter');

    expect(formatBRL(68000)).toContain('68.000,00');
    expect(formatPct(97.14)).toBe('97,1%');
    expect(getInitials('André Maciel')).toBe('AM');
    expect(getInitials('Tiago Hilário')).toBe('TH');
  });

  it('2. Deve renderizar a tela de Login com e-mail, senha, mostrar/ocultar senha, esqueci minha senha e botão Entrar', async () => {
    const loginMock = vi.fn();
    render(
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          login: loginMock,
          logout: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText(/André Maciel/i)).toBeInTheDocument();
    expect(screen.getByText('Acessar Plataforma')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();

    // Testa alternância mostrar/ocultar senha
    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    const toggleBtn = screen.getByLabelText('Mostrar ou ocultar senha');
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');
  });

  it('3. Deve exigir confirmação explícita no ConfirmModal antes de excluir registros (Regra 12)', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        open={true}
        title="Excluir Negociação Comercial"
        description="Confirma a exclusão?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Excluir Negociação Comercial')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Exclusão' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
