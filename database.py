"""Persistência PostgreSQL, autenticação e CRUD das áreas."""
from datetime import date, timedelta
from functools import wraps
import json
import math
import os
from pathlib import Path
import re

import click
import psycopg
from psycopg.rows import dict_row
from flask import Blueprint, abort, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent.parent
db_api = Blueprint("database", __name__)


def connect():
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        abort(503, description="Configure DATABASE_URL no .env para usar o banco.")
    return psycopg.connect(url, row_factory=dict_row, connect_timeout=10)


def payload():
    body = request.get_json()
    if not isinstance(body, dict):
        abort(400, description="Envie um objeto JSON.")
    return body


def text_value(body, key, maximum=80, optional=False):
    value = body.get(key, "")
    if not isinstance(value, str) or len(value.strip()) > maximum:
        abort(400, description=f"Valor inválido para {key}.")
    value = value.strip()
    if not value and not optional:
        abort(400, description=f"Preencha {key}.")
    return value


def area_values(body):
    name = text_value(body, "name")
    try:
        hectares = float(body["area"])
        flow = float(body["flow"])
        city = int(body["city"])
        sensors = int(body.get("sensors", 1))
        planting = date.fromisoformat(body["planting"])
        last = date.fromisoformat(body["lastIrrigation"])
    except (ValueError, TypeError, KeyError, OverflowError):
        abort(400, description="Confira datas, município, área, vazão e sensores.")
    if (not math.isfinite(hectares) or not math.isfinite(flow)
            or not 0 < hectares <= 1000000 or not 0 < flow <= 1000000
            or not 0 <= sensors <= 10000):
        abort(400, description="Área e vazão devem ser positivas e finitas.")
    for key, allowed in {
        "soil": ("arenoso", "medio", "argiloso"),
        "system": ("gotejamento", "micro", "aspersao", "sulco"),
        "phase": ("ini", "cresc", "prod", "final"),
    }.items():
        if body.get(key) not in allowed:
            abort(400, description=f"Valor inválido para {key}.")
    crop = text_value(body, "crop", 40)
    return (name, city, crop, hectares, flow, body["soil"], body["system"],
            body["phase"], planting, last, sensors)


def area_json(row):
    return dict(id=row["id"], name=row["nome"], city=row["municipio_id"],
                crop=row["cultura_id"], area=row["hectares"], flow=row["vazao_m3h"],
                soil=row["solo"], system=row["sistema"], phase=row["fase"],
                planting=row["plantio"].isoformat(),
                lastIrrigation=row["ultima_irrigacao"].isoformat(),
                sensors=row["sensores"], version=row["versao"],
                clientKey=row["client_key"], createdAt=row["criado_em"].isoformat())


def profile(row):
    return dict(username=row["username"], name=row["nome"], farmName=row["fazenda"],
                cityId=row["municipio_id"], community=row["comunidade"],
                producerTitle=row["tratamento"], role=row["papel"])


