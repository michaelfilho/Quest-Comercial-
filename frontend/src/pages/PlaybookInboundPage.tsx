import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Edit3,
  CheckCircle2,
  UserCheck,
  X,
  FileText,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export const PlaybookInboundPage: React.FC = () => {
  const { user } = useAuth();
  const isGestor = user?.role === 'GESTOR';

  const [secoes, setSecoes] = useState<any[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('visao-geral');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<any>(null);

  const loadPlaybook = useCallback(async () => {
    try {
      const res = await api.get('/playbook-inbound');
      setSecoes(res.secoes || []);
      if (res.secoes?.length > 0 && !activeSlug) {
        setActiveSlug(res.secoes[0].secao_slug);
      }
    } catch {
      // ignore
    }
  }, [activeSlug]);

  useEffect(() => {
    loadPlaybook();
  }, [loadPlaybook]);

  // Scroll-Spy Navigation (Seção 12)
  useEffect(() => {
    const elements = document.querySelectorAll('[data-playbook-section]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const slug = entry.target.getAttribute('data-playbook-section');
            if (slug) setActiveSlug(slug);
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0.1 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [secoes]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;
    await api.put(`/playbook-inbound/${editingBlock.id}`, {
      titulo: editingBlock.titulo,
      subtitulo: editingBlock.subtitulo,
      conteudo: editingBlock.conteudo,
      criterios_avanco: editingBlock.criterios_avanco,
      responsaveis: editingBlock.responsaveis,
      copiavel: editingBlock.copiavel,
      oficial_importado: true,
    });
    setEditingBlock(null);
    await loadPlaybook();
  };

  const scrollToSection = (slug: string) => {
    setActiveSlug(slug);
    const el = document.getElementById(`section-${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Navegação Interna Fixa com Scroll-Spy (7 Seções) */}
      <aside className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-24 bg-white rounded-2xl border border-zinc-200 p-4 shadow-card">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-zinc-100">
          <BookOpen className="w-4 h-4 text-[#FF5A00]" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#111111]">
            Playbook Inbound Rev03
          </span>
        </div>

        <nav className="space-y-1">
          {secoes.map((sec) => (
            <button
              key={sec.secao_slug}
              type="button"
              onClick={() => scrollToSection(sec.secao_slug)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeSlug === sec.secao_slug
                  ? 'bg-[#FF5A00] text-white shadow-sm'
                  : 'text-[#333333] hover:bg-[#F5F5F5]'
              }`}
            >
              {sec.secao_titulo}
            </button>
          ))}
        </nav>

        <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
          <FileText className="w-3.5 h-3.5 text-[#FF5A00] inline mr-1" />
          Fonte da verdade: <strong>Playbook Inbound Rev03</strong>. Nenhum texto oficial é
          inventado; gestores podem importar/atualizar os blocos diretamente.
        </div>
      </aside>

      {/* Conteúdo das 7 Seções */}
      <div className="flex-1 space-y-8 min-w-0 w-full">
        {secoes.map((sec) => (
          <section
            key={sec.secao_slug}
            id={`section-${sec.secao_slug}`}
            data-playbook-section={sec.secao_slug}
            className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-card scroll-mt-24 space-y-4"
          >
            <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#111111]">{sec.secao_titulo}</h2>
              <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-[#333333]">
                {sec.blocos.length} bloco(s)
              </span>
            </div>

            <div className="space-y-4">
              {sec.blocos.map((bloco: any) => (
                <div
                  key={bloco.id}
                  className="p-5 rounded-2xl bg-[#F5F5F5] border border-zinc-200/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#111111]">{bloco.titulo}</h3>
                        {bloco.oficial_importado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Rev03 Oficial
                          </span>
                        )}
                      </div>
                      {bloco.subtitulo && (
                        <p className="text-xs text-[#333333] mt-0.5">{bloco.subtitulo}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {bloco.copiavel && (
                        <button
                          type="button"
                          onClick={() => handleCopy(bloco.id, bloco.conteudo)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-zinc-300 hover:border-[#FF5A00] text-[#111111] transition-colors"
                        >
                          {copiedId === bloco.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#FF5A00]" />
                              <span>Copiar Texto</span>
                            </>
                          )}
                        </button>
                      )}

                      {isGestor && (
                        <button
                          type="button"
                          onClick={() => setEditingBlock({ ...bloco })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#111111] text-white hover:bg-[#333333]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar / Importar Rev03</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-zinc-200/70 text-xs text-[#111111] whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {bloco.conteudo}
                  </div>

                  {(bloco.criterios_avanco || bloco.responsaveis) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
                      {bloco.criterios_avanco && (
                        <div className="p-2.5 rounded-xl bg-white border border-zinc-200/60 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[#111111] block">Critérios de Avanço:</strong>
                            <span className="text-[#333333]">{bloco.criterios_avanco}</span>
                          </div>
                        </div>
                      )}
                      {bloco.responsaveis && (
                        <div className="p-2.5 rounded-xl bg-white border border-zinc-200/60 flex items-start gap-2">
                          <UserCheck className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[#111111] block">Responsáveis:</strong>
                            <span className="text-[#333333]">{bloco.responsaveis}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Modal de Edição / Importação Literal do Playbook Inbound Rev03 (Gestor) */}
      {editingBlock && isGestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-2xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Atualizar Conteúdo Oficial — Playbook Inbound Rev03
                </h3>
                <p className="text-xs text-[#333333]">{editingBlock.secao_titulo}</p>
              </div>
              <button type="button" onClick={() => setEditingBlock(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Título do Bloco *</label>
                <input
                  type="text"
                  required
                  value={editingBlock.titulo}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, titulo: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Texto Oficial do Documento Playbook Inbound Rev03 *
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingBlock.conteudo}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, conteudo: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Critérios de Avanço</label>
                  <input
                    type="text"
                    value={editingBlock.criterios_avanco || ''}
                    onChange={(e) =>
                      setEditingBlock({ ...editingBlock, criterios_avanco: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Responsáveis</label>
                  <input
                    type="text"
                    value={editingBlock.responsaveis || ''}
                    onChange={(e) =>
                      setEditingBlock({ ...editingBlock, responsaveis: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBlock(null)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Salvar Conteúdo Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

