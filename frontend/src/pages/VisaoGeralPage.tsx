import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Target,
  Calendar,
  Filter,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  formatBRL,
  formatPct,
  getFullPortugueseDate,
  getPortugueseGreeting,
} from '../lib/utils';

export const VisaoGeralPage: React.FC = () => {
  const { user } = useAuth();
  const now = new Date();

  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [customRange, setCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sellerId, setSellerId] = useState('');

  const [sellers, setSellers] = useState<Array<{ id: string; name: string; cargo: string }>>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'GESTOR') {
      api
        .get<{ accounts: any[] }>('/auth/initial-accounts')
        .then((res) => setSellers(res.accounts || []))
        .catch(() => {});
    }
  }, [user]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('year', String(year));
      params.set('month', String(month));
      if (customRange && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      if (user?.role === 'GESTOR' && sellerId) {
        params.set('sellerId', sellerId);
      }
      const res = await api.get(`/dashboard/overview?${params.toString()}`);
      setData(res);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }, [year, month, customRange, startDate, endDate, sellerId, user]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const kpis = data?.kpis || {
    receita_no_mes: 0,
    negocios_em_andamento: 0,
    valor_pipeline_em_andamento: 0,
    taxa_conversao: 0,
    ganhos_no_periodo: 0,
    perdidos_no_periodo: 0,
    meta_vendas: 0,
    percentual_meta_atingido: 0,
    valor_restante_meta: 0,
    semaforo_meta: 'VERMELHO',
  };

  const semaforoBadge =
    kpis.semaforo_meta === 'VERDE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : kpis.semaforo_meta === 'AMARELO'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-red-100 text-red-800 border-red-200';

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Saudação Personalizada, Data em Português e Filtros */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF5A00] uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="capitalize">{getFullPortugueseDate()}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#111111]">
            {getPortugueseGreeting()}, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-sm text-[#333333] mt-0.5">
            Acompanhe os indicadores reais consolidados no banco de dados da Quest Comunicação Total.
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5 bg-[#F5F5F5] p-2.5 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#333333] px-2">
            <Filter className="w-3.5 h-3.5 text-[#FF5A00]" />
            <span>Filtros:</span>
          </div>

          {!customRange ? (
            <>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                aria-label="Selecionar Mês"
                className="px-3 py-1.5 text-xs font-medium bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
              >
                {[
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
                ].map((label, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                aria-label="Selecionar Ano"
                className="px-3 py-1.5 text-xs font-medium bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-zinc-300"
              />
              <span className="text-xs text-zinc-500">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-zinc-300"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setCustomRange((v) => !v)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              customRange
                ? 'bg-[#FF5A00] text-white border-[#FF5A00]'
                : 'bg-white text-[#333333] border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {customRange ? 'Usar Mês/Ano' : 'Intervalo Personalizado'}
          </button>

          {user?.role === 'GESTOR' && (
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              aria-label="Filtrar por Vendedor"
              className="px-3 py-1.5 text-xs font-medium bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-[#FF5A00]"
            >
              <option value="">Todos os Vendedores (Equipe)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.cargo})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4 Cards Principais de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Receita no Mês */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#333333]">
              1. Receita no Período
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : formatBRL(kpis.receita_no_mes)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-[#333333]">
            <span>{kpis.ganhos_no_periodo} negócio(s) ganho(s)</span>
            {data?.graficos?.variacao_receita_percentual !== undefined && (
              <span
                className={`inline-flex items-center font-semibold ${
                  data.graficos.variacao_receita_percentual >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {data.graficos.variacao_receita_percentual >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {formatPct(Math.abs(data.graficos.variacao_receita_percentual))}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Negócios em Andamento */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#333333]">
              2. Negócios em Andamento
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : kpis.negocios_em_andamento}
          </p>
          <p className="mt-2 text-xs text-[#333333]">
            Pipeline ativo: <strong>{formatBRL(kpis.valor_pipeline_em_andamento)}</strong>
          </p>
        </div>

        {/* KPI 3: Taxa de Conversão */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#333333]">
              3. Taxa de Conversão
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : formatPct(kpis.taxa_conversao)}
          </p>
          <p className="mt-2 text-xs text-[#333333]">
            {kpis.ganhos_no_periodo} ganhos / {kpis.perdidos_no_periodo} perdidos no período
          </p>
        </div>

        {/* KPI 4: Meta de Vendas e Percentual Atingido */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#333333]">
              4. Meta de Vendas
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className="text-2xl font-extrabold text-[#111111]">
              {loading ? '...' : formatBRL(kpis.meta_vendas)}
            </p>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${semaforoBadge}`}
            >
              {formatPct(kpis.percentual_meta_atingido)}
            </span>
          </div>
          <div className="mt-2 w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                kpis.semaforo_meta === 'VERDE'
                  ? 'bg-emerald-500'
                  : kpis.semaforo_meta === 'AMARELO'
                  ? 'bg-amber-500'
                  : 'bg-[#FF5A00]'
              }`}
              style={{ width: `${Math.min(100, kpis.percentual_meta_atingido)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gráficos Analíticos (Seção 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução Mensal da Receita vs Meta */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#111111]">
              Evolução Mensal da Receita vs. Meta ({year})
            </h3>
            <p className="text-xs text-[#333333]">
              Receita realizada de negócios ganhos comparada à meta mensal (BRL)
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.graficos?.evolucao_mensal_receita || []}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A00" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF5A00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="mes_nome" tick={{ fontSize: 12, fill: '#333333' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#333333' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita Realizada"
                  stroke="#FF5A00"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                />
                <Area
                  type="monotone"
                  dataKey="meta"
                  name="Meta Mensal"
                  stroke="#111111"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Negócios por Status */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#111111]">Negócios por Status Comercial</h3>
            <p className="text-xs text-[#333333]">
              Volume financeiro (BRL) e quantidade em Em Andamento, Ganho e Perdido
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.graficos?.negocios_por_status || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#333333' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#333333' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                <Legend />
                <Bar
                  dataKey="valor_total"
                  name="Valor Total (BRL)"
                  fill="#FF5A00"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Progresso de Metas no Período */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#111111]">Progresso de Metas do Período</h3>
            <p className="text-xs text-[#333333]">
              Acompanhamento de valor-alvo, realizado e saldo restante para a meta
            </p>
          </div>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#F5F5F5] min-w-0">
                <span className="text-xs text-[#333333] block">Meta Alvo</span>
                <p className="text-base font-bold text-[#111111] mt-1 break-words">
                  {formatBRL(kpis.meta_vendas)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FF5A00]/10 min-w-0">
                <span className="text-xs text-[#FF5A00] font-semibold block">Realizado</span>
                <p className="text-base font-bold text-[#111111] mt-1 break-words">
                  {formatBRL(kpis.receita_no_mes)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F5F5] min-w-0">
                <span className="text-xs text-[#333333] block">Falta Atingir</span>
                <p className="text-base font-bold text-[#111111] mt-1 break-words">
                  {formatBRL(kpis.valor_restante_meta)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span>Percentual Atingido</span>
                <span className="text-[#FF5A00] font-bold">
                  {formatPct(kpis.percentual_meta_atingido)}
                </span>
              </div>
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF5A00] transition-all duration-300"
                  style={{ width: `${Math.min(100, kpis.percentual_meta_atingido)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 4: Comparativo de Períodos */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#111111]">Comparativo de Períodos</h3>
            <p className="text-xs text-[#333333]">
              Período atual selecionado vs. período imediatamente anterior
            </p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.graficos?.comparativo_periodos || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: '#333333' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#333333' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                <Bar
                  dataKey="receita"
                  name="Receita (BRL)"
                  fill="#111111"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fórmulas Transparentes de Cálculo dos KPIs (Seção 6) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111111] mb-3">
          <Info className="w-4 h-4 text-[#FF5A00]" />
          <span>Memória de Cálculo dos Indicadores (Processados no Backend)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs text-[#333333]">
          <div className="p-3 rounded-xl bg-[#F5F5F5]">
            <strong className="text-[#111111] block mb-0.5">Receita no Mês:</strong>
            {data?.formulas_kpis?.receita_no_mes}
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F5]">
            <strong className="text-[#111111] block mb-0.5">Negócios em Andamento:</strong>
            {data?.formulas_kpis?.negocios_em_andamento}
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F5]">
            <strong className="text-[#111111] block mb-0.5">Taxa de Conversão:</strong>
            {data?.formulas_kpis?.taxa_conversao}
          </div>
          <div className="p-3 rounded-xl bg-[#F5F5F5]">
            <strong className="text-[#111111] block mb-0.5">Meta Atingida:</strong>
            {data?.formulas_kpis?.meta_atingida}
          </div>
        </div>
      </div>
    </div>
  );
};

