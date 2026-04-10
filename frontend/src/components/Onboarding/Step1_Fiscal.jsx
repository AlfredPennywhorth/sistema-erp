import React, { useEffect, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Search, Building2, Landmark, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
// import InputMask from 'react-input-mask';
import { api } from '../../lib/api';

const Step1_Fiscal = () => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext();
  const [loading, setLoading] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [existingCompany, setExistingCompany] = useState(null);
  const cnpjValue = watch('cnpj');

  // Efeito para busca automática quando CNPJ atinge 14 dígitos (ignorando máscara)
  useEffect(() => {
    const cleanCnpj = cnpjValue?.replace(/\D/g, '');
    if (cleanCnpj?.length === 14) {
      handleFetchCnpj(cleanCnpj);
    }
  }, [cnpjValue]);

  const handleFetchCnpj = async (cnpj) => {
    setLoading(true);
    setAlreadyExists(false);
    try {
      // 1. Checar se já existe no nosso banco
      const checkRes = await api.get(`/tenants/check-cnpj/${cnpj}`);
      if (checkRes.data?.exists) {
        setAlreadyExists(true);
        setExistingCompany(checkRes.data);
        return; 
      }

      // 2. Se não existe, buscar dados para auto-preenchimento (BrasilAPI)
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = response.data;
      
      // Preenchimento de Dados Fiscais
      setValue('razao_social', data.razao_social, { shouldValidate: true });
      setValue('nome_fantasia', data.nome_fantasia || data.razao_social, { shouldValidate: true });
      
      // Preenchimento de Endereço (Será aproveitado no Passo 2)
      setValue('cep', data.cep, { shouldValidate: true });
      setValue('logradouro', data.logradouro, { shouldValidate: true });
      setValue('bairro', data.bairro, { shouldValidate: true });
      setValue('cidade', data.municipio, { shouldValidate: true });
      setValue('uf', data.uf, { shouldValidate: true });
      setValue('numero', data.numero || '', { shouldValidate: true });
      setValue('complemento', data.complemento || '', { shouldValidate: true });
      
    } catch (err) {
      console.error("Erro ao processar CNPJ:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Identificação Fiscal</h2>
          <p className="text-slate-600 dark:text-slate-300">Comece informando o CNPJ da sua empresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2 relative">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">CNPJ</label>
          <div className="relative group">
            <Controller
              name="cnpj"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const masked = value
                      .replace(/^(\d{2})(\d)/, '$1.$2')
                      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                      .replace(/\.(\d{3})(\d)/, '.$1/$2')
                      .replace(/(\d{4})(\d)/, '$1-$2')
                      .substring(0, 18);
                    field.onChange(masked);
                  }}
                  placeholder="00.000.000/0000-00"
                  className={`input-field pr-12 font-mono ${errors.cnpj ? 'border-red-500' : ''}`}
                />
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-primary transition-colors">
              {loading ? (
                <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={20} />
              )}
            </div>
          </div>
          
          {alreadyExists && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl flex items-start gap-3 animate-in zoom-in-95 duration-300">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-lg text-amber-600">
                <Landmark size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Esta empresa já possui cadastro!</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                  A empresa <strong>{existingCompany?.razao_social}</strong> já está registrada.
                </p>
                <a 
                  href="/login" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
                >
                  Fazer Login no Portal
                </a>
              </div>
            </div>
          )}

          {errors.cnpj && !alreadyExists && <p className="text-red-500 text-xs mt-1 ml-1">{errors.cnpj.message}</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Razão Social</label>
          <input
            {...register('razao_social')}
            className={`input-field ${errors.razao_social ? 'border-red-500' : ''}`}
            placeholder="Nome oficial da empresa"
          />
          {errors.razao_social && <p className="text-red-500 text-xs mt-1 ml-1">{errors.razao_social.message}</p>}
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Nome Fantasia</label>
          <input
            {...register('nome_fantasia')}
            className={`input-field ${errors.nome_fantasia ? 'border-red-500' : ''}`}
            placeholder="Nome comercial (Opcional)"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Regime Tributário</label>
          <select 
            {...register('regime_tributario')} 
            className={`input-field ${errors.regime_tributario ? 'border-red-500' : ''}`}
          >
            <option value="SIMPLES_NACIONAL">Simples Nacional</option>
            <option value="LUCRO_PRESUMIDO"> Lucro Presumido</option>
            <option value="LUCRO_REAL">Lucro Real</option>
            <option value="MEI">MEI</option>
          </select>
          {errors.regime_tributario && <p className="text-red-500 text-xs mt-1 ml-1">{errors.regime_tributario.message}</p>}
        </div>

        <div className="col-span-1 text-xs bg-brand-primary/5 dark:bg-white/5 p-4 rounded-xl border border-brand-primary/20 flex items-start gap-3">
          <CheckCircle2 size={16} className="text-brand-primary mt-0.5 shrink-0" />
          <p className="text-slate-600 dark:text-slate-400">
            <strong>BrasilAPI Ativa</strong>: Os dados de <strong>endereço</strong> também serão preenchidos automaticamente para o próximo passo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step1_Fiscal;
