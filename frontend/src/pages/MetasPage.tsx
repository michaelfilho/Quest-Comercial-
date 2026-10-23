import React, { useCallback, useEffect, useState } from 'react';
import {
  Target,
  Plus,
  Sliders,
  Trash2,
  X,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { formatBRL, formatPct } from '../lib/utils';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Meta } from '../types';

export const MetasPage: React.FC = () => {
  const { user } = useAuth();
  const isGestor = user?.role === 'GESTOR';
  const now = new Date();
  const defaultPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [metas, setMetas] = useState<Meta[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [inboundData, setInboundData] = useState<any>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meta | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [metaForm, setMetaForm] = useState({
    vendedor_id: '',
    tipo: 'MENSAL',
    periodo: defaultPeriodo,
    ano: String(now.getFullYear()),
    mes: String(now.getMonth() + 1),
    ciclo: '',
    indicador_nome: '',
    valor_alvo: '',
    observacoes: '',
  });

  const [kpiForm, setKpiForm] = useState({
    usuario_id: '',
    periodo: defaultPeriodo,
    ciclo: 'GERAL',
    validacoes_radar_meta: '',
    validacoes_radar_realizado: '0',
    taxa_agendamento_meta: '',
    taxa_agendamento_realizado: '',
    taxa_qualificacao_meta: '',
    taxa_qualificacao_realizado: '',
    taxa_aceite_diagnostico_meta: '',
    taxa_aceite_diagnostico_realizado: '',
    taxa_conversao_meta: '',
    taxa_conversao_realizado: '',
    ticket_medio_meta: '',
    ticket_medio_realizado: '',
    ciclo_dias_meta: '',
    ciclo_dias_realizado: '',
    ciclo_1_meta: '',
    ciclo_1_realizado: '',
    ciclo_2_meta: '',
    ciclo_2_realizado: '',
  });

  const loadAll = useCallback(async () => {
    try {
      const [mRes, kRes] = await Promise.all([
        api.get<{ metas: Meta[] }>('/metas'),
        api.get('/metas/kpis-inbound'),
      ]);
      setMetas(mRes.metas || []);
      setInboundData(kRes);

      const firstReg = kRes?.registros?.[0];
      const tiagoId = kRes?.vendedor_referencia?.id || '';
      if (firstReg) {
        setKpiForm({
          usuario_id: firstReg.usuario_id || tiagoId,
          periodo: firstReg.periodo || defaultPeriodo,
          ciclo: firstReg.ciclo || 'GERAL',
          validacoes_radar_meta: String(firstReg.validacoes_radar_meta ?? ''),
          validacoes_radar_realizado: String(firstReg.validacoes_radar_realizado ?? '0'),
          taxa_agendamento_meta: String(firstReg.taxa_agendamento_meta ?? ''),
          taxa_agendamento_realizado: String(firstReg.taxa_agendamento_realizado ?? ''),
          taxa_qualificacao_meta: String(firstReg.taxa_qualificacao_meta ?? ''),
          taxa_qualificacao_realizado: String(firstReg.taxa_qualificacao_realizado ?? ''),
          taxa_aceite_diagnostico_meta: String(firstReg.taxa_aceite_diagnostico_meta ?? ''),
          taxa_aceite_diagnostico_realizado: String(
            firstReg.taxa_aceite_diagnostico_realizado ?? ''
          ),
          taxa_conversao_meta: String(firstReg.taxa_conversao_meta ?? ''),
          taxa_conversao_realizado: String(firstReg.taxa_conversao_realizado ?? ''),
          ticket_medio_meta: String(firstReg.ticket_medio_meta ?? ''),
          ticket_medio_realizado: String(firstReg.ticket_medio_realizado ?? ''),
          ciclo_dias_meta: String(firstReg.ciclo_dias_meta ?? ''),
          ciclo_dias_realizado: String(firstReg.ciclo_dias_realizado ?? ''),
          ciclo_1_meta: String(firstReg.ciclo_1_meta ?? ''),
          ciclo_1_realizado: String(firstReg.ciclo_1_realizado ?? ''),
          ciclo_2_meta: String(firstReg.ciclo_2_meta ?? ''),
          ciclo_2_realizado: String(firstReg.ciclo_2_realizado ?? ''),
        });
      } else if (tiagoId) {
        setKpiForm((prev) => ({ ...prev, usuario_id: tiagoId }));
      }
    } catch {
      // ignore
    }
  }, [defaultPeriodo]);

  useEffect(() => {
    loadAll();
    if (isGestor) {
      api
        .get<{ accounts: any[] }>('/auth/initial-accounts')
        .then((r) => setSellers(r.accounts || []))
        .catch(() => {});
    }
  }, [loadAll, isGestor]);

  const handleCreateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/metas', {
      vendedor_id: metaForm.vendedor_id || null,
      tipo: metaForm.tipo,
      periodo: metaForm.periodo,
      ano: Number(metaForm.ano),
      mes: metaForm.mes ? Number(metaForm.mes) : null,
      ciclo: metaForm.ciclo || null,
      indicador_nome: metaForm.indicador_nome || null,
      valor_alvo: Number(metaForm.valor_alvo),
      observacoes: metaForm.observacoes || null,
    });
    setModalOpen(false);
    setFeedback('Meta cadastrada com sucesso.');
    await loadAll();
  };

  const handleSaveKpisInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    const toOptionalNum = (val: string) => (val.trim() === '' ? null : Number(val));
    await api.put('/metas/kpis-inbound', {
      usuario_id: kpiForm.usuario_id || null,
      periodo: kpiForm.periodo,
      ciclo: kpiForm.ciclo,
      validacoes_radar_meta: toOptionalNum(kpiForm.validacoes_radar_meta),
      validacoes_radar_realizado: Number(kpiForm.validacoes_radar_realizado || 0),
      taxa_agendamento_meta: toOptionalNum(kpiForm.taxa_agendamento_meta),
      taxa_agendamento_realizado: toOptionalNum(kpiForm.taxa_agendamento_realizado),
      taxa_qualificacao_meta: toOptionalNum(kpiForm.taxa_qualificacao_meta),
      taxa_qualificacao_realizado: toOptionalNum(kpiForm.taxa_qualificacao_realizado),
      taxa_aceite_diagnostico_meta: toOptionalNum(kpiForm.taxa_aceite_diagnostico_meta),
      taxa_aceite_diagnostico_realizado: toOptionalNum(kpiForm.taxa_aceite_diagnostico_realizado),
      taxa_conversao_meta: toOptionalNum(kpiForm.taxa_conversao_meta),
      taxa_conversao_realizado: toOptionalNum(kpiForm.taxa_conversao_realizado),
      ticket_medio_meta: toOptionalNum(kpiForm.ticket_medio_meta),
      ticket_medio_realizado: toOptionalNum(kpiForm.ticket_medio_realizado),
      ciclo_dias_meta: toOptionalNum(kpiForm.ciclo_dias_meta),
      ciclo_dias_realizado: toOptionalNum(kpiForm.ciclo_dias_realizado),
      ciclo_1_meta: toOptionalNum(kpiForm.ciclo_1_meta),
      ciclo_1_realizado: toOptionalNum(kpiForm.ciclo_1_realizado),
      ciclo_2_meta: toOptionalNum(kpiForm.ciclo_2_meta),
      ciclo_2_realizado: toOptionalNum(kpiForm.ciclo_2_realizado),
    });
    setKpiModalOpen(false);
    setFeedback('KPIs do Funil Inbound + Consultoria salvos no banco de dados.');
    await loadAll();
  };

  const handleConfirmDeleteMeta = async () => {
    if (!deleteTarget) return;
    await api.delete(`/metas/${deleteTarget.id}`, { confirm: true });
    setDeleteTarget(null);
    await loadAll();
  };

  const activeKpiRecord = inboundData?.registros?.[0] || null;
  const crmReal = inboundData?.indicadores_crm_tempo_real || {};

  return (
    <div className="space-y-8">
      {/* Cabeçalho e Ações */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#111111]">
            Gestão de Metas Comerciais & KPIs de Funil
          </h2>
          <p className="text-xs text-[#333333] mt-1">
            Semáforo Oficial Quest: <span className="text-emerald-700 font-bold">Verde (≥ 90%)</span> •{' '}
            <span className="text-amber-700 font-bold">Amarelo (50% a 89%)</span> •{' '}
            <span className="text-red-700 font-bold">Vermelho (&lt; 50%)</span>
          </p>
        </div>

        {isGestor && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setKpiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#111111] bg-[#F5F5F5] hover:bg-zinc-200"
            >
              <Sliders className="w-4 h-4 text-[#FF5A00]" />
              <span>Configurar KPIs Inbound + Consultoria</span>
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00]"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Listagem de Metas Individuais e da Equipe */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <Target className="w-4 h-4 text-[#FF5A00]" />
          <span>Metas Cadastradas (Mensal, Anual, Indicadores e por Ciclo)</span>
        </h3>

        {metas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
            <p className="text-sm font-bold text-[#111111]">
              Nenhuma meta cadastrada para este filtro ainda.
            </p>
            <p className="text-xs text-[#333333] mt-1">
              Não utilizamos metas fictícias.{' '}
              {isGestor
                ? 'Clique em "Nova Meta" para cadastrar as metas reais da planilha.'
                : 'Aguarde o cadastro das metas oficiais pelo gestor comercial.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {metas.map((meta) => {
              const colorBadge =
                meta.cor_semaforo === 'VERDE'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : meta.cor_semaforo === 'AMARELO'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-red-100 text-red-800 border-red-300';

              const barColor =
                meta.cor_semaforo === 'VERDE'
                  ? 'bg-emerald-500'
                  : meta.cor_semaforo === 'AMARELO'
                  ? 'bg-amber-500'
                  : 'bg-red-500';

              return (
                <div
                  key={meta.id}
                  className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-[#333333]">
                          {meta.tipo} • {meta.periodo}
                        </span>
                        <h4 className="text-base font-bold text-[#111111] mt-1.5">
                          {meta.vendedor_nome || 'Meta Global da Equipe'}
                        </h4>
                        {meta.vendedor_cargo && (
                          <p className="text-xs text-[#333333]">{meta.vendedor_cargo}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${colorBadge}`}
                        >
                          {formatPct(meta.percentual_atingido)}
                        </span>
                        {isGestor && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(meta)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(100, meta.percentual_atingido)}%` }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                        <span className="text-zinc-500 block">Valor-Alvo</span>
                        <strong className="text-sm text-[#111111]">
                          {formatBRL(meta.valor_alvo)}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                        <span className="text-zinc-500 block">Valor Realizado</span>
                        <strong className="text-sm text-[#111111]">
                          {formatBRL(meta.valor_realizado)}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                        <span className="text-zinc-500 block">Valor Restante</span>
                        <strong className="text-sm text-[#111111]">
                          {formatBRL(meta.valor_restante)}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FF5A00]/10">
                        <span className="text-[#FF5A00] font-semibold block">
                          Projeção Atingimento
                        </span>
                        <strong className="text-sm text-[#111111]">
                          {formatBRL(meta.projecao_atingimento)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção Específica: KPIs do Funil — Produto Inbound + Consultoria (Seção 8) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5A00]">
              Seção Especializada • Vendas Inbound / Consultoria
            </span>
            <h3 className="text-lg font-extrabold text-[#111111] flex items-center gap-2 mt-0.5">
              <TrendingUp className="w-5 h-5 text-[#FF5A00]" />
              <span>KPIs do Funil — Produto Inbound + Consultoria</span>
            </h3>
            <p className="text-xs text-[#333333] mt-0.5">
              Responsável de referência:{' '}
              <strong>
                {inboundData?.vendedor_referencia?.name || 'Tiago Hilário'} (
                {inboundData?.vendedor_referencia?.cargo || 'Vendas Inbound / Consultoria'})
              </strong>
              . Campos preparados para os dados reais da planilha oficial (sem números fictícios).
            </p>
          </div>

          {isGestor && (
            <button
              type="button"
              onClick={() => setKpiModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#111111] hover:bg-[#333333]"
            >
              Cadastrar / Editar Planilha de KPIs
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: '1. Validações no Radar',
              meta: activeKpiRecord?.validacoes_radar_meta ?? 'Não configurado',
              realizado: activeKpiRecord?.validacoes_radar_realizado ?? 0,
            },
            {
              label: '2. Taxa de Agendamento',
              meta:
                activeKpiRecord?.taxa_agendamento_meta !== null &&
                activeKpiRecord?.taxa_agendamento_meta !== undefined
                  ? formatPct(activeKpiRecord.taxa_agendamento_meta)
                  : 'Não configurado',
              realizado:
                activeKpiRecord?.taxa_agendamento_realizado !== null &&
                activeKpiRecord?.taxa_agendamento_realizado !== undefined
                  ? formatPct(activeKpiRecord.taxa_agendamento_realizado)
                  : '—',
            },
            {
              label: '3. Taxa de Qualificação',
              meta:
                activeKpiRecord?.taxa_qualificacao_meta !== null &&
                activeKpiRecord?.taxa_qualificacao_meta !== undefined
                  ? formatPct(activeKpiRecord.taxa_qualificacao_meta)
                  : 'Não configurado',
              realizado:
                activeKpiRecord?.taxa_qualificacao_realizado !== null &&
                activeKpiRecord?.taxa_qualificacao_realizado !== undefined
                  ? formatPct(activeKpiRecord.taxa_qualificacao_realizado)
                  : '—',
            },
            {
              label: '4. Taxa de Aceite de Diagnóstico',
              meta:
                activeKpiRecord?.taxa_aceite_diagnostico_meta !== null &&
                activeKpiRecord?.taxa_aceite_diagnostico_meta !== undefined
                  ? formatPct(activeKpiRecord.taxa_aceite_diagnostico_meta)
                  : 'Não configurado',
              realizado:
                activeKpiRecord?.taxa_aceite_diagnostico_realizado !== null &&
                activeKpiRecord?.taxa_aceite_diagnostico_realizado !== undefined
                  ? formatPct(activeKpiRecord.taxa_aceite_diagnostico_realizado)
                  : '—',
            },
            {
              label: '5. Taxa de Conversão',
              meta:
                activeKpiRecord?.taxa_conversao_meta !== null &&
                activeKpiRecord?.taxa_conversao_meta !== undefined
                  ? formatPct(activeKpiRecord.taxa_conversao_meta)
                  : 'Não configurado',
              realizado: formatPct(
                activeKpiRecord?.taxa_conversao_realizado ?? crmReal.taxa_conversao_realizada ?? 0
              ),
            },
            {
              label: '6. Ticket Médio',
              meta:
                activeKpiRecord?.ticket_medio_meta !== null &&
                activeKpiRecord?.ticket_medio_meta !== undefined
                  ? formatBRL(activeKpiRecord.ticket_medio_meta)
                  : 'Não configurado',
              realizado: formatBRL(
                activeKpiRecord?.ticket_medio_realizado ?? crmReal.ticket_medio_realizado ?? 0
              ),
            },
            {
              label: '7. Ciclo Médio de Fechamento',
              meta:
                activeKpiRecord?.ciclo_dias_meta !== null &&
                activeKpiRecord?.ciclo_dias_meta !== undefined
                  ? `${activeKpiRecord.ciclo_dias_meta} dias`
                  : 'Não configurado',
              realizado: `${
                activeKpiRecord?.ciclo_dias_realizado ??
                crmReal.ciclo_medio_fechamento_dias ??
                0
              } dias`,
            },
            {
              label: '8. Ciclo 1 (Inbound + Consultoria)',
              meta:
                activeKpiRecord?.ciclo_1_meta !== null &&
                activeKpiRecord?.ciclo_1_meta !== undefined
                  ? formatBRL(activeKpiRecord.ciclo_1_meta)
                  : 'Não configurado',
              realizado:
                activeKpiRecord?.ciclo_1_realizado !== null &&
                activeKpiRecord?.ciclo_1_realizado !== undefined
                  ? formatBRL(activeKpiRecord.ciclo_1_realizado)
                  : 'R$ 0,00',
            },
            {
              label: '9. Ciclo 2 (Expansão / Recorrência)',
              meta:
                activeKpiRecord?.ciclo_2_meta !== null &&
                activeKpiRecord?.ciclo_2_meta !== undefined
                  ? formatBRL(activeKpiRecord.ciclo_2_meta)
                  : 'Não configurado',
              realizado:
                activeKpiRecord?.ciclo_2_realizado !== null &&
                activeKpiRecord?.ciclo_2_realizado !== undefined
                  ? formatBRL(activeKpiRecord.ciclo_2_realizado)
                  : 'R$ 0,00',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F5F5F5] border border-zinc-200/70">
              <span className="text-xs font-bold text-[#111111] block">{item.label}</span>
              <div className="mt-2 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 block">Referência / Meta</span>
                  <strong className="text-sm text-[#333333]">{item.meta}</strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block">Realizado</span>
                  <strong className="text-sm text-[#FF5A00]">{item.realizado}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Nova Meta (Gestor) */}
      {modalOpen && isGestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-base font-bold text-[#111111]">Cadastrar Meta Comercial</h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleCreateMeta} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Tipo de Meta</label>
                  <select
                    value={metaForm.tipo}
                    onChange={(e) => setMetaForm({ ...metaForm, tipo: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  >
                    <option value="MENSAL">Meta Mensal</option>
                    <option value="ANUAL">Meta Anual</option>
                    <option value="INDICADOR_COMERCIAL">Meta de Indicador Comercial</option>
                    <option value="CICLO">Meta por Ciclo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Vendedor (ou Equipe)</label>
                  <select
                    value={metaForm.vendedor_id}
                    onChange={(e) => setMetaForm({ ...metaForm, vendedor_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  >
                    <option value="">Meta Global da Equipe</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.cargo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Período</label>
                  <input
                    type="text"
                    required
                    value={metaForm.periodo}
                    onChange={(e) => setMetaForm({ ...metaForm, periodo: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="2026-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Ano</label>
                  <input
                    type="number"
                    required
                    value={metaForm.ano}
                    onChange={(e) => setMetaForm({ ...metaForm, ano: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Mês (Opcional)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={metaForm.mes}
                    onChange={(e) => setMetaForm({ ...metaForm, mes: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Valor-Alvo (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={metaForm.valor_alvo}
                  onChange={(e) => setMetaForm({ ...metaForm, valor_alvo: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  placeholder="Ex: 70000"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configurar KPIs do Funil Inbound + Consultoria (Gestor) */}
      {kpiModalOpen && isGestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-2xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Configurar KPIs do Funil — Produto Inbound + Consultoria
                </h3>
                <p className="text-xs text-[#333333]">
                  Insira os valores reais da planilha comercial (Referência e Realizado)
                </p>
              </div>
              <button type="button" onClick={() => setKpiModalOpen(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveKpisInbound} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Período</label>
                  <input
                    type="text"
                    required
                    value={kpiForm.periodo}
                    onChange={(e) => setKpiForm({ ...kpiForm, periodo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Ciclo</label>
                  <input
                    type="text"
                    required
                    value={kpiForm.ciclo}
                    onChange={(e) => setKpiForm({ ...kpiForm, ciclo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Validações no Radar (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Meta"
                      value={kpiForm.validacoes_radar_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, validacoes_radar_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      placeholder="Realizado"
                      value={kpiForm.validacoes_radar_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, validacoes_radar_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Taxa Agendamento % (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Meta %"
                      value={kpiForm.taxa_agendamento_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_agendamento_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Real %"
                      value={kpiForm.taxa_agendamento_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_agendamento_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Taxa Qualificação % (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Meta %"
                      value={kpiForm.taxa_qualificacao_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_qualificacao_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Real %"
                      value={kpiForm.taxa_qualificacao_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_qualificacao_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Taxa Aceite Diagnóstico % (Meta / Real)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Meta %"
                      value={kpiForm.taxa_aceite_diagnostico_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_aceite_diagnostico_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Real %"
                      value={kpiForm.taxa_aceite_diagnostico_realizado}
                      onChange={(e) =>
                        setKpiForm({
                          ...kpiForm,
                          taxa_aceite_diagnostico_realizado: e.target.value,
                        })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Taxa Conversão % (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Meta %"
                      value={kpiForm.taxa_conversao_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_conversao_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Real %"
                      value={kpiForm.taxa_conversao_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, taxa_conversao_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Ticket Médio R$ (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Meta R$"
                      value={kpiForm.ticket_medio_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, ticket_medio_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      placeholder="Real R$"
                      value={kpiForm.ticket_medio_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, ticket_medio_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Ciclo Médio Fechamento Dias (Meta / Real)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Meta dias"
                      value={kpiForm.ciclo_dias_meta}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, ciclo_dias_meta: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      placeholder="Real dias"
                      value={kpiForm.ciclo_dias_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, ciclo_dias_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Ciclo 1 R$ (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Meta R$"
                      value={kpiForm.ciclo_1_meta}
                      onChange={(e) => setKpiForm({ ...kpiForm, ciclo_1_meta: e.target.value })}
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      placeholder="Real R$"
                      value={kpiForm.ciclo_1_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, ciclo_1_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Ciclo 2 R$ (Meta / Real)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Meta R$"
                      value={kpiForm.ciclo_2_meta}
                      onChange={(e) => setKpiForm({ ...kpiForm, ciclo_2_meta: e.target.value })}
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                    <input
                      type="number"
                      placeholder="Real R$"
                      value={kpiForm.ciclo_2_realizado}
                      onChange={(e) =>
                        setKpiForm({ ...kpiForm, ciclo_2_realizado: e.target.value })
                      }
                      className="px-2.5 py-2 rounded-lg border border-zinc-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setKpiModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Salvar KPIs Inbound
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Excluir Meta Comercial"
        description="Tem certeza que deseja excluir esta meta? A operação exige confirmação explícita."
        onConfirm={handleConfirmDeleteMeta}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

