import React, { useEffect, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { MapPin, Map, Loader2, Search } from 'lucide-react';
import axios from 'axios';
// import InputMask from 'react-input-mask';

const Step2_Endereco = () => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext();
  const [loading, setLoading] = useState(false);
  const cepValue = watch('cep');

  useEffect(() => {
    const cleanCep = cepValue?.replace(/\D/g, '');
    if (cleanCep?.length === 8) {
      handleFetchCep(cleanCep);
    }
  }, [cepValue]);

  const handleFetchCep = async (cep) => {
    setLoading(true);
    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      const data = response.data;
      
      setValue('logradouro', data.street, { shouldValidate: true });
      setValue('bairro', data.neighborhood, { shouldValidate: true });
      setValue('cidade', data.city, { shouldValidate: true });
      setValue('uf', data.state, { shouldValidate: true });
      
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
          <MapPin size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Onde sua empresa está?</h2>
          <p className="text-slate-600 dark:text-slate-300">Dados de localização para emissão de notas fiscais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="md:col-span-2 relative">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">CEP</label>
          <div className="relative group">
            <Controller
              name="cep"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const masked = value
                      .replace(/(\d{5})(\d)/, '$1-$2')
                      .substring(0, 9);
                    field.onChange(masked);
                  }}
                  placeholder="00000-000"
                  className={`input-field pr-12 font-mono ${errors.cep ? 'border-red-500' : ''}`}
                />
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-primary transition-colors">
              {loading ? <Loader2 size={20} className="animate-spin text-brand-primary" /> : <Search size={20} />}
            </div>
          </div>
          {errors.cep && <p className="text-red-500 text-xs mt-1 ml-1">{errors.cep.message}</p>}
        </div>

        <div className="md:col-span-4">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Logradouro</label>
          <input
            {...register('logradouro')}
            className={`input-field ${errors.logradouro ? 'border-red-500' : ''}`}
            placeholder="Ex: Avenida das Empresas"
          />
          {errors.logradouro && <p className="text-red-500 text-xs mt-1 ml-1">{errors.logradouro.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Número</label>
          <input
            {...register('numero')}
            className={`input-field ${errors.numero ? 'border-red-500' : ''}`}
            placeholder="123"
          />
          {errors.numero && <p className="text-red-500 text-xs mt-1 ml-1">{errors.numero.message}</p>}
        </div>

        <div className="md:col-span-4">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Complemento</label>
          <input
            {...register('complemento')}
            className="input-field"
            placeholder="Sala 101, Bloco B"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Bairro</label>
          <input
            {...register('bairro')}
            className={`input-field ${errors.bairro ? 'border-red-500' : ''}`}
            placeholder="Ex: Centro"
          />
          {errors.bairro && <p className="text-red-500 text-xs mt-1 ml-1">{errors.bairro.message}</p>}
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">Cidade</label>
          <input
            {...register('cidade')}
            className={`input-field ${errors.cidade ? 'border-red-500' : ''}`}
            placeholder="Ex: São Paulo"
          />
          {errors.cidade && <p className="text-red-500 text-xs mt-1 ml-1">{errors.cidade.message}</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-semibold mb-2 ml-1 uppercase tracking-wider text-slate-500">UF</label>
          <input
            {...register('uf')}
            className={`input-field text-center ${errors.uf ? 'border-red-500' : ''}`}
            placeholder="SP"
            maxLength={2}
          />
          {errors.uf && <p className="text-red-500 text-xs mt-1 ml-1">{errors.uf.message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Step2_Endereco;
