import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BadgeCheck, BookOpen, Check, CircleAlert, Coins, Copy, Edit3, GitBranch, Handshake, Layers, Lightbulb, Mail, Megaphone, MessageSquare, PhoneCall, ShieldCheck, Sparkles, Target, Users, X, type LucideIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import * as content from './inbound-content';
import './inbound-reference.css';

function Rich({ text }: { text: string }) {
  return <>{text.split('\n\n').map((paragraph, p) => <span className="ib-rich-paragraph" key={p}>{paragraph.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => part.startsWith('**')
    ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith('*')
      ? <em key={i}>{part.slice(1, -1)}</em> : <React.Fragment key={i}>{part}</React.Fragment>)}</span>)}</>;
}

function copyableText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (!(node instanceof HTMLElement) || node.tagName === 'BUTTON' || node.classList.contains('ib-objection-pending')) return '';
  const separator = node.tagName === 'TR' ? '\t' : '';
  const text = Array.from(node.childNodes).map(copyableText).join(separator);
  if (node.classList.contains('ib-rich-paragraph')) return `${text}\n\n`;
  return /^(DIV|SECTION|ARTICLE|P|H[1-6]|LI|TR|SUMMARY|BLOCKQUOTE)$/.test(node.tagName) ? `${text}\n` : text;
}

type EditingText = { key: string; title: string; text: string };
const ReferenceContext = createContext<{
  overrides: Record<string, string>; user: boolean; loaded: boolean;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setEditing: React.Dispatch<React.SetStateAction<EditingText | null>>;
  copied: string; copy: (id: string) => Promise<void>;
} | null>(null);
function useReference() {
  const context = useContext(ReferenceContext);
  if (!context) throw new Error('Referência Inbound indisponível.');
  return context;
}

const T = ({ name, text, title }: { name: string; text: string; title?: string }) => {
  const { overrides, user, loaded, setError, setEditing } = useReference();
  return (
  <div className="ib-field">
    <div className="ib-rich"><Rich text={overrides[name] ?? text} /></div>
    {user && loaded && <button className="ib-edit" type="button" aria-label={`Editar ${title || name}`}
      title="Editar texto compartilhado" onClick={() => { setError(''); setEditing({ key: name, title: title || name, text: overrides[name] ?? text }); }}><Edit3 size={13} /></button>}
  </div>
);
};
const CopyButton = ({ target, label = 'Copiar Seção' }: { target: string; label?: string }) => {
  const { copied, copy } = useReference();
  return (
  <button type="button" className="ib-copy" aria-label={copied === target ? 'Copiado!' : label || 'Copiar texto'} onClick={() => copy(target)}>{copied === target ? <Check size={15} /> : <Copy size={15} />}{copied === target ? 'Copiado!' : label}</button>
);
};
const Section = ({ index, children, copyLabel }: { index: number; children: React.ReactNode; copyLabel?: string }) => {
  const section = content.sections[index - 1];
  return <section className="ib-section" id={`ib-${section.id}`}>
    <div className="ib-section-heading"><span className="ib-section-number">{index}</span>
      <div className="ib-section-heading-copy"><div><h2>{section.title}</h2><span className={`ib-badge ib-badge-${index}`}>{section.badge}</span></div><p>{section.subtitle}</p></div>
      <CopyButton target={`ib-${section.id}`} label={copyLabel} />
    </div>{children}
  </section>;
};
const Subheading = ({ children, badge, icon: Icon = Target }: { children: React.ReactNode; badge?: string; icon?: LucideIcon }) => (
  <div className="ib-subheading"><h3><Icon size={16} />{children}</h3>{badge && <span className="ib-soft-badge">{badge}</span>}</div>
);
const Box = ({ children, title, icon: Icon, className = '', id, copyLabel, badge }: { children: React.ReactNode; title?: string; icon?: LucideIcon; className?: string; id?: string; copyLabel?: string; badge?: string }) => (
  <article className={`ib-box ${className}`} id={id}>{title && <div className="ib-box-heading"><h4>{Icon && <Icon size={15} />}{title}{badge && <span className="ib-pitch-badge">{badge}</span>}</h4>{id && <CopyButton target={id} label={copyLabel ?? ''} />}</div>}<div className="ib-box-body">{children}</div></article>
);
const Table = ({ headers, rows, prefix, className = '' }: { headers: string[]; rows: string[][]; prefix: string; className?: string }) => (
  <div className={`ib-table-scroll ${className}`} role="region" aria-label={headers.join(', ')} tabIndex={0}>
    <table><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><T name={`${prefix}.r${i}.c${j}`} text={cell} title={`${headers[j]} — ${row[0].replace(/\*/g, '')}`} /></td>)}</tr>)}</tbody>
    </table>
  </div>
);


