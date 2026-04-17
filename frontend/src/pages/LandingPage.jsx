import React from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] rounded-full bg-brand-primary/10 blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          <div className="inline-flex items-center gap-3 bg-brand-primary/10 border border-brand-primary/30 rounded-full px-5 py-2">
            <Zap size={14} className="text-brand-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-brand-primary">
              ERP Modular — Fase 5
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-tight">
            Gestão Financeira e
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-indigo-400">
              Contábil Integrada
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
            Sistema ERP multi-empresa com módulo contábil completo. Partidas dobradas automáticas,
            plano de contas por setor, DRE, Balancete e Balanço Patrimonial em tempo real.
          </p>

          <div className="flex gap-4 mt-2">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-black px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-brand-primary/20 group"
            >
              Acessar o Sistema
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold px-7 py-3.5 rounded-2xl border border-white/10 transition-all"
            >
              Criar Empresa
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary mb-3">Módulos</p>
          <h2 className="text-3xl font-black text-white">Tudo o que sua empresa precisa</h2>
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
      </section>

      {/* Footer CTA */}
      <section className="border-t border-white/5 py-16 px-6 text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
            <Landmark size={20} className="text-white" />
          </div>
          <span className="text-white font-black text-lg tracking-tight">Sistema ERP Modular</span>
        </div>
        <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
          Desenvolvido com FastAPI · React · Supabase · SQLModel
        </p>
      </section>
    </div>
  );
}
