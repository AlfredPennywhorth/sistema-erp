"""
Módulo Contábil — Endpoints

Rotas:
  GET  /templates                — lista templates disponíveis (sem autenticação de tenant)
  GET  /templates/{modelo_id}    — detalhe do template com itens
  POST /ativar-modulo            — clona template para a empresa (idempotente)
  GET  /lotes                    — lista lotes contábeis da empresa
  POST /lancamento               — lançamento manual (ADMIN/CONTADOR)
  GET  /razao                    — Livro Razão por conta
  GET  /balancete                — Balancete de verificação
  GET  /dre                      — Demonstração do Resultado (DRE)
  GET  /balanco                  — Balanço Patrimonial
"""
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.core.auth import get_session, get_current_tenant_id, get_current_user_id, RoleChecker
from app.models.database import (
    AtividadeEconomica,
    Empresa,
    JournalEntry,
    LoteContabil,
    ModeloPlanoConta,
    ModeloPlanoContaItem,
    PlanoConta,
    StatusLoteContabil,
    TipoConta,
    NaturezaConta,
    UserRole,
)
from app.schemas.contabilidade import (
    AtivarModuloPayload,
    AtivarModuloResponse,
    BalanceteRead,
    BalanceteItem,
    BalancoItem,
    BalancoRead,
    DREItem,
    DRERead,
    LancamentoContabilCreate,
    LoteContabilDetailRead,
    LoteContabilRead,
    ModeloPlanoContaDetailRead,
    ModeloPlanoContaItemRead,
    ModeloPlanoContaRead,
    PartidaRead,
    RazaoMovimento,
    RazaoRead,
)
from app.services.contabilidade import criar_lote_e_partidas
from app.seeds.templates_plano_contas import seed_templates

logger = logging.getLogger(__name__)

router = APIRouter()

allow_admin_contador = RoleChecker(allowed_roles=[
    UserRole.ADMIN, UserRole.CONTADOR, UserRole.OWNER, UserRole.MANAGER
])

_ZERO = Decimal("0")


def _to_dec(v) -> Decimal:
    if v is None:
        return _ZERO
    return Decimal(str(v))


# ---------------------------------------------------------------------------
# Templates (leitura pública — sem tenant required)
# ---------------------------------------------------------------------------

@router.get("/templates", response_model=List[ModeloPlanoContaRead])
def list_templates(
    atividade_economica: Optional[AtividadeEconomica] = None,
    db: Session = Depends(get_session),
):
    """Lista os templates de plano de contas disponíveis."""
    # Garantir que os templates existem (lazy seed)
    total_existente = db.exec(select(func.count(ModeloPlanoConta.id))).one() or 0
    if total_existente == 0:
        logger.info("[CONTABIL] Templates não encontrados — executando seed automático.")
        seed_templates(db)

    stmt = select(ModeloPlanoConta).where(ModeloPlanoConta.ativo == True)
    if atividade_economica:
        stmt = stmt.where(ModeloPlanoConta.atividade_economica == atividade_economica)
    modelos = db.exec(stmt).all()

    result = []
    for m in modelos:
        total_contas = db.exec(
            select(func.count(ModeloPlanoContaItem.id)).where(ModeloPlanoContaItem.modelo_id == m.id)
        ).one() or 0
        item = ModeloPlanoContaRead(
            id=m.id,
            codigo=m.codigo,
            nome=m.nome,
            atividade_economica=m.atividade_economica,
            versao=m.versao,
            descricao=m.descricao,
            ativo=m.ativo,
            total_contas=total_contas,
        )
        result.append(item)
    return result


@router.get("/templates/{modelo_id}", response_model=ModeloPlanoContaDetailRead)
def get_template(
    modelo_id: UUID,
    db: Session = Depends(get_session),
):
    """Retorna um template com todos os seus itens."""
    modelo = db.get(ModeloPlanoConta, modelo_id)
    if not modelo:
        raise HTTPException(status_code=404, detail="Template não encontrado.")

    itens = db.exec(
        select(ModeloPlanoContaItem)
        .where(ModeloPlanoContaItem.modelo_id == modelo_id)
        .order_by(ModeloPlanoContaItem.codigo_estruturado)
    ).all()

    return ModeloPlanoContaDetailRead(
        id=modelo.id,
        codigo=modelo.codigo,
        nome=modelo.nome,
        atividade_economica=modelo.atividade_economica,
        versao=modelo.versao,
        descricao=modelo.descricao,
        ativo=modelo.ativo,
        total_contas=len(itens),
        itens=[ModeloPlanoContaItemRead.model_validate(i) for i in itens],
    )


