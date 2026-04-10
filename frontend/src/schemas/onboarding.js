import { z } from 'zod';

export const onboardingSchema = z.object({
  // Step 1: Identificacao Fiscal
  cnpj: z.string()
    .min(14, 'CNPJ deve ter 14 numeros')
    .max(18, 'CNPJ Invalido')
    .transform(val => val.replace(/\D/g, '')),
  razao_social: z.string().min(3, 'Razao Social obrigatoria'),
  nome_fantasia: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  regime_tributario: z.enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI']),

  // Step 2: Endereco (Sera auto-preenchido via BrasilAPI)
  cep: z.string()
    .min(8, 'CEP deve ter 8 numeros')
    .transform(val => val.replace(/\D/g, '')),
  logradouro: z.string().min(3, 'Logradouro obrigatorio'),
  numero: z.string().min(1, 'Numero obrigatorio'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro obrigatorio'),
  cidade: z.string().min(2, 'Cidade obrigatoria'),
  uf: z.string().length(2, 'UF deve ter 2 letras'),

  // Step 3: Aceite e Finalizacao
  aceite_termos: z.boolean().refine(val => val === true, 'Voce deve aceitar os termos de uso (LGPD)'),
});

// Schemas segmentados por passo
export const step1Schema = onboardingSchema.pick({
  cnpj: true,
  razao_social: true,
  nome_fantasia: true,
  inscricao_estadual: true,
  regime_tributario: true
});

export const step2Schema = onboardingSchema.pick({
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true
});

export const step3Schema = onboardingSchema.pick({
  aceite_termos: true
});
