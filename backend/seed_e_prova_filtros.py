"""
Cria dados de teste no Supabase para provar que os filtros funcionam.
"""
import urllib.request, json
from datetime import date, timedelta

BASE = 'http://localhost:8000/api/v1'
TENANT_ID = 'fa965353-0be8-4e4d-85db-48bea0bd86b4'

def req(url, method='GET', body=None):
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, method=method, data=data)
    r.add_header('X-Tenant-ID', TENANT_ID)
    r.add_header('Authorization', 'Bearer mock-token')
    r.add_header('X-User-ID', '00000000-0000-0000-0000-000000000001')
    if data:
        r.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(r, timeout=15)
        return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        print(f'  HTTP {e.code}: {detail[:300]}')
        return None

# 1. Criar conta bancaria
print('1. Criando conta bancária...')
# Primeiro vamos listar bancos disponíveis
bancos = req(f'{BASE}/financeiro/bancos')
print(f'   Bancos disponíveis: {len(bancos) if bancos else 0}')
banco_id = bancos[0]['id'] if bancos else None

conta = req(f'{BASE}/financeiro/contas-bancarias', method='POST', body={
    'nome': 'Conta Corrente Teste',
    'tipo': 'CORRENTE',
    'agencia': '0001',
    'conta': '12345-6',
    'banco_id': banco_id,
    'saldo_inicial': 10000.00
})
if conta:
    conta_id = conta.get('id')
    print(f'   Conta criada: {conta_id}')
else:
    print('   Erro ao criar conta.')
    exit(1)

# 2. Criar plano de contas
print('\n2. Criando categorias (plano de contas)...')
cat_receita = req(f'{BASE}/financeiro/plano-contas', method='POST', body={
    'nome': 'Receita de Serviços',
    'codigo': '3.1.01',
    'tipo': 'RECEITA'
})
cat_despesa = req(f'{BASE}/financeiro/plano-contas', method='POST', body={
    'nome': 'Despesas Administrativas',
    'codigo': '4.1.01',
    'tipo': 'DESPESA'
})
cat_receita_id = cat_receita.get('id') if cat_receita else None
cat_despesa_id = cat_despesa.get('id') if cat_despesa else None
print(f'   Receita: {cat_receita_id}')
print(f'   Despesa: {cat_despesa_id}')

# 3. Criar lançamentos de teste
hoje = date.today()
mes_passado = hoje - timedelta(days=30)

lancamentos_dados = [
    # Mês atual - receitas
    {'descricao': 'Pagamento de consultoria abril', 'natureza': 'RECEBER', 'valor_previsto': 5000.00,
     'data_vencimento': str(hoje), 'data_pagamento': str(hoje), 'plano_contas_id': cat_receita_id,
     'conta_bancaria_id': conta_id, 'tipo': 'CAIXA'},
    {'descricao': 'Serviços de manutenção', 'natureza': 'RECEBER', 'valor_previsto': 1200.00,
     'data_vencimento': str(hoje - timedelta(days=5)), 'data_pagamento': str(hoje - timedelta(days=5)),
     'plano_contas_id': cat_receita_id, 'conta_bancaria_id': conta_id, 'tipo': 'CAIXA'},
    # Mês atual - despesas
    {'descricao': 'Aluguel escritório abril', 'natureza': 'PAGAR', 'valor_previsto': 2000.00,
     'data_vencimento': str(hoje - timedelta(days=10)), 'data_pagamento': str(hoje - timedelta(days=10)),
     'plano_contas_id': cat_despesa_id, 'conta_bancaria_id': conta_id, 'tipo': 'CAIXA'},
    # Mês anterior - despesas
    {'descricao': 'Pagamento fornecedor março', 'natureza': 'PAGAR', 'valor_previsto': 800.00,
     'data_vencimento': str(mes_passado), 'data_pagamento': str(mes_passado),
     'plano_contas_id': cat_despesa_id, 'conta_bancaria_id': conta_id, 'tipo': 'CAIXA'},
    {'descricao': 'Energia elétrica março', 'natureza': 'PAGAR', 'valor_previsto': 350.00,
     'data_vencimento': str(mes_passado - timedelta(days=5)), 'data_pagamento': str(mes_passado - timedelta(days=5)),
     'plano_contas_id': cat_despesa_id, 'conta_bancaria_id': conta_id, 'tipo': 'CAIXA'},
]

