"""Servidor do AgroÁgua e ponto de entrada da API AgroIA."""

from pathlib import Path
import os

import requests
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent if CURRENT_DIR.name == "backend" else CURRENT_DIR
load_dotenv(PROJECT_ROOT / ".env")

AGROIA_PATH = PROJECT_ROOT / "backend" / "agroia.txt"
AGROIA_CONTEXT = (
    AGROIA_PATH.read_text(encoding="utf-8")
    if AGROIA_PATH.exists()
    else "Você é a AgroIA, assistente técnica do projeto AgroÁgua."
)

PAGES = {
    "index.html",
    "automacao-esp32.html",
}
PUBLIC_EXTENSIONS = {
    "ativos": {".css", ".js", ".svg", ".png", ".jpg", ".webp", ".woff", ".woff2"},
    "assets": {".css", ".js", ".svg", ".png", ".jpg", ".webp", ".woff", ".woff2"},
    "dados": {".js", ".json", ".csv"},
    "img": {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"},
}

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 128 * 1024
app.json.ensure_ascii = False


@app.get("/")
def home():
    html_dir = PROJECT_ROOT / "html"
    if (html_dir / "index.html").exists():
        return send_from_directory(html_dir, "index.html")
    return send_from_directory(PROJECT_ROOT, "index.html")


@app.get("/api/health")
def health():
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    return jsonify(
        status="ok",
        service="AgroÁgua",
        agroia="configured" if groq_key else "not_configured",
        provider="groq",
    )


@app.post("/api/chat")
def chat():
    """Envia a conversa ao Groq, mantendo a chave no servidor."""
    payload = request.get_json()
    if not isinstance(payload, dict):
        return jsonify(error="Envie um objeto JSON com o campo message."), 400

    message = payload.get("message")
    if not isinstance(message, str) or not message.strip():
        return jsonify(error="Escreva uma mensagem para a AgroIA."), 400
    if len(message) > 2000:
        return jsonify(error="A mensagem deve ter até 2000 caracteres."), 400

    history = payload.get("history", [])
    if not isinstance(history, list) or len(history) > 6 or len(history) % 2:
        return jsonify(error="O histórico deve conter até três pares de mensagens."), 400

    for index, turn in enumerate(history):
        expected_role = "user" if index % 2 == 0 else "model"
        limit = 2000 if expected_role == "user" else 8000
        if (
            not isinstance(turn, dict)
            or turn.get("role") != expected_role
            or not isinstance(turn.get("text"), str)
            or not turn["text"].strip()
            or len(turn["text"]) > limit
        ):
            return jsonify(error="O histórico contém uma mensagem inválida."), 400

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        return (
            jsonify(
                error="Configure GROQ_API_KEY no ambiente e reinicie o servidor.",
                code="agroia_not_configured",
            ),
            503,
        )

    model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
    messages = [{"role": "system", "content": AGROIA_CONTEXT}]
    for turn in history:
        role = "user" if turn["role"] == "user" else "assistant"
        messages.append({"role": role, "content": turn["text"]})
    messages.append({"role": "user", "content": message.strip()})

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 600,
                "temperature": 0.7,
            },
            timeout=(10, 35),
        )
        if response.status_code == 429:
            return (
                jsonify(
                    error="Limite temporário do Groq atingido. Aguarde alguns segundos e tente novamente."
                ),
                429,
            )
        if response.status_code in (400, 401, 403, 404):
            return (
                jsonify(
                    error="Configuração do Groq recusada. Verifique a chave ou o modelo."
                ),
                503,
            )
        response.raise_for_status()
        result = response.json()
        choices = result.get("choices", [])
        if not choices:
            return (
                jsonify(
                    error="A AgroIA não retornou uma resposta. Tente reformular a pergunta."
                ),
                502,
            )
        reply = choices[0].get("message", {}).get("content", "").strip()
        if not reply:
            return jsonify(error="A resposta veio vazia. Tente novamente."), 502
        return jsonify(reply=reply)
    except requests.Timeout:
        return jsonify(error="A AgroIA demorou para responder. Tente novamente."), 504
    except (
        requests.RequestException,
        ValueError,
        AttributeError,
        TypeError,
        KeyError,
        IndexError,
    ):
        return (
            jsonify(
                error="Não foi possível consultar a AgroIA. Verifique a conexão com a internet."
            ),
            502,
        )


@app.get("/<filename>")
def page(filename):
    if filename not in PAGES:
        abort(404)
    html_dir = PROJECT_ROOT / "html"
    if (html_dir / filename).exists():
        return send_from_directory(html_dir, filename)
    return send_from_directory(PROJECT_ROOT, filename)


@app.get("/ativos/<path:filename>", defaults={"folder": "ativos"})
@app.get("/assets/<path:filename>", defaults={"folder": "assets"})
@app.get("/dados/<path:filename>", defaults={"folder": "dados"})
@app.get("/img/<path:filename>", defaults={"folder": "img"})
def public_file(folder, filename):
    extensions = PUBLIC_EXTENSIONS.get(folder, set())
    if Path(filename).suffix.lower() not in extensions:
        abort(404)
    if any(part.startswith(".") for part in Path(filename).parts):
        abort(404)
    target_dir = PROJECT_ROOT / folder
    if not target_dir.exists():
        abort(404)
    return send_from_directory(target_dir, filename)


@app.errorhandler(HTTPException)
def http_error(error):
    if request.path.startswith("/api/"):
        response = error.get_response()
        response.data = app.json.dumps({"error": error.name})
        response.content_type = "application/json"
        return response
    return error


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8124, debug=False)
