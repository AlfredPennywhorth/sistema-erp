from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlmodel import Session, select, func
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal

from app.models.database import (
    Parceiro,
    RegraContabil,
    LancamentoFinanceiro,
    StatusLancamento,
    NaturezaFinanceira,
    TipoLancamento,
    LogAuditoria,
    Empresa,
    ContaBancaria,
    Banco,
    PlanoConta,
    CentroCusto,
    FormaPagamento,
    TipoEventoContabil,
    TipoCentroCusto
)
from app.schemas.financeiro import (
    ExtratoRead, 
    ExtratoPaginatedRead, 
    LancamentoUpdate,
    LancamentoCreate,
    PlanoContaRead,
    PlanoContaCreate,
    PlanoContaUpdate,
    CentroCustoRead,
    CentroCustoCreate,
    CentroCustoUpdate,
    FormaPagamentoRead,
    FormaPagamentoCreate,
    ContaBancariaCreate,
    ContaBancariaUpdate,
    ContaBancariaRead,
)
from app.core.auth import get_session, get_current_tenant_id, get_current_user_id

router = APIRouter()

# --- Manutenção de Lançamentos ---

@router.patch("/manutencao/{lancamento_id}", response_model=LancamentoFinanceiro)
def update_lancamento(
    lancamento_id: str,
    dados: LancamentoUpdate,
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Atualiza dados de um lançamento existente.
    """
    try:
        id_val = UUID(lancamento_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de lançamento inválido")

    lancamento = session.get(LancamentoFinanceiro, id_val)
    if not lancamento or lancamento.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    # Guardar estado para auditoria
    dados_anteriores = lancamento.model_dump(mode='json')

    update_data = dados.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lancamento, key, value)

    session.add(lancamento)
    
    # Log Auditoria
    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="UPDATE",
        tabela_afetada="lancamentos_financeiros",
        registro_id=lancamento.id,
        dados_anteriores=dados_anteriores,
        dados_novos=lancamento.model_dump(mode='json')
    )

    session.add(log)
    
    session.commit()
    session.refresh(lancamento)
    return lancamento

@router.post("/manutencao/{lancamento_id}/estornar")
def estornar_pagamento(
    lancamento_id: str,
    session: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Desfaz a liquidação de um lançamento.
    """
    try:
        id_val = UUID(lancamento_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de lançamento inválido")

    lancamento = session.get(LancamentoFinanceiro, id_val)
    if not lancamento or lancamento.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    if lancamento.status != StatusLancamento.PAGO:
        raise HTTPException(status_code=400, detail="Apenas lançamentos pagos podem ser estornados")

    # Guardar estado para auditoria
    dados_anteriores = lancamento.model_dump(mode='json')

    # Reverter saldo bancário se houver conta
    if lancamento.conta_bancaria_id:
        conta = session.get(ContaBancaria, lancamento.conta_bancaria_id)
        if conta:
            valor = lancamento.valor_pago or lancamento.valor_previsto
            if lancamento.natureza == NaturezaFinanceira.RECEBER:
                conta.saldo_atual -= valor
            else:
                conta.saldo_atual += valor
            session.add(conta)

    # Reverter status
    lancamento.status = StatusLancamento.ABERTO
    lancamento.data_pagamento = None
    lancamento.valor_pago = 0
    session.add(lancamento)

    # Log Auditoria
    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="VOID",
        tabela_afetada="lancamentos_financeiros",
        registro_id=lancamento.id,
        dados_anteriores=dados_anteriores,
        dados_novos=lancamento.model_dump(mode='json')
    )
    session.add(log)
    
    session.commit()
    return {"message": "Estorno realizado com sucesso"}

@router.get("/")
def list_lancamentos(
    natureza: Optional[NaturezaFinanceira] = None,
    status_filtro: Optional[StatusLancamento] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    descricao: Optional[str] = None,
    parceiro_id: Optional[UUID] = None,
    plano_contas_id: Optional[UUID] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    """
    Lista os lançamentos financeiros da empresa ativa, com dados do parceiro e filtros aplicados.
    """
    from app.models.database import Parceiro
    from sqlalchemy.orm import selectinload

    stmt = (
        select(LancamentoFinanceiro)
        .where(LancamentoFinanceiro.empresa_id == tenant_id)
        .options(selectinload(LancamentoFinanceiro.parceiro))
    )

    if natureza:
        stmt = stmt.where(LancamentoFinanceiro.natureza == natureza)
    if status_filtro:
        stmt = stmt.where(LancamentoFinanceiro.status == status_filtro)
    if data_inicio:
        stmt = stmt.where(LancamentoFinanceiro.data_vencimento >= data_inicio)
    if data_fim:
        stmt = stmt.where(LancamentoFinanceiro.data_vencimento <= data_fim)
    if descricao:
        stmt = stmt.where(LancamentoFinanceiro.descricao.ilike(f"%{descricao}%"))
    if parceiro_id:
        stmt = stmt.where(LancamentoFinanceiro.parceiro_id == parceiro_id)
    if plano_contas_id:
        stmt = stmt.where(LancamentoFinanceiro.plano_contas_id == plano_contas_id)

    stmt = stmt.order_by(LancamentoFinanceiro.data_vencimento.asc())
    lancamentos = session.exec(stmt).all()

    result = []
    for l in lancamentos:
        d = l.model_dump(mode='json')
        if l.parceiro:
            d['parceiro'] = {'id': str(l.parceiro.id), 'nome_razao': l.parceiro.nome_razao}
        else:
            d['parceiro'] = None
        result.append(d)
    return result

@router.post("/", response_model=LancamentoFinanceiro, status_code=status.HTTP_201_CREATED)
def create_lancamento(
    payload: LancamentoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """
    Cria um novo lançamento financeiro (Provisão ou Caixa).
    Suporta parametrização via tipo_evento para buscar conta contábil automaticamente.
    """
    
    # 1. Resolver Plano de Contas via RegraContabil se tipo_evento for fornecido
    plano_contas_id = payload.plano_contas_id
    
    if payload.tipo_evento:
        # Busca a regra configurada para a empresa, evento e natureza
        stmt_regra = select(RegraContabil).where(
            RegraContabil.empresa_id == tenant_id,
            RegraContabil.tipo_evento == payload.tipo_evento,
            RegraContabil.natureza == payload.natureza,
            RegraContabil.ativo == True
        )
        regra = session.exec(stmt_regra).first()
        
        if not regra:
            raise HTTPException(
                status_code=400, 
                detail=f"Regra Contábil não configurada para o evento {payload.tipo_evento} e natureza {payload.natureza}."
            )
        
        # Convenção: PAGAR -> Débito | RECEBER -> Crédito
        if payload.natureza == NaturezaFinanceira.PAGAR:
            plano_contas_id = regra.conta_debito_id
        else:
            plano_contas_id = regra.conta_credito_id

    # Validação final: plano_contas_id é obrigatório para salvar no DB
    if not plano_contas_id:
        raise HTTPException(
            status_code=400, 
            detail="Classificação (Plano de Contas) é obrigatória."
        )

    # 2. Criar objeto do Model
    novo_lancamento = LancamentoFinanceiro(
        **payload.model_dump(exclude={"tipo_evento", "plano_contas_id"}),
        plano_contas_id=plano_contas_id,
        empresa_id=tenant_id,
        usuario_criacao_id=user_id
    )
    
    # Defaults se for CAIXA (liquidação imediata)
    if novo_lancamento.tipo == TipoLancamento.CAIXA:
        novo_lancamento.status = StatusLancamento.PAGO
        novo_lancamento.data_pagamento = novo_lancamento.data_pagamento or date.today()
        novo_lancamento.valor_pago = novo_lancamento.valor_previsto
        novo_lancamento.usuario_liquidacao_id = user_id 
    
    session.add(novo_lancamento)
    session.commit()
    session.refresh(novo_lancamento)
    
    # Log de Auditoria
    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="CREATE",
        tabela_afetada="lancamentos_financeiros",
        registro_id=novo_lancamento.id,
        dados_novos=novo_lancamento.model_dump(mode='json')
    )
    session.add(log)
    session.commit()
    
    return novo_lancamento

class LiquidacaoPayload(BaseModel):
    valor_pago: Decimal
    data_pagamento: date
    conta_bancaria_id: UUID
    juros_multa: Optional[Decimal] = Decimal('0')
    desconto: Optional[Decimal] = Decimal('0')

@router.post("/{lancamento_id}/liquidar")
def liquidar_lancamento(
    lancamento_id: UUID,
    payload: LiquidacaoPayload,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    valor_pago = payload.valor_pago
    data_pagamento = payload.data_pagamento
    conta_bancaria_id = payload.conta_bancaria_id
    juros_multa = payload.juros_multa or Decimal('0')
    desconto = payload.desconto or Decimal('0')
    """
    Realiza a baixa (liquidação) de um título financeiro com validação de SoD.
    """
    # 1. Buscar a empresa e configurações de conformidade
    empresa = session.get(Empresa, tenant_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    # 2. Buscar o lançamento
    lancamento = session.get(LancamentoFinanceiro, lancamento_id)
    if not lancamento or lancamento.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    
    if lancamento.status == StatusLancamento.PAGO:
        raise HTTPException(status_code=400, detail="Este lançamento já está pago.")

    # 3. Validação de Segregação de Funções (SoD)
    if empresa.strict_compliance_sod and lancamento.usuario_criacao_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Políticas de Compliance: A aprovação do pagamento deve ser feita por um usuário diferente do criador."
        )

    # 5. Salvar estado anterior para auditoria
    dados_anteriores = lancamento.model_dump(mode='json')
    
    # 6. Atualizar Saldo Bancário (Atomicidade)
    conta = session.get(ContaBancaria, conta_bancaria_id)
    if not conta or conta.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")
    
    # Valor líquido considerando juros/multa e desconto
    valor_liquido = valor_pago + juros_multa - desconto

    # Validação de saldo disponível (saldo real + limite de crédito)
    if lancamento.natureza == NaturezaFinanceira.PAGAR:
        saldo_disponivel = conta.saldo_atual + conta.limite_credito
        if valor_liquido > saldo_disponivel:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Disponível (incluindo limite de crédito): R$ {float(saldo_disponivel):.2f}"
            )

    if lancamento.natureza == NaturezaFinanceira.RECEBER:
        conta.saldo_atual += valor_liquido
    else:
        conta.saldo_atual -= valor_liquido

    # Atualizar status do lançamento
    lancamento.status = StatusLancamento.PAGO
    lancamento.data_pagamento = data_pagamento
    lancamento.valor_pago = valor_pago
    lancamento.juros_multa = juros_multa
    lancamento.desconto = desconto
    lancamento.conta_bancaria_id = conta_bancaria_id
    lancamento.usuario_liquidacao_id = user_id

    session.add(conta)
    session.add(lancamento) # <-- Faltava persistir o lançamento também!

    # 7. Log de Auditoria
    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="LIQUIDAR",
        tabela_afetada="lancamentos_financeiros",
        registro_id=lancamento.id,
        dados_anteriores=dados_anteriores,
        dados_novos=lancamento.model_dump(mode='json')
    )
    session.add(log)
    
    session.commit()
    session.refresh(lancamento)
    
    return {"message": "Liquidação realizada com sucesso", "lancamento": lancamento}

@router.get("/extrato", response_model=ExtratoPaginatedRead)
def get_extrato(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    conta_bancaria_id: Optional[UUID] = None,
    descricao: Optional[str] = None,
    parceiro_id: Optional[UUID] = None,
    categoria_id: Optional[UUID] = None,
    page: int = 1,
    size: int = 10,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    """
    Retorna o extrato de movimentações (Regime de Caixa) com paginação tradicional.
    """
    # Base query para dados
    stmt = select(
        LancamentoFinanceiro.id,
        LancamentoFinanceiro.descricao,
        LancamentoFinanceiro.natureza,
        LancamentoFinanceiro.valor_pago,
        LancamentoFinanceiro.data_pagamento,
        LancamentoFinanceiro.documento,
        ContaBancaria.nome.label("conta_nome"),
        PlanoConta.nome.label("categoria_nome"),
        Parceiro.nome_razao.label("parceiro_nome")
    ).join(
        ContaBancaria, LancamentoFinanceiro.conta_bancaria_id == ContaBancaria.id, isouter=True
    ).join(
        PlanoConta, LancamentoFinanceiro.plano_contas_id == PlanoConta.id, isouter=True
    ).join(
        Parceiro, LancamentoFinanceiro.parceiro_id == Parceiro.id, isouter=True
    ).where(
        LancamentoFinanceiro.empresa_id == tenant_id,
        LancamentoFinanceiro.status == StatusLancamento.PAGO
    )
    
    # Filtros
    if data_inicio:
        stmt = stmt.where(LancamentoFinanceiro.data_pagamento >= data_inicio)
    if data_fim:
        stmt = stmt.where(LancamentoFinanceiro.data_pagamento <= data_fim)
    if conta_bancaria_id:
        stmt = stmt.where(LancamentoFinanceiro.conta_bancaria_id == conta_bancaria_id)
    if descricao:
        stmt = stmt.where(LancamentoFinanceiro.descricao.ilike(f"%{descricao}%"))
    if parceiro_id:
        stmt = stmt.where(LancamentoFinanceiro.parceiro_id == parceiro_id)
    if categoria_id:
        stmt = stmt.where(LancamentoFinanceiro.plano_contas_id == categoria_id)
        
    # Ordenação
    stmt = stmt.order_by(LancamentoFinanceiro.data_pagamento.desc())

    # Contagem total (Executada de forma simples para evitar problemas com subqueries no SQLite)
    count_stmt = select(func.count(LancamentoFinanceiro.id)).where(
        LancamentoFinanceiro.empresa_id == tenant_id,
        LancamentoFinanceiro.status == StatusLancamento.PAGO
    )
    if data_inicio:
        count_stmt = count_stmt.where(LancamentoFinanceiro.data_pagamento >= data_inicio)
    if data_fim:
        count_stmt = count_stmt.where(LancamentoFinanceiro.data_pagamento <= data_fim)
    if conta_bancaria_id:
        count_stmt = count_stmt.where(LancamentoFinanceiro.conta_bancaria_id == conta_bancaria_id)
    if descricao:
        count_stmt = count_stmt.where(LancamentoFinanceiro.descricao.ilike(f"%{descricao}%"))
    if parceiro_id:
        count_stmt = count_stmt.where(LancamentoFinanceiro.parceiro_id == parceiro_id)
    if categoria_id:
        count_stmt = count_stmt.where(LancamentoFinanceiro.plano_contas_id == categoria_id)
    
    total = session.exec(count_stmt).one() or 0

    # Paginação
    stmt = stmt.offset((page - 1) * size).limit(size)
    results = session.exec(stmt).all()
    
    items = [
        {
            "id": r[0],
            "descricao": r[1],
            "natureza": r[2],
            "valor_pago": r[3],
            "data_pagamento": r[4],
            "documento": r[5],
            "conta_nome": r[6],
            "categoria_nome": r[7],
            "parceiro_nome": r[8]
        }
        for r in results
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size)
    }

def _build_conta_read(conta: ContaBancaria, session: Session) -> ContaBancariaRead:
    """Helper that assembles ContaBancariaRead with computed fields."""
    saldo_disponivel = conta.saldo_atual + conta.limite_credito
    conta_contabil_nome: Optional[str] = None
    if conta.conta_contabil_id:
        plano = session.get(PlanoConta, conta.conta_contabil_id)
        if plano:
            conta_contabil_nome = plano.nome
    return ContaBancariaRead(
        id=conta.id,
        empresa_id=conta.empresa_id,
        banco_id=conta.banco_id,
        nome=conta.nome,
        agencia=conta.agencia,
        conta=conta.conta,
        tipo_conta=conta.tipo_conta,
        saldo_inicial=conta.saldo_inicial,
        saldo_atual=conta.saldo_atual,
        limite_credito=conta.limite_credito,
        conta_contabil_id=conta.conta_contabil_id,
        saldo_disponivel=saldo_disponivel,
        conta_contabil_nome=conta_contabil_nome,
        ativo=conta.ativo,
        criado_em=conta.criado_em,
    )

@router.get("/contas-bancarias", response_model=List[ContaBancariaRead])
def list_contas_bancarias(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    contas = session.exec(
        select(ContaBancaria).where(
            ContaBancaria.empresa_id == tenant_id,
            ContaBancaria.ativo == True
        )
    ).all()
    return [_build_conta_read(c, session) for c in contas]

@router.post("/contas-bancarias", response_model=ContaBancariaRead, status_code=status.HTTP_201_CREATED)
def create_conta_bancaria(
    payload: ContaBancariaCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    # Validar conta contábil na mesma empresa
    plano = session.exec(
        select(PlanoConta).where(
            PlanoConta.id == payload.conta_contabil_id,
            PlanoConta.empresa_id == tenant_id
        )
    ).first()
    if not plano:
        raise HTTPException(status_code=400, detail="Conta contábil não encontrada para esta empresa.")

    # Verificar duplicidade agencia+conta+banco dentro da empresa
    existente = session.exec(
        select(ContaBancaria).where(
            ContaBancaria.empresa_id == tenant_id,
            ContaBancaria.banco_id == payload.banco_id,
            ContaBancaria.agencia == payload.agencia,
            ContaBancaria.conta == payload.conta,
            ContaBancaria.ativo == True
        )
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Já existe uma conta ativa com este banco, agência e número de conta.")

    nova_conta = ContaBancaria(
        **payload.model_dump(),
        empresa_id=tenant_id,
        saldo_atual=payload.saldo_inicial,
    )
    session.add(nova_conta)
    session.commit()
    session.refresh(nova_conta)

    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="CREATE",
        tabela_afetada="contas_bancarias",
        registro_id=nova_conta.id,
        dados_novos=nova_conta.model_dump(mode='json'),
    )
    session.add(log)
    session.commit()

    return _build_conta_read(nova_conta, session)

@router.put("/contas-bancarias/{conta_id}", response_model=ContaBancariaRead)
def update_conta_bancaria(
    conta_id: UUID,
    payload: ContaBancariaUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    conta = session.exec(
        select(ContaBancaria).where(
            ContaBancaria.id == conta_id,
            ContaBancaria.empresa_id == tenant_id
        )
    ).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

    if payload.conta_contabil_id is not None:
        plano = session.exec(
            select(PlanoConta).where(
                PlanoConta.id == payload.conta_contabil_id,
                PlanoConta.empresa_id == tenant_id
            )
        ).first()
        if not plano:
            raise HTTPException(status_code=400, detail="Conta contábil não encontrada para esta empresa.")

    dados_anteriores = conta.model_dump(mode='json')
    update_data = payload.model_dump(exclude_unset=True)
    # saldo_atual is managed by the system; never allow direct update via this endpoint
    update_data.pop("saldo_atual", None)
    for key, value in update_data.items():
        setattr(conta, key, value)

    session.add(conta)

    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="UPDATE",
        tabela_afetada="contas_bancarias",
        registro_id=conta.id,
        dados_anteriores=dados_anteriores,
        dados_novos=conta.model_dump(mode='json'),
    )
    session.add(log)
    session.commit()
    session.refresh(conta)

    return _build_conta_read(conta, session)

@router.delete("/contas-bancarias/{conta_id}")
def delete_conta_bancaria(
    conta_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    conta = session.exec(
        select(ContaBancaria).where(
            ContaBancaria.id == conta_id,
            ContaBancaria.empresa_id == tenant_id
        )
    ).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

    lancamentos_ativos = session.exec(
        select(func.count(LancamentoFinanceiro.id)).where(
            LancamentoFinanceiro.conta_bancaria_id == conta_id,
            LancamentoFinanceiro.status != StatusLancamento.CANCELADO
        )
    ).one()
    if lancamentos_ativos > 0:
        raise HTTPException(
            status_code=400,
            detail="Esta conta possui lançamentos financeiros ativos e não pode ser excluída. Reclassifique ou cancele os lançamentos antes de inativar."
        )

    dados_anteriores = conta.model_dump(mode='json')
    conta.ativo = False
    session.add(conta)

    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="INATIVAR",
        tabela_afetada="contas_bancarias",
        registro_id=conta.id,
        dados_anteriores=dados_anteriores,
        dados_novos=conta.model_dump(mode='json'),
    )
    session.add(log)
    session.commit()

    return {"message": "Conta bancária inativada com sucesso."}

@router.get("/bancos", response_model=List[Banco])
def list_bancos(session: Session = Depends(get_session)):
    return session.exec(select(Banco)).all()

@router.get("/dashboard-stats")
def get_dashboard_stats(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    """
    Retorna estatísticas consolidadas para o dashboard.
    """
    # 1. Saldo Total em Contas (Query 1)
    saldo_total = session.exec(
        select(func.sum(ContaBancaria.saldo_atual))
        .where(ContaBancaria.empresa_id == tenant_id)
    ).first() or Decimal('0.00')

    # 2 e 3. Totais a Pagar e Receber (Query 2 - Otimizada com CASE)
    from sqlalchemy import case, and_
    stats_stmt = select(
        func.sum(case(
            (and_(
                LancamentoFinanceiro.natureza == NaturezaFinanceira.PAGAR, 
                LancamentoFinanceiro.status == StatusLancamento.ABERTO
            ), LancamentoFinanceiro.valor_previsto),
            else_=0
        )).label("a_pagar"),
        func.sum(case(
            (and_(
                LancamentoFinanceiro.natureza == NaturezaFinanceira.RECEBER, 
                LancamentoFinanceiro.status == StatusLancamento.ABERTO
            ), LancamentoFinanceiro.valor_previsto),
            else_=0
        )).label("a_receber")
    ).where(LancamentoFinanceiro.empresa_id == tenant_id)
    
    stats_res = session.exec(stats_stmt).first()
    a_pagar = stats_res[0] if stats_res else 0
    a_receber = stats_res[1] if stats_res else 0

    return {
        "saldo_bancario": float(saldo_total),
        "contas_a_pagar": float(a_pagar),
        "contas_a_receber": float(a_receber),
        "percentual_vendas": 12.5 # Mockado por enquanto até vendas
    }

# --- Plano de Contas ---

@router.get("/plano-contas", response_model=List[PlanoContaRead])
def list_plano_contas(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    return session.exec(select(PlanoConta).where(PlanoConta.empresa_id == tenant_id)).all()

@router.post("/plano-contas", response_model=PlanoContaRead, status_code=status.HTTP_201_CREATED)
def create_plano_conta(
    plano: PlanoContaCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_plano = PlanoConta(**plano.model_dump())
    db_plano.empresa_id = tenant_id
    session.add(db_plano)
    session.commit()
    session.refresh(db_plano)
    return db_plano

@router.put("/plano-contas/{id}", response_model=PlanoContaRead)
def update_plano_conta(
    id: UUID,
    plano_update: PlanoContaUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_plano = session.exec(select(PlanoConta).where(PlanoConta.id == id, PlanoConta.empresa_id == tenant_id)).one_or_none()
    if not db_plano:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    update_data = plano_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plano, key, value)
    
    session.add(db_plano)
    session.commit()
    session.refresh(db_plano)
    return db_plano

@router.delete("/plano-contas/{id}")
def delete_plano_conta(
    id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_plano = session.exec(select(PlanoConta).where(PlanoConta.id == id, PlanoConta.empresa_id == tenant_id)).one_or_none()
    if not db_plano:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    # Validação de Hierarquia
    filhos = session.exec(select(func.count(PlanoConta.id)).where(PlanoConta.parent_id == id)).one()
    if filhos > 0:
        raise HTTPException(status_code=400, detail="Não é possível excluir uma conta que possui subcontas vinculadas.")
    
    # Proteção de Integridade Financeira
    lancamentos = session.exec(select(func.count(LancamentoFinanceiro.id)).where(LancamentoFinanceiro.plano_contas_id == id)).one()
    if lancamentos > 0:
        raise HTTPException(status_code=400, detail="Esta conta possui lançamentos financeiros vinculados e não pode ser excluída.")
    
    session.delete(db_plano)
    session.commit()
    return {"message": "Conta excluída com sucesso"}

# --- Centros de Custo ---

@router.get("/centros-custo", response_model=List[CentroCustoRead])
def list_centros_custo(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    return session.exec(select(CentroCusto).where(CentroCusto.empresa_id == tenant_id)).all()

@router.post("/centros-custo", response_model=CentroCustoRead, status_code=status.HTTP_201_CREATED)
def create_centro_custo(
    cc: CentroCustoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_cc = CentroCusto(**cc.model_dump())
    db_cc.empresa_id = tenant_id
    session.add(db_cc)
    session.commit()
    session.refresh(db_cc)
    return db_cc

@router.put("/centros-custo/{id}", response_model=CentroCustoRead)
def update_centro_custo(
    id: UUID,
    cc_update: CentroCustoUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_cc = session.exec(select(CentroCusto).where(CentroCusto.id == id, CentroCusto.empresa_id == tenant_id)).one_or_none()
    if not db_cc:
        raise HTTPException(status_code=404, detail="Centro de custo não encontrado")
    
    update_data = cc_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cc, key, value)
    
    session.add(db_cc)
    session.commit()
    session.refresh(db_cc)
    return db_cc

@router.delete("/centros-custo/{id}")
def delete_centro_custo(
    id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_cc = session.exec(select(CentroCusto).where(CentroCusto.id == id, CentroCusto.empresa_id == tenant_id)).one_or_none()
    if not db_cc:
        raise HTTPException(status_code=404, detail="Centro de custo não encontrado")
    
    # Proteção de Integridade Financeira
    lancamentos = session.exec(select(func.count(LancamentoFinanceiro.id)).where(LancamentoFinanceiro.centro_custo_id == id)).one()
    if lancamentos > 0:
        raise HTTPException(status_code=400, detail="Este centro de custo possui lançamentos financeiros vinculados e não pode ser excluído.")
    
    session.delete(db_cc)
    session.commit()
    return {"message": "Centro de custo excluído com sucesso"}

# --- Formas de Pagamento ---

@router.get("/formas-pagamento", response_model=List[FormaPagamentoRead])
def list_formas_pagamento(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    return session.exec(select(FormaPagamento).where(FormaPagamento.empresa_id == tenant_id)).all()

@router.post("/formas-pagamento", response_model=FormaPagamentoRead, status_code=status.HTTP_201_CREATED)
def create_forma_pagamento(
    forma: FormaPagamentoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_forma = FormaPagamento(**forma.model_dump())
    db_forma.empresa_id = tenant_id
    session.add(db_forma)
    session.commit()
    session.refresh(db_forma)
    return db_forma
