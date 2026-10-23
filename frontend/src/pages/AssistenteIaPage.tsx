import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
  Cpu,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { formatDateTimeBR } from '../lib/utils';

const QUICK_PROMPTS = [
  'Analise minhas negociações em andamento e indique os próximos passos pelo Playbook.',
  'Quais são as 7 etapas do Pipeline Inbound e seus critérios de avanço?',
  'Como conduzir o Pitch dos Quatro Atos e contornar objeções de preço?',
  'Como está o atingimento das minhas metas atuais e elegibilidade no 7-Point Scorecard?',
];

export const AssistenteIaPage: React.FC = () => {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<any[]>([]);
  const [activeConversa, setActiveConversa] = useState<any>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const loadConversas = useCallback(async () => {
    try {
      const res = await api.get<{ conversas: any[] }>('/assistente/conversas');
      const list = res.conversas || [];
      setConversas(list);
      if (list.length > 0 && !activeConversa) {
        const detail = await api.get<{ conversa: any }>(`/assistente/conversas/${list[0].id}`);
        setActiveConversa(detail.conversa);
      }
    } catch {
      // ignore
    }
  }, [activeConversa]);

  useEffect(() => {
    loadConversas();
  }, [loadConversas]);

  const handleSelectConversa = async (id: string) => {
    const res = await api.get<{ conversa: any }>(`/assistente/conversas/${id}`);
    setActiveConversa(res.conversa);
  };

  const handleNewConversa = async () => {
    const res = await api.post<{ conversa: any }>('/assistente/conversas', {
      titulo: 'Consulta ao Assistente Comercial Quest',
    });
    const detail = await api.get<{ conversa: any }>(
      `/assistente/conversas/${res.conversa.id}`
    );
    setActiveConversa(detail.conversa);
    await loadConversas();
    return detail.conversa;
  };

  const handleDeleteConversa = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.delete(`/assistente/conversas/${id}`);
    if (activeConversa?.id === id) {
      setActiveConversa(null);
    }
    const res = await api.get<{ conversas: any[] }>('/assistente/conversas');
    setConversas(res.conversas || []);
  };

  const handleSend = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || sending) return;

    setSending(true);
    setInput('');
    setStreamingText('');

    try {
      let current = activeConversa;
      if (!current) {
        current = await handleNewConversa();
      }

      // Usa endpoint com suporte a streaming SSE
      const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
      const response = await fetch(
        `${API_BASE}/assistente/conversas/${current.id}/mensagens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          credentials: 'include',
          body: JSON.stringify({ mensagem: textToSend, stream: true }),
        }
      );

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          for (const block of lines) {
            if (block.startsWith('data: ')) {
              try {
                const payload = JSON.parse(block.slice(6));
                if (payload.type === 'delta') {
                  setStreamingText((prev) => prev + payload.content);
                }
              } catch {
                // ignore malformed chunk
              }
            }
          }
        }
      }

      const updated = await api.get<{ conversa: any }>(`/assistente/conversas/${current.id}`);
      setActiveConversa(updated.conversa);
      const listRes = await api.get<{ conversas: any[] }>('/assistente/conversas');
      setConversas(listRes.conversas || []);
    } finally {
      setStreamingText('');
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[calc(100vh-8.5rem)]">
      {/* Coluna Lateral: Histórico Privado de Conversas do Usuário */}
      <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-zinc-200 p-4 shadow-card flex flex-col justify-between">
      <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-zinc-200 p-4 shadow-card flex flex-col justify-between min-w-0">
        <div>
          <button
            type="button"
            onClick={handleNewConversa}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FF5A00] hover:bg-[#E04F00] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nova Conversa Comercial</span>
          </button>

          <div className="mt-4 space-y-1.5 max-h-[480px] overflow-y-auto">
          <div className="mt-4 space-y-1.5 max-h-[55vh] overflow-y-auto">
            {conversas.length === 0 ? (
              <p className="text-xs text-zinc-500 p-3 text-center">
                Nenhuma conversa iniciada ainda.
              </p>
            ) : (
              conversas.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversa(c.id)}
                  className={`p-3 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  className={`p-3 rounded-xl text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    activeConversa?.id === c.id
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#F5F5F5] text-[#111111] hover:bg-zinc-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold truncate">
                      <MessageSquare className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                      <span className="truncate">{c.titulo}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5 font-bold">
                      <MessageSquare className="w-3.5 h-3.5 text-[#FF5A00] shrink-0 mt-0.5" />
                      <span className="break-words leading-snug">{c.titulo}</span>
                    </div>
                    <p
                      className={`text-[10px] mt-0.5 ${
                      className={`text-[10px] mt-1 ${
                        activeConversa?.id === c.id ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {c.total_tokens} tokens • {formatDateTimeBR(c.updated_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversa(c.id, e)}
                    className="p-1 text-zinc-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5 font-semibold text-[#111111]">
            <Cpu className="w-3.5 h-3.5 text-[#FF5A00]" />
            <span>Governança e Segurança</span>
          </div>
          <p className="mt-1">
            Histórico privado de <strong>{user?.name}</strong>. Ferramentas validadas por RBAC no
            backend.
          </p>
        </div>
      </div>

      {/* Área Principal do Chat: Assistente Comercial Quest */}
      <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-zinc-200 shadow-card flex flex-col justify-between overflow-hidden">
      <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-zinc-200 shadow-card flex flex-col justify-between overflow-hidden min-w-0">
        {/* Header do Assistente */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-[#111111] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A00] flex items-center justify-center">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 bg-[#111111] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A00] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">Assistente Comercial Quest</h2>
              <p className="text-xs text-zinc-400">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold break-words">
                Assistente Comercial Quest
              </h2>
              <p className="text-xs text-zinc-400 break-words">
                Conectado ao Playbook Quest, Pipeline CRM e Metas Autorizadas
              </p>
            </div>
          </div>

          {activeConversa && (
            <div className="text-right text-xs hidden sm:block">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-zinc-200 font-semibold">
            <div className="text-xs">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/10 text-zinc-200 font-semibold">
                Tokens: {activeConversa.total_tokens || 0} • Custo est.: US${' '}
                {Number(activeConversa.custo_estimado_usd || 0).toFixed(5)}
              </span>
            </div>
          )}
        </div>

        {/* Mensagens da Conversa */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[480px] bg-[#F5F5F5]/40">
          {(!activeConversa || (activeConversa.mensagens || []).length === 0) &&
            !streamingText && (
              <div className="space-y-4 py-4">
                <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#FF5A00] mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Inteligência Comercial Quest</span>
                  </div>
                  <h3 className="text-base font-bold text-[#111111]">
                    Como posso apoiar sua operação comercial hoje, {user?.name?.split(' ')[0]}?
                  </h3>
                  <p className="text-xs text-[#333333] mt-1">
                    Posso consultar o Playbook Inbound, orientar sobre etapas do processo, sugerir
                    abordagens, preparar reuniões, contornar objeções e analisar suas negociações e
                    metas autorizadas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_PROMPTS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="text-left p-3.5 rounded-xl bg-white border border-zinc-200 hover:border-[#FF5A00] text-xs font-medium text-[#111111] transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {(activeConversa?.mensagens || []).map((msg: any) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#111111] text-white'
                    : 'bg-white border border-zinc-200 text-[#111111] shadow-xs'
                }`}
              >
                {msg.conteudo}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-zinc-200 text-[#111111] flex items-center justify-center shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {streamingText && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="max-w-2xl rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap bg-white border border-[#FF5A00]/40 text-[#111111]">
                {streamingText}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Envio de Mensagem */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-white border-t border-zinc-200 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="Pergunte ao Assistente Comercial Quest sobre o Playbook, objeções, metas ou negociações..."
            className="flex-1 px-4 py-3 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-5 py-3 rounded-xl bg-[#FF5A00] hover:bg-[#E04F00] text-white font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Consultando...' : 'Enviar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