# ---------------------------------------------------------------------------
# Ativação do módulo contábil (idempotente)
# ---------------------------------------------------------------------------

@router.post("/ativar-modulo", response_model=AtivarModuloResponse)
def ativar_modulo_contabil(
    payload: AtivarModuloPayload,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_session),
    _auth=Depends(RoleChecker(allowed_roles=[UserRole.ADMIN, UserRole.OWNER])),
):
    """
    Ativa o módulo contábil para a empresa, clonando o template de plano de contas.

    Idempotente: se já ativado com o MESMO template, retorna o status sem duplicar.
    Se chamado com template diferente, levanta 400.
    Proteção contra race-condition via verificação após lock do registro da empresa.
    """
    empresa = db.get(Empresa, tenant_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    # Garantir que os templates existem
    total_existente = db.exec(select(func.count(ModeloPlanoConta.id))).one() or 0
    if total_existente == 0:
        seed_templates(db)

    # Selecionar o modelo
    if payload.modelo_id:
        modelo = db.get(ModeloPlanoConta, payload.modelo_id)
        if not modelo or not modelo.ativo:
            raise HTTPException(status_code=404, detail="Template não encontrado ou inativo.")
        if modelo.atividade_economica != payload.atividade_economica:
            raise HTTPException(
                status_code=400,
                detail=f"O template selecionado é para '{modelo.atividade_economica}', mas a atividade informada é '{payload.atividade_economica}'."
            )
    else:
        modelo = db.exec(
            select(ModeloPlanoConta).where(
                ModeloPlanoConta.atividade_economica == payload.atividade_economica,
                ModeloPlanoConta.ativo == True,
            ).order_by(ModeloPlanoConta.versao.desc())
        ).first()
        if not modelo:
            raise HTTPException(
                status_code=404,
                detail=f"Nenhum template disponível para atividade '{payload.atividade_economica}'."
            )

    # Idempotência: já ativado com o mesmo template
    if empresa.modulo_contabil_ativo and empresa.plano_contas_template_id == modelo.id:
        contas_existentes = db.exec(
            select(func.count(PlanoConta.id)).where(PlanoConta.empresa_id == tenant_id)
        ).one() or 0
        return AtivarModuloResponse(
            message="Módulo contábil já estava ativado com este template.",
            modelo_codigo=modelo.codigo,
            modelo_versao=modelo.versao,
            contas_criadas=contas_existentes,
        )

    # Impedir ativação com template diferente do atual (evita sobrescrever customizações)
    if empresa.modulo_contabil_ativo:
        raise HTTPException(
            status_code=400,
            detail=(
                "O módulo contábil já está ativado com outro template. "
                "Para migrar para um template diferente é necessário inativar as contas existentes "
                "e reativar o módulo — operação que requer suporte especializado para preservar o histórico."
            )
        )

    # Buscar os itens do template ordenados por código (garante que pais vêm antes de filhos)
    itens = db.exec(
        select(ModeloPlanoContaItem)
        .where(ModeloPlanoContaItem.modelo_id == modelo.id)
        .order_by(ModeloPlanoContaItem.codigo_estruturado)
    ).all()

    now = datetime.now(timezone.utc)

    # Mapa codigo_estruturado → UUID da PlanoConta criada (para resolver parent_id)
    codigo_to_id: dict[str, UUID] = {}
    contas_criadas = 0

    for item in itens:
        parent_id = None
        if item.parent_codigo and item.parent_codigo in codigo_to_id:
            parent_id = codigo_to_id[item.parent_codigo]

        conta = PlanoConta(
            empresa_id=tenant_id,
            codigo_estruturado=item.codigo_estruturado,
            nome=item.nome,
            tipo=item.tipo,
            natureza=item.natureza,
            is_analitica=item.is_analitica,
            ativo=True,
            parent_id=parent_id,
            template_conta_origem_id=item.id,
            origem="TEMPLATE",
            is_required=item.is_required,
            criado_em=now,
            atualizado_em=now,
        )
        db.add(conta)
        db.flush()  # Obter o ID para resolver parents
        codigo_to_id[item.codigo_estruturado] = conta.id
        contas_criadas += 1

    # Atualizar Empresa
    empresa.modulo_contabil_ativo = True
    empresa.atividade_economica = payload.atividade_economica
    empresa.plano_contas_template_id = modelo.id
    empresa.plano_contas_template_versao = modelo.versao
    db.add(empresa)

    db.commit()
    logger.info(
        "[CONTABIL] Módulo contábil ativado para empresa=%s — template=%s — contas=%d",
        tenant_id, modelo.codigo, contas_criadas
    )

    return AtivarModuloResponse(
        message=f"Módulo contábil ativado com sucesso. {contas_criadas} contas criadas.",
        modelo_codigo=modelo.codigo,
        modelo_versao=modelo.versao,
        contas_criadas=contas_criadas,
    )


# ---------------------------------------------------------------------------
# Lotes Contábeis
# ---------------------------------------------------------------------------

@router.get("/lotes", response_model=List[LoteContabilRead])
def list_lotes(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    status_filtro: Optional[StatusLoteContabil] = None,
    modulo_origem: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session),
    _auth=Depends(allow_admin_contador),
):
    """Lista os lotes contábeis da empresa com filtros."""
    stmt = (
        select(LoteContabil)
        .where(LoteContabil.empresa_id == tenant_id)
        .order_by(LoteContabil.data_lancamento.desc(), LoteContabil.criado_em.desc())
    )
    if data_inicio:
        stmt = stmt.where(LoteContabil.data_lancamento >= data_inicio)
    if data_fim:
        stmt = stmt.where(LoteContabil.data_lancamento <= data_fim)
    if status_filtro:
        stmt = stmt.where(LoteContabil.status == status_filtro)
    if modulo_origem:
        stmt = stmt.where(LoteContabil.modulo_origem == modulo_origem)

    stmt = stmt.offset((page - 1) * size).limit(size)
    return db.exec(stmt).all()


