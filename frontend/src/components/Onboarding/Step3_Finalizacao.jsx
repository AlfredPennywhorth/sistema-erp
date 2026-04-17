import React from 'react';
import { useFormContext } from 'react-hook-form';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { BRAND } from '../../config/branding';

const Step3_Finalizacao = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Conformidade e Termos</h2>
          <p className="text-slate-600 dark:text-slate-300">Ultimo passo para ativar sua empresa no ERP.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-brand-primary">
            <FileText size={18} />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Termos de Uso e LGPD</h3>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed">
            <p>Ao prosseguir, voce concorda que o processamento dos dados fiscais e de localizacao informados e necessario para a prestacao dos servicos do {BRAND.name}.</p>
            <p>Garantimos a seguranca e o isolamento logico dos seus dados (Multi-tenancy), em total conformidade com a Lei Geral de Protecao de Dados (Lei n. 13.709/2018).</p>
          </div>
        </div>

        <label className="flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border border-transparent hover:border-brand-primary/10">
          <input
            type="checkbox"
            {...register('aceite_termos')}
            className="mt-1 w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20"
          />
          <div>
            <span className="font-medium text-slate-800 dark:text-white">Aceito os termos de uso e politica de privacidade.</span>
            <p className="text-xs text-slate-600 dark:text-slate-300">Seus logs de aceite serao registrados para auditoria fiscal e juridica.</p>
            {errors.aceite_termos && <p className="text-red-500 text-xs mt-1">{errors.aceite_termos.message}</p>}
          </div>
        </label>
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-xl flex items-center gap-3">
        <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        <p className="text-sm text-green-700 dark:text-green-400">Tudo pronto! Seus dados foram validados com sucesso.</p>
      </div>
    </div>
  );
};

export default Step3_Finalizacao;
