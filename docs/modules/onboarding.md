# Documentação Técnica: Módulo de Onboarding e Registro (v1.0.0)

## 1. Visão do Módulo
Este módulo é responsável por gerenciar o ciclo de vida inicial de novos usuários e empresas (tenants). Sua principal responsabilidade é validar convites de equipes, integrar com o provedor de identidade (Supabase) e persistir o vínculo do usuário com sua respectiva empresa no banco de dados local.

**Estabilização Crítica (v1.1.0)**: O backend utiliza rotas síncronas (`def`) para operações de banco de dados e e-mail, evitando o bloqueio do *Event Loop* do FastAPI e garantindo alta disponibilidade sob carga.

**Resiliência de Rede (v1.1.1)**: O frontend (`api.js`) agora detecta configurações de placeholder (ex: Supabase) e erros de rede, permitindo o funcionamento parcial do sistema sem travar as requisições ao backend local (`127.0.0.1:8000`).

## 2. Mapeamento de Dependências
- **Consome**:
  - `Supabase Auth`: Para autenticação e gestão de segurança.
  - `Resend API`: Para disparo de e-mails transacionais (convites).
  - `SQLite (erp.db)`: Para armazenamento persistente de dados de negócio.
- **Afeta**:
  - `Team Management`: Define quem tem acesso a quais recursos.
  - `Multi-tenant Middleware`: Define o `empresa_id` nas rotas autenticadas.

## 3. Dicionário de Dados
| Nome | Tipo | Descrição |
| :--- | :--- | :--- |
| `token` | `String` | UUID único gerado no disparo do convite (validade: 48h). |
| `usuario_id` | `UUID` | Identificador único retornado pelo Supabase Auth. |
| `tenant_id` | `Integer` | ID da empresa vinculada no banco de dados local. |
| `email` | `String` | Endereço de e-mail do usuário convidado. |
| `cnpj` | `String` | Identificador fiscal da empresa (Único, bloqueia duplicidade - 409 Conflict). |

## 4. Pontos de Extensão
- **Hooks de Registro**: O sistema permite a inserção de novos processos no `finalize-registration` (ex: criar workspace padrão, popular dados iniciais via mixins).
- **Identity Provider Abstraction**: O código foi desenhado para facilitar a troca do Supabase por outro provedor (cognito, firebase) ajustando apenas o componente frontend e o middleware de validação JWT.

---

# Roteiro de Vídeo (Script PSR)

## O Problema
"Como integrar novos colaboradores de forma segura e rápida sem gerenciar senhas sensíveis no nosso servidor?"

## A Solução (Tutorial)
1. **Convite**: O administrador gera um convite via painel (ou API).
2. **E-mail**: O colaborador recebe um e-mail com o design premium da Luminous Enterprise.
3. **Cadastro**: Ao clicar no link, o colaborador escolhe sua senha (que é processada diretamente pelo Supabase).
4. **Finalização**: O sistema vincula automaticamente o perfil dele ao banco de dados da empresa certa.

## O Resultado
O colaborador já cai no Dashboard com acesso total às ferramentas da empresa, com login sincronizado e segurança de nível corporativo.

**Timecodes Sugeridos:**
- 00:00 - Painel de Convites.
- 01:15 - Visual do E-mail recebido.
- 02:30 - Finalização de Registro.
- 03:00 - Login efetuado com sucesso.
