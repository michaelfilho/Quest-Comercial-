import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { LoginShowcase } from '../components/login/LoginShowcase';
import { getTimeGreeting } from '../lib/greeting';
import './login.css';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState(getTimeGreeting);

  React.useEffect(() => {
    const refreshGreeting = () => setGreeting(getTimeGreeting());
    const timer = window.setInterval(refreshGreeting, 60_000);
    document.addEventListener('visibilitychange', refreshGreeting);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshGreeting); };
  }, []);

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
  // Convite emitido pela gestão; fragmento removido do endereço após leitura.
  React.useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('convite');
    if (token) {
      setResetToken(token);
      setMode('reset');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
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
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-login">
      <LoginShowcase />
      <div className="seller-login-auth">
        <div className="seller-login-card">
          {mode === 'login' && (
            <>
              <div className="seller-login-header">
                <p className="seller-login-greeting" aria-live="polite">{greeting}!</p>
                <h2 className="seller-login-welcome">Bem-vindo de volta</h2>
                <p className="seller-login-subtitle">
                  Acesse sua conta Quest Seller.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="seller-login-form">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[#111111] mb-1.5"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="seller-login-input-icon absolute top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@empresa.com"
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
                    />
                  </div>
                </div>

                <div>
                  <div className="seller-login-password-heading">
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
                      className="seller-login-forgot"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="seller-login-input-icon absolute top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      autoComplete="current-password"
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
                      className="seller-login-eye absolute top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="seller-login-submit"
                >
                  {loading ? 'Autenticando...' : 'Entrar na plataforma'}
                </button>
              </form>
              <p className="seller-login-secure"><Lock aria-hidden="true" />Acesso seguro e protegido</p>
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
                  Recuperar acesso
                </h2>
                <p className="text-sm text-[#333333] mt-1">
                  A recuperação de acesso é autorizada pela gestão comercial.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800">
                  {infoMessage}
                </div>
              )}

              <p className="text-sm text-[#333333]">Entre em contato com André ou com a gestão comercial para solicitar a redefinição da sua senha.</p>
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
                <div role="alert" className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
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

