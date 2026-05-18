from __future__ import annotations

import asyncio
import uuid

import pytest
from fastapi.responses import JSONResponse
from starlette.requests import Request
from sqlmodel import Session, select

from app.api.v1.endpoints import tenants
from app.core import middleware
from app.main import app_startup
from app.models.database import Empresa, User, UsuarioEmpresa


def _seed_base_user(engine, user_id: uuid.UUID):
    with Session(engine) as session:
        session.add(User(id=user_id, email="auth@teste.com", nome="Auth User"))
        session.commit()


def _tenant_payload(usuario_id: str):
    return {
        "cnpj": "11222333000181",
        "usuario_id": usuario_id,
        "email": "fake@client.com",
        "razao_social": "Nova Empresa Segura",
        "nome_fantasia": "Empresa Segura",
        "inscricao_estadual": "123",
        "regime_tributario": "SIMPLES_NACIONAL",
        "cep": "01001000",
        "logradouro": "Rua B",
        "numero": "200",
        "complemento": "Sala 1",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "uf": "SP",
        "aceite_termos": True,
    }


def test_setup_ignora_usuario_id_do_client_e_usa_usuario_autenticado(client, db_engine, monkeypatch: pytest.MonkeyPatch):
    auth_user_id = uuid.uuid4()
    atacante_user_id = uuid.uuid4()
    _seed_base_user(db_engine, auth_user_id)

    monkeypatch.setattr(tenants.SeederService, "seed_plano_contas", staticmethod(lambda **kwargs: None))
    monkeypatch.setattr(tenants.SeederService, "seed_centros_custo", staticmethod(lambda **kwargs: None))
    monkeypatch.setattr(tenants.SeederService, "seed_formas_pagamento", staticmethod(lambda **kwargs: None))
    monkeypatch.setattr(tenants.SeederService, "seed_bandeiras_cartao", staticmethod(lambda **kwargs: None))

    resp = client.post(
        "/api/v1/tenants/setup",
        json=_tenant_payload(str(atacante_user_id)),
        headers={"X-Test-User-ID": str(auth_user_id)},
    )
    assert resp.status_code == 201

    with Session(db_engine) as session:
        vinculos_auth = session.exec(
            select(UsuarioEmpresa).where(UsuarioEmpresa.usuario_id == auth_user_id)
        ).all()
        vinculos_atacante = session.exec(
            select(UsuarioEmpresa).where(UsuarioEmpresa.usuario_id == atacante_user_id)
        ).all()

    assert len(vinculos_auth) == 1
    assert len(vinculos_atacante) == 0


def test_setup_sem_autenticacao_falha(client, db_engine, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(tenants.SeederService, "seed_plano_contas", staticmethod(lambda **kwargs: None))
    monkeypatch.setattr(tenants.SeederService, "seed_centros_custo", staticmethod(lambda **kwargs: None))
    monkeypatch.setattr(tenants.SeederService, "seed_formas_pagamento", staticmethod(lambda **kwargs: None))
    monkeypatch.setattr(tenants.SeederService, "seed_bandeiras_cartao", staticmethod(lambda **kwargs: None))

    resp = client.post("/api/v1/tenants/setup", json=_tenant_payload(str(uuid.uuid4())))
    assert resp.status_code == 401


def test_check_cnpj_nao_vaza_razao_social(client, db_engine):
    with Session(db_engine) as session:
        session.add(
            Empresa(
                id=uuid.uuid4(),
                razao_social="Empresa Sigilosa LTDA",
                cnpj="44555666000177",
                regime_tributario="SIMPLES_NACIONAL",
                cep="01001000",
                logradouro="Rua C",
                numero="300",
                bairro="Centro",
                cidade="São Paulo",
                uf="SP",
                codigo_municipio_ibge="3550308",
                cnae_principal="6201500",
            )
        )
        session.commit()

    existente = client.get("/api/v1/tenants/check-cnpj/44555666000177")
    assert existente.status_code == 200
    body = existente.json()
    assert body["exists"] is True
    assert body["can_register"] is False
    assert "razao_social" not in body

    inexistente = client.get("/api/v1/tenants/check-cnpj/11111111111111")
    assert inexistente.status_code == 200
    body2 = inexistente.json()
    assert body2["exists"] is False
    assert body2["can_register"] is True


def test_middleware_recusa_mock_token_em_producao(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(middleware.settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(middleware.settings, "ENABLE_MOCK_AUTH", True)

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/team/members",
        "headers": [
            (b"authorization", b"Bearer mock-token"),
            (b"x-user-id", b"00000000-0000-0000-0000-000000000000"),
        ],
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def call_next(_request):
        return JSONResponse({"ok": True})

    request = Request(scope, receive)
    response = asyncio.run(middleware.get_empresa_id_middleware(request, call_next))
    assert response.status_code == 401


def test_startup_falha_em_producao_com_mock_auth(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("app.main.create_db_and_tables", lambda: None)
    monkeypatch.setattr("app.main.settings.ENVIRONMENT", "production")
    monkeypatch.setattr("app.main.settings.ENABLE_MOCK_AUTH", True)

    with pytest.raises(RuntimeError):
        asyncio.run(app_startup())
