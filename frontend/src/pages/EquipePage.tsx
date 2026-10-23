import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  DollarSign,
  Target,
  Award,
  Power,
  Edit3,
  X,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../services/api';
import { formatBRL, formatPct, getInitials } from '../lib/utils';

export const EquipePage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [createModal, setCreateModal] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    name: string;
    email: string;
    token: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    cargo: 'Vendas Inbound / Consultoria',
    role: 'VENDEDOR',
    meta_mensal_opcional: '',
  });

  const loadEquipe = useCallback(async () => {
    try {
      const res = await api.get('/equipe');
      setData(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadEquipe();
  }, [loadEquipe]);

  const openDetail = async (id: string) => {
    const res = await api.get(`/equipe/${id}`);
    setSelectedDetail(res);
  };

  const handleCreateVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/equipe', {
      name: form.name,
      email: form.email,
      cargo: form.cargo,
      role: form.role,
      meta_mensal_opcional: form.meta_mensal_opcional
        ? Number(form.meta_mensal_opcional)
        : undefined,
    });
    setCreateModal(false);
    if (res.convite?.invite_token) {
      setInviteInfo({
        name: form.name,
        email: form.email,
        token: res.convite.invite_token,
      });
    }
    setForm({
      name: '',
      email: '',
      cargo: 'Vendas Inbound / Consultoria',
      role: 'VENDEDOR',
      meta_mensal_opcional: '',
    });
    await loadEquipe();
  };

  const handleUpdateVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    await api.put(`/equipe/${editMember.id}`, {
      name: editMember.nome,
      email: editMember.email,
      cargo: editMember.cargo,
      role: editMember.role,
    });
    setEditMember(null);
    await loadEquipe();
  };

  const handleToggleStatus = async (member: any, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.patch(`/equipe/${member.id}/status`, {
      active: !member.active,
    });
    await loadEquipe();
  };

  const resumo = data?.resumo || {
    quantidade_vendedores: 0,
    receita_total_equipe: 0,
    meta_total_equipe: 0,
    percentual_atingido: 0,
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Botão Cadastrar Vendedor */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#FF5A00]/15 text-[#FF5A00]">
            Acesso Exclusivo Gestor
          </span>
          <h2 className="text-xl font-extrabold text-[#111111] mt-1">
            Gestão da Equipe Comercial Quest
          </h2>
          <p className="text-xs text-[#333333]">
            Gerencie vendedores, metas, ativação segura de contas e desempenho individual.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Vendedor</span>
        </button>
      </div>

      {/* Notificação de Convite Seguro para Criação de Senha */}
      {inviteInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Integrante {inviteInfo.name} ({inviteInfo.email}) cadastrado com convite seguro!
              </span>
            </div>
            <p className="text-xs text-emerald-700">
              Token único de criação de senha (válido por 72h):{' '}
              <code className="px-2 py-0.5 rounded bg-white font-mono text-[#111111] border border-emerald-300">
                {inviteInfo.token}
              </code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInviteInfo(null)}
            className="text-xs font-bold text-emerald-800 hover:underline"
          >
            Fechar aviso
          </button>
        </div>
      )}

      {/* 4 Indicadores Globais da Equipe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">
              Vendedores Ativos
            </span>
            <Users className="w-5 h-5 text-[#FF5A00]" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {resumo.quantidade_vendedores}
          </p>
          <p className="mt-1 text-xs text-[#333333]">
            {resumo.total_integrantes || 0} integrantes totais
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">
              Receita Total da Equipe
            </span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {formatBRL(resumo.receita_total_equipe)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">Soma de contratos ganhos</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">Meta Total</span>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#111111]">
            {formatBRL(resumo.meta_total_equipe)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">Meta acumulada no ano</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#333333]">
              Percentual Atingido
            </span>
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#FF5A00]">
            {formatPct(resumo.percentual_atingido)}
          </p>
          <p className="mt-1 text-xs text-[#333333]">Atingimento coletivo da equipe</p>
        </div>
      </div>

      {/* Cards Individuais com Gráfico de Tendência */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(data?.integrantes || []).map((member: any) => (
          <div
            key={member.id}
            onClick={() => openDetail(member.id)}
            className={`bg-white rounded-2xl border p-5 shadow-card hover:shadow-card-hover transition-all cursor-pointer flex flex-col justify-between min-w-0 ${
              member.active ? 'border-zinc-200' : 'border-red-200 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#111111] text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {getInitials(member.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#111111] break-words leading-snug">
                      {member.nome}
                    </h4>
                    <p className="text-xs text-[#333333] break-words leading-snug mt-0.5">
                      {member.cargo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditMember(member);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-[#111111] hover:bg-zinc-100"
                    title="Editar Integrante"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleToggleStatus(member, e)}
                    className={`p-1.5 rounded-lg ${
                      member.active
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={member.active ? 'Desativar Conta' : 'Reativar Conta'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                  <span className="text-zinc-500 block">Receita Realizada</span>
                  <strong className="text-[#111111]">
                    {formatBRL(member.receita_realizada)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                  <span className="text-zinc-500 block">Meta</span>
                  <strong className="text-[#111111]">{formatBRL(member.meta)}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                  <span className="text-zinc-500 block">Conversão</span>
                  <strong className="text-[#FF5A00]">
                    {formatPct(member.taxa_conversao)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F5F5F5]">
                  <span className="text-zinc-500 block">Negócios</span>
                  <strong className="text-[#111111]">{member.quantidade_negocios}</strong>
                </div>
              </div>
            </div>

            {/* Mini Gráfico de Tendência (6 meses) */}
            <div className="mt-4 pt-3 border-t border-zinc-100">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                <span>Tendência (6 meses)</span>
                <span
                  className={`font-semibold ${
                    member.activated ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {member.activated ? 'Senha Ativa' : 'Aguardando Ativação'}
                </span>
              </div>
              <div className="h-14">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={member.grafico_tendencia || []}>
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#FF5A00"
                      fill="#FF5A00"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Painel Detalhado Individual do Vendedor */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-3xl w-full p-6 shadow-xl my-8 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#111111]">
                  Desempenho Individual — {selectedDetail.vendedor?.name}
                </h3>
                <p className="text-xs text-[#333333]">
                  {selectedDetail.vendedor?.cargo} • {selectedDetail.vendedor?.email}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedDetail(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase text-[#333333] mb-2">
                  Negociações Sob Responsabilidade ({selectedDetail.negociacoes?.length || 0})
                </h4>
                {selectedDetail.negociacoes?.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-4 rounded-xl bg-[#F5F5F5]">
                    Nenhuma negociação vinculada a este vendedor no momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDetail.negociacoes.map((n: any) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-[#F5F5F5] flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-[#111111]">{n.nome}</strong>
                          <span className="text-zinc-500 ml-2">
                            ({n.cliente_empresa} • Etapa: {n.etapa_nome})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#111111]">{formatBRL(n.valor)}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white">
                            {n.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-[#333333] mb-2">
                  Metas Atribuídas ({selectedDetail.metas?.length || 0})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(selectedDetail.metas || []).map((m: any) => (
                    <div key={m.id} className="p-3 rounded-xl border border-zinc-200 text-xs">
                      <div className="flex justify-between font-bold">
                        <span>
                          {m.tipo} ({m.periodo})
                        </span>
                        <span className="text-[#FF5A00]">
                          {formatPct(m.percentual_atingido)}
                        </span>
                      </div>
                      <p className="mt-1 text-[#333333]">
                        Realizado: {formatBRL(m.valor_realizado)} / Alvo:{' '}
                        {formatBRL(m.valor_alvo)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Vendedor com Convite Seguro */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#FF5A00]" />
                <h3 className="text-base font-bold text-[#111111]">
                  Cadastrar Integrante Comercial
                </h3>
              </div>
              <button type="button" onClick={() => setCreateModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleCreateVendedor} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Cargo Comercial *</label>
                  <input
                    type="text"
                    required
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Perfil RBAC</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="GESTOR">Gestor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Meta Mensal Inicial Opcional (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.meta_mensal_opcional}
                  onChange={(e) =>
                    setForm({ ...form, meta_mensal_opcional: e.target.value })
                  }
                  placeholder="Deixe em branco para definir depois"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Cadastrar e Gerar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Integrante */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-base font-bold text-[#111111]">Editar Integrante</h3>
              <button type="button" onClick={() => setEditMember(null)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateVendedor} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={editMember.nome}
                  onChange={(e) => setEditMember({ ...editMember, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Cargo</label>
                <input
                  type="text"
                  required
                  value={editMember.cargo}
                  onChange={(e) => setEditMember({ ...editMember, cargo: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

