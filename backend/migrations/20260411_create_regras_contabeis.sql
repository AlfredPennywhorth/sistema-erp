-- Migration: Criação da Tabela de Regras Contábeis
-- Data: 2026-04-11
-- Autor: Antigravity

-- 1. Criação do Tipo Enum para Eventos Contábeis
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoeventocontabil') THEN
        CREATE TYPE tipoeventocontabil AS ENUM (
            'COMPRA_PRAZO', 'COMPRA_AVISTA', 'VENDA_PRAZO', 'VENDA_AVISTA',
            'SERVICO_PRESTADO_PRAZO', 'SERVICO_PRESTADO_AVISTA', 'DESPESA_CONSUMO',
            'ADIANTAMENTO_CLIENTE', 'ADIANTAMENTO_FORNECEDOR', 'TRANSFERENCIA_INTERNA'
        );
    END IF;
END $$;

-- 2. Criação da Tabela de Regras
CREATE TABLE IF NOT EXISTS regras_contabeis (
    id UUID PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    tipo_evento tipoeventocontabil NOT NULL,
    natureza naturezafinanceira NOT NULL, 
    conta_debito_id UUID NOT NULL REFERENCES plano_contas(id),
    conta_credito_id UUID NOT NULL REFERENCES plano_contas(id),
    historico_padrao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID,
    
    -- Constraint de Unicidade
    CONSTRAINT uq_regra_evento_natureza UNIQUE (empresa_id, tipo_evento, natureza)
);

-- 3. Índice de Tenant
CREATE INDEX IF NOT EXISTS idx_regras_contabeis_tenant ON regras_contabeis(empresa_id);

COMMENT ON TABLE regras_contabeis IS 'Armazena as regras de de-para para automação contábil a partir de eventos financeiros.';
