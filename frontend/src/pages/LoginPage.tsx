import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, KeyRound, CheckCircle2, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { QuestLogo } from '../components/ui/QuestLogo';

interface InitialAccount {
  id: string;
  name: string;
  email: string;
  role: 'GESTOR' | 'VENDEDOR';
  cargo: string;
  activated: boolean;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [initialAccounts, setInitialAccounts] = useState<InitialAccount[]>([]);

  const loadAccounts = async () => {
    try {
      const res = await api.get<{ accounts: InitialAccount[] }>('/auth/initial-accounts');
      setInitialAccounts(res.accounts || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação.');
      if (err.code === 'ACCOUNT_NEEDS_ACTIVATION') {
        setMode('forgot');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await api.post<{
        message: string;
        resetTokenForSetup?: string | null;
      }>('/auth/forgot-password', { email });

      setInfoMessage(res.message);
      if (res.resetTokenForSetup) {
        setResetToken(res.resetTokenForSetup);
      }
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string; email?: string }>('/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      setInfoMessage(res.message);
      if (res.email) setEmail(res.email);
      setPassword('');
      await loadAccounts();
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col lg:flex-row">
      {/* Painel Institucional Esquerdo — Identidade QUEST 2026 */}
      <div className="lg:w-5/12 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 bg-gradient-to-br from-[#111111] via-[#18181B] to-[#111111] text-white">
        <div>
          <QuestLogo light />
          <div className="mt-10 space-y-4">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#FF5A00]/20 text-[#FF5A00]">
              Quest Comunicação Total • 2026
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Playbook de Vendas & Inteligência Comercial
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Plataforma corporativa integrada de CRM, Pipeline em 5 etapas, Gestão de Metas,
              KPIs do Funil Inbound + Consultoria, Rotinas e Rituais e Assistente Comercial IA.
            </p>
          </div>

          {/* Contas Oficiais Iniciais da Equipe Quest */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#FF5A00]" />
                Equipe Comercial Quest (Clique para selecionar)
              </span>
            </div>
            <div className="space-y-2">
              {initialAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setError(null);
                    if (!acc.activated) {
                      setMode('forgot');
                      setInfoMessage(
                        `A conta de ${acc.name} ainda não possui senha definida. Gere o token seguro abaixo para ativar seu acesso.`
                      );
                    } else {
                      setMode('login');
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#FF5A00]/40 transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white break-words">
                      {acc.name}{' '}
                      <span className="text-[10px] font-bold text-[#FF5A00]">({acc.role})</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 break-all sm:break-words">
                      {acc.cargo} • {acc.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      acc.activated
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {acc.activated ? 'Ativa' : 'Definir Senha'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-zinc-500">
          © 2026 Quest Comunicação Total. Autenticação Argon2id & Sessões HttpOnly.
        </p>
      </div>

      {/* Painel de Autenticação Direito */}
      <div className="flex-1 bg-[#F5F5F5] flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200/80 shadow-card p-8">
          {mode === 'login' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#111111]">Acessar Plataforma</h2>
                <p className="text-sm text-[#333333] mt-1">
                  Entre com seu e-mail corporativo e senha da Quest.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[#111111] mb-1.5"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@questcomunicacao.com.br"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#111111]"
                    >
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('forgot');
                      }}
                      className="text-xs font-semibold text-[#FF5A00] hover:underline"
                    >
                      Esqueci minha senha / 1º Acesso
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
                    />
                    <button
                      type="button"
                      aria-label="Mostrar ou ocultar senha"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#FF5A00] hover:bg-[#E04F00] text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Autenticando...' : 'Entrar'}
                </button>
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#333333] hover:text-[#111111] mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#111111]">
                  Recuperação / Ativação de Senha
                </h2>
                <p className="text-sm text-[#333333] mt-1">
                  Informe seu e-mail corporativo para gerar um token seguro com expiração.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@questcomunicacao.com.br"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#FF5A00] hover:bg-[#E04F00] text-white font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Gerando token seguro...' : 'Gerar Token de Definição de Senha'}
                </button>
              </form>
            </>
          )}

          {mode === 'reset' && (
            <>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#333333] hover:text-[#111111] mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </button>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-[#111111]">Definir Senha Segura</h2>
                <p className="text-sm text-[#333333] mt-1">
                  Valide seu token de uso único e defina sua senha criptografada com Argon2id.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Token de Ativação / Recuperação
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Cole o token gerado"
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Nova Senha (mín. 8 caracteres, letras e números)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ex: Quest2026!Comercial"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#FF5A00] hover:bg-[#E04F00] text-white font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Ativando senha...' : 'Confirmar e Ativar Senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

