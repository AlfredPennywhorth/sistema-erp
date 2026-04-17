# Módulo de Tesouraria - Documentação Técnica

Este documento descreve a arquitetura, funcionalidades e fluxos do módulo de Tesouraria do Sistema ERP.

## 1. Visão Geral
A Tesouraria é responsável pelo monitoramento de saldos bancários, conciliação de lançamentos e histórico de movimentações (Regime de Caixa). Ela consolida dados de múltiplas contas bancárias e permite a gestão fina de entradas e saídas.

## 2. Arquitetura Técnica

### Backend (FastAPI + SQLModel)
- **Endpoint Principal**: `/api/v1/financeiro/extrato`
- **Lógica de Dados**: Filtra lançamentos com status `PAGO` (liquidados).
- **Paginação**: Implementa paginação tradicional via `offset` e `limit`. O padrão é de **10 registros por página**.
- **Segurança**: Isolamento por `tenant_id` em todas as queries.

### Frontend (React 19 + Tailwind)
- **Componente**: `Tesouraria.jsx`
- **Estado Local**: Gerencia paginação, filtros por conta e edição de lançamentos.
- **Integração**: Utiliza a biblioteca `api` customizada (axios) para comunicação REST.

## 3. Melhorias Recentes (v1.1)
- **Paginação Dinâmica**: Implementado seletor de quantidade de registros (10, 20, 50, 100).
- **Correção de UI**: Bug de mapeamento de campos (`valor` vs `valor_pago`) na edição de lançamentos resolvido.
- **Performance**: Removidos logs de diagnóstico em ambiente de desenvolvimento.

---

# Script de Vídeo Tutorial (Roteiro PSR)

**Título**: Gestão de Tesouraria e Fluxo de Caixa
**Objetivo**: Ensinar o usuário a monitorar saldos e corrigir lançamentos.

| Tempo | Visual | Áudio/Locução |
| :--- | :--- | :--- |
| 00:00 | Tela inicial do Dashboard, clicando em "Financeiro" > "Tesouraria". | "Bem-vindo ao tutorial de Tesouraria. Hoje vamos aprender a monitorar sua saúde financeira." |
| 00:15 | Zoom nos cards de saldo bancário. | "Aqui no topo, você visualiza o saldo consolidado de todas as suas contas em tempo real." |
| 00:30 | Clicando em um card de conta (ex: Banco do Brasil). | "Você pode filtrar o extrato clicando diretamente em uma conta específica para ver apenas as movimentações dela." |
| 01:00 | Descendo para a tabela de movimentação, apontando para o novo seletor de registros. | "Agora você tem controle total da exibição. Pode escolher ver de 10 até 100 registros por página para facilitar sua conferência." |
| 01:30 | Clicando no ícone de editar em um lançamento. | "Identificou um erro? Clique em editar para reclassificar a categoria ou ajustar o valor sem complicações." |
| 02:00 | Tela de sucesso após salvar. | "Simples, rápido e seguro. Sua tesouraria sempre em dia." |

---
*Documentação gerada automaticamente por Antigravity Architect v1.0*
