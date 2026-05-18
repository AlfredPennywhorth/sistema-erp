from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlmodel import Session

from app.models.database import Empresa, Invite, InviteStatus, UsuarioEmpresa, User, UserRole, LogAuditoria
from app.services.resend_service import ResendService


def _seed_team_data(engine):
    tenant_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    operador_id = uuid.uuid4()
    contador_id = uuid.uuid4()
    sem_vinculo_id = uuid.uuid4()

    with Session(engine) as session:
        empresa = Empresa(
            id=tenant_id,
            razao_social="Empresa Teste LTDA",
            cnpj="12345678000199",
            regime_tributario="SIMPLES_NACIONAL",
            cep="01001000",
            logradouro="Rua A",
            numero="100",
            bairro="Centro",
            cidade="São Paulo",
            uf="SP",
            codigo_municipio_ibge="3550308",
            cnae_principal="6201500",
        )
        session.add(empresa)

        users = [
            User(id=admin_id, email="admin@teste.com", nome="Admin"),
            User(id=operador_id, email="operador@teste.com", nome="Operador"),
            User(id=contador_id, email="contador@teste.com", nome="Contador"),
            User(id=sem_vinculo_id, email="out@teste.com", nome="Sem Vinculo"),
        ]
        for u in users:
            session.add(u)

        session.add(UsuarioEmpresa(usuario_id=admin_id, empresa_id=tenant_id, role=UserRole.ADMIN, ativo=True))
        session.add(UsuarioEmpresa(usuario_id=operador_id, empresa_id=tenant_id, role=UserRole.OPERADOR, ativo=True))
        session.add(UsuarioEmpresa(usuario_id=contador_id, empresa_id=tenant_id, role=UserRole.CONTADOR, ativo=True))

        invite = Invite(
            empresa_id=tenant_id,
            email="convite@teste.com",
            role=UserRole.OPERADOR,
            token=str(uuid.uuid4()),
            status=InviteStatus.PENDING,
            expira_em=datetime(2099, 1, 1, tzinfo=timezone.utc),
        )
        session.add(invite)

        log = LogAuditoria(
            empresa_id=tenant_id,
            usuario_id=admin_id,
            acao="CREATE",
            tabela_afetada="usuarios",
            registro_id=admin_id,
            dados_novos={"ok": True},
        )
        session.add(log)

        session.commit()
        session.refresh(invite)

    return {
        "tenant_id": str(tenant_id),
        "admin_id": str(admin_id),
        "operador_id": str(operador_id),
        "contador_id": str(contador_id),
        "sem_vinculo_id": str(sem_vinculo_id),
        "invite_id": str(invite.id),
    }


def _headers(user_id: str, tenant_id: str):
    return {
        "X-Test-User-ID": user_id,
        "X-Tenant-ID": tenant_id,
    }


def test_team_endpoints_admin_autorizado(client, db_engine, monkeypatch):
    ids = _seed_team_data(db_engine)
    h = _headers(ids["admin_id"], ids["tenant_id"])
    monkeypatch.setattr(ResendService, "send_invite_email", staticmethod(lambda *args, **kwargs: True))

    assert client.get("/api/v1/team/members", headers=h).status_code == 200
    assert client.post(
        "/api/v1/team/invite",
        json={"email": "novo@teste.com", "role": "OPERADOR"},
        headers=h,
    ).status_code == 201
    assert client.post(f"/api/v1/team/resend-invite/{ids['invite_id']}", headers=h).status_code == 200
    assert client.patch(
        f"/api/v1/team/members/{ids['invite_id']}/role",
        json={"role": "OPERADOR"},
        headers=h,
    ).status_code == 200
    assert client.get("/api/v1/team/audit", headers=h).status_code == 200


def test_team_endpoints_operador_bloqueado(client, db_engine):
    ids = _seed_team_data(db_engine)
    h = _headers(ids["operador_id"], ids["tenant_id"])

    assert client.get("/api/v1/team/members", headers=h).status_code == 403
    assert client.post("/api/v1/team/invite", json={"email": "x@x.com"}, headers=h).status_code == 403
    assert client.post(f"/api/v1/team/resend-invite/{ids['invite_id']}", headers=h).status_code == 403
    assert client.patch(
        f"/api/v1/team/members/{ids['invite_id']}/role",
        json={"role": "OPERADOR"},
        headers=h,
    ).status_code == 403
    assert client.delete(f"/api/v1/team/members/{ids['invite_id']}", headers=h).status_code == 403
    assert client.get("/api/v1/team/audit", headers=h).status_code == 403


def test_team_endpoints_contador_bloqueado(client, db_engine):
    ids = _seed_team_data(db_engine)
    h = _headers(ids["contador_id"], ids["tenant_id"])

    assert client.get("/api/v1/team/members", headers=h).status_code == 403
    assert client.post("/api/v1/team/invite", json={"email": "x@x.com"}, headers=h).status_code == 403
    assert client.get("/api/v1/team/audit", headers=h).status_code == 403


def test_team_endpoints_sem_vinculo_bloqueado(client, db_engine):
    ids = _seed_team_data(db_engine)
    h = _headers(ids["sem_vinculo_id"], ids["tenant_id"])

    assert client.get("/api/v1/team/members", headers=h).status_code == 403