export const InboundReference: React.FC = () => {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [active, setActive] = useState('visao-geral');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<{ key: string; title: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    api.get('/playbook-inbound').then((res) => {
      if (!cancelled) { setOverrides(res.reference_overrides || {}); setLoaded(true); }
    }).catch((err) => { if (!cancelled) setError(`Não foi possível carregar as edições compartilhadas: ${err.message}`); });
    return () => { cancelled = true; clearTimeout(copyTimer.current); };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id.replace('ib-', ''));
    }, { rootMargin: '-140px 0px -60% 0px', threshold: 0 });
    root.current?.querySelectorAll('.ib-section').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const copy = async (id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    try {
      await navigator.clipboard.writeText(copyableText(node).replace(/\n{3,}/g, '\n\n').trim());
      setCopied(id); clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(''), 2000);
    } catch { setError('Não foi possível copiar. Permita o acesso à área de transferência no navegador.'); }
  };

  return <ReferenceContext.Provider value={{ overrides, user: Boolean(user), loaded, setError, setEditing, copied, copy }}><div className="inbound-reference" ref={root}>
    {error && !editing && <p className="ib-error" role="alert">{error}</p>}
    <nav className="ib-navigation" aria-label="Seções do Playbook Inbound"><span>SEÇÕES:</span>
      {content.sections.map((section) => <button key={section.id} type="button" className={active === section.id ? 'ib-nav-active' : ''}
        aria-current={active === section.id ? 'location' : undefined} onClick={() => {
          setActive(section.id); document.getElementById(`ib-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}>{section.nav}</button>)}
    </nav>

    <Section index={1}>
      <Box title="Origem Estrutural e os Três Pilares Interdependentes" icon={GitBranch} className="ib-overview">
        <p className="ib-muted ib-origin-label">Texto oficial verbatim do documento mestre</p>
        <blockquote className="ib-origin"><T name="s1.origin" text={content.overview.origin} title="Origem estrutural" /></blockquote>
        <h5 className="ib-eyebrow"><Layers size={16} />OS TRÊS PILARES INTERDEPENDENTES</h5>
        <div className="ib-grid ib-grid-3 ib-pillars">{content.overview.pillars.map((pillar, i) => {
          const Icon = [Handshake, Megaphone, Users][i];
          return <article key={pillar.title} className={`ib-pillar ib-pillar-${i}`}><div className="ib-pillar-heading"><span><Icon size={17} /></span><div><h4>{pillar.title}</h4><p>{pillar.subtitle}</p></div></div>
            <T name={`s1.pillar${i}`} text={pillar.text} title={pillar.title} /></article>;
        })}</div>
        <div className="ib-grid ib-grid-2 ib-overview-notes">
          <Box title="CONTRATO DE MÚTUA RESPONSABILIDADE" icon={ShieldCheck} className="ib-inset"><T name="s1.contract" text={content.overview.contract} title="Contrato de mútua responsabilidade" /></Box>
          <Box title="ABSOLUTA MENSURABILIDADE (ROAS & ROI)" icon={Coins} className="ib-inset"><T name="s1.roi" text={content.overview.roi} title="Mensurabilidade ROAS e ROI" /></Box>
        </div>
        <div className="ib-callout ib-orange"><T name="s1.difference" text={content.overview.difference} title="Diferencial competitivo" /></div>
      </Box>
    </Section>

    <Section index={2}>
      <div className="ib-mandate"><p className="ib-eyebrow"><ShieldCheck size={16} />DIRETRIZ COMERCIAL MANDATÓRIA QUEST</p>
        <h3>“PROVAR O VALOR ANTES DE QUALQUER DISCUSSÃO DE PREÇO”</h3><T name="s2.mandate" text={content.persona.mandate} title="Diretriz comercial mandatória" />
      </div>
      <div className="ib-grid ib-grid-2">{content.persona.cards.map(([title, text], i) => <Box key={title} title={title} icon={[Users, ArrowUpRight, Lightbulb, CircleAlert][i]}><T name={`s2.card${i}`} text={text} title={title} /></Box>)}</div>
    </Section>

    <Section index={3} copyLabel="Copiar Pipeline">
      <Table headers={['ETAPA', 'OBJETIVO', 'CRITÉRIO DE AVANÇO (VERIFICÁVEL)', 'DONO', 'SAÍDA']} rows={content.pipeline} prefix="s3.pipeline" className="ib-pipeline-table" />
      <Box title="INDICADORES-CHAVE DE PERFORMANCE (KPIS INTERNOS DO FUNIL QUEST)" className="ib-inset">
        <p className="ib-muted">Tabela de conversão a partir de 100 validações no Radar Quest e leitura de Ciclo 1 e Ciclo 2:</p>
        <div className="ib-grid ib-grid-3 ib-mini-grid">{content.kpis.map((text, i) => <div className="ib-mini" key={i}><T name={`s3.kpi${i}`} text={text} title={`KPI ${i + 1}`} /></div>)}</div>
      </Box>
    </Section>

    <Section index={4} copyLabel="Copiar Matriz">
      <Table headers={['ETAPA', 'SCRIPT GERAL QUEST (COMUNICAÇÃO)', 'SCRIPT DO PRODUTO (INBOUND + CONSULTORIA)']} rows={content.evolution} prefix="s4.matrix" className="ib-evolution-table" />
    </Section>

    <Section index={5}>
      <div className="ib-script-part" id="ib-opening"><Subheading icon={PhoneCall} badge="Primeiros 15 segundos">5.1 Etapa 1 — Abertura (Prospecção Ativa)</Subheading>
        <T name="s5.opening-intro" text={content.opening.intro} title="Objetivo da abertura" />
        <div className="ib-grid ib-grid-2">
          <Box title="ROTEIRO DE LIGAÇÃO DE PROSPECÇÃO" id="ib-call" className="ib-script-box"><p className="ib-muted">Gancho de Crescimento Comercial</p><T name="s5.opening-call" text={content.opening.call} title="Roteiro de ligação de prospecção" /></Box>
          <Box title="MENSAGEM ATIVA DIRETA (LINKEDIN / WHATSAPP / COLD MAIL)" id="ib-direct-message" className="ib-script-box"><p className="ib-muted">Abordagem Individualizada</p><T name="s5.opening-message" text={content.opening.message} title="Mensagem ativa direta" /></Box>
        </div>
        <div className="ib-callout ib-orange"><T name="s5.opening-directive" text={content.opening.directive} title="Diretriz tática de abordagem" /></div>
      </div>

      <div className="ib-script-part"><Subheading icon={BadgeCheck} badge="Blocos A e B">5.2 Etapa 2 — Qualificação (Descoberta Profunda — 11 Perguntas)</Subheading>
        <p>Nesta etapa, o consultor comercial deve identificar com precisão as fricções operacionais através de 11 perguntas estratégicas divididas entre maturidade geral e prontidão de processos:</p>
        <div className="ib-grid ib-grid-2 ib-questions">{[content.questionsA, content.questionsB].map((questions, group) =>
          <Box key={group} title={group === 0 ? 'BLOCO A: PERGUNTAS ESTRUTURAIS GERAIS (MATURIDADE DE COMUNICAÇÃO)' : 'BLOCO B: PERGUNTAS ESPECÍFICAS DO PRODUTO (MATURIDADE COMERCIAL E PROCESSUAL)'}>
            <ul>{questions.map(([title, question, note], i) => <li key={title}><strong>• {title}:</strong><div className="ib-italic"><T name={`s5.q${group}-${i}`} text={question} title={title} /></div><small>{note}</small></li>)}</ul>
          </Box>)}</div>
        <div className="ib-callout ib-inset"><T name="s5.qualification-criterion" title="Critério verificável de avanço" text="**Critério Verificável de Avanço:** O consultor só deve autorizar o avanço do lead caso haja dor financeira identificada, alinhamento orçamentário básico, presença de equipe de vendas ativa e aceitação formal dos sócios para a sessão de diagnóstico." /></div>
      </div>

      <div className="ib-script-part"><Subheading badge="45 minutos • Sem preço prévio">5.3 Etapa 3 — Diagnóstico Pré-venda (A Prova de Valor)</Subheading>
        <T name="s5.diagnosis-intro" text={content.diagnosis.intro} title="Introdução do diagnóstico" />
        <Box title="SCRIPT DE CONVITE AO DIAGNÓSTICO (ENCERRAMENTO DA DISCOVERY)" id="ib-diagnosis-invite" className="ib-script-box"><T name="s5.diagnosis-invite" text={content.diagnosis.invite} title="Convite ao diagnóstico" /></Box>
        <div className="ib-grid ib-grid-5 ib-findings">{content.diagnosis.findings.map((text, i) => <div className="ib-mini" key={i}><T name={`s5.finding${i}`} text={text} title={`Achado ${i + 1}`} /></div>)}</div>
        <div className="ib-callout ib-solid-orange"><T name="s5.diagnosis-rule" text={content.diagnosis.rule} title="Regra de ouro do diagnóstico" /></div>
      </div>

      <div className="ib-script-part" id="ib-pitch"><div className="ib-subheading"><h3><Sparkles size={16} />5.4 Etapa 4 — Pitch de Valor (Fórmula dos 4 Atos Verbatim)</h3><CopyButton target="ib-pitch" label="Copiar Pitch Completo" /></div>
        <div className="ib-grid ib-grid-2 ib-pitch-grid">{content.pitch.map(([title, badge, text], i) => <Box key={title} title={title} badge={badge} className={`ib-pitch ib-pitch-${i}`}><div className="ib-italic"><T name={`s5.pitch${i}`} text={text} title={title} /></div></Box>)}</div>
        <Box title="PITCH DE SÍNTESE RÁPIDA (APRESENTAÇÕES DE ALTA VELOCIDADE)" id="ib-pitch-summary" className="ib-dark ib-italic"><T name="s5.pitch-summary" text={content.pitchSummary} title="Pitch de síntese rápida" /></Box>
      </div>

      <div className="ib-script-part"><Subheading icon={CircleAlert} badge="5 Clássicas + 3 do Produto">5.5 Etapa 5 — Tratamento Avançado de Objeções (8 Objeções com Técnicas e Respostas)</Subheading>
        <p>Cada objeção possui uma técnica psicológica fundamentada e a resposta pronta verbatim para o consultor aplicar imediatamente:</p>
        <div className="ib-objections">{content.objections.map((title, i) => <details key={i} className={i >= 5 ? 'ib-objection-product' : ''}>
          <summary>{title}</summary><div className="ib-objection-body"><T name={`s5.objection${i}`} text="Resposta oficial ainda não cadastrada." title={`Resposta à objeção ${i + 1}`} /></div>
        </details>)}</div>
      </div>

      <div className="ib-script-part"><Subheading icon={BadgeCheck} badge="Técnicas A, B e C">5.6 Etapa 6 — Fechamento (Conversão e Compromisso)</Subheading>
        <p>Identificar os indicativos tácitos de compra, interromper o discurso persuasivo e avançar para a assinatura:</p>
        <div className="ib-grid ib-grid-3 ib-closing-grid">{content.closing.map(([title, text], i) => <Box key={title} title={title}><div className="ib-italic"><T name={`s5.closing${i}`} text={text} title={title} /></div></Box>)}</div>
        <Box title="DIRETRIZ INEGOCIÁVEL DA QUEST: TOLERÂNCIA ZERO PARA “DEPOIS NÓS NOS FALAMOS”" icon={PhoneCall} className="ib-dark">
          <p>Nenhuma sessão comercial se encerra <strong>sem o registro de um próximo passo objetivo</strong>, com dia e horário estabelecidos em agenda.</p>
          <div className="ib-dark-inset ib-italic"><T name="s5.next-step" text={content.nextStep} title="Diretriz de próximo passo" /></div>
        </Box>
      </div>
    </Section>

    <Section index={6}>
      <div className="ib-grid ib-grid-2 ib-followup">
        <Box title="6.1 E-MAIL FORMAL — RESUMO & AGENDAMENTO DO DIAGNÓSTICO" icon={Mail} id="ib-email" copyLabel="Copiar E-mail"><T name="s6.email" text={content.followup.email} title="Template de e-mail" /></Box>
        <Box title="6.2 MENSAGEM ÁGIL (WHATSAPP CORPORATIVO) — PÓS-DESCOBERTA" icon={MessageSquare} id="ib-whatsapp" copyLabel="Copiar WhatsApp" className="ib-whatsapp"><T name="s6.whatsapp" text={content.followup.whatsapp} title="Template de WhatsApp" /></Box>
      </div>
    </Section>

    <Section index={7}>
      <div className="ib-script-part"><Subheading icon={Coins}>7.1 Anexo A — Referência Comercial (Case Santa Massa)</Subheading>
        <p>Os parâmetros financeiros expressos neste anexo constituem a referência analítica de precificação baseada no case de contratação do produto (Santa Massa — 2026). Servem de balizador para ancoragem de valor, dimensionamento da esteira e cálculo do ticket médio esperado para novas contas.</p>
        <Table headers={['COMPONENTE DO PROJETO', 'ESTRUTURAÇÃO E ENTREGÁVEIS', 'INVESTIMENTO DE REFERÊNCIA']} rows={content.pricing} prefix="s7.pricing" className="ib-pricing" />
        <div className="ib-grid ib-grid-2"><Box title="ROADMAP DE IMPLANTAÇÃO E OPERAÇÃO (4 FASES)"><T name="s7.roadmap" text={content.roadmap} title="Roadmap de implantação" /></Box>
          <Box title="ESTRATÉGIA DO QUICK WIN DE VENDAS (PRIMEIRO RESULTADO EM 60 DIAS)" className="ib-orange"><T name="s7.quickwin" text={content.quickwin} title="Estratégia Quick Win" /></Box></div>
      </div>

      <div className="ib-script-part"><Subheading icon={BookOpen}>7.2 Anexo B — Governança, Manutenção e Adoção do Playbook</Subheading>
        <div className="ib-grid ib-grid-4">{content.governance.map((text, i) => <div key={i} className="ib-mini"><T name={`s7.governance${i}`} text={text} title={`Governança ${i + 1}`} /></div>)}</div>
      </div>

      <div className="ib-script-part"><Subheading icon={GitBranch}>7.3 Anexo C — Roteiro de Diagnóstico em Duas Etapas (Pré-diagnóstico e Diagnóstico Aprofundado)</Subheading>
        <p>A metodologia está rigidamente estruturada em duas etapas complementares e sequenciais: o <strong>Pré-diagnóstico Comercial</strong> (ferramenta de vendas pré-contrato) e o <strong>Diagnóstico Aprofundado</strong> (ferramenta de entrega e imersão pós-contrato em 8 blocos dimensionais).</p>
        <Table headers={['DIMENSÃO AVALIADA', 'ETAPA 1 — PRÉ-DIAGNÓSTICO COMERCIAL', 'ETAPA 2 — DIAGNÓSTICO APROFUNDADO']} rows={content.diagnosisComparison} prefix="s7.comparison" className="ib-diagnosis-table" />
        <div className="ib-grid ib-grid-2"><Box title="OS 4 PILARES DE INVESTIGAÇÃO PRÉVIA (PRÉ-DIAGNÓSTICO)"><T name="s7.investigation" text={content.investigation} title="Pilares de investigação" /></Box>
          <Box title="EQUAÇÃO DE VAZAMENTO PRELIMINAR DA QUEST" className="ib-dark"><div className="ib-equation"><T name="s7.equation" text={content.leakageEquation} title="Equação de vazamento" /></div><T name="s7.equation-example" text={content.leakageExample} title="Exemplo de vazamento" /></Box></div>
        <Box title="SCRIPT DE CONDUÇÃO DA APRESENTAÇÃO DO PRÉ-DIAGNÓSTICO (45 MINUTOS)" id="ib-diagnosis-script" copyLabel="Copiar Roteiro 45 min"><div className="ib-callout ib-inset"><T name="s7.diagnosis-script" text={content.diagnosisScript} title="Roteiro de 45 minutos" /></div></Box>
        <h4 className="ib-eyebrow">OS 8 BLOCOS DIMENSIONAIS DO DIAGNÓSTICO APROFUNDADO (FASE 1 • 30 DIAS PÓS-CONTRATO)</h4>
        <div className="ib-grid ib-grid-4">{content.dimensionalBlocks.map((text, i) => <div key={i} className="ib-mini"><T name={`s7.dimension${i}`} text={text} title={`Bloco dimensional ${i + 1}`} /></div>)}</div>
        <div className="ib-grid ib-grid-3 ib-final-cards">{content.finalCards.map(([title, text], i) => <Box key={title} title={title}><T name={`s7.final${i}`} text={text} title={title} /></Box>)}</div>
      </div>
    </Section>

    {editing && <div className="ib-modal-backdrop"><div className="ib-modal" role="dialog" aria-modal="true" aria-labelledby="ib-edit-title">
      <div className="ib-modal-heading"><h2 id="ib-edit-title">Editar texto compartilhado</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fechar edição"><X size={20} /></button></div>
      <p className="ib-muted">{editing.title}</p>
      <form onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError('');
        try {
          await api.put(`/playbook-inbound/reference/${editing.key}`, { titulo: editing.title.slice(0, 200), conteudo: editing.text });
          setOverrides((prev) => ({ ...prev, [editing.key]: editing.text })); setEditing(null);
        } catch (err: any) { setError(err.message || 'Não foi possível salvar o texto.'); } finally { setSaving(false); }
      }}>
        <label htmlFor="ib-edit-text">Conteúdo</label><textarea id="ib-edit-text" required maxLength={25000} rows={12} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
        <p className="ib-muted">Use **texto** para negrito e *texto* para itálico. A edição será compartilhada com a equipe.</p>
        {error && <p className="ib-error" role="alert">{error}</p>}
        <div className="ib-modal-actions"><button type="button" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar texto'}</button></div>
      </form>
    </div></div>}
  </div></ReferenceContext.Provider>;
};
