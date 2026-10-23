import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  TrendingUp,
  Clock,
  DollarSign,
  Filter,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { formatBRL, formatPct } from '../lib/utils';

export const ResultadosPage: React.FC = () => {
  const { user } = useAuth();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [sellerId, setSellerId] = useState<string>('');
  const [sellers, setSellers] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('year', String(year));
      if (user?.role === 'GESTOR' && sellerId) {
        q.set('sellerId', sellerId);
      }
      const res = await api.get(`/resultados/analytics?${q.toString()}`);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [year, sellerId, user]);

  useEffect(() => {
    loadAnalytics();
    if (user?.role === 'GESTOR') {
      api
        .get<{ accounts: any[] }>('/auth/initial-accounts')
        .then((r) => setSellers(r.accounts || []))
        .catch(() => {});
    }
  }, [loadAnalytics, user]);

  const ind = data?.indicadores || {
    total_negociacoes: 0,
    total_ganhos: 0,
    total_perdidos: 0,
    total_em_andamento: 0,
    receita_total_ganha: 0,
    valor_total_perdido: 0,
    ticket_medio: 0,
    taxa_conversao: 0,
    ciclo_medio_vendas_dias: 0,
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#111111]">
            Dashboards Analíticos de Resultados
          </h2>
          <p className="text-xs text-[#333333] mt-0.5">
            Análise de conversão, ciclo médio de fechamento, funil por etapa e ranking comercial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#333333]">
            <Filter className="w-3.5 h-3.5 text-[#FF5A00]" />
            <span>Período:</span>
          </div>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-xs font-medium bg-white rounded-xl border border-zinc-300"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Ano {y}
              </option>
            ))}
          </select>

          {user?.role === 'GESTOR' && (
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white rounded-xl border border-zinc-300"
            >
              <option value="">Equipe Completa</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.cargo})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPIs de Performance de Vendas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">Receita Acumulada</span>
            <DollarSign className="w-5 h-5 text-[#FF5A00]" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : formatBRL(ind.receita_total_ganha)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">{ind.total_ganhos} negócios ganhos</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">Ticket Médio</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : formatBRL(ind.ticket_medio)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">Valor médio por contrato ganho</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">Taxa de Conversão</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : formatPct(ind.taxa_conversao)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">
            {ind.total_ganhos} ganhos vs. {ind.total_perdidos} perdidos
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">
              Ciclo Médio de Vendas
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {loading ? '...' : `${ind.ciclo_medio_vendas_dias} dias`}
          </p>
          <p className="mt-1 text-xs text-[#333333]">Tempo médio da abertura ao fechamento</p>
        </div>
      </div>

      {/* Estado Vazio Adequado Quando Não Houver Dados (Seção 9) */}
      {!loading && !data?.possui_dados && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <BarChart3 className="w-10 h-10 text-[#FF5A00] mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#111111]">
            Ainda não há negociações registradas para compor o histórico analítico deste filtro
          </h3>
          <p className="text-xs text-[#333333] mt-1">
            Conforme a diretriz de produção da Quest, nenhum número fictício é exibido. Cadastre
            oportunidades no módulo Playbook para visualizar a evolução em tempo real.
          </p>
        </div>
      )}

      {/* Gráficos: Receita por Mês (Ganhos vs Perdidos) e Funil por Etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card">
          <h3 className="text-base font-bold text-[#111111]">
            Receita por Mês — Ganhos vs. Perdidos ({year})
          </h3>
          <p className="text-xs text-[#333333] mb-4">
            Comparativo mensal de volume financeiro ganho e perdido (BRL)
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.receita_por_mes || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="mes_nome" tick={{ fontSize: 12, fill: '#333333' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#333333' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                <Legend />
                <Bar
                  dataKey="receita_ganha"
                  name="Receita Ganha"
                  fill="#FF5A00"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="valor_perdido"
                  name="Valor Perdido"
                  fill="#111111"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card">
          <h3 className="text-base font-bold text-[#111111]">Funil Comercial por Etapa</h3>
          <p className="text-xs text-[#333333] mb-4">
            Distribuição de oportunidades nas 5 etapas oficiais do Playbook Quest
          </p>
          <div className="space-y-3">
            {(data?.funil_por_etapa || []).map((et: any) => (
              <div
                key={et.etapa_id}
                className="p-3.5 rounded-xl bg-[#F5F5F5] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: et.cor || '#FF5A00' }}
                  />
                  <span className="text-xs font-bold text-[#111111]">
                    {et.ordem}. {et.etapa_nome}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[#333333]">
                    <strong>{et.quantidade}</strong> negócio(s)
                  </span>
                  <span className="font-extrabold text-[#111111]">
                    {formatBRL(et.valor_total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela: Ranking de Desempenho Comercial */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card overflow-x-auto">
        <h3 className="text-base font-bold text-[#111111] mb-1">Ranking de Desempenho</h3>
        <p className="text-xs text-[#333333] mb-4">
          Classificação por receita realizada, negócios ganhos, ticket médio e taxa de conversão
        </p>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-[#333333] uppercase">
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3">Integrante</th>
              <th className="py-3 px-3">Cargo</th>
              <th className="py-3 px-3 text-right">Negócios</th>
              <th className="py-3 px-3 text-right">Ganhos</th>
              <th className="py-3 px-3 text-right">Conversão</th>
              <th className="py-3 px-3 text-right">Ticket Médio</th>
              <th className="py-3 px-3 text-right">Receita Realizada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(data?.ranking_vendedores || []).map((row: any) => (
              <tr key={row.vendedor_id} className="hover:bg-[#F5F5F5]/60">
                <td className="py-3 px-3 font-extrabold text-[#FF5A00]">{row.posicao}º</td>
                <td className="py-3 px-3 font-bold text-[#111111]">{row.nome}</td>
                <td className="py-3 px-3 text-[#333333]">{row.cargo}</td>
                <td className="py-3 px-3 text-right">{row.total_negocios}</td>
                <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                  {row.ganhos}
                </td>
                <td className="py-3 px-3 text-right font-semibold">
                  {formatPct(row.taxa_conversao)}
                </td>
                <td className="py-3 px-3 text-right">{formatBRL(row.ticket_medio)}</td>
                <td className="py-3 px-3 text-right font-extrabold text-[#111111]">
                  {formatBRL(row.receita_realizada)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

