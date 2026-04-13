"""
Verifica o estado dos lancamentos_financeiros no Supabase.
"""
import urllib.request, json

BASE = 'http://localhost:8000/api/v1'
TENANT_ID = 'fa965353-0be8-4e4d-85db-48bea0bd86b4'

def req(url, method='GET', body=None):
    r = urllib.request.Request(url, method=method, data=body)
    r.add_header('X-Tenant-ID', TENANT_ID)
    r.add_header('Authorization', 'Bearer mock-token')
    r.add_header('X-User-ID', '00000000-0000-0000-0000-000000000001')
    if body:
        r.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(r, timeout=15)
        return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'detail': e.read().decode()[:500]}

# Listar lancamentos sem filtro de status
print('--- Contas Bancarias ---')
cb = req(f'{BASE}/financeiro/contas-bancarias')
print(json.dumps(cb, indent=2, default=str)[:1000])

print('\n--- Extrato (sem filtros baseline) ---')
e = req(f'{BASE}/financeiro/extrato?page=1&size=10')
print(f'Total: {e.get("total")} | Itens: {len(e.get("items",[]))}')

print('\n--- Lancamentos em geral (endpoint principal) ---')
l = req(f'{BASE}/financeiro/?natureza=PAGAR&status_filtro=PAGO')
print(f'PAGAR+PAGO: {len(l) if isinstance(l, list) else l}')

l2 = req(f'{BASE}/financeiro/')
print(f'Todos os lancamentos: {len(l2) if isinstance(l2, list) else l2}')
if isinstance(l2, list) and l2:
    for item in l2[:3]:
        print(f'  STATUS: {item.get("status")} | {item.get("descricao")} | {item.get("valor_pago")}')
