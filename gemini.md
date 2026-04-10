# ERP Modular - Documentação de Projeto (Gemini)

| Campo | Descrição | Exemplo |
| :--- | :--- | :--- |
| **Última Atualização** | 2026-04-10 02:15 | Data e Hora ISO |
| **Responsável** | Gemini / Antigravity | Quem operou a IA |
| **Branch/Versão** | main | Onde o código está |

---

Este arquivo serve como documentação viva para auxiliar o assistente AI (Gemini) a manter o contexto do projeto, histórico de decisões técnicas e progresso.

## 🛠️ Alterações e Histórico de Correções

### [2026-04-10 02:40] - Hotfix: Correção de Referência no Login
- **Auth / Bugfix**: Resolvido erro `data is not defined` no `AuthContext.jsx`. A chamada do `supabase.auth.signInWithPassword` foi restaurada no fluxo de login real.
- **Status**: Fluxo de login restaurado e funcional.

### [2026-04-10 02:15] - Central de Acesso e Redirecionamento Inteligente
- **Backend / Estabilidade**: Adicionado logging estruturado no `brasil_api.py` para monitoramento de falhas externas.
- **Frontend / Auth**: Função `login` agora retorna a lista de empresas vinculadas.
- **UX / Redirecionamento**: Implementada lógica "Smart-Redirect" no `Login.jsx`:
    - 0 empresas: Redireciona para Onboarding.
    - 1 empresa: Auto-seleciona e redireciona para Dashboard.
    - \>1 empresa: Redireciona para `/selecionar-empresa` (Central de Acesso).
- **Interface**: Refinamento visual da `SelectTenant.jsx` com animações stagger e suporte a troca de visualização (Grid/Lista).
- **Segurança**: Rota de seleção protegida e isolada (Sidebar/Header ocultos até a seleção).
- **Status**: Fluxo de acesso multi-empresa operacional.

### [2026-04-10 01:45] - Estabilização e Multi-tenancy: Correção de CNPJ e Seletor de Empresa
- **Backend / Bugfix**: Aumentado o timeout da consulta de CNPJ na BrasilAPI de 2s para 10s para resolver falhas por lentidão externa.
- **Frontend / Bugfix**: `ParceiroModal.jsx` aprimorado para exibir mensagens de erro reais do backend na consulta de CNPJ.
- **Multi-tenancy / UX**: Criada página `SelectTenant.jsx` com design premium (Glassmorphism + Framer Motion) para seleção manual de empresas.
- **Autenticação / Fluxo**: Desativada a auto-seleção de empresa no login/refresh. O usuário agora é direcionado para a seleção de empresa se não houver um tenant ativo na sessão.
- **Status**: Funcionalidades integradas e prontas para uso.

### [2026-04-10 01:25] - Estabilização Crítica: Modal de Parceiros
- **Frontend / Refatoração**: Removida a biblioteca `react-input-mask` do `ParceiroModal.jsx` para eliminar crashes de renderização ("Tela Branca").
- **Máscaras Manuais**: Implementadas funções de máscara via Regex para CPF/CNPJ, CEP e Telefone (Comercial e de Contatos).
- **Blindagem**: Implementada verificação de resiliência (`Array.isArray`) ao carregar o Plano de Contas, garantindo que falhas na API financeira não quebrem o modal.
- **Consistência**: Todos os campos do formulário agora são inicializados como strings vazias, prevenindo avisos de inputs não controlados.
- **Status**: Modal operacional e estável.

