import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '../config/branding';
import { TERMS } from '../constants/terms';
import {
  Landmark,
  BarChart3,
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Banknote,
  Users,
  AlertTriangle,
} from 'lucide-react';

import { useDashboardData } from '../hooks/useDashboardData';
import { HeroFinancialChart } from '../components/Landing/HeroFinancialChart';
import { KPIStatsCards } from '../components/Landing/KPIStatsCards';
import { MiniDRECard } from '../components/Landing/MiniDRECard';
import { CashFlowLineChart } from '../components/Landing/CashFlowLineChart';
import { CostDistributionChart } from '../components/Landing/CostDistributionChart';
import { MultiEmpresaTable } from '../components/Landing/MultiEmpresaTable';
import { SkeletonKPI, SkeletonChart } from '../components/Landing/Skeletons';

const FEATURES = [
  {
    icon: <TrendingDown size={20} />,
    color: 'from-red-500/20 to-red-600/10 border-red-500/20',
    iconColor: 'text-red-400',
    title: 'Contas a Pagar',
    desc: 'Gestão completa de obrigações financeiras com liquidação, vencimentos e alertas.',
  },
  {
    icon: <TrendingUp size={20} />,
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    title: 'Contas a Receber',
    desc: 'Controle de recebíveis, status de pagamento e histórico de clientes.',
  },
  {
    icon: <Banknote size={20} />,
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
    iconColor: 'text-blue-400',
    title: 'Tesouraria & Extrato',
    desc: 'Saldo bancário em tempo real, conciliação e extrato com filtros avançados.',
  },
  {
    icon: <BookOpen size={20} />,
    color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
    iconColor: 'text-violet-400',
    title: 'Lançamentos Contábeis',
    desc: 'Partidas dobradas automáticas a partir do financeiro. Rastreabilidade completa.',
  },
  {
    icon: <FileSpreadsheet size={20} />,
    color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
    title: 'Balancete',
    desc: 'Balancete de verificação com saldos anteriores, débitos, créditos e diferença.',
  },
  {
    icon: <BarChart3 size={20} />,
    color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20',
    iconColor: 'text-cyan-400',
    title: 'DRE',
    desc: 'Demonstração do Resultado do Exercício com análise de receitas vs despesas.',
  },
  {
    icon: <Layers size={20} />,
    color: 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
    iconColor: 'text-orange-400',
    title: 'Templates de Plano de Contas',
    desc: '4 templates prontos para Serviços, Comércio, Indústria e Agricultura.',
  },
  {
    icon: <Users size={20} />,
    color: 'from-pink-500/20 to-pink-600/10 border-pink-500/20',
    iconColor: 'text-pink-400',
    title: 'Multi-Empresa & Equipe',
    desc: 'Isolamento total entre empresas. Controle de roles e segregação de funções (SoD).',
  },
  {
    icon: <ShieldCheck size={20} />,
    color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20',
    iconColor: 'text-yellow-400',
    title: 'Compliance & Auditoria',
    desc: 'Log completo de todos os eventos. Trilha de auditoria imutável por tenant.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useDashboardData({ mode: 'demo' });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          {/* Copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-5 py-2 mb-6">
              <Zap size={14} className="text-cyan-300" />
              <span className="text-xs font-black uppercase tracking-widest text-cyan-300">
                {BRAND.slogan} — Fase 5
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                {TERMS.landing.gestaoFinanceira}
              </span>
              <br />
              {TERMS.landing.contabilIntegrada}
            </h1>

            <p className="text-slate-400 text-lg lg:text-xl mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {TERMS.landing.descricaoHero}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-cyan-400/20 group"
              >
                {TERMS.landing.acessarSistema}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-4 rounded-2xl border border-white/10 transition-all"
              >
                {TERMS.onboarding.criarEmpresa}
              </button>
            </div>
          </div>

          {/* Hero chart */}
          {loading ? (
            <SkeletonChart className="flex-1 h-64" />
          ) : error ? null : (
            <HeroFinancialChart
              revenueVsExpenses={data?.revenueVsExpenses}
              financialSummary={data?.financialSummary}
            />
          )}
        </div>
      </section>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-400/10 text-cyan-300 text-xs font-black uppercase tracking-widest mb-4">
              Dashboard Central
            </span>
            <h2 className="text-3xl font-black">{TERMS.landing.visaoConsolidadaGrupo}</h2>
          </div>

          {/* Error fallback */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm font-medium mb-8">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{TERMS.landing.erroCarregamento} {error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => <SkeletonKPI key={i} />)}
            </div>
          ) : (
            <KPIStatsCards kpis={data?.kpis} />
          )}
        </div>
      </section>

      {/* ── DRE + Cash Flow ─────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
          {loading ? (
            <>
              <SkeletonChart className="h-80" />
              <SkeletonChart className="h-80" />
            </>
          ) : (
            <>
              <MiniDRECard dre={data?.dre} />
              <CashFlowLineChart cashflow={data?.cashflow} />
            </>
          )}
        </div>
      </section>

      {/* ── Custo + Multi-empresa ────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black">{TERMS.landing.metricasGrowth}</h2>
            <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
              {TERMS.landing.metricasDesc}
            </p>
          </div>
          {loading ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <SkeletonChart className="h-64" />
              <SkeletonChart className="h-64" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <CostDistributionChart costDistribution={data?.costDistribution} />
              <MultiEmpresaTable multiEmpresa={data?.multiEmpresa} />
            </div>
          )}
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300 mb-3">Módulos</p>
            <h2 className="text-3xl font-black text-white">{TERMS.landing.tudoQueEmpresaPrecisa}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`bg-gradient-to-br ${f.color} rounded-2xl border p-6 flex flex-col gap-3 hover:scale-[1.01] transition-transform`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${f.iconColor}`}>
                  {f.icon}
                </div>
                <h3 className="font-black text-white text-base">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center bg-white/3 border border-cyan-400/10 p-16 rounded-3xl relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black mb-6">
            {TERMS.landing.ctaTitulo}
          </h2>
          <p className="text-slate-400 text-lg mb-12">
            {TERMS.landing.ctaDesc} {BRAND.slogan}.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => navigate('/onboarding')}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-10 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-transform"
            >
              Criar Minha Empresa
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border border-white/10 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/5 transition-all"
            >
              Fazer Login
            </button>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-400/5 rounded-full blur-[150px] -z-0 pointer-events-none" />
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-16 px-6 text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-cyan-400/10 border border-cyan-400/20 rounded-xl flex items-center justify-center">
            <Landmark size={20} className="text-cyan-300" />
          </div>
          <span className="text-white font-black text-lg tracking-tight">{BRAND.name}</span>
        </div>
        <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
          {TERMS.landing.tecnologias}
        </p>
      </section>
    </div>
  );
}