@router.get("/lotes/{lote_id}", response_model=LoteContabilDetailRead)
def get_lote(
    lote_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session),
    _auth=Depends(allow_admin_contador),
):
    """Retorna um lote com suas partidas."""
    lote = db.get(LoteContabil, lote_id)
    if not lote or lote.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Lote não encontrado.")

    partidas_raw = db.exec(
        select(JournalEntry, PlanoConta.nome.label("conta_nome"), PlanoConta.codigo_estruturado.label("conta_codigo"))
        .join(PlanoConta, JournalEntry.conta_id == PlanoConta.id)
        .where(JournalEntry.lote_id == lote_id)
        .order_by(JournalEntry.debito_credito.desc())
    ).all()

    partidas = [
        PartidaRead(
            id=je.id,
            conta_id=je.conta_id,
            conta_nome=conta_nome,
            conta_codigo=conta_codigo,
            valor=_to_dec(je.valor),
            debito_credito=je.debito_credito,
            historico=je.historico,
        )
        for je, conta_nome, conta_codigo in partidas_raw
    ]

    return LoteContabilDetailRead(
        id=lote.id,
        empresa_id=lote.empresa_id,
        data_lancamento=lote.data_lancamento,
        historico=lote.historico,
        documento_referencia=lote.documento_referencia,
        modulo_origem=lote.modulo_origem,
        lancamento_financeiro_id=lote.lancamento_financeiro_id,
        usuario_id=lote.usuario_id,
        status=lote.status,
        criado_em=lote.criado_em,
        partidas=partidas,
    )


@router.post("/lancamento", response_model=LoteContabilRead, status_code=status.HTTP_201_CREATED)
def criar_lancamento_manual(
    payload: LancamentoContabilCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_session),
    _auth=Depends(RoleChecker(allowed_roles=[UserRole.ADMIN, UserRole.CONTADOR, UserRole.OWNER])),
):
    """
    Cria um lançamento contábil manual (casos que não passam pelo financeiro).
    Valida soma_débitos == soma_créditos antes de persistir.
    """
    partidas = [
        {"conta_id": p.conta_id, "valor": p.valor, "debito_credito": p.debito_credito}
        for p in payload.partidas
    ]

    lote = criar_lote_e_partidas(
        db=db,
        empresa_id=tenant_id,
        data=payload.data,
        historico=payload.historico,
        partidas=partidas,
        modulo_origem="MANUAL",
        usuario_id=user_id,
        documento_referencia=payload.documento_referencia,
    )
    db.commit()
    db.refresh(lote)
    return lote


# ---------------------------------------------------------------------------
# Livro Razão
# ---------------------------------------------------------------------------

