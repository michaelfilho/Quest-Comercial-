import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  Target,
  BarChart3,
  Users,
  CalendarCheck2,
  BookOpen,
  Bot,
  KeyRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { QuestLogo } from '../components/ui/QuestLogo';
import { ChangePasswordModal } from '../components/ui/ChangePasswordModal';
import { getInitials } from '../lib/utils';

const PAGE_METADATA: Record<string, { title: string; context: string }> = {
  '/': {
    title: 'Visão Geral',
    context: 'Indicadores reais de performance comercial, receita e atingimento de metas',
  },
  '/playbook': {
    title: 'Playbook — Pipeline Comercial',
    context: 'Gestão visual em 5 etapas com histórico auditável e registro de atividades',
  },
  '/metas': {
    title: 'Metas & KPIs do Funil',
    context: 'Gestão de metas mensais, anuais, por ciclo e KPIs Inbound + Consultoria',
  },
  '/resultados': {
    title: 'Resultados Comerciais',
    context: 'Análise de funil, ganhos vs. perdidos, ciclo médio de vendas e ranking',
  },
  '/equipe': {
    title: 'Gestão de Equipe',
    context: 'Desempenho individual, metas, convites e administração de contas (Exclusivo Gestores)',
  },
  '/rituais': {
    title: 'Rotinas e Rituais',
    context: 'Rituais diários, semanais, mensais e trimestrais com alertas determinísticos',
  },
  '/playbook-inbound': {
    title: 'Playbook Inbound',
    context: 'Documentação comercial interativa de 7 seções — Playbook Inbound Rev03',
  },
  '/assistente': {
    title: 'Assistente Comercial Quest',
    context: 'Inteligência artificial integrada ao Playbook e dados comerciais autorizados',
  },
};

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Visão Geral', icon: LayoutDashboard, gestorOnly: false },
    { to: '/playbook', label: 'Playbook', icon: Kanban, gestorOnly: false },
    { to: '/metas', label: 'Metas', icon: Target, gestorOnly: false },
    { to: '/resultados', label: 'Resultados', icon: BarChart3, gestorOnly: false },
    { to: '/equipe', label: 'Equipe', icon: Users, gestorOnly: true },
    { to: '/rituais', label: 'Rotinas e Rituais', icon: CalendarCheck2, gestorOnly: false },
    { to: '/playbook-inbound', label: 'Playbook Inbound', icon: BookOpen, gestorOnly: false },
    { to: '/assistente', label: 'Assistente IA', icon: Bot, gestorOnly: false },
  ].filter((item) => !item.gestorOnly || user?.role === 'GESTOR');

  const currentMeta = PAGE_METADATA[location.pathname] || {
    title: 'Playbook de Vendas Quest',
    context: 'Sistema Comercial — Quest Comunicação Total',
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F5F5F5] text-[#111111]">
      {/* Overlay Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: Fixa no fluxo Flexbox no Desktop (nunca sobrepõe o conteúdo) e Gaveta no Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#111111] text-white flex flex-col justify-between transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 shrink-0 ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
            <QuestLogo light compact={sidebarCollapsed} />
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden lg:flex text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-zinc-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex items-center ${
                      sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'gap-3 px-3.5'
                    } py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#FF5A00] text-white font-semibold shadow-sm'
                        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={sidebarCollapsed ? 'lg:hidden' : 'block'}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Avatar, Nome, Cargo, Alterar senha, Sair */}
        <div className="p-3 border-t border-white/10 bg-black/30 shrink-0">
          <div
            className={`flex items-center ${
              sidebarCollapsed ? 'lg:justify-center' : 'gap-3'
            } mb-3`}
          >
            <div
              className="w-9 h-9 rounded-full bg-[#FF5A00] text-white font-bold text-xs flex items-center justify-center shrink-0"
              title={`${user?.name} — ${user?.cargo}`}
            >
              {getInitials(user?.name || 'Quest')}
            </div>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="text-xs font-semibold text-white break-words leading-snug">
                {user?.name}
              </p>
              <p className="text-[11px] text-zinc-400 break-words leading-snug">
                {user?.cargo}
              </p>
            </div>
          </div>

          <div
            className={`grid ${
              sidebarCollapsed ? 'lg:grid-cols-1 gap-1.5' : 'grid-cols-2 gap-2'
            }`}
          >
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              title="Alterar senha"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-zinc-300 bg-white/5 hover:bg-white/15 hover:text-white transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className={sidebarCollapsed ? 'lg:hidden' : 'inline'}>Senha</span>
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sair"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 hover:text-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className={sidebarCollapsed ? 'lg:hidden' : 'inline'}>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Área Principal Fluida: adapta-se automaticamente a 100% da largura restante do monitor */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="sticky top-0 z-30 min-h-16 py-2.5 bg-white border-b border-zinc-200 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#111111] hover:bg-[#F5F5F5] shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#111111] leading-snug break-words">
                {currentMeta.title}
              </h1>
              <p className="text-xs text-[#333333] leading-snug break-words">
                {currentMeta.context}
              </p>
            </div>
          </div>

          {/* Identificação do Usuário na Topbar (Sempre visível e adaptável) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-[#111111]">
                  {user?.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    user?.role === 'GESTOR'
                      ? 'bg-[#FF5A00]/15 text-[#FF5A00]'
                      : 'bg-zinc-100 text-[#333333]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {user?.role}
                </span>
              </div>
              <p className="text-[11px] text-[#333333]">{user?.cargo}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 w-full min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
};
