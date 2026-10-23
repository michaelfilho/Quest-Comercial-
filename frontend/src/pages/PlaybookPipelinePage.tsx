import React, { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  Plus,
  Building2,
  User as UserIcon,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  History,
  Trash2,
  X,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { formatBRL, formatDateBR, formatDateTimeBR } from '../lib/utils';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Cliente, Negociacao, PipelineColumn, Stage } from '../types';

const DroppableStageColumn: React.FC<{
  column: PipelineColumn;
  onSelectDeal: (dealId: string) => void;
}> = ({ column, onSelectDeal }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-colors min-h-[420px] w-full min-w-0 ${
        isOver
          ? 'bg-[#FF5A00]/5 border-[#FF5A00]'
          : 'bg-[#F5F5F5]/80 border-zinc-200/90'
      }`}
    >
      {/* Cabeçalho da Etapa */}
      <div className="p-3.5 bg-white rounded-t-2xl border-b border-zinc-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: column.cor || '#FF5A00' }}
            />
            <h3 className="text-xs sm:text-sm font-bold text-[#111111] break-words">
              {column.ordem}. {column.nome}
            </h3>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-[#111111] shrink-0">
            {column.quantidade}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#333333]">
          <span>
            Total: <strong>{formatBRL(column.valor_total)}</strong>
          </span>
          <span>Pond.: {formatBRL(column.valor_ponderado)}</span>
        </div>
      </div>

      {/* Lista de Cards da Etapa */}
      <div className="p-2.5 space-y-2.5 flex-1">
        {column.negociacoes.length === 0 ? (
          <div className="h-40 rounded-xl border border-dashed border-zinc-300 flex flex-col items-center justify-center p-3 text-center">
            <p className="text-xs font-medium text-zinc-500">
              Nenhuma negociação em {column.nome}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Arraste um card para cá ou crie uma oportunidade
            </p>
          </div>
        ) : (
          column.negociacoes.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              onClick={() => onSelectDeal(deal.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const DraggableDealCard: React.FC<{
  deal: Negociacao;
  onClick: () => void;
}> = ({ deal, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const statusBadge =
    deal.status === 'GANHO'
      ? 'bg-emerald-100 text-emerald-800'
      : deal.status === 'PERDIDO'
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800';

  const statusLabel =
    deal.status === 'GANHO'
      ? 'Ganho'
      : deal.status === 'PERDIDO'
      ? 'Perdido'
      : 'Em andamento';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white rounded-xl border border-zinc-200 p-3.5 shadow-card hover:shadow-card-hover hover:border-[#FF5A00]/60 transition-all cursor-grab active:cursor-grabbing min-w-0 ${
        isDragging ? 'opacity-60 ring-2 ring-[#FF5A00] z-30' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-snug break-words flex-1 min-w-0">
          {deal.nome}
        </h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 flex items-start gap-1.5 text-xs text-[#333333]">
        <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <span className="break-words font-medium">{deal.cliente_empresa}</span>
      </div>

      <div className="mt-1 flex items-start gap-1.5 text-xs text-[#333333]">
        <UserIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <span className="break-words">{deal.owner_nome}</span>
      </div>

      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-xs sm:text-sm font-extrabold text-[#111111]">
          {formatBRL(deal.valor)}
        </span>
        <span className="text-[11px] font-bold text-[#FF5A00] bg-[#FF5A00]/10 px-2 py-0.5 rounded-md">
          {deal.probabilidade}% prob.
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3 shrink-0" />
          Prev.: {formatDateBR(deal.expected_close_date)}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-medium ${
            deal.parado_mais_15_dias ? 'text-red-600 font-bold' : 'text-zinc-500'
          }`}
        >
          <Clock className="w-3 h-3 shrink-0" />
          {deal.tempo_na_etapa_dias}d na etapa
        </span>
      </div>
    </div>
  );
};

