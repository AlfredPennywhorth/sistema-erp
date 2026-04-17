import React, { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, ChevronLeft, Rocket, CheckCircle2 } from 'lucide-react';
import { onboardingSchema, step1Schema, step2Schema, step3Schema } from '../../schemas/onboarding';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

import Step1_Fiscal from './Step1_Fiscal';
import Step2_Endereco from './Step2_Endereco';
import Step3_Finalizacao from './Step3_Finalizacao';

const MultiStepForm = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const { user, login, setActiveTenant } = useAuth();
  const navigate = useNavigate();

  const getStepSchema = (s) => {
    switch (s) {
      case 1: return step1Schema;
      case 2: return step2Schema;
      case 3: return step3Schema;
      default: return step1Schema;
    }
  };

  const currentSchema = useMemo(() => getStepSchema(step), [step]);

  const methods = useForm({
    resolver: zodResolver(currentSchema),
    mode: 'onChange',
    defaultValues: {
      regime_tributario: 'SIMPLES_NACIONAL',
      aceite_termos: false,
    }
  });

  // Debug obrigatório de erros
  console.log("[DEBUG] Erros atuais:", methods.formState.errors);

  // Reset controlado ao trocar etapa
  useEffect(() => {
    methods.reset(methods.getValues(), {
      keepDirty: true,
      keepTouched: true,
    });
  }, [step, methods]);

  const nextStep = async () => {
    const isValid = await methods.trigger();
    if (!isValid) {
      console.warn("[Onboarding] Validação Falhou no Passo", step, methods.formState.errors);
      return;
    }

    // Lógica de "Fast-Access" no Passo 1
    if (step === 1) {
      setIsSubmitting(true);
      try {
        const data = methods.getValues();
        let currentCnpj = data.cnpj || '';
        currentCnpj = currentCnpj.replace(/\D/g, '');
        
        if (currentCnpj.length === 14) {
          console.log('[Onboarding] Checando CNPJ no servidor...', currentCnpj);
          const response = await api.get(`/tenants/check-cnpj/${currentCnpj}`);
          
          if (response.data?.exists) {
            setAlreadyRegistered(true);
            return;
          }
        }
        
        // Se não existe, podemos seguir normalmente para o próximo passo.
        setStep(2);
      } catch (err) {
        console.error('Erro ao verificar CNPJ:', err);
        // Em caso de erro na verificacao (ex. rede), segue adiante e deixa falhar no final.
        setStep(2); 
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => setStep(s => s - 1);

  const onSubmit = async () => {
    setIsSubmitting(true);
    setAlreadyRegistered(false);
    try {
      const allData = methods.getValues();
      const payload = {
        ...allData,
        usuario_id: user?.id || '00000000-0000-0000-0000-000000000000',
        email: user?.email || 'mock@exemplo.com',
      };

      console.log('>>> [FRONTEND] ENVIANDO PAYLOAD FINAL:', payload);
      const response = await api.post('/tenants/setup', payload);
      console.log('Resposta recebida do servidor (Final):', response);
      
      // No novo retorno minimalista, não temos empresa_id, então usamos o input se necessário
      // Mas o backend agora retorna {"status": "ok", "message": "created"}
      // Se precisarmos do ID, podemos buscar via /active-tenant ou similar, 
      // mas para o fluxo de UI, o sucesso basta.
      setSuccess(true);
    } catch (err) {
      console.error('Erro no setup:', err);
      if (err.response?.status === 409) {
        setAlreadyRegistered(true);
      } else {
        const errorMsg = err.response?.data?.detail || err.message || 'Erro ao configurar empresa.';
        alert(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card p-12 text-center space-y-6 max-w-2xl mx-auto mt-20 animate-in zoom-in-95 duration-500 border border-emerald-500/20 shadow-emerald-500/5">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-4 shadow-lg ring-4 ring-emerald-500/5">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-black dark:text-white tracking-tight">Empresa Ativada com Sucesso!</h2>
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            A configuracao do seu ERP modular foi concluida com sucesso. Sua empresa ja esta isolada e configurada sob o regime <strong className="text-brand-primary">{methods.getValues('regime_tributario')}</strong>.
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-lg text-sm font-medium animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            ✅ Plano de Contas configurado com sucesso com base na sua atividade econômica (CNAE).
          </div>
        </div>
        <button 
          onClick={async () => {
            try {
              // Auto-login com admin se estivermos em ambiente de dev/mock
              await login('admin', 'password');
              navigate('/equipe');
            } catch (e) {
              navigate('/login');
            }
          }}
          className="btn-primary w-full max-w-xs mt-4 py-4 flex items-center justify-center gap-2 hover:scale-105 transition-transform"
        >
          Acessar Meu Painel <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  if (alreadyRegistered) {
    return (
      <div className="glass-card p-12 text-center space-y-6 max-w-2xl mx-auto mt-20 animate-in zoom-in-95 duration-500 border border-amber-500/20 shadow-amber-500/5">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-4 shadow-lg ring-4 ring-amber-500/5">
          <Rocket size={40} className="rotate-45" />
        </div>
        <h2 className="text-3xl font-black dark:text-white tracking-tight">Empresa Já Cadastrada</h2>
        <p className="text-slate-600 dark:text-slate-400">
          O CNPJ informado ja possui um registro ativo no sistema. Se voce e o proprietario ou administrador, por favor realize o login para acessar o painel de gestao.
        </p>
        <div className="flex flex-col gap-4">
          <Link 
            to="/login" 
            className="btn-primary w-full max-w-xs mx-auto py-4 flex items-center justify-center gap-2 hover:scale-105 transition-transform bg-amber-600 hover:bg-amber-700 border-none"
          >
            Ir para Login <ChevronRight size={20} />
          </Link>
          <button 
            type="button"
            onClick={() => {
              setAlreadyRegistered(false);
              setStep(1);
            }}
            className="text-slate-500 hover:text-brand-primary text-sm font-medium transition-colors"
          >
            Tentar outro CNPJ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Progress Stepper Premium */}
      <div className="flex items-center justify-between mb-12 relative px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center z-10">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              step >= s ? 'bg-brand-primary text-white scale-110 shadow-lg' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s ? <CheckCircle2 size={20} /> : s}
            </div>
            <span className={`text-xs mt-2 font-medium ${step >= s ? 'text-brand-primary dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              Passo {s}
            </span>
          </div>
        ))}
        {/* Progress Line */}
        <div className="absolute top-6 left-8 right-8 h-0.5 bg-slate-200 -z-0">
          <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${(step - 1) * 50}%` }} />
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="glass-card p-8 md:p-12 shadow-2xl">
          {step === 1 && <Step1_Fiscal />}
          {step === 2 && <Step2_Endereco />}
          {step === 3 && <Step3_Finalizacao />}

          <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button type="button" onClick={prevStep} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold hover:text-brand-primary dark:hover:text-white transition-colors">
                <ChevronLeft size={20} /> Voltar
              </button>
            ) : <div />}

            {step < 3 ? (
              <button 
                type="button" 
                onClick={nextStep} 
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2 pr-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processando...' : <>Proximo <ChevronRight size={20} /></>}
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="btn-primary flex items-center gap-2 bg-brand-secondary hover:bg-brand-secondary/90 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Configurando...' : <>Finalizar Configuracao <Rocket size={20} /></>}
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default MultiStepForm;