### [2026-04-10 01:05] - Estabilização de Interface e Conectividade
- **Frontend / Router**: Resolvido erro `You cannot render a <Router> inside another <Router>`. Removido `<BrowserRouter>` redundante do `App.jsx` que conflitava com o `main.jsx`.
- **Backend / Setup**: Corrigido `NameError: name 'empresa_id' is not defined` no endpoint de `/setup`. A variável estava referenciada incorretamente durante a injeção do plano de contas.
- **Frontend / Onboarding**: Removida dependência problemática `react-input-mask` (causadora de crash). Implementada máscara manual via regex no `Step1_Fiscal` e `Step2_Endereco`.
- **Backend / Infra**: Forçado o uso de `NullPool` para todas as conexões Supabase/Postgres. Esta medida garante que o backend não acumule conexões zumbis e reduz o risco de travamentos por timeout de pool.
- **Plano de Contas**: Implementados guards no `useEffect` de sugestão de código para prevenir loops infinitos e instabilidade na renderização do modal.
- **Middleware**: Revisão de resiliência no middleware de autenticação e multitenancy.

### [2026-04-10 00:06] - Fase 3: Motor de Execução Financeira e Tesouraria
- **Tesouraria Premium**: Implementada gestão de Contas Bancárias e Bancos vinculados ao inquilino.
- **Execução & SoD**: Criada lógica robusta de liquidação (baixa) de títulos financeiros com proteção de Segregação de Funções (SoD) para compliance.
- **Atomicidade**: Garantida a atualização atômica de saldos bancários sincronizada com lançamentos de caixa.
- **Auditoria Nativa**: Implementado `LogAuditoria` para rastreabilidade total de operações críticas (Criação/Liquidação).
- **Dashboard Dinâmico**: Painel de controle agora consome dados reais de saldo, contas a pagar/receber e atividades recentes.

### [2026-04-09 23:40] - Correção de Estabilidade do Logout
- **Bug Fix**: Resolvido problema onde o botão "Sair" não respondia adequadamente em condições de erro de rede ou sessão expirada.
- **Resiliência**: Funções de logout (Contexto e Header) agora utilizam `try/catch/finally` para garantir que `localStorage` e estados de autenticação sejam limpos independentemente da resposta do servidor.
- **UX**: Adicionada navegação forçada para `/login` pós-logout como medida de segurança.

### [2026-04-09 02:40] - Correção do Modal de Parceiros e Aba de Contatos
- **Correção de Crash**: Removida a render prop do `react-input-mask` que causava erro de renderização após atualização do componente.
- **Melhoria UX**: Adicionada aba dedicada para "Contatos" no modal de parceiros.
- **Funcionalidade**: Implementado suporte a múltiplos contatos (Nome, Cargo, Email, Telefone) com opção de definir um contato principal (Estrela).
- **Refatoração**: Modal expandido para `max-w-3xl` para melhor visualização dos dados de contatos e financeiro.
- **Status**: Funcionalidade 100% operacional no frontend.

### [2026-04-09 01:30] - Estabilização Crítica e Correção de Herança (Fix Loading)
- **Problema: Loading Infinito no Frontend**
  - **Causa**: O backend estava travado (Internal Server Error / Hang) devido a um erro de mapeamento no SQLAlchemy causado por herança redundante (`FullAuditMixin` + `AuditMixin`) e campo duplicado (`empresa_id`) no modelo `PlanoConta`.
- **Solução Aplicada**:
  - **Refatoração de Modelo**: Removida a herança redundante e o campo `empresa_id` duplicado em `database.py`.
  - **Cleanup**: Executado `taskkill` nos processos Python e reiniciado o servidor Uvicorn.
- **Status**: Sistema online, loading central removido e dados carregando normalmente.

### [2026-04-09 01:25] - Correção de Sincronização do Banco (Tela Vazia)
- **Problema: Tela de Plano de Contas Vazia**
  - **Causa**: O modelo `PlanoConta` no Python exigia a coluna `ativo`, mas ela não existia na tabela física do Supabase, causando erro silencioso na API.
- **Solução Aplicada**:
  - **DB Migração**: Executado script manual para adicionar as colunas `ativo`, `criado_em` e `atualizado_em` via SQL direto.
  - **Modelo**: Atualizado `PlanoConta` no `database.py` para herdar de `AuditMixin`, garantindo rastreabilidade.
- **Status**: API normalizada e dados voltaram a aparecer no frontend.
- **Problema: Servidor Travado (Timeout 10s)**
  - **Causa**: `ImportError` ao tentar rodar o backend devido à falta da função `get_current_user_id` em `app/core/auth.py`, que foi referenciada nos novos endpoints do Plano de Contas.
