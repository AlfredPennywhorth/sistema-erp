from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from uuid import UUID
from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta

from app.models.database import (
    Emprestimo,
    ParcelaEmprestimo,
    ContaBancaria,
    PlanoConta,
    Parceiro,
    LancamentoFinanceiro,
    LogAuditoria,
    StatusEmprestimo,
    StatusParcela,
    TipoAmortizacao,
    TipoJuros,
    TipoLancamento,
    NaturezaFinanceira,
    StatusLancamento,
    TipoConta,
    NaturezaConta,
)
from app.schemas.emprestimos import (
    EmprestimoCreate,
    EmprestimoUpdate,
    EmprestimoRead,
    EmprestimoListItem,
    PagarParcelaPayload,
    ParcelaEmprestimoRead,
)
from app.core.auth import get_session, get_current_tenant_id, get_current_user_id

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _calcular_parcelas_price(
    valor: Decimal,
    taxa: Decimal,
    n: int,
    data_primeira: date,
    periodicidade_dias: int,
) -> list[dict]:
    """Gera lista de parcelas pelo sistema Price (prestação fixa)."""
    if taxa == 0:
        pmt = valor / n
        parcelas = []
        for i in range(n):
            venc = data_primeira + timedelta(days=periodicidade_dias * i)
            parcelas.append({
                "numero_parcela": i + 1,
                "valor_principal": round(pmt, 2),
                "valor_juros": Decimal("0.00"),
                "valor_total": round(pmt, 2),
                "data_vencimento": venc,
            })
        return parcelas

    pmt = valor * taxa / (1 - (1 + taxa) ** -n)
    pmt = round(pmt, 2)
    saldo = valor
    parcelas = []
    for i in range(n):
        juros = round(saldo * taxa, 2)
        amort = round(pmt - juros, 2)
        if i == n - 1:
            # Última parcela absorve diferenças de arredondamento
            amort = round(saldo, 2)
            pmt_i = round(amort + juros, 2)
        else:
            pmt_i = pmt
        saldo = round(saldo - amort, 2)
        venc = data_primeira + timedelta(days=periodicidade_dias * i)
        parcelas.append({
            "numero_parcela": i + 1,
            "valor_principal": amort,
            "valor_juros": juros,
            "valor_total": pmt_i,
            "data_vencimento": venc,
        })
    return parcelas


def _calcular_parcelas_sac(
    valor: Decimal,
    taxa: Decimal,
    n: int,
    data_primeira: date,
    periodicidade_dias: int,
) -> list[dict]:
    """Gera lista de parcelas pelo sistema SAC (amortização constante)."""
    amort = round(valor / n, 2)
    saldo = valor
    parcelas = []
    for i in range(n):
        juros = round(saldo * taxa, 2)
        if i == n - 1:
            amort_i = round(saldo, 2)
        else:
            amort_i = amort
        total = round(amort_i + juros, 2)
        saldo = round(saldo - amort_i, 2)
        venc = data_primeira + timedelta(days=periodicidade_dias * i)
        parcelas.append({
            "numero_parcela": i + 1,
            "valor_principal": amort_i,
            "valor_juros": juros,
            "valor_total": total,
            "data_vencimento": venc,
        })
    return parcelas


def _calcular_parcelas_livre(
    valor: Decimal,
    n: int,
    data_primeira: date,
    periodicidade_dias: int,
) -> list[dict]:
    """Gera parcelas iguais sem juros pré-calculados (fluxo livre / bullet)."""
    amort = round(valor / n, 2)
    parcelas = []
    for i in range(n):
        if i == n - 1:
            amort_i = round(valor - amort * (n - 1), 2)
        else:
            amort_i = amort
        venc = data_primeira + timedelta(days=periodicidade_dias * i)
        parcelas.append({
            "numero_parcela": i + 1,
            "valor_principal": amort_i,
            "valor_juros": Decimal("0.00"),
            "valor_total": amort_i,
            "data_vencimento": venc,
        })
    return parcelas