def authenticated(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            abort(401, description="Entre novamente para acessar suas áreas no banco.")
        return fn(*args, **kwargs)
    return wrapped


def insert_area(conn, user_id, body):
    values = area_values(body)
    key = text_value(body, "clientKey", 100)
    row = conn.execute("""
        INSERT INTO area (usuario_id, client_key, nome, municipio_id, cultura_id,
            hectares, vazao_m3h, solo, sistema, fase, plantio, ultima_irrigacao, sensores)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (usuario_id, client_key) DO NOTHING RETURNING *
    """, (user_id, key, *values)).fetchone()
    if row is None:
        row = conn.execute("SELECT * FROM area WHERE usuario_id=%s AND client_key=%s",
                           (user_id, key)).fetchone()
    return area_json(row)


@db_api.post("/api/auth/register")
def register():
    body = payload()
    username = text_value(body, "username", 24).lower()
    if not re.fullmatch(r"[a-z0-9._-]{3,24}", username) or username in ("admin", "agricultor"):
        abort(400, description="Escolha um usuário de 3 a 24 caracteres.")
    password = text_value(body, "password", 200)
    if len(password) < 6:
        abort(400, description="A senha deve ter pelo menos seis caracteres.")
    name = text_value(body, "name")
    farm = text_value(body, "farmName")
    community = text_value(body, "community", optional=True)
    title = body.get("producerTitle", "produtor(a)")
    if title not in ("produtor", "produtora", "produtor(a)"):
        abort(400, description="Forma de tratamento inválida.")
    areas = body.get("areas", [])
    if not isinstance(areas, list) or len(areas) > 100:
        abort(400, description="Cadastre até cem plantações.")
    if any(not isinstance(a, dict) for a in areas):
        abort(400, description="Plantação inválida.")
    with connect() as conn:
        user = conn.execute("""
            INSERT INTO usuario (username,password_hash,nome,fazenda,municipio_id,comunidade,tratamento)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, (username, generate_password_hash(password), name, farm,
              body.get("cityId"), community, title)).fetchone()
        for area in areas:
            insert_area(conn, user["id"], area)
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True
    return jsonify(user=profile(user)), 201


@db_api.post("/api/auth/login")
def login():
    body = payload()
    username = text_value(body, "username", 24).lower()
    password = text_value(body, "password", 200)
    with connect() as conn:
        user = conn.execute("SELECT * FROM usuario WHERE username=%s", (username,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        abort(401, description="Usuário ou senha inválidos no banco.")
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True
    return jsonify(user=profile(user))


@db_api.get("/api/auth/me")
@authenticated
def me():
    with connect() as conn:
        user = conn.execute("SELECT * FROM usuario WHERE id=%s", (session["user_id"],)).fetchone()
    if not user:
        session.clear()
        abort(401)
    return jsonify(user=profile(user))


@db_api.get("/api/farms")
@authenticated
def list_farms():
    with connect() as conn:
        user = conn.execute("SELECT papel FROM usuario WHERE id=%s", (session["user_id"],)).fetchone()
        if not user or user["papel"] != "admin":
            abort(403)
        farmers = conn.execute("SELECT * FROM usuario WHERE papel='farmer' ORDER BY fazenda, nome").fetchall()
        areas = conn.execute("SELECT * FROM area ORDER BY id").fetchall()
    return jsonify(farms=[dict(account=profile(farmer), areas=[
        area_json(a) for a in areas if a["usuario_id"] == farmer["id"]
    ]) for farmer in farmers])


@db_api.post("/api/auth/logout")
def logout():
    session.clear()
    return "", 204


@db_api.get("/api/areas")
@authenticated
def list_areas():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM area WHERE usuario_id=%s ORDER BY id",
                            (session["user_id"],)).fetchall()
    return jsonify(areas=[area_json(row) for row in rows])


@db_api.get("/api/areas/<int:area_id>")
@authenticated
def get_area(area_id):
    with connect() as conn:
        row = conn.execute("SELECT * FROM area WHERE id=%s AND usuario_id=%s",
                           (area_id, session["user_id"])).fetchone()
    if not row:
        abort(404, description="Área não encontrada.")
    return jsonify(area=area_json(row))


@db_api.post("/api/areas")
@authenticated
def create_area():
    with connect() as conn:
        area = insert_area(conn, session["user_id"], payload())
    return jsonify(area=area), 201


@db_api.post("/api/areas/import")
@authenticated
def import_areas():
    areas = payload().get("areas")
    if not isinstance(areas, list) or len(areas) > 500 or any(not isinstance(a, dict) for a in areas):
        abort(400, description="Envie uma lista de até 500 áreas.")
    with connect() as conn:
        result = [insert_area(conn, session["user_id"], a) for a in areas]
    return jsonify(areas=result)


@db_api.put("/api/areas/<int:area_id>")
@authenticated
def update_area(area_id):
    body = payload()
    values = area_values(body)
    if not isinstance(body.get("version"), int) or body["version"] < 1:
        abort(400, description="Recarregue a área antes de editar.")
    with connect() as conn:
        row = conn.execute("""
            UPDATE area SET nome=%s,municipio_id=%s,cultura_id=%s,hectares=%s,
                vazao_m3h=%s,solo=%s,sistema=%s,fase=%s,plantio=%s,
                ultima_irrigacao=%s,sensores=%s,versao=versao+1,atualizado_em=now()
            WHERE id=%s AND usuario_id=%s AND versao=%s RETURNING *
        """, (*values, area_id, session["user_id"], body["version"])).fetchone()
    if not row:
        abort(409, description="A área mudou ou foi excluída. Atualize o painel antes de editar.")
    return jsonify(area=area_json(row))


@db_api.delete("/api/areas/<int:area_id>")
@authenticated
def delete_area(area_id):
    version = payload().get("version")
    if not isinstance(version, int):
        abort(400, description="Informe a versão atual da área.")
    with connect() as conn:
        row = conn.execute("DELETE FROM area WHERE id=%s AND usuario_id=%s AND versao=%s RETURNING id",
                           (area_id, session["user_id"], version)).fetchone()
    if not row:
        abort(409, description="A área mudou ou foi excluída. Atualize o painel.")
    return "", 204


def init_app(app):
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY") or os.urandom(32),
        SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE") == "1",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    )
    app.register_blueprint(db_api)

    @app.before_request
    def protect_writes():
        if request.path.startswith(("/api/auth/", "/api/areas")) and request.method in ("POST", "PUT", "DELETE"):
            if request.headers.get("X-Agroagua-Request") != "1":
                abort(403, description="Requisição inválida.")
            if request.headers.get("Sec-Fetch-Site") == "cross-site":
                abort(403)

    @app.errorhandler(psycopg.IntegrityError)
    def integrity_error(error):
        return jsonify(error="Confira o usuário, o município, a cultura e as restrições do cadastro."), 409

    @app.errorhandler(psycopg.Error)
    def database_error(error):
        # Nunca expor o DSN, senha ou detalhes da conexão na resposta.
        return jsonify(error="Banco indisponível. Confira a conexão e execute init-db."), 503

    @app.cli.command("init-db")
    def init_db():
        """Cria tabelas e carrega os catálogos sem apagar registros existentes."""
        cities = json.loads((ROOT / "dados/municipios_pi.json").read_text(encoding="utf-8"))
        crops_source = (ROOT / "js/saas.js").read_text(encoding="utf-8").split("const CROPS = [", 1)[1].split("];", 1)[0]
        crops = re.findall(r"id: '([^']+)', nome: '([^']+)'", crops_source)
        if len(crops) != 17:
            raise click.ClickException("Catálogo de culturas inesperado.")
        with connect() as conn:
            conn.execute((ROOT / "sql/schema.sql").read_text(encoding="utf-8"))
            with conn.cursor() as cur:
                cur.executemany("INSERT INTO municipio VALUES (%s,%s) ON CONFLICT (codigo_ibge) DO UPDATE SET nome=EXCLUDED.nome",
                                [(c["id"], c["nome"]) for c in cities["municipios"]])
                cur.executemany("INSERT INTO cultura VALUES (%s,%s) ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome", crops)
        click.echo("Tabelas criadas. Catálogos de municípios e culturas atualizados.")

    @app.cli.command("seed-demo")
    def seed_demo():
        """Cria as duas contas públicas de demonstração, sem sobrescrever senhas."""
        with connect() as conn:
            for username, name, role in [("admin", "Admin AgroÁgua", "admin"),
                                         ("agricultor", "Produtor de demonstração", "farmer")]:
                conn.execute("""
                    INSERT INTO usuario (username,password_hash,nome,fazenda,municipio_id,papel)
                    VALUES (%s,%s,%s,%s,2211001,%s) ON CONFLICT (username) DO NOTHING
                """, (username, generate_password_hash("2026"), name, "Fazenda Boa Vista", role))
        click.echo("Contas públicas de demonstração disponíveis.")