- **Solução Aplicada**:
  - **Auth**: Implementada a função `get_current_user_id` para extrair o ID do usuário do cabeçalho `X-User-ID` (essencial para auditoria).
  - **Infra**: Executado `taskkill` para limpar processos Python travados e reiniciado o servidor Uvicorn.
  - **Status**: Backend restaurado e respondendo normalmente com logs de startup OK.

### [2026-04-09 01:15] - CRUD Completo do Plano de Contas e Auditoria
- **Melhoria: Gestão de Estrutura Contábil**
  - **Ação**: Implementado CRUD completo (Create, Read, Update, Delete) para o Plano de Contas.
  - **Segurança**: Adicionada trava no backend que impede a exclusão de contas sintéticas (pais) que possuem filhos vinculados.
  - **Auditoria**: Backend agora registra `user_id` e `timestamp` em cada criação/edição para fins de conformidade.
  - **UX/Frontend**:
    - Refatoração para Visualização Tabular Densa com padding dinâmico por hierarquia.
    - Sugestão automática de código estruturado baseado na conta pai selecionada.
    - Toggle rápido de status (Ativo/Inativo) e filtragem por nome/código.

### [2026-04-09 00:36] - Estabilização do Plano de Contas
- **Problema: Loop Indefinido no Loading**
  - **Causa Provável**: Falha na ordenação de dados malformados ou loop hierárquico infinito na árvore de contas.
- **Soluções Aplicadas**:
  - **Resiliência no Frontend**: Adicionado check `Array.isArray(data)` e spread operator no `sort` para evitar mutação direta e quebras.
  - **Segurança de Hierarquia**: Implementado `depth guard` no loop de ancestrais para prevenir travamento do navegador (Infinite Loop).
  - **Diagnóstico**: Inserção de logs verbosos no `PlanoContas.jsx` para monitorar a comunicação com a API Financeira.

### [2026-04-06 00:26] - Correção de Timeout e Estabilização de Dependências
- **Problema: Servidor Travado (Timeout 10s)**
  - **Causa 1**: Múltiplos processos Python zumbis (10+) rodando em paralelo no Windows.
  - **Causa 2**: Erro crítico de importação (`ImportError`) ao incluir o SDK `supabase`.
- **Solução de Infra: Cleanup & Refactoring**
  - **Ação 1**: Executado `taskkill /F /IM python.exe` para limpar o ambiente.
  - **Ação 2**: Refatorado `team.py` (Backend) para remover o SDK `supabase` e utilizar chamadas REST diretas via `httpx`.
  - **Ação 3**: Convertido endpoint `finalize_registration` para `async def`.
- **Impacto**: Servidor restaurado e mais estável.

---

Este arquivo serve como documentação viva para auxiliar o assistente AI (Gemini) a manter o contexto do projeto, histórico de decisões técnicas e progresso.

## 🚀 Tecnologias Utilizadas
- **Frontend**: React, Vite, Tailwind CSS (Vanilla CSS predominante), Lucide React, React Hook Form, Zod.
- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL (Supabase).
- **Autenticação**: Supabase Auth (Integrado com JWT no Backend).
- **Multitenancy**: Isolamento lógico por `empresa_id` (Tenant).

## 🛠️ Alterações e Histórico de Correções

### [2026-04-05 14:14] - Estabilização de Convites e Auto-Select para Admin
- **Melhoria 1: Resiliência de Headers (Backend)**
  - **Ação**: `get_current_tenant_id` refatorado para retornar 400 Bad Request em vez de 422 ao encontrar headers vazios/nulos.
  - **Impacto**: Redução de erros de validação genéricos do FastAPI no frontend.
- **Melhoria 2: Auto-select de Empresa para Admin (Mock)**
  - **Ação**: `AuthContext.jsx` e `tenants.py` atualizados para buscar e selecionar a primeira empresa vinculada ao administrador logo após o login simulado.
  - **Impacto**: Eliminação do estado `tenant_id: null` para desenvolvedores e testadores.