print('\n3. Criando lançamentos de teste...')
criados = []
for l in lancamentos_dados:
    result = req(f'{BASE}/financeiro/', method='POST', body=l)
    if result:
        criados.append(result.get('id'))
        print(f'   ✓ {l["descricao"][:40]} | status={result.get("status")}')
    else:
        print(f'   ✗ Erro: {l["descricao"][:40]}')

print(f'\nTotal criados: {len(criados)} lançamentos')

# 4. Verificar extrato (sem filtros)
print('\n4. PROVA: Extrato sem filtros')
e = req(f'{BASE}/financeiro/extrato?page=1&size=10')
baseline = e.get('total', 0) if e else 0
print(f'   TOTAL: {baseline} registros')

# 5. Prova filtro de descrição "pagamento"
print('\nPROVA A: Filtro descrição="pagamento"')
e2 = req(f'{BASE}/financeiro/extrato?page=1&size=10&descricao=pagamento')
total_pagamento = e2.get('total', 0) if e2 else 0
print(f'   TOTAL após filtro "pagamento": {total_pagamento}')
if e2 and e2.get('items'):
    for item in e2['items']:
        print(f'   → {item.get("descricao")}')

# 6. Prova filtro de período - mês atual
print('\nPROVA B: Filtro período mês atual')
import calendar
data_ini = f'{hoje.year}-{hoje.month:02d}-01'
data_fim = f'{hoje.year}-{hoje.month:02d}-{calendar.monthrange(hoje.year, hoje.month)[1]}'
e3 = req(f'{BASE}/financeiro/extrato?page=1&size=10&data_inicio={data_ini}&data_fim={data_fim}')
total_mes = e3.get('total', 0) if e3 else 0
print(f'   TOTAL após filtro mês atual ({data_ini} a {data_fim}): {total_mes}')

# 7. Prova filtro de período - mês anterior
print('\nPROVA C: Filtro período mês anterior')
mes_ant = hoje.month - 1 if hoje.month > 1 else 12
ano_ant = hoje.year if hoje.month > 1 else hoje.year - 1
data_ini2 = f'{ano_ant}-{mes_ant:02d}-01'
data_fim2 = f'{ano_ant}-{mes_ant:02d}-{calendar.monthrange(ano_ant, mes_ant)[1]}'
e4 = req(f'{BASE}/financeiro/extrato?page=1&size=10&data_inicio={data_ini2}&data_fim={data_fim2}')
total_mes_ant = e4.get('total', 0) if e4 else 0
print(f'   TOTAL após filtro mês anterior ({data_ini2} a {data_fim2}): {total_mes_ant}')

# 8. Prova filtro categoria
if cat_despesa_id:
    print(f'\nPROVA D: Filtro categoria=Despesas ({cat_despesa_id})')
    e5 = req(f'{BASE}/financeiro/extrato?page=1&size=10&categoria_id={cat_despesa_id}')
    total_cat = e5.get('total', 0) if e5 else 0
    print(f'   TOTAL após filtro categoria despesa: {total_cat}')

print('\n' + '='*60)
print('RESUMO FINAL - PROVA DOS FILTROS:')
print(f'  Sem filtro (baseline):         {baseline} registros')
print(f'  Filtro descrição "pagamento":  {total_pagamento} registros')
print(f'  Filtro mês atual:              {total_mes} registros')
print(f'  Filtro mês anterior:           {total_mes_ant} registros')

if total_pagamento < baseline or total_mes < baseline or total_mes_ant < baseline:
    print('\n✅ FILTROS FUNCIONANDO: Os filtros reduziram o número de registros.')
else:
    print('\n⚠️ Revisar: Os filtros não reduziram os registros (pode ser dados insuficientes)')
