import { test, expect } from '@playwright/test';

// Respostas controladas para validar a interface. API real coberta pelos testes
// de integração com PostgreSQL isolado (PGlite).
const gestor = { id: 'gestor', name: 'André Maciel', email: 'andre@example.test', role: 'GESTOR', cargo: 'Gestor Comercial', active: true };
const vendedor = { ...gestor, id: 'tiago', name: 'Tiago Hilário', role: 'VENDEDOR' };
const stages = [
  { id: 'etapa1', nome: 'Prospecção', ordem: 1, slug: 'prospeccao', cor: '#FF5A00', probabilidade_padrao: 20 },
  { id: 'etapa2', nome: 'Diagnóstico', ordem: 2, slug: 'diagnostico', cor: '#FF5A00', probabilidade_padrao: 40 },
];

test('Vendedor filtra por usuário e estágio e edita negócio compartilhado', async ({ page }) => {
  let deal = { id: 'negocio', nome: 'Campanha da Katia', owner_id: 'katia', owner_nome: 'Katia Gebran',
    cliente_id: 'cliente', cliente_nome: 'Cliente', cliente_empresa: 'Empresa', valor: 10000,
    etapa_id: 'etapa1', etapa_nome: 'Prospecção', status: 'EM_ANDAMENTO', probabilidade: 20, tempo_na_etapa_dias: 1 };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: any = {};
    if (path.endsWith('/auth/me')) body = { user: vendedor };
    if (path.endsWith('/pipeline/responsaveis')) body = { accounts: [{ id: 'katia', name: 'Katia Gebran' }] };
    if (path.endsWith('/pipeline')) body = { stages, columns: stages.map((s) => ({ ...s, quantidade: s.id === 'etapa1' ? 1 : 0,
      valor_total: 10000, valor_ponderado: 2000, negociacoes: s.id === 'etapa1' ? [deal] : [] })) };
    if (path.endsWith('/clientes')) body = { clientes: [] };
    if (path.endsWith('/negociacoes/negocio')) {
      if (route.request().method() === 'PUT') deal = { ...deal, ...route.request().postDataJSON() };
      body = { negociacao: deal };
    }
    await route.fulfill({ json: body });
  });
  await page.goto('/playbook');
  await expect(page.getByRole('link', { name: 'Assistente IA' })).toHaveCount(0);
  await page.getByLabel('Filtrar por usuário').selectOption('katia');
  const filtered = page.waitForRequest((r) => r.url().includes('/pipeline?') && r.url().includes('ownerId=katia') && r.url().includes('stageId=etapa1'));
  await page.getByLabel('Filtrar por estágio').selectOption('etapa1');
  await filtered;
  await page.getByRole('heading', { name: 'Campanha da Katia' }).click();
  await page.getByLabel('Nome da negociação', { exact: true }).fill('Campanha revisada pelo Tiago');
  await page.getByRole('button', { name: 'Salvar negociação' }).click();
  await expect(page.getByRole('heading', { name: 'Campanha revisada pelo Tiago' })).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath('playbook.png'), fullPage: true });
});

test('Gestor edita usuários e confirma remoção de acesso', async ({ page }) => {
  let member = { id: 'katia', nome: 'Katia Gebran', email: 'katia@example.test', role: 'VENDEDOR', cargo: 'Vendas', active: true };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: any = {};
    if (path.endsWith('/auth/me')) body = { user: gestor };
    if (path.endsWith('/equipe')) body = { integrantes: [member] };
    if (path.endsWith('/equipe/katia') && route.request().method() === 'PUT') {
      const edit = route.request().postDataJSON(); member = { ...member, ...edit, nome: edit.name }; body = { usuario: member };
    }
    if (path.endsWith('/equipe/katia/status')) { member.active = false; body = { usuario: member }; }
    await route.fulfill({ json: body });
  });
  await page.goto('/equipe');
  await expect(page.getByRole('button', { name: 'Cadastrar Usuário' })).toBeVisible();
  await page.getByTitle('Editar Integrante').click();
  await page.getByLabel('E-mail', { exact: true }).fill('novo@example.test');
  await page.getByRole('button', { name: 'Salvar Alterações' }).click();
  await page.getByTitle('Remover acesso').click();
  await expect(page.getByText(/histórico comercial será preservado/)).toBeVisible();
  await page.getByRole('dialog', { name: 'Remover acesso do usuário' }).getByRole('button', { name: 'Remover acesso', exact: true }).click();
  await expect(page.getByTitle('Reativar Conta')).toBeVisible();
});