- **Melhoria 3: Tratamento de Erros Robusto (Frontend)**
  - **Ação**: Implementado formatador de erro no `InviteModal.jsx` que lida com objetos/arrays do Pydantic (JSON.stringify/map).
  - **Impacto**: Fim da "Tela Branca" (crash do React) por renderização de objetos inválidos como filhos.
- **Melhoria 4: UX Preventiva**
  - **Ação**: Botão de convite desabilitado se não houver tenant ativo no modal.

### [2026-04-04 14:38] - Implementação de Multicompany N:N e Vínculos (Crachá)
- **Melhoria 1: Arquitetura N:N (Múltiplas Empresas)**
  - **Ação**: Refatorado `database.py` para utilizar `UsuarioEmpresa` como tabela de associação.
  - **Impacto**: Usuários agora podem pertencer a N empresas com diferentes roles (ADMIN, OPERADOR, CONTADOR).
- **Melhoria 2: Middleware "Badge Validation"**
  - **Ação**: Implementada validação de vínculo ativa no `middleware.py`.
  - **Impacto**: Bloqueio automático (`403 Forbidden`) se o usuário tentar acessar uma empresa sem vínculo no banco local, mitigando riscos de acesso indevido.
- **Melhoria 3: Setup Transacional (Onboarding)**
  - **Ação**: Refatorado endpoint `/setup` para usar transações atômicas (`session.begin()`).
  - **Impacto**: Garante que o vínculo ADMIN seja criado no mesmo passo da empresa, evitando "Tenants órfãos".
- **Frontend: Hidratação e Persistência**
  - **Ação**: Atualizado `AuthContext.jsx` para persistir e hidratar `activeTenant` via `localStorage`.
  - **Impacto**: Usuário permanece na empresa selecionada após F5/Refresh.

### [2026-04-03 22:29] - Estabilização de Onboarding e Hidratação de Sessão
- **Problema 1: Onboarding Loop (F5)**
  - **Causa**: `AuthContext` liberava `loading: false` antes de carregar o `activeTenant`, fazendo o `ProtectedRoute` desviar o usuário indevidamente.
  - **Solução**: Refatoração do `initializeAuth` para ser 100% asíncrono e aguardar a hidratação completa da empresa.
- **Problema 2: Botão "Próximo" Travado**
  - **Causa**: Falhas de validação silenciosas do Zod no `MultiStepForm`.
  - **Solução**: Implementado sistema de logs (`console.warn`) para expor erros de validação e garantia de `await` na persistência do tenant antes do redirecionamento.
- **Melhoria Visual**: Adição de um `Loading Universal` no `AppContent` para evitar que o usuário veja a UI "piscando" ou em estado quebrado enquanto os dados sincronizam.

### [2026-04-02] - Correção de Login Mock e Conectividade
- **Problema 1**: Erro `setMockUser is not defined`.
- **Problema 2**: Falha de login em modo Mock.
- **Problema 3**: Conectividade Intermitente (CORS/Rede). Padronizada `baseURL` para `http://localhost:8000`.

## 📂 Estrutura do Projeto
- `/backend`: API FastAPI, integração Supabase, modelos PostgreSQL.
- `/frontend`: React + Supabase Client, dashboard e onboarding.
- **Infra**: PostgreSQL rodando no Supabase (Removido SQLite local `erp.db` para escala).

## ⚙️ Comandos Úteis
### Frontend
```bash
cd frontend
npm run dev
```

### Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Administração
```bash
cd backend
python scripts/fix_admin.py
```

## 🎯 Próximos Passos
1. **Módulo de Vendas**: Iniciar a estrutura de pedidos e faturamento.
2. **Dashboard Financeiro**: Gráficos de receita por tenant.
3. **Persistência Offline**: Estudar service workers para resiliência no PDV.

---
*Documentação atualizada via Protocolo de Sincronização de Contexto.*
