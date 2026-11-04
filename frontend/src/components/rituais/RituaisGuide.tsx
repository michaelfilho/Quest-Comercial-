import React from 'react';
import {
  ArrowRight, CalendarDays, CalendarRange, CheckCircle2, Clock, Compass,
  Flame, Headphones, Sparkles, Target, TrendingUp, TriangleAlert, UsersRound,
  UserRoundCheck, Zap, type LucideIcon,
} from 'lucide-react';
import './rituais-guide.css';

type Tone = 'orange' | 'blue' | 'purple' | 'red' | 'green' | 'indigo' | 'amber' | 'neutral';

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`ritual-badge ritual-tone-${tone}`}>{children}</span>;
}

function Card({ badge, tone = 'neutral', icon: Icon, title, subtitle, aside, critical, children }: {
  badge: string; tone?: Tone; icon: LucideIcon; title: string; subtitle: string;
  aside?: string; critical?: boolean; children: React.ReactNode;
}) {
  return (
    <article className={`ritual-guide-card${critical ? ' ritual-guide-critical' : ''}`}>
      {critical && <span className="ritual-gold-ribbon"><Flame size={13} /> REGRA DE OURO</span>}
      <div className="ritual-card-meta"><Badge tone={tone}>{badge}</Badge>{aside && <span>{aside}</span>}</div>
      <h4><Icon size={18} className={`ritual-icon-${tone}`} aria-hidden="true" />{title}</h4>
      <p className="ritual-card-subtitle">{subtitle}</p>
      <div className="ritual-card-body">{children}</div>
    </article>
  );
}

function Section({ title, subtitle, badge, tone, icon: Icon, children, quarterly }: {
  title: string; subtitle: string; badge: string; tone: Tone; icon: LucideIcon;
  children: React.ReactNode; quarterly?: boolean;
}) {
  return (
    <section className={`ritual-guide-section ritual-section-${tone}`} aria-label={title}>
      <div className="ritual-section-heading">
        <span className={`ritual-section-icon ritual-tone-${tone}`}><Icon size={19} aria-hidden="true" /></span>
        <div className="ritual-section-heading-copy"><h3>{title}</h3><p>{subtitle}</p></div>
        <Badge tone={tone}>{badge}</Badge>
      </div>
      <div className={`ritual-guide-grid${quarterly ? ' ritual-guide-grid-quarterly' : ''}`}>{children}</div>
    </section>
  );
}

