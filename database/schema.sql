-- ==========================================
-- ESTRUTURA INICIAL - ERP MODULAR MULTI-TENANT
-- 1. EXTENSÕES E ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE regime_tributario_enum AS ENUM ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE natureza_conta_enum AS ENUM ('DEVEDORA', 'CREDORA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_conta_enum AS ENUM ('ATIVO', 'PASSIVO', 'RECEITA', 'DESPESA', 'PATRIMONIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. TABELAS CORE
-- ==========================================

-- TABELA DE EMPRESAS (TENANTS)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj CHAR(14) UNIQUE NOT NULL,
    inscricao_estadual VARCHAR(20),
    cnae_principal CHAR(7),
    regime_tributario regime_tributario_enum DEFAULT 'SIMPLES_NACIONAL',
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf CHAR(2),
    codigo_municipio_ibge CHAR(7),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    excluido_em TIMESTAMP WITH TIME ZONE
);

-- PLANO DE CONTAS (MULTI-TENANT)
CREATE TABLE IF NOT EXISTS plano_contas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    codigo_estruturado VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo tipo_conta_enum NOT NULL,
    natureza natureza_conta_enum NOT NULL,
    nivel INTEGER NOT NULL,
    aceita_lancamento BOOLEAN DEFAULT TRUE,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(empresa_id, codigo_estruturado)
);

-- AUDITORIA (CONFORMIDADE LGPD)
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id),
    usuario_id UUID, -- Referência ao Supabase Auth
    acao VARCHAR(50) NOT NULL,
    tabela_afetada VARCHAR(50),
    registro_id UUID,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_origem INET,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. SEGURANÇA (RLS)
-- ==========================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Política de isolamento por empresa_id (Baseado no JWT claim 'empresa_id')
-- CREATE POLICY multi_tenant_isolation_policy ON plano_contas
-- FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);