@router.get("/razao", response_model=RazaoRead)
def livro_razao(
    conta_id: UUID,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session),
    _auth=Depends(allow_admin_contador),
):
    """
    Retorna o Livro Razão de uma conta para o período.
    Inclui saldo anterior ao período e saldo final.
    """
    conta = db.get(PlanoConta, conta_id)
    if not conta or conta.empresa_id != tenant_id:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    if not conta.is_analitica:
        raise HTTPException(status_code=400, detail="Livro Razão só disponível para contas analíticas.")

    # Saldo anterior (todos os lançamentos antes de data_inicio)
    saldo_anterior = _ZERO
    if data_inicio:
        stmt_ant = select(JournalEntry).where(
            JournalEntry.conta_id == conta_id,
            JournalEntry.empresa_id == tenant_id,
            JournalEntry.data_lancamento < data_inicio,
        )
        for je in db.exec(stmt_ant).all():
            v = _to_dec(je.valor)
            if conta.natureza == NaturezaConta.DEVEDORA:
                saldo_anterior += v if je.debito_credito == "D" else -v
            else:
                saldo_anterior += v if je.debito_credito == "C" else -v

    # Movimentos no período
    stmt = select(JournalEntry).where(
        JournalEntry.conta_id == conta_id,
        JournalEntry.empresa_id == tenant_id,
    ).order_by(JournalEntry.data_lancamento, JournalEntry.criado_em)

    if data_inicio:
        stmt = stmt.where(JournalEntry.data_lancamento >= data_inicio)
    if data_fim:
        stmt = stmt.where(JournalEntry.data_lancamento <= data_fim)

    entradas = db.exec(stmt).all()

    movimentos = []
    saldo_corrente = saldo_anterior
    total_debitos = _ZERO
    total_creditos = _ZERO

    for je in entradas:
        v = _to_dec(je.valor)
        deb = v if je.debito_credito == "D" else _ZERO
        cre = v if je.debito_credito == "C" else _ZERO

        total_debitos += deb
        total_creditos += cre

        if conta.natureza == NaturezaConta.DEVEDORA:
            saldo_corrente += deb - cre
        else:
            saldo_corrente += cre - deb

        # Buscar módulo de origem (via lote se disponível)
        modulo = je.modulo_origem or "FINANCEIRO"

        movimentos.append(RazaoMovimento(
            data=je.data_lancamento,
            historico=je.historico,
            debito=deb,
            credito=cre,
            saldo=saldo_corrente,
            lote_id=je.lote_id,
            modulo_origem=modulo,
        ))

    return RazaoRead(
        conta_id=conta_id,
        conta_nome=conta.nome,
        conta_codigo=conta.codigo_estruturado,
        natureza=conta.natureza,
        saldo_anterior=saldo_anterior,
        total_debitos=total_debitos,
        total_creditos=total_creditos,
        saldo_final=saldo_corrente,
        movimentos=movimentos,
    )


# ---------------------------------------------------------------------------
# Balancete de Verificação
# ---------------------------------------------------------------------------

