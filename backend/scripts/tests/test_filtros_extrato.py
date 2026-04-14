"""
Prova funcional dos filtros do endpoint /financeiro/extrato.
Usa o tenant real do Supabase e testa cada filtro.
"""
import urllib.request, json, urllib.parse

BASE = 'http://localhost:8000/api/v1'
TENANT_ID = 'fa965353-0be8-4e4d-85db-48bea0bd86b4'  # COMPANHIA DE ENGENHARIA DE TRAFEGO

def request(url, tenant_id=TENANT_ID):
    req = urllib.request.Request(url)
    req.add_header('X-Tenant-ID', tenant_id)
    req.add_header('Authorization', 'Bearer mock-token')
    req.add_header('X-User-ID', '00000000-0000-0000-0000-000000000001')
    try:
        res = urllib.request.urlopen(req, timeout=10)
        return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  HTTP {e.code}: {body[:300]}')
        return None
    except Exception as e:
        print(f'  Erro: {e}')
        return None

print('='*60)
print('TESTE 1: Sem filtros (baseline)')
url = f'{BASE}/financeiro/extrato?page=1&size=10'
print(f'  URL: {url}')
data = request(url)
if data:
    print(f'  Total: {data.get("total")} | Itens nesta página: {len(data.get("items", []))}')
    for item in data.get('items', [])[:3]:
        print(f'    - {item.get("data_pagamento")} | {item.get("descricao")[:30] if item.get("descricao") else "---"} | R${item.get("valor_pago")}')

print('\nTESTE 2: Com filtro de período (Mês Atual - Abril/2026)')
from datetime import date
hoje = date.today()
data_inicio = f'{hoje.year}-{hoje.month:02d}-01'
import calendar
data_fim = f'{hoje.year}-{hoje.month:02d}-{calendar.monthrange(hoje.year, hoje.month)[1]}'
url = f'{BASE}/financeiro/extrato?page=1&size=10&data_inicio={data_inicio}&data_fim={data_fim}'
print(f'  URL: {url}')
data2 = request(url)
if data2:
    print(f'  Total: {data2.get("total")} | Itens nesta página: {len(data2.get("items", []))}')

print('\nTESTE 3: Com filtro de descrição (descricao=pagamento)')
url = f'{BASE}/financeiro/extrato?page=1&size=10&descricao=pagamento'
print(f'  URL: {url}')
data3 = request(url)
if data3:
    print(f'  Total: {data3.get("total")} | Itens nesta página: {len(data3.get("items", []))}')
    for item in data3.get('items', [])[:3]:
        print(f'    - {item.get("descricao")[:50] if item.get("descricao") else "---"}')

print('\nTESTE 4: Com filtro de descrição letra "a"')
url = f'{BASE}/financeiro/extrato?page=1&size=10&descricao=a'
print(f'  URL: {url}')
data4 = request(url)
if data4:
    print(f'  Total: {data4.get("total")} | Itens nesta página: {len(data4.get("items", []))}')

print('\nTESTE 5: Com filtro de mês anterior')
mes_ant_inicio = f'{hoje.year}-{(hoje.month-1):02d}-01' if hoje.month > 1 else f'{hoje.year-1}-12-01'
mes_ant_fim = f'{hoje.year}-{hoje.month:02d}-01'
url = f'{BASE}/financeiro/extrato?page=1&size=10&data_inicio={mes_ant_inicio}&data_fim={mes_ant_fim}'
print(f'  URL: {url}')
data5 = request(url)
if data5:
    print(f'  Total: {data5.get("total")} | Itens nesta página: {len(data5.get("items", []))}')

print('='*60)
print('COMPARAÇÃO FINAL:')
totals = {
    'Sem filtro': data.get('total') if data else 'ERRO',
    'Mês Atual': data2.get('total') if data2 else 'ERRO',
    'Descrição "pagamento"': data3.get('total') if data3 else 'ERRO',
    'Descrição "a"': data4.get('total') if data4 else 'ERRO',
    'Mês Anterior': data5.get('total') if data5 else 'ERRO',
}
for k, v in totals.items():
    print(f'  {k}: {v} registros')
