# ERP Modular - Documentação de Projeto (Gemini)

| Campo | Descrição | Exemplo |
| :--- | :--- | :--- |
| **Última Atualização** | 2026-04-11 15:51 | Data e Hora ISO |
| **Responsável** | Gemini / Antigravity | Quem operou a IA |
| **Branch/Versão** | main | Onde o código está |

---

Este arquivo serve como documentação viva para auxiliar o assistente AI (Gemini) a manter o contexto do projeto, histórico de decisões técnicas e progresso.

### 📌 Status Atual em 17/04/2026

1.  **Backend (Online)**: Porta 8000. Sincronizado com Fase 4.
    - Health Check: `OK`
    - Padronização de Portas: Removidos hardcodes de 5174/5175. Utiliza `FRONTEND_URL`.
    - Autenticação: Logs de diagnóstico adicionados ao middleware para validação de JWT.
2.  **Frontend (Online)**: Porta 5173 (Porta Padrão).
    - Config: `.env` corrigido para apontar para backend:8000.
    - Convites: Links dinâmicos usando `window.location.origin`.
3.  **Reparo de Dados**: Vínculo do usuário `[REDACTED_EMAIL]` com a empresa **ALFRED PENNYWORTH** restaurado manualmente.

---

## 🛠️ Histórico de Alterações e Correções

### [2026-04-17 00:10] - Padronização de Portas e Reparo de Tenancy
- **Infra/CORS**: Unificação da porta do Frontend em `5173` e Backend em `8000`. Removida a permissão para portas aleatórias (5174, 5175) no middleware e CORS.
- **Backend**: Implementada a leitura de `FRONTEND_URL` em `team.py` para geração de convites dinâmicos.
- **Frontend**: Corrigida a geração de link de convite em `TeamManagement.jsx` para suportar qualquer porta via `window.location.origin`.
- **Banco de Dados**: Correção emergencial (Quickfix) criando vínculo Admin para `[REDACTED_EMAIL]` na empresa `ALFRED PENNYWORTH`, resolvendo o bloqueio de acesso pós-registro.
- **Observabilidade**: Adicionados logs de `INFO` no middleware de autenticação para rastrear decodificação de claims do Supabase.

---

## 🛠️ Histórico de Alterações e Correções

### [2026-04-13 01:30] - Auditoria e Estabilização da Tesouraria
- **Frontend**: Corrigida a falha onde o extrato não recarregava automaticamente ao alterar o seletor de período (passou a reagir ao snapshot de `appliedFilters`).
- **Frontend**: Corrigido bug no modal de edição onde os campos de data e valor apareciam vazios ou não salvavam devido a divergência com o esquema do backend (`data_pagamento` vs `data`).
- **Backend/Audit**: Realizada prova definitiva de filtros via script `prova_definitiva_filtros.py`, confirmando que o isolamento por tenant e filtros de data e descrição estão 100% operacionais.
- **UX**: Melhorado o feedback visual de "Filtrando extrato..." para evitar confusão durante o carregamento assíncrono.

### [2026-04-11 15:50] - Melhorias na Tesouraria e Documentação (Skill)
- **Frontend**: Implementada paginação dinâmica na Tesouraria (seletor de 10, 20, 50, 100 registros).
- **Bug Fix**: Corrigida falha na edição de lançamentos onde os campos `data` e `valor` não eram mapeados corretamente no salvamento.
- **Backend**: Alterado o tamanho padrão da página de extrato para 10 registros.
- **Skill**: Criada documentação técnica detalhada e roteiro educativo (PSR) em `docs/modules/financeiro-tesouraria.md`.
- **Cleanup**: Remoção de logs de diagnóstico (`console.log`) e comentários desnecessários.

### [2026-04-11 12:00] - Reativação e Estabilização
- **Infra**: Banco SQLite (`erp.db`) removido do fluxo principal em favor do **Supabase**.
- **Backend**: Adicionado suporte no CORS para porta `5174` (usada quando a 5173 está ocupada).
- **Cleanup**: Remoção de logs obsoletos (`error.log`, `backend.log`).
- **Verificação**: Realizado Smoke Test no endpoint `/health` com sucesso.

### [2026-04-10 19:30] - Governança: Identificação de Usuário e SoD
- **Auth / UX**: Adicionada exibição do nome do usuário logado no Header Premium.
- **Governança**: Refatorado o login de demonstração para gerar IDs únicos baseados no perfil (`admin` vs `operador`).
- **Compliance**: Ativada a regra onde o usuário que cria o lançamento não pode ser o mesmo que realiza a liquidação quando o compliance estrito está ativo.

### [2026-04-05 14:14] - Estabilização de Convites e Auto-Select
- **Backend**: `get_current_tenant_id` refatorado para melhor tratamento de erros (400 vs 422).
- **Frontend**: Auto-select de empresa para Admin no Mock Login. Tratamento robusto de erros no `InviteModal` para evitar crashes.

---

## 🚀 Tecnologias Utilizadas
- **Frontend**: React 19, Vite 8, Tailwind CSS (Vanilla CSS predominante).
- **Backend**: Python 3.x, FastAPI, SQLModel (SQLAlchemy 2.0 style).
- **Database**: PostgreSQL (Supabase) + Migrações automáticas.
- **Segurança**: JWT via Supabase Auth + Middleware de Tenant Isolation.

## 🛡️ Diretrizes de Negócio e Compliance
1. **Segregação de Funções (SoD)**: Controle estrito de aprovação financeira.
2. **Auditoria Total**: Todo `CREATE/UPDATE/DELETE` gera log na tabela `logs_auditoria`.
3. **Multi-tenant**: Hard-isolation. O `empresa_id` é obrigatório em todos os filtros de Query via Depends.
