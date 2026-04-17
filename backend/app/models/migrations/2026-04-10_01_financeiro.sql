-- Migration: 2026-04-10_01_financeiro_transacional.sql
-- Descrição: Criação do Motor Financeiro (Tabelas e Índices)

BEGIN;

-- 1. Tabelas de Apoio à Tesouraria
CREATE TABLE IF NOT EXISTS bancos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_bacen VARCHAR(10) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    banco_id UUID NOT NULL REFERENCES bancos(id),
    nome VARCHAR(100) NOT NULL, -- Ex: Bradesco Empresa
    agencia VARCHAR(20) NOT NULL,
    conta VARCHAR(20) NOT NULL,
    saldo_inicial DECIMAL(18,2) DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS centros_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'ANALITICO', -- SINTETICO, ANALITICO
    parent_id UUID REFERENCES centros_custo(id),
    is_active BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL, -- Ex: PIX, Boleto
    taxa_padrao DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela Principal: Lancamentos Financeiros (Universal Ledger)
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Classificação
    tipo VARCHAR(20) NOT NULL,         -- PROVISAO, CAIXA, TRANSFERENCIA
    natureza VARCHAR(10) NOT NULL,     -- PAGAR, RECEBER
    status VARCHAR(20) DEFAULT 'ABERTO', -- ABERTO, PAGO, PARCIAL, CANCELADO, CONCILIADO
    
    -- Vínculos
    parceiro_id UUID REFERENCES parceiros(id),
    plano_contas_id UUID NOT NULL REFERENCES plano_contas(id),
    centro_custo_id UUID REFERENCES centros_custo(id),
    conta_bancaria_id UUID REFERENCES contas_bancarias(id), -- Usado na liquidação
    forma_pagamento_id UUID REFERENCES formas_pagamento(id),
    
    -- Valores
    valor_previsto DECIMAL(18,2) NOT NULL DEFAULT 0,
    valor_pago DECIMAL(18,2) NOT NULL DEFAULT 0,
    juros_multa DECIMAL(18,2) NOT NULL DEFAULT 0,
    desconto DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Datas
    data_vencimento DATE NOT NULL,
    data_competencia DATE DEFAULT CURRENT_DATE,
    data_pagamento DATE,
    
    -- Descritivo
    descricao VARCHAR(255) NOT NULL,
    documento VARCHAR(100),
    observacoes TEXT,
    
    -- Governança (SoD) e Auditoria
    usuario_criacao_id UUID NOT NULL, 
    usuario_liquidacao_id UUID,        
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices Estratégicos
CREATE INDEX IF NOT EXISTS idx_lf_empresa_status ON lancamentos_financeiros(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_lf_vencimento ON lancamentos_financeiros(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_banc_empresa ON contas_bancarias(empresa_id);

-- 4. Inserção de Dados Básicos (Bancos principais)
INSERT INTO bancos (codigo_bacen, nome) VALUES 
('001', 'BANCO DO BRASIL S.A.'),
('033', 'BANCO SANTANDER (BRASIL) S.A.'),
('104', 'CAIXA ECONOMICA FEDERAL'),
('237', 'BANCO BRADESCO S.A.'),
('341', 'ITAÚ UNIBANCO S.A.'),
('197', 'STONE INSTITUIÇÃO DE PAGAMENTO S.A.'),
('260', 'NU PAGAMENTOS S.A. (NUBANK)')
ON CONFLICT (codigo_bacen) DO NOTHING;

COMMIT;
