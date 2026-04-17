# Script de Inicialização Robusta - ERP Modular
# Este script garante que o ambiente esteja limpo e inicia ambos os servidores.

Write-Host "--- [AUTO-FIX] Iniciando Estabilização do ERP ---" -ForegroundColor Cyan

# 1. Limpeza preventiva de processos órfãos
Write-Host "[1/4] Limpando processos antigos (Node/Python)..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM python.exe /T 2>$null
Start-Sleep -Seconds 1

# 2. Iniciar Backend em background
Write-Host "[2/4] Iniciando Backend na porta 8000..." -ForegroundColor Yellow
Set-Location backend
$env:PYTHONPATH = "."
Start-Process .venv\Scripts\python.exe -ArgumentList "-m app.main" -NoNewWindow -RedirectStandardOutput "server_log.txt" -RedirectStandardError "server_error.txt"
Set-Location ..

# 3. Aguardar Health Check
Write-Host "[3/4] Aguardando Backend ficar online..." -ForegroundColor Yellow
$retries = 0
$online = $false
while ($retries -lt 10 -and -not $online) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -ErrorAction Ignore
        if ($response.StatusCode -eq 200) { $online = $true }
    } catch {}
    if (-not $online) {
        $retries++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
}

if ($online) {
    Write-Host "`n[OK] Backend Online!" -ForegroundColor Green
} else {
    Write-Host "`n[ERRO] Backend não respondeu. Verifique backend/server_error.txt" -ForegroundColor Red
    exit 1
}

# 4. Iniciar Frontend
Write-Host "[4/4] Iniciando Frontend na porta 5173..." -ForegroundColor Yellow
Set-Location frontend
# Usamos cmd /c porque npm é um script .cmd e Start-Process espera um executável binário no Windows
Start-Process cmd -ArgumentList "/c npm run dev -- --port 5173 --strictPort" -NoNewWindow
Set-Location ..

Write-Host "--- [SUCESSO] Sistema pronto para uso ---" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend: http://localhost:8000"