def _gerar_parcelas(emprestimo: Emprestimo) -> list[dict]:
    v = emprestimo.valor_contratado
    t = emprestimo.taxa_juros
    n = emprestimo.numero_parcelas
    d = emprestimo.data_primeira_parcela
    p = emprestimo.periodicidade_dias

    if emprestimo.tipo_amortizacao == TipoAmortizacao.PRICE:
        return _calcular_parcelas_price(v, t, n, d, p)
    elif emprestimo.tipo_amortizacao == TipoAmortizacao.SAC:
        return _calcular_parcelas_sac(v, t, n, d, p)
    else:
        return _calcular_parcelas_livre(v, n, d, p)


def _validate_conta_passivo(session: Session, conta_id: UUID, empresa_id: UUID) -> PlanoConta:
    conta = session.get(PlanoConta, conta_id)
    if not conta or conta.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail=f"Conta contábil {conta_id} não encontrada.")
    if not conta.ativo:
        raise HTTPException(status_code=400, detail=f"Conta contábil {conta_id} está inativa.")
    if not conta.is_analitica:
        raise HTTPException(status_code=400, detail=f"Conta contábil {conta_id} deve ser analítica.")
    if conta.tipo != TipoConta.PASSIVO:
        raise HTTPException(
            status_code=400,
            detail=f"Conta contábil de passivo {conta_id} deve ser do tipo PASSIVO."
        )
    return conta


