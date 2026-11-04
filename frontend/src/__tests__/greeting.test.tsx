import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getTimeGreeting } from '../lib/greeting';
import { LoginPage } from '../pages/LoginPage';
import { AuthContext } from '../contexts/AuthContext';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Saudação do login pelo horário de Brasília', () => {
  it.each([
    ['2026-11-04T03:00:00Z', 'Boa noite'],
    ['2026-11-04T07:59:59Z', 'Boa noite'],
    ['2026-11-04T08:00:00Z', 'Bom dia'],
    ['2026-11-04T14:59:59Z', 'Bom dia'],
    ['2026-11-04T15:00:00Z', 'Boa tarde'],
    ['2026-11-04T20:59:59Z', 'Boa tarde'],
    ['2026-11-04T21:00:00Z', 'Boa noite'],
  ])('Em %s deve mostrar %s', (date, expected) => {
    expect(getTimeGreeting(new Date(date))).toBe(expected);
  });

  it('Atualiza sem recarregar ao meio-dia e ao retornar à aba à noite', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T14:59:00Z'));
    render(<AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), logout: vi.fn(), refreshUser: vi.fn() }}>
      <MemoryRouter><LoginPage /></MemoryRouter>
    </AuthContext.Provider>);
    expect(screen.getByText('Bom dia!')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText('Boa tarde!')).toBeInTheDocument();
    act(() => { vi.setSystemTime(new Date('2026-11-04T23:00:00Z')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByText('Boa noite!')).toBeInTheDocument();
  });
});