export const RituaisGuide: React.FC = () => (
  <div className="rituais-guide">
    <header className="ritual-guide-header">
      <div>
        <p className="ritual-eyebrow"><span />PLAYBOOK COMERCIAL QUEST</p>
        <h2>Rotinas e Rituais</h2>
        <p className="ritual-guide-description">Cadências, processos e disciplinas essenciais para garantir ritmo, previsibilidade e fechamento.</p>
      </div>
      <span className="ritual-guide-purpose"><Sparkles size={16} aria-hidden="true" />Ritmo &amp; Previsibilidade</span>
    </header>

    <div className="ritual-principle">
      <span className="ritual-principle-icon"><Zap size={28} aria-hidden="true" /></span>
      <div>
        <p>PRINCÍPIO FUNDAMENTAL • RITUAL</p>
        <blockquote>"O time comercial da Quest não pode depender do talento individual — precisa de ritmo. Rotinas criam previsibilidade: sabem o que cada vendedor fez, o que vai fazer e onde estão os riscos antes que eles virem perda."</blockquote>
      </div>
    </div>

    <Section title="Rituais diários" subtitle="Alinhamento rápido, cadência de prospecção e velocidade no primeiro toque" badge="15 min" tone="orange" icon={Clock}>
      <Card badge="Diário • 9h00" aside="15 minutos" icon={UsersRound} tone="neutral" title="Stand-up comercial — 9h00" subtitle="Cada consultor responde em 3 frases objetivas:">
        <ol className="ritual-standup ritual-inset">
          <li><span>1</span><div><strong>Ontem:</strong> O que foi feito ontem para gerar/avançar oportunidades?</div></li>
          <li><span>2</span><div><strong>Hoje:</strong> O que está agendado para hoje (calls, reuniões, propostas)?</div></li>
          <li><span>3</span><div><strong>Ajuda:</strong> Onde precisa de ajuda ou há bloqueios?</div></li>
        </ol>
      </Card>
      <Card badge="SLA Crítico" tone="orange" icon={Flame} title="Regra de ouro diário" subtitle="Velocidade no primeiro contato define a conversão" critical>
        <div className="ritual-sla">Todo lead novo deve receber o primeiro contato em até <strong>12h</strong> (SLA de primeira resposta).</div>
        <p className="ritual-small-note">Não deixe o lead esfriar. Quanto menor o tempo até a primeira abordagem, maior a chance de conexão qualificada e avanço de fase no funil.</p>
      </Card>
      <Card badge="Volume & Intensidade" aside="Por vendedor" icon={TrendingUp} title="Cadência mínima por dia (exemplo)" subtitle="Ritmo mínimo de atividades operacionais">
        <div className="ritual-inset ritual-cadence">
          <p><CheckCircle2 size={17} /><strong>15 novos touches (calls / e-mails)</strong></p>
          <div className="ritual-or">— ou —</div>
          <p><CheckCircle2 size={17} /><strong>5 reuniões / qualificações</strong></p>
        </div>
        <p className="ritual-small-note ritual-italic">* Ajustar conforme fase do funil e maturidade do vendedor.</p>
      </Card>
    </Section>

    <Section title="Rituais semanais" subtitle="Saúde do pipeline, calibração técnica de pitch e garantia de próximos passos" badge="45–60 min — toda segunda ou sexta" tone="blue" icon={CalendarDays}>
      <Card badge="WBR • Weekly Business Review" tone="blue" icon={Target} title="Reunião de Pipeline (WBR)" subtitle="Inspeção rigorosa do funil de vendas">
        <p>Revisar etapa por etapa do funil: o que avançou, o que parou, quais deals estão <strong>há mais de 15 dias sem interação real</strong> (Recência do scorecard).</p>
        <div className="ritual-callout ritual-callout-amber"><TriangleAlert size={16} /><p>Negócios sem interação real por &gt;15 dias devem receber plano de ação ou desqualificação imediata.</p></div>
      </Card>
      <Card badge="Coaching Prático" tone="purple" icon={Headphones} title="Pitch Scoring da semana" subtitle="Treinar com call real, não com teoria">
        <p>Ouvir <strong>1 call gravada</strong> de cada consultor e pontuar as skills comerciais chave:</p>
        <ul className="ritual-skills"><li>• Abertura</li><li>• Diagnóstico</li><li>• Condução</li><li>• Fechamento</li></ul>
        <p className="ritual-small-note ritual-italic">O objetivo é treinar com call real, não com teoria.</p>
      </Card>
      <Card badge="Tolerância Zero" tone="red" icon={ArrowRight} title="Revisão de próximos passos" subtitle="Garantia de compromisso futuro agendado">
        <div className="ritual-callout ritual-callout-red"><p>Todo deal precisa de data e hora agendada para o próximo passo nos <strong>próximos 7 dias.</strong></p></div>
        <div className="ritual-inset ritual-small-note"><strong className="ritual-icon-red">Sem isso, o deal está morto</strong> — e sai do forecast.</div>
      </Card>
    </Section>

    <Section title="Rituais mensais" subtitle="Forecast qualificado com scorecard, realizado vs. planejado e ciclo de melhoria contínua" badge="Fechamento Mensal" tone="green" icon={CalendarRange}>
      <Card badge="Scorecard ≥ 6" tone="green" icon={Target} title="Forecast Meeting" subtitle="Filtro rigoroso de previsibilidade financeira">
        <p>Aplicar o <strong>7-Point Scorecard</strong> em todas as oportunidades. Só entram no forecast deals com <strong className="ritual-icon-green">score ≥ 6.</strong></p>
        <div className="ritual-inset ritual-small-note">Apresentar previsão de receita vs. meta do mês com base factual, sem "otimismo infundado".</div>
      </Card>
      <Card badge="Balanço Operacional" icon={TrendingUp} title="Revisão de metas" subtitle="Realizado vs. Planejado em 3 dimensões">
        <p>Auditoria completa de realizado vs. planejado:</p>
        <ul className="ritual-checklist">
          <li><CheckCircle2 size={16} />Atividades (calls, reuniões, propostas)</li>
          <li><CheckCircle2 size={16} />Pipeline gerado e avançado</li>
          <li><CheckCircle2 size={16} />Fechamento de receita (R$)</li>
        </ul>
      </Card>
      <Card badge="Desenvolvimento & Feedback" tone="amber" icon={UserRoundCheck} title="Reconhecer e loop" subtitle="Melhoria contínua e calibração de percepção">
        <ul className="ritual-inset ritual-feedback">
          <li>• <strong>Acionar plano de melhoria</strong> para o bottom 1.</li>
          <li>• <strong>Feedback 360 leve:</strong> cada consultor avalia a si mesmo vs. a percepção do gestor sobre a skill comercial.</li>
        </ul>
      </Card>
    </Section>

    <Section title="Rituais trimestrais" subtitle="Visão macroestratégica, revisão de ICP, territórios e evolução de carreira (PDI)" badge="Estratégico (QBR)" tone="indigo" icon={Compass} quarterly>
      <Card badge="Estratégia & Mercado" tone="indigo" icon={Compass} title="Planejamento comercial" subtitle="Revisão trimestral de alinhamento com o mercado">
        <p>Definição e alinhamento de:</p>
        <ul className="ritual-skills ritual-strategy"><li>🎯 Metas do trimestre</li><li>🔍 Revisão de ICP</li><li>🗺️ Territórios comerciais</li><li>🚀 Ofertas em destaque</li></ul>
      </Card>
      <Card badge="Gente & Gestão" tone="indigo" icon={UsersRound} title="PDI em ação" subtitle="Desenvolvimento e plano individual do consultor">
        <p>Revisar o plano de desenvolvimento individual de cada pessoa (ver bloco 1:1 &amp; PDI).</p>
        <div className="ritual-callout ritual-callout-indigo ritual-small-note"><p>Acompanhamento próximo de pontos fortes, gaps de execução e metas de aprendizado contínuo para cada vendedor.</p></div>
      </Card>
    </Section>
  </div>
);