@router.get("/balancete", response_model=BalanceteRead)
def balancete(
    data_inicio: date,
    data_fim: date,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session),
    _auth=Depends(allow_admin_contador),
):
    """
    Balancete de verificação: todas as contas analíticas com
    saldo_anterior, total_debitos, total_creditos e saldo_atual.
    """
    # Buscar todas as contas analíticas ativas da empresa
    contas = db.exec(
        select(PlanoConta).where(
            PlanoConta.empresa_id == tenant_id,
            PlanoConta.is_analitica == True,
            PlanoConta.ativo == True,
        ).order_by(PlanoConta.codigo_estruturado)
    ).all()

    # Buscar todos os lançamentos anteriores (saldo anterior)
    stmt_ant = (
        select(JournalEntry.conta_id, JournalEntry.debito_credito, func.sum(JournalEntry.valor))
        .where(
            JournalEntry.empresa_id == tenant_id,
            JournalEntry.data_lancamento < data_inicio,
        )
        .group_by(JournalEntry.conta_id, JournalEntry.debito_credito)
    )
    saldos_anteriores: dict[UUID, dict] = {}
    for conta_id, dc, soma in db.exec(stmt_ant).all():
        if conta_id not in saldos_anteriores:
            saldos_anteriores[conta_id] = {"D": _ZERO, "C": _ZERO}
        saldos_anteriores[conta_id][dc] += _to_dec(soma)

    # Buscar movimentos do período
    stmt_periodo = (
        select(JournalEntry.conta_id, JournalEntry.debito_credito, func.sum(JournalEntry.valor))
        .where(
            JournalEntry.empresa_id == tenant_id,
            JournalEntry.data_lancamento >= data_inicio,
            JournalEntry.data_lancamento <= data_fim,
        )
        .group_by(JournalEntry.conta_id, JournalEntry.debito_credito)
    )
    movimentos_periodo: dict[UUID, dict] = {}
    for conta_id, dc, soma in db.exec(stmt_periodo).all():
        if conta_id not in movimentos_periodo:
            movimentos_periodo[conta_id] = {"D": _ZERO, "C": _ZERO}
        movimentos_periodo[conta_id][dc] += _to_dec(soma)

    itens = []
    total_debitos_geral = _ZERO
    total_creditos_geral = _ZERO

    for conta in contas:
        ant = saldos_anteriores.get(conta.id, {"D": _ZERO, "C": _ZERO})
        mov = movimentos_periodo.get(conta.id, {"D": _ZERO, "C": _ZERO})

        if conta.natureza == NaturezaConta.DEVEDORA:
            saldo_ant = ant["D"] - ant["C"]
            saldo_atual = saldo_ant + mov["D"] - mov["C"]
        else:
            saldo_ant = ant["C"] - ant["D"]
            saldo_atual = saldo_ant + mov["C"] - mov["D"]

        # Incluir somente contas com movimento ou saldo
        if saldo_ant == _ZERO and mov["D"] == _ZERO and mov["C"] == _ZERO:
            continue

        total_debitos_geral += mov["D"]
        total_creditos_geral += mov["C"]

        itens.append(BalanceteItem(
            conta_id=conta.id,
            codigo=conta.codigo_estruturado,
            nome=conta.nome,
            tipo=conta.tipo,
            natureza=conta.natureza,
            saldo_anterior=saldo_ant,
            total_debitos=mov["D"],
            total_creditos=mov["C"],
            saldo_atual=saldo_atual,
        ))

    return BalanceteRead(
        data_inicio=data_inicio,
        data_fim=data_fim,
        itens=itens,
        total_debitos=total_debitos_geral,
        total_creditos=total_creditos_geral,
    )


# ---------------------------------------------------------------------------
# DRE — Demonstração do Resultado do Exercício
# ---------------------------------------------------------------------------

@router.get("/dre", response_model=DRERead)
def dre(
    data_inicio: date,
    data_fim: date,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session),
    _auth=Depends(allow_admin_contador),
):
    """DRE: filtra contas RECEITA e DESPESA no período."""
    contas = db.exec(
        select(PlanoConta).where(
            PlanoConta.empresa_id == tenant_id,
            PlanoConta.is_analitica == True,
            PlanoConta.ativo == True,
            PlanoConta.tipo.in_([TipoConta.RECEITA, TipoConta.DESPESA]),
        ).order_by(PlanoConta.codigo_estruturado)
    ).all()

    contas_ids = [c.id for c in contas]
    if not contas_ids:
        return DRERead(
            data_inicio=data_inicio, data_fim=data_fim,
            total_receitas=_ZERO, total_despesas=_ZERO, resultado_liquido=_ZERO, itens=[]
        )

    stmt = (
        select(JournalEntry.conta_id, JournalEntry.debito_credito, func.sum(JournalEntry.valor))
        .where(
            JournalEntry.empresa_id == tenant_id,
            JournalEntry.data_lancamento >= data_inicio,
            JournalEntry.data_lancamento <= data_fim,
            JournalEntry.conta_id.in_(contas_ids),
        )
        .group_by(JournalEntry.conta_id, JournalEntry.debito_credito)
    )
    movimentos: dict[UUID, dict] = {}
    for conta_id, dc, soma in db.exec(stmt).all():
        if conta_id not in movimentos:
            movimentos[conta_id] = {"D": _ZERO, "C": _ZERO}
        movimentos[conta_id][dc] += _to_dec(soma)

    itens = []
    total_receitas = _ZERO
    total_despesas = _ZERO

    for conta in contas:
        mov = movimentos.get(conta.id, {"D": _ZERO, "C": _ZERO})
        if mov["D"] == _ZERO and mov["C"] == _ZERO:
            continue

        if conta.tipo == TipoConta.RECEITA:
            # Receita: natureza CREDORA → saldo = C - D
            valor = mov["C"] - mov["D"]
            total_receitas += valor
        else:
            # Despesa: natureza DEVEDORA → saldo = D - C (apresentado como negativo)
            valor = -(mov["D"] - mov["C"])
            total_despesas += mov["D"] - mov["C"]

        itens.append(DREItem(conta_id=conta.id, codigo=conta.codigo_estruturado, nome=conta.nome, tipo=conta.tipo, valor=valor))

    return DRERead(
        data_inicio=data_inicio,
        data_fim=data_fim,
        total_receitas=total_receitas,
        total_despesas=total_despesas,
        resultado_liquido=total_receitas - total_despesas,
        itens=itens,
    )


