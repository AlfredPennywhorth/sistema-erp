from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlmodel import Session, select, func
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime, timedelta
from typing import List, Optional
from decimal import Decimal
import calendar

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
    BandeiraCartao,
    FaturaCartao,
    TipoEventoContabil,
    TipoCentroCusto,
    TipoOperacaoPagamento,
    StatusFatura
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
    FormaPagamentoUpdate,
    FaturaCartaoRead,
    FaturaCartaoCreate,
    PagarFaturaPayload,
    BandeiraCartaoRead,
    BandeiraCartaoCreate,
    BandeiraCartaoUpdate,
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
    conta_bancaria_id: Optional[UUID] = None
    juros_multa: Optional[Decimal] = Decimal('0')
    desconto: Optional[Decimal] = Decimal('0')
    forma_pagamento_id: Optional[UUID] = None
    bandeira_id: Optional[UUID] = None  # Para RECEBIMENTO_CARTAO: define taxa por bandeira

@router.post("/{lancamento_id}/liquidar")
def liquidar_lancamento(
    lancamento_id: UUID,
    payload: LiquidacaoPayload,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """
    Realiza a baixa (liquidação) de um título financeiro com validação de SoD.
    O comportamento varia conforme a forma de pagamento:
    - LIQUIDACAO_DIRETA: débito/crédito imediato na conta bancária (padrão)
    - GERACAO_FATURA: vincula à fatura do cartão, sem mexer no saldo bancário
    - COMPENSACAO_BOLETO: baixa com status CONCILIADO e prazo de compensação
    - LIQUIDACAO_DIFERIDA: baixa com data diferida (cheque pré-datado)
    """

    valor_pago = payload.valor_pago
    data_pagamento = payload.data_pagamento
    conta_bancaria_id = payload.conta_bancaria_id
    juros_multa = payload.juros_multa or Decimal('0')
    desconto = payload.desconto or Decimal('0')
    forma_pagamento_id = payload.forma_pagamento_id
    bandeira_id = payload.bandeira_id

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

    # 4. Resolver forma de pagamento e tipo de operação
    tipo_operacao = TipoOperacaoPagamento.LIQUIDACAO_DIRETA
    prazo_liquidacao_dias = 0
    forma = None

    if forma_pagamento_id:
        forma = session.exec(
            select(FormaPagamento).where(
                FormaPagamento.id == forma_pagamento_id,
                FormaPagamento.empresa_id == tenant_id,
                FormaPagamento.is_active == True
            )
        ).first()
        if not forma:
            raise HTTPException(status_code=404, detail="Forma de pagamento não encontrada.")
        tipo_operacao = forma.tipo_operacao
        prazo_liquidacao_dias = forma.prazo_liquidacao_dias or 0

    # 5. Salvar estado anterior para auditoria
    dados_anteriores = lancamento.model_dump(mode='json')

    # 6. Processar conforme tipo de operação
    if tipo_operacao == TipoOperacaoPagamento.GERACAO_FATURA:
        # CARTÃO DE CRÉDITO: NÃO debitar conta bancária agora.
        # Vincular à fatura do mês corrente.
        mes_ref = data_pagamento.replace(day=1)
        fatura = session.exec(
            select(FaturaCartao).where(
                FaturaCartao.empresa_id == tenant_id,
                FaturaCartao.forma_pagamento_id == forma_pagamento_id,
                FaturaCartao.mes_referencia == mes_ref,
                FaturaCartao.status == StatusFatura.ABERTA
            )
        ).first()

        if not fatura:
            # Usar dia_fechamento e dia_vencimento configurados na forma de pagamento
            dia_fec = forma.dia_fechamento if forma and forma.dia_fechamento else None
            dia_ven = forma.dia_vencimento if forma and forma.dia_vencimento else None

            if dia_fec:
                # Ajustar para não ultrapassar o último dia do mês
                ultimo_dia_mes = calendar.monthrange(mes_ref.year, mes_ref.month)[1]
                data_fechamento = mes_ref.replace(day=min(dia_fec, ultimo_dia_mes))
            else:
                # Padrão: último dia do mês
                ultimo_dia = calendar.monthrange(mes_ref.year, mes_ref.month)[1]
                data_fechamento = mes_ref.replace(day=ultimo_dia)

            if dia_ven:
                # Vencimento no dia configurado do mês seguinte
                if mes_ref.month == 12:
                    data_vencimento = date(mes_ref.year + 1, 1, min(dia_ven, 31))
                else:
                    ultimo_dia_prox = calendar.monthrange(mes_ref.year, mes_ref.month + 1)[1]
                    data_vencimento = date(mes_ref.year, mes_ref.month + 1, min(dia_ven, ultimo_dia_prox))
            else:
                # Padrão: dia 10 do mês seguinte
                if mes_ref.month == 12:
                    data_vencimento = date(mes_ref.year + 1, 1, 10)
                else:
                    data_vencimento = date(mes_ref.year, mes_ref.month + 1, 10)

            fatura = FaturaCartao(
                empresa_id=tenant_id,
                forma_pagamento_id=forma_pagamento_id,
                mes_referencia=mes_ref,
                data_vencimento=data_vencimento,
                data_fechamento=data_fechamento,
                valor_total=Decimal('0'),
                status=StatusFatura.ABERTA
            )
            session.add(fatura)
            session.flush()

        # Recalcular valor total da fatura via query
        valor_existente = session.exec(
            select(func.sum(LancamentoFinanceiro.valor_previsto)).where(
                LancamentoFinanceiro.fatura_cartao_id == fatura.id
            )
        ).one() or Decimal('0')
        fatura.valor_total = (valor_existente or Decimal('0')) + valor_pago
        session.add(fatura)

        # Vincular lançamento à fatura (sem pagar ainda)
        lancamento.fatura_cartao_id = fatura.id
        lancamento.forma_pagamento_id = forma_pagamento_id
        lancamento.usuario_liquidacao_id = user_id
        session.add(lancamento)

        log = LogAuditoria(
            empresa_id=tenant_id,
            usuario_id=user_id,
            acao="VINCULAR_FATURA",
            tabela_afetada="lancamentos_financeiros",
            registro_id=lancamento.id,
            dados_anteriores=dados_anteriores,
            dados_novos=lancamento.model_dump(mode='json')
        )
        session.add(log)
        session.commit()

        return {
            "acao": "vinculado_a_fatura",
            "fatura_id": str(fatura.id),
            "mes_referencia": str(fatura.mes_referencia),
            "data_vencimento": str(fatura.data_vencimento),
            "valor_total_fatura": float(fatura.valor_total)
        }

    elif tipo_operacao == TipoOperacaoPagamento.RECEBIMENTO_CARTAO:
        # Cartão de crédito como RECEBIMENTO (POS/PDV):
        # - Taxa da bandeira (ou taxa_padrao da forma) é descontada do valor recebido
        # - O repasse efetivo pela operadora ocorre em prazo_liquidacao_dias
        if lancamento.natureza != NaturezaFinanceira.RECEBER:
            raise HTTPException(
                status_code=400,
                detail="RECEBIMENTO_CARTAO só pode ser usado para lançamentos de natureza RECEBER."
            )

        # Determinar taxa: bandeira específica tem prioridade sobre taxa_padrao da forma
        taxa = Decimal(str(forma.taxa_padrao)) if forma else Decimal('0')
        if bandeira_id:
            bandeira = session.exec(
                select(BandeiraCartao).where(
                    BandeiraCartao.id == bandeira_id,
                    BandeiraCartao.empresa_id == tenant_id,
                    BandeiraCartao.is_active == True
                )
            ).first()
            if bandeira:
                taxa = Decimal(str(bandeira.taxa_credito_1x))

        valor_taxa = (valor_pago * taxa / Decimal('100')).quantize(Decimal('0.01'))
        valor_liquido_recebimento = valor_pago - valor_taxa

        # Data de crédito = hoje + prazo_repasse_dias (usa prazo_liquidacao_dias da forma)
        prazo_repasse = prazo_liquidacao_dias if prazo_liquidacao_dias > 0 else 30
        data_repasse = data_pagamento + timedelta(days=prazo_repasse)

        lancamento.status = StatusLancamento.CONCILIADO
        lancamento.data_pagamento = data_repasse
        lancamento.valor_pago = valor_liquido_recebimento
        lancamento.juros_multa = Decimal('0')
        lancamento.desconto = Decimal('0')
        lancamento.forma_pagamento_id = forma_pagamento_id
        lancamento.usuario_liquidacao_id = user_id
        # Nota: saldo bancário é creditado quando o repasse for confirmado

        session.add(lancamento)

    elif tipo_operacao == TipoOperacaoPagamento.COMPENSACAO_BOLETO:
        # Boleto: baixa com status CONCILIADO e data futura de compensação
        if not conta_bancaria_id:
            raise HTTPException(status_code=400, detail="Conta bancária é obrigatória para compensação de boleto.")
        conta = session.exec(
            select(ContaBancaria).where(ContaBancaria.id == conta_bancaria_id, ContaBancaria.empresa_id == tenant_id)
        ).first()
        if not conta:
            raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

        valor_liquido = valor_pago + juros_multa - desconto
        if lancamento.natureza == NaturezaFinanceira.RECEBER:
            conta.saldo_atual += valor_liquido
        else:
            conta.saldo_atual -= valor_liquido

        data_compensacao = data_pagamento + timedelta(days=prazo_liquidacao_dias)
        lancamento.status = StatusLancamento.CONCILIADO
        lancamento.data_pagamento = data_compensacao
        lancamento.valor_pago = valor_pago
        lancamento.juros_multa = juros_multa
        lancamento.desconto = desconto
        lancamento.conta_bancaria_id = conta_bancaria_id
        lancamento.forma_pagamento_id = forma_pagamento_id
        lancamento.usuario_liquidacao_id = user_id

        session.add(conta)
        session.add(lancamento)

    else:
        # LIQUIDACAO_DIRETA ou LIQUIDACAO_DIFERIDA: comportamento padrão
        if not conta_bancaria_id:
            raise HTTPException(status_code=400, detail="Conta bancária é obrigatória para liquidação direta.")
        conta = session.exec(
            select(ContaBancaria).where(ContaBancaria.id == conta_bancaria_id, ContaBancaria.empresa_id == tenant_id)
        ).first()
        if not conta:
            raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

        valor_liquido = valor_pago + juros_multa - desconto
        if lancamento.natureza == NaturezaFinanceira.RECEBER:
            conta.saldo_atual += valor_liquido
        else:
            conta.saldo_atual -= valor_liquido

        lancamento.status = StatusLancamento.PAGO
        lancamento.data_pagamento = data_pagamento
        lancamento.valor_pago = valor_pago
        lancamento.juros_multa = juros_multa
        lancamento.desconto = desconto
        lancamento.conta_bancaria_id = conta_bancaria_id
        if forma_pagamento_id:
            lancamento.forma_pagamento_id = forma_pagamento_id
        lancamento.usuario_liquidacao_id = user_id

        session.add(conta)
        session.add(lancamento)

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
    return session.exec(
        select(FormaPagamento)
        .where(FormaPagamento.empresa_id == tenant_id)
        .order_by(FormaPagamento.nome)
    ).all()

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

@router.put("/formas-pagamento/{forma_id}", response_model=FormaPagamentoRead)
def update_forma_pagamento(
    forma_id: UUID,
    forma_update: FormaPagamentoUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_forma = session.exec(
        select(FormaPagamento).where(FormaPagamento.id == forma_id, FormaPagamento.empresa_id == tenant_id)
    ).one_or_none()
    if not db_forma:
        raise HTTPException(status_code=404, detail="Forma de pagamento não encontrada.")

    update_data = forma_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_forma, key, value)

    session.add(db_forma)
    session.commit()
    session.refresh(db_forma)
    return db_forma

@router.delete("/formas-pagamento/{forma_id}")
def delete_forma_pagamento(
    forma_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_forma = session.exec(
        select(FormaPagamento).where(FormaPagamento.id == forma_id, FormaPagamento.empresa_id == tenant_id)
    ).one_or_none()
    if not db_forma:
        raise HTTPException(status_code=404, detail="Forma de pagamento não encontrada.")

    # Soft-delete
    db_forma.is_active = False
    session.add(db_forma)
    session.commit()
    return {"message": "Forma de pagamento desativada com sucesso."}

# --- Faturas de Cartão ---

@router.get("/faturas-cartao", response_model=List[FaturaCartaoRead])
def list_faturas_cartao(
    mes_referencia: Optional[date] = None,
    status_filtro: Optional[StatusFatura] = None,
    forma_pagamento_id: Optional[UUID] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    stmt = select(FaturaCartao).where(FaturaCartao.empresa_id == tenant_id)
    if mes_referencia:
        stmt = stmt.where(FaturaCartao.mes_referencia == mes_referencia)
    if status_filtro:
        stmt = stmt.where(FaturaCartao.status == status_filtro)
    if forma_pagamento_id:
        stmt = stmt.where(FaturaCartao.forma_pagamento_id == forma_pagamento_id)
    stmt = stmt.order_by(FaturaCartao.mes_referencia.desc())
    return session.exec(stmt).all()

@router.get("/faturas-cartao/{fatura_id}", response_model=FaturaCartaoRead)
def get_fatura_cartao(
    fatura_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    fatura = session.exec(
        select(FaturaCartao).where(FaturaCartao.id == fatura_id, FaturaCartao.empresa_id == tenant_id)
    ).one_or_none()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")
    return fatura

@router.get("/faturas-cartao/{fatura_id}/lancamentos")
def get_lancamentos_fatura(
    fatura_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    fatura = session.exec(
        select(FaturaCartao).where(FaturaCartao.id == fatura_id, FaturaCartao.empresa_id == tenant_id)
    ).one_or_none()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")

    lancamentos = session.exec(
        select(LancamentoFinanceiro).where(LancamentoFinanceiro.fatura_cartao_id == fatura_id)
    ).all()
    return [l.model_dump(mode='json') for l in lancamentos]

@router.post("/faturas-cartao", response_model=FaturaCartaoRead, status_code=status.HTTP_201_CREATED)
def create_fatura_cartao(
    fatura: FaturaCartaoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    # Validar forma de pagamento
    forma = session.exec(
        select(FormaPagamento).where(
            FormaPagamento.id == fatura.forma_pagamento_id,
            FormaPagamento.empresa_id == tenant_id
        )
    ).one_or_none()
    if not forma:
        raise HTTPException(status_code=404, detail="Forma de pagamento não encontrada.")

    db_fatura = FaturaCartao(**fatura.model_dump())
    db_fatura.empresa_id = tenant_id
    session.add(db_fatura)
    session.commit()
    session.refresh(db_fatura)
    return db_fatura

@router.post("/faturas-cartao/{fatura_id}/pagar")
def pagar_fatura_cartao(
    fatura_id: UUID,
    payload: PagarFaturaPayload,
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """
    Paga uma fatura de cartão de crédito fechada.
    Gera um LancamentoFinanceiro de saída e debita a conta bancária.
    """
    fatura = session.exec(
        select(FaturaCartao).where(FaturaCartao.id == fatura_id, FaturaCartao.empresa_id == tenant_id)
    ).one_or_none()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada.")

    if fatura.status == StatusFatura.PAGA:
        raise HTTPException(status_code=400, detail="Esta fatura já está paga.")

    if fatura.status == StatusFatura.CANCELADA:
        raise HTTPException(status_code=400, detail="Esta fatura está cancelada.")

    conta = session.exec(
        select(ContaBancaria).where(
            ContaBancaria.id == payload.conta_bancaria_id,
            ContaBancaria.empresa_id == tenant_id
        )
    ).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta bancária não encontrada.")

    desconto = payload.desconto or Decimal('0')
    valor_pago = fatura.valor_total - desconto

    # Buscar plano_contas da forma de pagamento (conta transitória) ou fallback
    forma = session.get(FormaPagamento, fatura.forma_pagamento_id)
    plano_contas_id = forma.conta_transitoria_id if forma else None

    if not plano_contas_id:
        # Fallback: buscar primeira conta analítica de passivo ou despesa para o tenant.
        # Para garantir a contabilidade correta, configure conta_transitoria_id na forma de pagamento.
        from app.models.database import TipoConta as TC
        plano_fallback = session.exec(
            select(PlanoConta).where(
                PlanoConta.empresa_id == tenant_id,
                PlanoConta.is_analitica == True,
                PlanoConta.ativo == True,
                PlanoConta.tipo.in_([TC.PASSIVO, TC.DESPESA])
            )
        ).first()
        if not plano_fallback:
            raise HTTPException(
                status_code=400,
                detail="Configure uma conta contábil transitória (passivo/despesa) na forma de pagamento do cartão para registrar o pagamento da fatura corretamente."
            )
        plano_contas_id = plano_fallback.id

    # Debitar conta bancária
    conta.saldo_atual -= valor_pago
    session.add(conta)

    # Criar lançamento de pagamento da fatura
    lancamento_fatura = LancamentoFinanceiro(
        empresa_id=tenant_id,
        descricao=f"Pagamento Fatura Cartão — {fatura.mes_referencia.strftime('%m/%Y')}",
        natureza=NaturezaFinanceira.PAGAR,
        tipo=TipoLancamento.CAIXA,
        status=StatusLancamento.PAGO,
        valor_previsto=fatura.valor_total,
        valor_pago=valor_pago,
        desconto=desconto,
        data_vencimento=fatura.data_vencimento,
        data_pagamento=payload.data_pagamento,
        data_competencia=payload.data_pagamento,
        conta_bancaria_id=payload.conta_bancaria_id,
        forma_pagamento_id=fatura.forma_pagamento_id,
        plano_contas_id=plano_contas_id,
        usuario_criacao_id=user_id,
        usuario_liquidacao_id=user_id,
    )
    session.add(lancamento_fatura)
    session.flush()

    # Atualizar fatura
    fatura.status = StatusFatura.PAGA
    fatura.lancamento_pagamento_id = lancamento_fatura.id
    session.add(fatura)

    log = LogAuditoria(
        empresa_id=tenant_id,
        usuario_id=user_id,
        acao="PAGAR_FATURA",
        tabela_afetada="faturas_cartao",
        registro_id=fatura.id,
        dados_novos={"lancamento_id": str(lancamento_fatura.id), "valor_pago": float(valor_pago)}
    )
    session.add(log)
    session.commit()

    return {
        "message": "Fatura paga com sucesso.",
        "lancamento_id": str(lancamento_fatura.id),
        "valor_pago": float(valor_pago)
    }

# --- Bandeiras de Cartão ---

@router.get("/bandeiras-cartao", response_model=List[BandeiraCartaoRead])
def list_bandeiras_cartao(
    forma_pagamento_id: Optional[UUID] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    stmt = select(BandeiraCartao).where(
        BandeiraCartao.empresa_id == tenant_id,
        BandeiraCartao.is_active == True
    )
    if forma_pagamento_id:
        stmt = stmt.where(BandeiraCartao.forma_pagamento_id == forma_pagamento_id)
    stmt = stmt.order_by(BandeiraCartao.nome)
    return session.exec(stmt).all()

@router.post("/bandeiras-cartao", response_model=BandeiraCartaoRead, status_code=status.HTTP_201_CREATED)
def create_bandeira_cartao(
    bandeira: BandeiraCartaoCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    # Validar forma de pagamento
    forma = session.exec(
        select(FormaPagamento).where(
            FormaPagamento.id == bandeira.forma_pagamento_id,
            FormaPagamento.empresa_id == tenant_id
        )
    ).one_or_none()
    if not forma:
        raise HTTPException(status_code=404, detail="Forma de pagamento não encontrada.")

    db_bandeira = BandeiraCartao(**bandeira.model_dump())
    db_bandeira.empresa_id = tenant_id
    session.add(db_bandeira)
    session.commit()
    session.refresh(db_bandeira)
    return db_bandeira

@router.put("/bandeiras-cartao/{bandeira_id}", response_model=BandeiraCartaoRead)
def update_bandeira_cartao(
    bandeira_id: UUID,
    bandeira_update: BandeiraCartaoUpdate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_bandeira = session.exec(
        select(BandeiraCartao).where(BandeiraCartao.id == bandeira_id, BandeiraCartao.empresa_id == tenant_id)
    ).one_or_none()
    if not db_bandeira:
        raise HTTPException(status_code=404, detail="Bandeira não encontrada.")

    update_data = bandeira_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bandeira, key, value)

    session.add(db_bandeira)
    session.commit()
    session.refresh(db_bandeira)
    return db_bandeira

@router.delete("/bandeiras-cartao/{bandeira_id}")
def delete_bandeira_cartao(
    bandeira_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    session: Session = Depends(get_session)
):
    db_bandeira = session.exec(
        select(BandeiraCartao).where(BandeiraCartao.id == bandeira_id, BandeiraCartao.empresa_id == tenant_id)
    ).one_or_none()
    if not db_bandeira:
        raise HTTPException(status_code=404, detail="Bandeira não encontrada.")

    # Soft-delete
    db_bandeira.is_active = False
    session.add(db_bandeira)
    session.commit()
    return {"message": "Bandeira desativada com sucesso."}