export const PlaybookPipelinePage: React.FC = () => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const [newClienteModal, setNewClienteModal] = useState(false);
  const [newDealModal, setNewDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Negociacao | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Forms
  const [clienteForm, setClienteForm] = useState({
    nome: '',
    empresa: '',
    segmento: '',
    email: '',
    telefone: '',
    origem: 'INBOUND',
  });

  const [dealForm, setDealForm] = useState({
    nome: '',
    cliente_id: '',
    etapa_id: '',
    valor: '',
    probabilidade: '25',
    expected_close_date: '',
    forecast_score: '5',
    produto: 'INBOUND_CONSULTORIA',
  });

  const [atividadeForm, setAtividadeForm] = useState({
    tipo: 'REUNIAO',
    titulo: '',
    descricao: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const loadData = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter) q.set('status', statusFilter);
      if (ownerFilter) q.set('ownerId', ownerFilter);

      const [pipeRes, cliRes] = await Promise.all([
        api.get(`/pipeline?${q.toString()}`),
        api.get<{ clientes: Cliente[] }>('/clientes'),
      ]);

      setColumns(pipeRes.columns || []);
      setStages(pipeRes.stages || []);
      setClientes(cliRes.clientes || []);

      if (pipeRes.stages?.length > 0 && !dealForm.etapa_id) {
        setDealForm((prev) => ({ ...prev, etapa_id: pipeRes.stages[0].id }));
      }
    } catch {
      // ignore
    }
  }, [search, statusFilter, ownerFilter, dealForm.etapa_id]);

  useEffect(() => {
    loadData();
    if (user?.role === 'GESTOR') {
      api
        .get<{ accounts: any[] }>('/auth/initial-accounts')
        .then((r) => setSellers(r.accounts || []))
        .catch(() => {});
    }
  }, [loadData, user]);

  const openDealModal = async (dealId: string) => {
    try {
      const res = await api.get<{ negociacao: Negociacao }>(`/negociacoes/${dealId}`);
      setSelectedDeal(res.negociacao);
    } catch {
      // ignore
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const draggedDeal = active.data.current?.deal as Negociacao | undefined;
    if (!draggedDeal || draggedDeal.etapa_id === targetStageId) return;

    try {
      await api.patch(`/negociacoes/${dealId}/stage`, {
        etapa_id: targetStageId,
      });
      await loadData();
      if (selectedDeal?.id === dealId) {
        await openDealModal(dealId);
      }
    } catch {
      // ignore
    }
  };

  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post<{ cliente: Cliente }>('/clientes', clienteForm);
    setClienteForm({
      nome: '',
      empresa: '',
      segmento: '',
      email: '',
      telefone: '',
      origem: 'INBOUND',
    });
    setNewClienteModal(false);
    await loadData();
    setDealForm((prev) => ({ ...prev, cliente_id: res.cliente.id }));
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/negociacoes', {
      nome: dealForm.nome,
      cliente_id: dealForm.cliente_id,
      etapa_id: dealForm.etapa_id || stages[0]?.id,
      valor: Number(dealForm.valor),
      probabilidade: Number(dealForm.probabilidade),
      expected_close_date: dealForm.expected_close_date || null,
      forecast_score: Number(dealForm.forecast_score),
      produto: dealForm.produto,
    });
    setDealForm({
      nome: '',
      cliente_id: '',
      etapa_id: stages[0]?.id || '',
      valor: '',
      probabilidade: '25',
      expected_close_date: '',
      forecast_score: '5',
      produto: 'INBOUND_CONSULTORIA',
    });
    setNewDealModal(false);
    await loadData();
  };

  const handleMoveStageFromModal = async (targetStageId: string) => {
    if (!selectedDeal) return;
    const res = await api.patch<{ negociacao: Negociacao }>(
      `/negociacoes/${selectedDeal.id}/stage`,
      { etapa_id: targetStageId }
    );
    setSelectedDeal(res.negociacao);
    await loadData();
  };

  const handleStatusChange = async (status: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO') => {
    if (!selectedDeal) return;
    const res = await api.patch<{ negociacao: Negociacao }>(
      `/negociacoes/${selectedDeal.id}/status`,
      { status }
    );
    setSelectedDeal(res.negociacao);
    await loadData();
  };

  const handleAddAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal) return;
    const res = await api.post<{ negociacao: Negociacao }>(
      `/negociacoes/${selectedDeal.id}/atividades`,
      atividadeForm
    );
    setSelectedDeal(res.negociacao);
    setAtividadeForm({ tipo: 'REUNIAO', titulo: '', descricao: '' });
    await loadData();
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeal) return;
    await api.delete(`/negociacoes/${selectedDeal.id}`, { confirm: true });
    setConfirmDeleteOpen(false);
    setSelectedDeal(null);
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações e Filtros do Pipeline */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar negociação ou empresa..."
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:border-[#FF5A00] w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white rounded-xl border border-zinc-300"
          >
            <option value="">Todos os Status</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="GANHO">Ganho</option>
            <option value="PERDIDO">Perdido</option>
          </select>

          {user?.role === 'GESTOR' && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white rounded-xl border border-zinc-300"
            >
              <option value="">Todos os Responsáveis</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setNewClienteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#111111] bg-[#F5F5F5] hover:bg-zinc-200 transition-colors"
          >
            <Building2 className="w-4 h-4 text-[#FF5A00]" />
            <span>Novo Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => setNewDealModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Negócio</span>
          </button>
        </div>
      </div>

      {/* Quadro Kanban de 5 Etapas Fixas (Grade Responsiva Automática — Nada Fica Oculto) */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 w-full items-start">
          {columns.map((column) => (
            <DroppableStageColumn
              key={column.id}
              column={column}
              onSelectDeal={(id) => openDealModal(id)}
            />
          ))}
        </div>
      </DndContext>

      {/* Modal: Novo Cliente */}
      {newClienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-base font-bold text-[#111111]">Cadastrar Cliente / Lead</h3>
              <button
                type="button"
                onClick={() => setNewClienteModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCliente} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Empresa *</label>
                  <input
                    type="text"
                    required
                    value={clienteForm.empresa}
                    onChange={(e) => setClienteForm({ ...clienteForm, empresa: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="Razão Social / Nome Fantasia"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contato Principal *</label>
                  <input
                    type="text"
                    required
                    value={clienteForm.nome}
                    onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="Nome do decisor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Segmento</label>
                  <input
                    type="text"
                    value={clienteForm.segmento}
                    onChange={(e) => setClienteForm({ ...clienteForm, segmento: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="Ex: Indústria, Varejo, Tecnologia"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Origem</label>
                  <select
                    value={clienteForm.origem}
                    onChange={(e) => setClienteForm({ ...clienteForm, origem: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                  >
                    <option value="INBOUND">Inbound</option>
                    <option value="RADAR_QUEST">Radar Quest</option>
                    <option value="OUTBOUND">Outbound</option>
                    <option value="INDICACAO">Indicação</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={clienteForm.email}
                    onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="contato@empresa.com.br"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={clienteForm.telefone}
                    onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setNewClienteModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criar Negociação */}
      {newDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-base font-bold text-[#111111]">Criar Nova Negociação</h3>
              <button
                type="button"
                onClick={() => setNewDealModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {clientes.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-[#FF5A00] mx-auto" />
                <p className="text-sm font-medium text-[#111111]">
                  Cadastre primeiro um cliente antes de abrir uma oportunidade comercial.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewDealModal(false);
                    setNewClienteModal(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] rounded-xl"
                >
                  Cadastrar Cliente Agora
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateDeal} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1">Nome da Negociação *</label>
                  <input
                    type="text"
                    required
                    value={dealForm.nome}
                    onChange={(e) => setDealForm({ ...dealForm, nome: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    placeholder="Ex: Consultoria Comercial + Inbound 2026"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Cliente / Empresa *</label>
                    <select
                      required
                      value={dealForm.cliente_id}
                      onChange={(e) => setDealForm({ ...dealForm, cliente_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    >
                      <option value="">Selecione...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.empresa} ({c.nome})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Etapa Inicial *</label>
                    <select
                      required
                      value={dealForm.etapa_id}
                      onChange={(e) => setDealForm({ ...dealForm, etapa_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.ordem}. {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={dealForm.valor}
                      onChange={(e) => setDealForm({ ...dealForm, valor: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Probabilidade (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={dealForm.probabilidade}
                      onChange={(e) => setDealForm({ ...dealForm, probabilidade: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">7-Point Score (0-7)</label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={dealForm.forecast_score}
                      onChange={(e) => setDealForm({ ...dealForm, forecast_score: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Previsão de Fechamento
                    </label>
                    <input
                      type="date"
                      value={dealForm.expected_close_date}
                      onChange={(e) =>
                        setDealForm({ ...dealForm, expected_close_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Linha de Produto</label>
                    <select
                      value={dealForm.produto}
                      onChange={(e) => setDealForm({ ...dealForm, produto: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300"
                    >
                      <option value="INBOUND_CONSULTORIA">Inbound + Consultoria</option>
                      <option value="ADVERTISING">Advertising</option>
                      <option value="UPSELLING">Ad / Upselling</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setNewDealModal(false)}
                    className="px-4 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#FF5A00] hover:bg-[#E04F00] rounded-xl"
                  >
                    Criar Oportunidade
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalhado da Negociação (Seção 7) */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 max-w-4xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FF5A00]/15 text-[#FF5A00]">
                    {selectedDeal.etapa_nome}
                  </span>
                  <span className="text-xs text-zinc-500">
                    • {selectedDeal.tempo_na_etapa_dias} dia(s) nesta etapa
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[#111111] mt-1">
                  {selectedDeal.nome}
                </h3>
                <p className="text-xs text-[#333333]">
                  Empresa: <strong>{selectedDeal.cliente_empresa}</strong> ({selectedDeal.cliente_nome}) • Responsável: <strong>{selectedDeal.owner_nome}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('GANHO')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedDeal.status === 'GANHO'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ganho
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('PERDIDO')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedDeal.status === 'PERDIDO'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Perdido
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                  title="Excluir Negociação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Resumo Financeiro e Seletor de Etapa */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-[#F5F5F5]">
                <span className="text-xs text-[#333333]">Valor da Oportunidade</span>
                <p className="text-lg font-extrabold text-[#111111]">
                  {formatBRL(selectedDeal.valor)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F5F5]">
                <span className="text-xs text-[#333333]">Probabilidade</span>
                <p className="text-lg font-extrabold text-[#FF5A00]">
                  {selectedDeal.probabilidade}%
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F5F5]">
                <span className="text-xs text-[#333333]">Previsão Fechamento</span>
                <p className="text-sm font-bold text-[#111111] mt-1">
                  {formatDateBR(selectedDeal.expected_close_date)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F5F5]">
                <span className="text-xs text-[#333333]">7-Point Forecast Score</span>
                <p className="text-sm font-bold text-[#111111] mt-1">
                  {selectedDeal.forecast_score ?? 'Não avaliado'} / 7{' '}
                  {selectedDeal.forecast_score !== null &&
                    selectedDeal.forecast_score !== undefined &&
                    selectedDeal.forecast_score >= 6 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Elegível
                      </span>
                    )}
                </p>
              </div>
            </div>

            {/* Movimentação Rápida entre as 5 Etapas */}
            <div className="mb-6">
              <span className="block text-xs font-bold uppercase text-[#333333] mb-2">
                Mover Etapa do Pipeline (Histórico Preservado)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {stages.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleMoveStageFromModal(st.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedDeal.etapa_id === st.id
                        ? 'bg-[#FF5A00] text-white border-[#FF5A00]'
                        : 'bg-white text-[#333333] border-zinc-200 hover:border-[#FF5A00]'
                    }`}
                  >
                    {st.ordem}. {st.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Registrar e Listar Atividades */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-[#FF5A00]" />
                  <span>Registrar Atividade Comercial</span>
                </h4>

                <form
                  onSubmit={handleAddAtividade}
                  className="p-4 rounded-xl bg-[#F5F5F5] space-y-3"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={atividadeForm.tipo}
                      onChange={(e) =>
                        setAtividadeForm({ ...atividadeForm, tipo: e.target.value })
                      }
                      className="px-2.5 py-2 text-xs font-medium bg-white rounded-lg border border-zinc-300"
                    >
                      <option value="REUNIAO">Reunião</option>
                      <option value="LIGACAO">Ligação</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="DIAGNOSTICO">Diagnóstico</option>
                      <option value="PROPOSTA">Proposta</option>
                      <option value="NOTA">Nota</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={atividadeForm.titulo}
                      onChange={(e) =>
                        setAtividadeForm({ ...atividadeForm, titulo: e.target.value })
                      }
                      placeholder="Resumo da atividade..."
                      className="col-span-2 px-3 py-2 text-xs bg-white rounded-lg border border-zinc-300"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={atividadeForm.descricao}
                    onChange={(e) =>
                      setAtividadeForm({ ...atividadeForm, descricao: e.target.value })
                    }
                    placeholder="Observações e próximos passos acordados..."
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-zinc-300"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-semibold text-white bg-[#111111] hover:bg-[#333333] rounded-lg"
                  >
                    Salvar Atividade
                  </button>
                </form>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(selectedDeal.atividades || []).map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl border border-zinc-200 bg-white text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#111111]">
                        <span>
                          [{act.tipo}] {act.titulo}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {formatDateTimeBR(act.realizada_em)}
                        </span>
                      </div>
                      {act.descricao && (
                        <p className="text-[#333333] mt-1">{act.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna Direita: Histórico Auditável de Movimentações */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#FF5A00]" />
                  <span>Histórico de Movimentações ({selectedDeal.historico?.length || 0})</span>
                </h4>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {(selectedDeal.historico || []).map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl bg-[#F5F5F5] border border-zinc-200/80 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#111111]">{h.acao}</span>
                        <span className="text-[11px] text-zinc-500">
                          {formatDateTimeBR(h.created_at)}
                        </span>
                      </div>
                      <p className="text-[#333333] mt-1">{h.detalhes}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Por: {h.usuario_nome}
                        {h.etapa_anterior_nome && h.etapa_nova_nome
                          ? ` • ${h.etapa_anterior_nome} → ${h.etapa_nova_nome}`
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Excluir Negociação Comercial"
        description={`Tem certeza que deseja excluir permanentemente a negociação "${selectedDeal?.nome}"? Esta ação será registrada no log de auditoria.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};