def _validate_conta_juros(session: Session, conta_id: UUID, empresa_id: UUID) -> PlanoConta:
    conta = session.get(PlanoConta, conta_id)
    if not conta or conta.empresa_id != empresa_id:
        raise HTTPException(status_code=404, detail=f"Conta contábil {conta_id} não encontrada.")
    if not conta.ativo:
        raise HTTPException(status_code=400, detail=f"Conta contábil {conta_id} está inativa.")
    if not conta.is_analitica:
        raise HTTPException(status_code=400, detail=f"Conta contábil {conta_id} deve ser analítica.")
    if conta.tipo != TipoConta.DESPESA:
        raise HTTPException(
            status_code=400,
            detail=f"Conta contábil de juros {conta_id} deve ser do tipo DESPESA."
        )
    return conta


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[EmprestimoListItem])
def list_emprestimos(
    status_filtro: Optional[StatusEmprestimo] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Lista todos os empréstimos da empresa ativa."""
    stmt = (
        select(Emprestimo, Parceiro.nome_razao.label("parceiro_nome"))
        .join(Parceiro, Emprestimo.parceiro_id == Parceiro.id, isouter=True)
        .where(Emprestimo.empresa_id == tenant_id)
    )
    if status_filtro:
        stmt = stmt.where(Emprestimo.status == status_filtro)
    stmt = stmt.order_by(Emprestimo.data_contratacao.desc())

    results = session.exec(stmt).all()
    items = []
    for emp, parceiro_nome in results:
        d = emp.model_dump()
        d["parceiro_nome"] = parceiro_nome
        items.append(EmprestimoListItem(**d))
    return items


@router.get("/{emprestimo_id}", response_model=EmprestimoRead)
def get_emprestimo(
    emprestimo_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Retorna um empréstimo com todas as suas parcelas."""
    emp = session.get(Emprestimo, emprestimo_id)
    if not emp or emp.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")

    parcelas = session.exec(
        select(ParcelaEmprestimo)
        .where(ParcelaEmprestimo.emprestimo_id == emprestimo_id)
        .order_by(ParcelaEmprestimo.numero_parcela)
    ).all()

    data = emp.model_dump()
    data["parcelas"] = [p.model_dump() for p in parcelas]
    return EmprestimoRead(**data)


@router.post("/", response_model=EmprestimoRead, status_code=status.HTTP_201_CREATED)
def create_emprestimo(
    payload: EmprestimoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Cria um empréstimo com seu cronograma de parcelas gerado automaticamente.
    O saldo da conta bancária é creditado na contratação.
    """
    # 1. Validar conta bancária
    conta = session.get(ContaBancaria, payload.conta_bancaria_id)
    if not conta or conta.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

    # 2. Validar contas contábeis
    _validate_conta_passivo(session, payload.conta_contabil_passivo_id, tenant_id)
    _validate_conta_juros(session, payload.conta_contabil_juros_id, tenant_id)

    # 3. Calcular parcelas
    emprestimo_temp = Emprestimo(
        **payload.model_dump(),
        empresa_id=tenant_id,
        saldo_devedor=payload.valor_contratado,
        data_vencimento_final=date.today(),  # placeholder
        usuario_criacao_id=user_id,
    )
    plano_parcelas = _gerar_parcelas(emprestimo_temp)

    data_vencimento_final = plano_parcelas[-1]["data_vencimento"]

    # 4. Persistir empréstimo
    novo_emp = Emprestimo(
        **payload.model_dump(),
        empresa_id=tenant_id,
        saldo_devedor=payload.valor_contratado,
        data_vencimento_final=data_vencimento_final,
        usuario_criacao_id=user_id,
    )
    session.add(novo_emp)
    session.flush()  # obter o ID antes de criar parcelas

    # 5. Persistir parcelas
    for p in plano_parcelas:
        parcela = ParcelaEmprestimo(
            empresa_id=tenant_id,
            emprestimo_id=novo_emp.id,
            **p,
        )
        session.add(parcela)

    # 6. Creditar valor na conta bancária (entrada de caixa pela contratação)
    conta.saldo_atual += payload.valor_contratado
    session.add(conta)

    # 7. Auditoria
    session.flush()
    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="CREATE",
        tabela_afetada="emprestimos",
        registro_id=novo_emp.id,
        dados_novos=novo_emp.model_dump(mode="json"),
    )
    session.add(log)

    session.commit()
    session.refresh(novo_emp)

    return get_emprestimo(novo_emp.id, tenant_id, session)


@router.patch("/{emprestimo_id}", response_model=EmprestimoRead)
def update_emprestimo(
    emprestimo_id: UUID,
    payload: EmprestimoUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Atualiza dados descritivos ou status do empréstimo."""
    emp = session.get(Emprestimo, emprestimo_id)
    if not emp or emp.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")

    dados_anteriores = emp.model_dump(mode="json")

    if payload.conta_contabil_passivo_id:
        _validate_conta_passivo(session, payload.conta_contabil_passivo_id, tenant_id)
    if payload.conta_contabil_juros_id:
        _validate_conta_juros(session, payload.conta_contabil_juros_id, tenant_id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(emp, key, value)

    session.add(emp)

    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="UPDATE",
        tabela_afetada="emprestimos",
        registro_id=emp.id,
        dados_anteriores=dados_anteriores,
        dados_novos=emp.model_dump(mode="json"),
    )
    session.add(log)
    session.commit()
    session.refresh(emp)

    return get_emprestimo(emp.id, tenant_id, session)


@router.post("/{emprestimo_id}/parcelas/{parcela_id}/pagar", response_model=ParcelaEmprestimoRead)
def pagar_parcela(
    emprestimo_id: UUID,
    parcela_id: UUID,
    payload: PagarParcelaPayload,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """
    Registra o pagamento de uma parcela.
    - Débita na conta bancária informada.
    - Atualiza o saldo_devedor do empréstimo.
    - Gera um LancamentoFinanceiro vinculado à parcela.
    - Avalia automaticamente se o empréstimo foi quitado.
    """
    # 1. Validar empréstimo
    emp = session.get(Emprestimo, emprestimo_id)
    if not emp or emp.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
    if emp.status == StatusEmprestimo.CANCELADO:
        raise HTTPException(status_code=400, detail="Empréstimo cancelado.")

    # 2. Validar parcela
    parcela = session.get(ParcelaEmprestimo, parcela_id)
    if not parcela or parcela.emprestimo_id != emprestimo_id or parcela.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Parcela não encontrada.")
    if parcela.status == StatusParcela.PAGA:
        raise HTTPException(status_code=400, detail="Parcela já foi paga.")
    if parcela.status == StatusParcela.CANCELADA:
        raise HTTPException(status_code=400, detail="Parcela cancelada.")

    # 3. Validar conta bancária
    conta = session.get(ContaBancaria, payload.conta_bancaria_id)
    if not conta or conta.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

    # 4. Gerar LancamentoFinanceiro para o pagamento da parcela
    lancamento = LancamentoFinanceiro(
        empresa_id=tenant_id,
        tipo=TipoLancamento.CAIXA,
        natureza=NaturezaFinanceira.PAGAR,
        status=StatusLancamento.PAGO,
        plano_contas_id=emp.conta_contabil_juros_id,
        conta_bancaria_id=payload.conta_bancaria_id,
        valor_previsto=parcela.valor_total,
        valor_pago=payload.valor_pago,
        data_vencimento=parcela.data_vencimento,
        data_competencia=payload.data_pagamento,
        data_pagamento=payload.data_pagamento,
        descricao=f"Pagamento parcela {parcela.numero_parcela}/{emp.numero_parcelas} - {emp.descricao or emp.numero_contrato or str(emp.id)[:8]}",
        usuario_criacao_id=user_id,
        usuario_liquidacao_id=user_id,
    )
    session.add(lancamento)
    session.flush()

    # 5. Atualizar parcela
    dados_anteriores_parcela = parcela.model_dump(mode="json")
    parcela.valor_pago = payload.valor_pago
    parcela.data_pagamento = payload.data_pagamento
    parcela.status = StatusParcela.PAGA
    parcela.lancamento_id = lancamento.id
    parcela.usuario_liquidacao_id = user_id
    session.add(parcela)

    # 6. Debitar na conta bancária
    conta.saldo_atual -= payload.valor_pago
    session.add(conta)

    # 7. Atualizar saldo_devedor do empréstimo
    dados_anteriores_emp = emp.model_dump(mode="json")
    emp.saldo_devedor = max(Decimal("0.00"), emp.saldo_devedor - parcela.valor_principal)

    # 8. Verificar quitação automática
    parcelas_pendentes = session.exec(
        select(func.count(ParcelaEmprestimo.id)).where(
            ParcelaEmprestimo.emprestimo_id == emprestimo_id,
            ParcelaEmprestimo.status == StatusParcela.PENDENTE,
            ParcelaEmprestimo.id != parcela_id,
        )
    ).one()

    parcelas_atrasadas = session.exec(
        select(func.count(ParcelaEmprestimo.id)).where(
            ParcelaEmprestimo.emprestimo_id == emprestimo_id,
            ParcelaEmprestimo.status == StatusParcela.ATRASADA,
            ParcelaEmprestimo.id != parcela_id,
        )
    ).one()

    if parcelas_pendentes == 0 and parcelas_atrasadas == 0:
        emp.status = StatusEmprestimo.QUITADO
        emp.saldo_devedor = Decimal("0.00")

    session.add(emp)

    # 9. Auditoria
    log_parcela = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="PAGAR_PARCELA",
        tabela_afetada="parcelas_emprestimo",
        registro_id=parcela.id,
        dados_anteriores=dados_anteriores_parcela,
        dados_novos=parcela.model_dump(mode="json"),
    )
    log_emp = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="UPDATE",
        tabela_afetada="emprestimos",
        registro_id=emp.id,
        dados_anteriores=dados_anteriores_emp,
        dados_novos=emp.model_dump(mode="json"),
    )
    session.add(log_parcela)
    session.add(log_emp)

    session.commit()
    session.refresh(parcela)
    return ParcelaEmprestimoRead(**parcela.model_dump())


@router.get("/{emprestimo_id}/parcelas", response_model=List[ParcelaEmprestimoRead])
def list_parcelas(
    emprestimo_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session),
):
    """Lista o cronograma de parcelas de um empréstimo."""
    emp = session.get(Emprestimo, emprestimo_id)
    if not emp or emp.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")

    parcelas = session.exec(
        select(ParcelaEmprestimo)
        .where(ParcelaEmprestimo.emprestimo_id == emprestimo_id)
        .order_by(ParcelaEmprestimo.numero_parcela)
    ).all()
    return [ParcelaEmprestimoRead(**p.model_dump()) for p in parcelas]
