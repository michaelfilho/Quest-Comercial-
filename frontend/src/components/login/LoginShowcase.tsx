import React from 'react';
import { ArrowUpRight, ChartNoAxesColumnIncreasing, Layers, Target } from 'lucide-react';
import { QuestLogo } from '../ui/QuestLogo';
import questSymbol from '../../assets/quest-symbol.svg';

const stages = [
  ['Prospecção', 28, 76], ['Qualificação', 20, 70], ['Proposta', 17, 76],
  ['Negociação', 12, 62], ['Fechamento', 10, 57],
] as const;

export const LoginShowcase: React.FC = () => (
  <section className="seller-login-showcase" aria-label="Conheça o Quest Seller">
    <div className="seller-login-grid" aria-hidden="true" />
    <div className="seller-login-orbits" style={{ maskImage: `url("${questSymbol}")` }} aria-hidden="true" />
    <div className="seller-login-story">
      <div className="seller-login-brand"><QuestLogo light /></div>
      <div className="seller-login-intro">
        <span className="seller-login-company">QUEST COMUNICAÇÃO TOTAL • 2026</span>
        <h1>Sua operação comercial,<br /><span>em um só lugar.</span></h1>
        <p>CRM, pipeline, metas e indicadores para decisões mais inteligentes.</p>
      </div>

      <div className="seller-login-demo" aria-label="Exemplo ilustrativo de indicadores comerciais">
        <span className="seller-login-demo-label">Visão ilustrativa da operação</span>
        <div className="seller-login-metrics">
          <article className="seller-login-metric seller-login-sales">
            <div className="seller-login-metric-heading"><ChartNoAxesColumnIncreasing aria-hidden="true" /><h2>Vendas no período</h2></div>
            <div className="seller-login-sales-total"><strong>R$ 436.200</strong><span><ArrowUpRight size={14} />+18,4%</span></div>
            <svg viewBox="0 0 360 84" preserveAspectRatio="none" className="seller-login-chart" aria-hidden="true">
              <defs><linearGradient id="seller-login-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ff6500" stopOpacity=".48" /><stop offset="1" stopColor="#ff6500" stopOpacity=".04" /></linearGradient></defs>
              <path d="M0 70 L18 64 L34 57 L51 60 L66 54 L83 44 L103 48 L121 37 L138 36 L153 30 L168 34 L185 41 L201 43 L218 38 L234 33 L246 35 L264 27 L281 32 L296 27 L315 17 L335 19 L360 6 L360 84 L0 84 Z" fill="url(#seller-login-chart-fill)" />
              <path d="M0 70 L18 64 L34 57 L51 60 L66 54 L83 44 L103 48 L121 37 L138 36 L153 30 L168 34 L185 41 L201 43 L218 38 L234 33 L246 35 L264 27 L281 32 L296 27 L315 17 L335 19 L360 6" fill="none" stroke="#ff6900" strokeWidth="2.8" strokeLinejoin="round" />
            </svg>
          </article>
          <article className="seller-login-metric seller-login-goal">
            <div className="seller-login-metric-heading"><Target aria-hidden="true" /><h2>Meta comercial</h2></div>
            <strong className="seller-login-goal-total">82%</strong>
            <p><strong>R$ 436.200</strong> de R$ 530.000</p>
            <div className="seller-login-goal-track" aria-label="Meta ilustrativa: 82%"><span /></div>
          </article>
        </div>
        <article className="seller-login-pipeline">
          <div className="seller-login-pipeline-heading"><div><Layers aria-hidden="true" /><h2>Pipeline de oportunidades</h2></div><span>87 oportunidades</span></div>
          <div className="seller-login-stages">{stages.map(([title, count, progress], i) => (
            <div className={`seller-login-stage${i === 2 ? ' seller-login-stage-featured' : ''}`} key={title}>
              <h3>{title}</h3><strong>{count}</strong><span className="seller-login-stage-track"><span style={{ width: `${progress}%` }} /></span>
            </div>
          ))}</div>
        </article>
      </div>
    </div>
    <footer className="seller-login-footer">© 2026 Quest Comunicação Total. Autenticação Argon2id &amp; Sessões HttpOnly.</footer>
  </section>
);