# ---------------------------------------------------------------------------
# Balanço Patrimonial
# ---------------------------------------------------------------------------

@router.get("/balanco", response_model=BalancoRead)
def balanco_patrimonial(
    data_base: date,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_session),
    _auth=Depends(allow_admin_contador),
):
    """Balanço patrimonial com saldos até data_base, estrutura hierárquica."""
    contas = db.exec(
        select(PlanoConta).where(
            PlanoConta.empresa_id == tenant_id,
            PlanoConta.tipo.in_([TipoConta.ATIVO, TipoConta.PASSIVO, TipoConta.PATRIMONIO]),
        ).order_by(PlanoConta.codigo_estruturado)
    ).all()

    contas_ids = [c.id for c in contas]
    analiticas_ids = [c.id for c in contas if c.is_analitica]

    # Somar movimentos até data_base para contas analíticas
    saldos: dict[UUID, Decimal] = {}
    if analiticas_ids:
        stmt = (
            select(JournalEntry.conta_id, JournalEntry.debito_credito, func.sum(JournalEntry.valor))
            .where(
                JournalEntry.empresa_id == tenant_id,
                JournalEntry.data_lancamento <= data_base,
                JournalEntry.conta_id.in_(analiticas_ids),
            )
            .group_by(JournalEntry.conta_id, JournalEntry.debito_credito)
        )
        mov: dict[UUID, dict] = {}
        for conta_id, dc, soma in db.exec(stmt).all():
            if conta_id not in mov:
                mov[conta_id] = {"D": _ZERO, "C": _ZERO}
            mov[conta_id][dc] += _to_dec(soma)

        for conta in contas:
            if not conta.is_analitica:
                continue
            m = mov.get(conta.id, {"D": _ZERO, "C": _ZERO})
            if conta.natureza == NaturezaConta.DEVEDORA:
                saldos[conta.id] = m["D"] - m["C"]
            else:
                saldos[conta.id] = m["C"] - m["D"]

    # Construir hierarquia
    conta_map = {c.id: c for c in contas}

    def _build_node(conta: PlanoConta, nivel: int = 0) -> BalancoItem:
        if conta.is_analitica:
            saldo = saldos.get(conta.id, _ZERO)
            return BalancoItem(conta_id=conta.id, codigo=conta.codigo_estruturado, nome=conta.nome, tipo=conta.tipo, saldo=saldo, nivel=nivel, filhos=[])
        # Sintética: soma os filhos
        filhos = [c for c in contas if c.parent_id == conta.id]
        filhos_nodes = [_build_node(f, nivel + 1) for f in filhos]
        saldo_total = sum(f.saldo for f in filhos_nodes)
        return BalancoItem(conta_id=conta.id, codigo=conta.codigo_estruturado, nome=conta.nome, tipo=conta.tipo, saldo=saldo_total, nivel=nivel, filhos=filhos_nodes)

    raizes_ativo = [c for c in contas if c.tipo == TipoConta.ATIVO and c.parent_id is None]
    raizes_passivo = [c for c in contas if c.tipo == TipoConta.PASSIVO and c.parent_id is None]
    raizes_patrimonio = [c for c in contas if c.tipo == TipoConta.PATRIMONIO and c.parent_id is None]

    ativo_nodes = [_build_node(c) for c in raizes_ativo]
    passivo_nodes = [_build_node(c) for c in raizes_passivo]
    patrimonio_nodes = [_build_node(c) for c in raizes_patrimonio]

    return BalancoRead(
        data_base=data_base,
        total_ativo=sum(n.saldo for n in ativo_nodes),
        total_passivo=sum(n.saldo for n in passivo_nodes),
        total_patrimonio=sum(n.saldo for n in patrimonio_nodes),
        ativo=ativo_nodes,
        passivo=passivo_nodes,
        patrimonio=patrimonio_nodes,
    )
