import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Download,
  Filter,
  FileText,
  PieChart,
  LineChart,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Reports = () => {
  const { activeTenant } = useAuth();

  const reportTypes = [
    {
      id: 'vendas',
      title: 'Relatório de Vendas',
      description: 'Análise completa de faturamento mensal e anual.',
      icon: <LineChart className="text-blue-500" />,
      bg: 'bg-blue-50 dark:bg-blue-500/10'
    },
    {
      id: 'financeiro',
      title: 'Fluxo de Caixa',
      description: 'Entradas, saídas e previsibilidade financeira.',
      icon: <BarChart3 className="text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10'
    },
    {
      id: 'impostos',
      title: 'Apuração Fiscal',
      description: 'Resumo de tributos e notas fiscais emitidas.',
      icon: <FileText className="text-orange-500" />,
      bg: 'bg-orange-50 dark:bg-orange-500/10'
    },
    {
      id: 'clientes',
      title: 'Análise de Clientes',
      description: 'LTV, ticket médio e taxa de retenção.',
      icon: <PieChart className="text-purple-500" />,
      bg: 'bg-purple-50 dark:bg-purple-500/10'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-slate-800 dark:text-white tracking-tight"
          >
            Relatórios
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 dark:text-slate-400 font-medium mt-1"
          >
            Gere ou exporte análises sobre a operação da {activeTenant?.razao_social || 'empresa'}.
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex lg:items-center gap-3"
        >
          <button className="btn-secondary rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
            <Calendar size={16} />
            Últimos 30 dias
          </button>
          <button className="btn-primary rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
            <Filter size={16} />
            Filtros
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {reportTypes.map((report, idx) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-6 border border-white/10 dark:border-white/5 hover:border-brand-primary/30 transition-all flex flex-col md:flex-row gap-6 md:items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${report.bg} shadow-sm group-hover:scale-110 transition-transform`}>
                {report.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{report.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
              </div>
            </div>
            
            <button className="px-4 py-2 bg-slate-100/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-brand-primary/20 text-slate-700 dark:text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Download size={16} />
              Exportar
            </button>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-8 border border-white/10 dark:border-white/5 text-center flex flex-col items-center justify-center rounded-3xl"
      >
        <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
          <BarChart3 size={32} className="text-brand-primary" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Relatórios Customizados</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
          Precisa de uma visão mais específica do negócio? O construtor de relatórios customizados da plataforma permite combinar até 5 fontes de dados.
        </p>
        <button className="btn-primary rounded-xl px-6 py-3 font-black text-sm tracking-wide">
          Criar Relatório Personalizado
        </button>
      </motion.div>
    </div>
  );
};

export default Reports;
