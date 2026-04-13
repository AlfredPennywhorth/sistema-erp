# 🧠 Skill: Diagnóstico e Recuperação de Sistema (ERP Modular)

Esta Skill define o procedimento padrão para identificar e resolver problemas de conectividade, carregamento de página e conflitos de porta no ambiente de desenvolvimento.

## 🛠️ Checklist de Saúde (Status Rápido)

Para um diagnóstico rápido, execute os seguintes comandos no terminal:

### 1. Verificar Backend (FastAPI)
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/health
```
**Esperado**: `status: "online"`.

### 2. Verificar Frontend (Vite)
```powershell
curl http://localhost:5174
```
**Esperado**: Retorno de HTML contendo `<div id="root">`.

---

## 🚨 Procedimento de "Limpeza Profunda" (Deep Clean)

Se a página não carregar, houver "Red Bar" persistente ou erro de "EADDRINUSE", siga estes passos:

### Passo 1: Matar processos órfãos
O Windows às vezes mantém processos de Python/Node ativos mesmo após fechar o console.
```powershell
taskkill /F /IM python.exe; taskkill /F /IM node.exe; taskkill /F /IM uvicorn.exe
```

### Passo 2: Reiniciar os Serviços
Sempre utilize as portas padrão documentadas para evitar falhas de CORS.

**Terminal A (Backend):**
```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal B (Frontend):**
```powershell
cd frontend
npm run dev -- --port 5174
```

---

## 🔍 Diagnóstico de Erros Comuns

### 1. "Red Bar" (Smoke Test Failed)
- **Causa**: O frontend carregou, mas não consegue falar com o backend.
- **Solução**: Verifique se o backend está rodando em `127.0.0.1:8000`. Verifique o arquivo `frontend/.env` e confirme se `VITE_API_BASE_URL` aponta para o endereço correto.

### 2. Tela Branca (Vite não carrega)
- **Causa**: O frontend provavelmente caiu ou o `node_modules` está corrompido.
- **Solução**: Reinicie o frontend. Se persistir, rode `npm install` na pasta `frontend`.

### 3. Falha de Banco de Dados (Supabase)
- **Causa**: Variáveis de ambiente expiradas ou falha no pooler.
- **Solução**: Verifique os logs do backend. Procure por `[STARTUP] ERRO CRÍTICO no Banco de Dados`. Se houver erro de senha, atualize o `.env`.

---

> [!TIP]
> **Dica Pro**: Mantenha um terminal dedicado apenas para os logs do Backend. Ele é a "caixa preta" que explica 90% das falhas de carregamento.
