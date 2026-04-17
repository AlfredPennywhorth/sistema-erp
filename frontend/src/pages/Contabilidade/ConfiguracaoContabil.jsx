import React, { useState, useEffect } from 'react';
import {
  Settings2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Layers,
  Zap,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { ContabilidadeAPI } from '../../lib/contabilidade';
import { useAuth } from '../../contexts/AuthContext';

const ATIVIDADE_LABELS = {
  SERVICOS: 'Serviços',
  COMERCIO: 'Comércio',
  INDUSTRIA: 'Indústria',
  AGRICULTURA: 'Agricultura',
};

const ATIVIDADE_DESC = {
  SERVICOS: 'Prestadores de serviço, consultorias, agências, tech.',
  COMERCIO: 'Comércio varejista, atacadista, distribuidoras.',
  INDUSTRIA: 'Indústria em geral, manufatura, transformação.',
  AGRICULTURA: 'Agronegócio, pecuária, agroindústria.',
};

export default function ConfiguracaoContabil() {
  const { activeTenant } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [atividade, setAtividade] = useState(activeTenant?.atividade_economica || '');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const jaAtivado = !!activeTenant?.modulo_contabil_ativo;

  useEffect(() => {
    ContabilidadeAPI.getTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const templatesFiltrados = atividade
    ? templates.filter((t) => t.atividade_economica === atividade)
    : templates;

  const handleAtivar = async () => {
    if (!atividade) return setErrorMsg('Selecione a atividade econômica.');
    setStatus('loading');
    setErrorMsg('');
    try {
      const payload = { atividade_economica: atividade };
      if (selectedTemplate) payload.modelo_id = selectedTemplate;
      const res = await ContabilidadeAPI.ativarModulo(payload);
      setResultado(res);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Erro ao ativar o módulo contábil.');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-primary/10 rounded-2xl">
          <Settings2 className="text-brand-primary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Configuração Contábil</h1>
          <p className="text-sm text-slate-400">Ativação do módulo contábil e seleção de template</p>
        </div>
      </div>

      {/* Status atual */}
      <div className={`rounded-2xl p-5 border flex items-center gap-4 ${jaAtivado ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-white/5'}`}>
        <div className={`p-2.5 rounded-xl ${jaAtivado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
          {jaAtivado ? <CheckCircle2 size={20} /> : <Layers size={20} />}
        </div>
        <div className="flex-1">
          <p className={`font-black text-sm ${jaAtivado ? 'text-emerald-300' : 'text-white'}`}>
            {jaAtivado ? 'Módulo Contábil Ativo' : 'Módulo Contábil Inativo'}
          </p>
          {jaAtivado ? (
            <p className="text-xs text-slate-400 mt-0.5">
              Atividade: <strong className="text-white">{ATIVIDADE_LABELS[activeTenant?.atividade_economica] || activeTenant?.atividade_economica}</strong>
              {activeTenant?.plano_contas_template_versao && (
                <> · Template v{activeTenant.plano_contas_template_versao}</>
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              Selecione a atividade econômica e ative o módulo para gerar o plano de contas.
            </p>
          )}
        </div>
        {jaAtivado && (
          <a href="/contabilidade/lancamentos" className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            <BookOpen size={14} />
            Ver Lançamentos
            <ChevronRight size={14} />
          </a>
        )}
      </div>

      {/* Formulário de ativação */}
      {!jaAtivado && status !== 'success' && (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 space-y-6">
          <h2 className="text-base font-black text-white">Ativar Módulo Contábil</h2>

          {/* Seleção de atividade econômica */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Atividade Econômica *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(ATIVIDADE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setAtividade(key); setSelectedTemplate(null); }}
                  className={`flex flex-col items-start gap-1 px-4 py-3.5 rounded-xl border text-left transition-all ${
                    atividade === key
                      ? 'border-brand-primary bg-brand-primary/10 text-white'
                      : 'border-white/10 bg-slate-700/40 text-slate-300 hover:border-white/20 hover:bg-slate-700/60'
                  }`}
                >
                  <span className="font-bold text-sm">{label}</span>
                  <span className="text-xs text-slate-400">{ATIVIDADE_DESC[key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates disponíveis para a atividade */}
          {atividade && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Template de Plano de Contas
              </label>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader2 size={16} className="animate-spin" />
                  Carregando templates...
                </div>
              ) : templatesFiltrados.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum template disponível para esta atividade.</p>
              ) : (
                <div className="space-y-2">
                  {/* Opção automática */}
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      !selectedTemplate
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-white/10 bg-slate-700/30 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${!selectedTemplate ? 'border-brand-primary bg-brand-primary' : 'border-slate-500'}`} />
                    <div>
                      <p className="text-sm font-bold text-white">Padrão (recomendado)</p>
                      <p className="text-xs text-slate-400">Usa o template mais recente para {ATIVIDADE_LABELS[atividade]}</p>
                    </div>
                  </button>
                  {templatesFiltrados.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        selectedTemplate === t.id
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-white/10 bg-slate-700/30 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedTemplate === t.id ? 'border-brand-primary bg-brand-primary' : 'border-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{t.nome}</p>
                        <p className="text-xs text-slate-400">{t.codigo} · v{t.versao} · {t.total_contas ?? '—'} contas</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleAtivar}
              disabled={!atividade || status === 'loading'}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-brand-primary/20"
            >
              {status === 'loading' ? (
                <><Loader2 size={16} className="animate-spin" /> Ativando...</>
              ) : (
                <><Zap size={16} /> Ativar Módulo Contábil</>
              )}
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Esta ação criará o plano de contas baseado no template selecionado. O template ativado não pode ser trocado sem migração de dados.
            </p>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {status === 'success' && resultado && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400" size={24} />
            <div>
              <p className="text-white font-black">Módulo Contábil Ativado!</p>
              <p className="text-emerald-400 text-sm">{resultado.message}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-white">{resultado.contas_criadas}</p>
              <p className="text-xs text-slate-400 mt-1">Contas Criadas</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <p className="text-sm font-black text-white truncate">{resultado.modelo_codigo}</p>
              <p className="text-xs text-slate-400 mt-1">Template</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-white">v{resultado.modelo_versao}</p>
              <p className="text-xs text-slate-400 mt-1">Versão</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <a
              href="/financeiro/plano-contas"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm"
            >
              <Layers size={16} />
              Ver Plano de Contas
            </a>
            <a
              href="/contabilidade/lancamentos"
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-brand-primary/20"
            >
              <BookOpen size={16} />
              Ir para Lançamentos
            </a>
          </div>
        </div>
      )}

      {/* Já ativo: informações e próximos passos */}
      {jaAtivado && (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Próximos Passos</h2>
          <div className="space-y-3">
            {[
              { href: '/financeiro/regras-contabeis', icon: <Settings2 size={16} />, title: 'Regras Contábeis', desc: 'Configure quais eventos financeiros geram lançamentos automáticos.' },
              { href: '/contabilidade/lancamentos', icon: <BookOpen size={16} />, title: 'Lançamentos', desc: 'Visualize o Livro Diário com todas as partidas dobradas.' },
              { href: '/contabilidade/balancete', icon: <Layers size={16} />, title: 'Balancete', desc: 'Confira o saldo de todas as contas por período.' },
              { href: '/contabilidade/dre', icon: <Zap size={16} />, title: 'DRE', desc: 'Acompanhe receitas, despesas e resultado líquido.' },
              { href: '/contabilidade/balanco', icon: <CheckCircle2 size={16} />, title: 'Balanço Patrimonial', desc: 'Visão do Ativo, Passivo e Patrimônio Líquido.' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="text-brand-primary group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{item.title}</p>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-brand-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
