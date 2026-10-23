import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  Plus,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { formatBRL, formatDateTimeBR } from '../lib/utils';

export const RituaisPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [activeFreq, setActiveFreq] = useState<'DIARIO' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL'>(
    'DIARIO'
  );
  const [selectedRitual, setSelectedRitual] = useState<any>(null);

  const [execForm, setExecForm] = useState({
    status: 'CONCLUIDO',
    respostas_acompanhamento: '',
    observacoes: '',
    pitch_score: '',
    forecast_score: '',
  });

  const loadRituais = useCallback(async () => {
    try {
      const res = await api.get('/rituais');
      setData(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadRituais();
  }, [loadRituais]);

  const handleRecordExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRitual) return;
    await api.post(`/rituais/${selectedRitual.id}/execucoes`, {
      status: execForm.status,
      respostas_acompanhamento: execForm.respostas_acompanhamento || null,
      observacoes: execForm.observacoes || null,
      pitch_score: execForm.pitch_score ? Number(execForm.pitch_score) : null,
      forecast_score: execForm.forecast_score ? Number(execForm.forecast_score) : null,
    });
    setSelectedRitual(null);
    setExecForm({
      status: 'CONCLUIDO',
      respostas_acompanhamento: '',
      observacoes: '',
      pitch_score: '',
      forecast_score: '',
    });
    await loadRituais();
  };

  const alertas = data?.alertas_deterministicos || {};
  const rituaisAtivos = data?.por_frequencia?.[activeFreq] || [];

  return (
    <div className="space-y-6">
      {/* Painel de Alertas Determinísticos Processados no Backend (Seção 11) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Regra de Ouro 12h */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#FF5A00]">
              Diário • Regra de Ouro (12h)
            </span>
            <Clock className="w-4 h-4 text-[#FF5A00]" />
          </div>
          <p className="mt-2 text-sm font-bold text-[#111111]">
            Contato com lead novo em até 12 horas
          </p>
          <p className="mt-1 text-xs text-[#333333]">
            Leads aguardando 1º contato (&gt;12h):{' '}
            <strong
              className={
                (alertas.regra_ouro_12h?.quantidade_alertas || 0) > 0
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }
            >
              {alertas.regra_ouro_12h?.quantidade_alertas || 0}
            </strong>
          </p>
        </div>

        {/* WBR Semanal > 15 dias */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-600">
              Semanal • WBR de Pipeline
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-sm font-bold text-[#111111]">
            Negócios parados há mais de 15 dias
          </p>
          <p className="mt-1 text-xs text-[#333333]">
            Oportunidades em alerta:{' '}
            <strong
              className={
                (alertas.negocios_parados_15_dias?.quantidade_alertas || 0) > 0
                  ? 'text-red-600'
                  : 'text-emerald-600'
              }
            >
              {alertas.negocios_parados_15_dias?.quantidade_alertas || 0}
            </strong>
          </p>
        </div>

        {/* Mensal Forecast 7-Point Scorecard >= 6 */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-700">
              Mensal • 7-Point Scorecard (Score ≥ 6)
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-sm font-bold text-[#111111]">
            Forecast Elegível:{' '}
            {formatBRL(alertas.forecast_7point_scorecard?.valor_total_elegivel_forecast || 0)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">
            <strong>{alertas.forecast_7point_scorecard?.quantidade_elegiveis || 0}</strong>{' '}
            negociação(ões) com score ≥ 6/7
          </p>
        </div>
      </div>

      {/* Abas de Frequência: Diários, Semanais, Mensais, Trimestrais */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-card flex flex-wrap items-center gap-2">
        {[
          { key: 'DIARIO', label: 'Diários (Stand-up 9h & Regra 12h)' },
          { key: 'SEMANAL', label: 'Semanais (WBR Pipeline & Pitch Scoring)' },
          { key: 'MENSAL', label: 'Mensais (Forecast 7-Point, Metas & Feedback 360)' },
          { key: 'TRIMESTRAL', label: 'Trimestrais (Planejamento Comercial & PDI)' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFreq(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeFreq === tab.key
                ? 'bg-[#FF5A00] text-white shadow-sm'
                : 'bg-[#F5F5F5] text-[#333333] hover:bg-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards dos Rituais da Frequência Selecionada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rituaisAtivos.map((ritual: any) => (
          <div
            key={ritual.id}
            className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FF5A00]/15 text-[#FF5A00]">
                  {ritual.frequencia} • {ritual.horario_padrao || 'Horário flexível'}
                </span>
                {ritual.regras_alerta && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-[#111111]">
                    Regra Backend: {ritual.regras_alerta}
                  </span>
                )}
              </div>

              <h3 className="text-base font-extrabold text-[#111111] mt-3">{ritual.nome}</h3>
              <p className="text-xs text-[#333333] leading-relaxed mt-1.5">
                {ritual.descricao}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRitual(ritual)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#111111] hover:bg-[#FF5A00] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Execução do Ritual</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Histórico de Execuções dos Rituais */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-card">
        <h3 className="text-base font-bold text-[#111111] flex items-center gap-2 mb-4">
          <CalendarCheck2 className="w-4 h-4 text-[#FF5A00]" />
          <span>Histórico de Execuções Registradas</span>
        </h3>

        {(data?.execucoes || []).length === 0 ? (
          <p className="text-xs text-zinc-500 p-4 rounded-xl bg-[#F5F5F5]">
            Nenhuma execução de ritual registrada até o momento. Clique em "Registrar Execução do
            Ritual" acima após concluir o rito comercial.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.execucoes.map((ex: any) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl bg-[#F5F5F5] border border-zinc-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <strong className="text-[#111111] text-sm">{ex.ritual_nome}</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {ex.status}
                    </span>
                  </div>
                  {ex.respostas_acompanhamento && (
                    <p className="text-[#333333]">
                      <strong>Acompanhamento:</strong> {ex.respostas_acompanhamento}
                    </p>
                  )}
                  {ex.observacoes && (
                    <p className="text-zinc-600">
                      <strong>Observações:</strong> {ex.observacoes}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 text-[11px] text-zinc-500">
                  <p className="font-semibold text-[#111111]">{ex.responsavel_nome}</p>
                  <p>{formatDateTimeBR(ex.data_execucao)}</p>
                  {(ex.pitch_score !== null || ex.forecast_score !== null) && (
                    <p className="text-[#FF5A00] font-bold mt-0.5">
                      {ex.pitch_score !== null ? `Pitch Score: ${ex.pitch_score}/10 ` : ''}
                      {ex.forecast_score !== null ? `• 7-Point: ${ex.forecast_score}/7` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Registrar Execução de Ritual */}
      {selectedRitual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Registrar Execução — {selectedRitual.nome}
                </h3>
                <p className="text-xs text-[#333333]">Frequência: {selectedRitual.frequencia}</p>
              </div>
              <button type="button" onClick={() => setSelectedRitual(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleRecordExecution} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Status da Execução</label>
                <select
                  value={execForm.status}
                  onChange={(e) => setExecForm({ ...execForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                >
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Respostas de Acompanhamento (3 Perguntas Stand-up / WBR / Forecast / PDI)
                </label>
                <textarea
                  rows={3}
                  required
                  value={execForm.respostas_acompanhamento}
                  onChange={(e) =>
                    setExecForm({ ...execForm, respostas_acompanhamento: e.target.value })
                  }
                  placeholder="1. O que avancei? 2. Próximos passos de hoje/semana? 3. Bloqueios ou decisões..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Pitch Scoring (0 a 10 — Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={execForm.pitch_score}
                    onChange={(e) => setExecForm({ ...execForm, pitch_score: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    7-Point Scorecard (0 a 7 — Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={execForm.forecast_score}
                    onChange={(e) => setExecForm({ ...execForm, forecast_score: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observações e Próximos Passos</label>
                <textarea
                  rows={2}
                  value={execForm.observacoes}
                  onChange={(e) => setExecForm({ ...execForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRitual(null)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Salvar Execução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

