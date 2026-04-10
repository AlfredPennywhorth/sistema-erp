from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlmodel import Session, select, func
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal

from app.models.database import (
    LancamentoFinanceiro, 
    Empresa, 
    LogAuditoria, 
    StatusLancamento, 
    NaturezaFinanceira,
    TipoLancamento,
    ContaBancaria,
    Banco,
    PlanoConta,
    CentroCusto,
    FormaPagamento
)
from app.schemas.financeiro import (
    PlanoContaCreate, PlanoContaRead, PlanoContaUpdate,
    CentroCustoCreate, CentroCustoRead, CentroCustoUpdate,
    FormaPagamentoCreate, FormaPagamentoRead
)
from app.core.auth import get_session, get_current_tenant_id, get_current_user_id

router = APIRouter()

@router.get("/", response_model=List[LancamentoFinanceiro])
def list_lancamentos(
    natureza: Optional[NaturezaFinanceira] = None,
    status_filtro: Optional[StatusLancamento] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    """
    Lista os lançamentos financeiros da empresa ativa.
    """
    stmt = select(LancamentoFinanceiro).where(LancamentoFinanceiro.empresa_id == tenant_id)
    
    if natureza:
        stmt = stmt.where(LancamentoFinanceiro.natureza == natureza)
    if status_filtro:
        stmt = stmt.where(LancamentoFinanceiro.status == status_filtro)
        
    # Ordenar por data de vencimento
    stmt = stmt.order_by(LancamentoFinanceiro.data_vencimento.asc())
    
    return session.exec(stmt).all()

@router.post("/", response_model=LancamentoFinanceiro, status_code=status.HTTP_201_CREATED)
def create_lancamento(
    lancamento: LancamentoFinanceiro,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """
    Cria um novo lançamento financeiro (Provisão ou Caixa).
    """
    lancamento.empresa_id = tenant_id
    lancamento.usuario_criacao_id = user_id
    
    # Defaults se for CAIXA (liquidação imediata)
    if lancamento.tipo == TipoLancamento.CAIXA:
        lancamento.status = StatusLancamento.PAGO
        lancamento.data_pagamento = lancamento.data_pagamento or date.today()
        lancamento.valor_pago = lancamento.valor_previsto
        lancamento.usuario_liquidacao_id = user_id 
        # Nota: Lançamento imediato de caixa geralmente não exige SoD, 
        # pois não há aprovação posterior, é uma transação direta.
    
    session.add(lancamento)
    session.commit()
    session.refresh(lancamento)
    
    # Log de Auditoria
    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="CREATE",
        tabela_afetada="lancamentos_financeiros",
        registro_id=lancamento.id,
        dados_novos=lancamento.model_dump(mode='json')
    )
    session.add(log)
    session.commit()
    
    return lancamento

@router.post("/{lancamento_id}/liquidar")
def liquidar_lancamento(
    lancamento_id: UUID,
    valor_pago: Decimal,
    data_pagamento: date,
    conta_bancaria_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
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
    
    if lancamento.natureza == NaturezaFinanceira.RECEBER:
        conta.saldo_atual += valor_pago
    else:
        conta.saldo_atual -= valor_pago
    
    # Atualizar status do lançamento
    lancamento.status = StatusLancamento.PAGO
    lancamento.data_pagamento = data_pagamento
    lancamento.valor_pago = valor_pago
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

@router.get("/extrato", response_model=List[LancamentoFinanceiro])
def get_extrato(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    conta_bancaria_id: Optional[UUID] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    """
    Retorna o extrato de movimentações (Regime de Caixa).
    Inclui apenas lançamentos pagos ou diretos de caixa.
    """
    stmt = select(LancamentoFinanceiro).where(
        LancamentoFinanceiro.empresa_id == tenant_id,
        LancamentoFinanceiro.status == StatusLancamento.PAGO
    )
    
    if data_inicio:
        stmt = stmt.where(LancamentoFinanceiro.data_pagamento >= data_inicio)
    if data_fim:
        stmt = stmt.where(LancamentoFinanceiro.data_pagamento <= data_fim)
    if conta_bancaria_id:
        stmt = stmt.where(LancamentoFinanceiro.conta_bancaria_id == conta_bancaria_id)
        
    stmt = stmt.order_by(LancamentoFinanceiro.data_pagamento.desc())
    
    return session.exec(stmt).all()

@router.get("/contas-bancarias", response_model=List[ContaBancaria])
def list_contas_bancarias(
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    return session.exec(select(ContaBancaria).where(ContaBancaria.empresa_id == tenant_id)).all()

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
    # 1. Saldo Total em Contas
    saldo_total = session.exec(
        select(func.sum(ContaBancaria.saldo_atual))
        .where(ContaBancaria.empresa_id == tenant_id)
    ).first() or Decimal('0.00')

    # 2. Total a Pagar (Aberto)
    a_pagar = session.exec(
        select(func.sum(LancamentoFinanceiro.valor_previsto))
        .where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.PAGAR,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO
        )
    ).first() or Decimal('0.00')

    # 3. Total a Receber (Aberto)
    a_receber = session.exec(
        select(func.sum(LancamentoFinanceiro.valor_previsto))
        .where(
            LancamentoFinanceiro.empresa_id == tenant_id,
            LancamentoFinanceiro.natureza == NaturezaFinanceira.RECEBER,
            LancamentoFinanceiro.status == StatusLancamento.ABERTO
        )
    ).first() or Decimal('0.00')

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
