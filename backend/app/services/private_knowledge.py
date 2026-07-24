from __future__ import annotations

import json
import hashlib
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from uuid import UUID


ROOT = Path(__file__).resolve().parents[3]
PRIVATE_CORPUS = ROOT / "scripts" / "private-corpus"
if str(PRIVATE_CORPUS) not in sys.path:
    sys.path.insert(0, str(PRIVATE_CORPUS))
from query_quarantine_index import query_index  # noqa: E402


def load_local_env() -> None:
    for name in (".env.local", ".env"):
        path = ROOT / name
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = value.strip().strip("\"'")


class SupabaseGateway:
    def __init__(self) -> None:
        load_local_env()
        self.url = (os.getenv("SUPABASE_URL") or os.getenv("APP_SUPABASE_URL") or "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("APP_SUPABASE_SERVICE_ROLE_KEY") or ""
        if not self.url or not self.key:
            raise RuntimeError("Falta la configuración local de Supabase.")

    def request(self, path: str, *, token: str | None = None, params: dict | None = None,
                method: str = "GET", body: dict | None = None):
        query = f"?{urllib.parse.urlencode(params or {})}" if params else ""
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(f"{self.url}{path}{query}", data=data, method=method, headers={
            "apikey": self.key, "Authorization": f"Bearer {token or self.key}",
            "Content-Type": "application/json", "Accept": "application/json",
            "Prefer": "return=minimal",
        })
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            raise PermissionError("No se pudo validar el acceso privado.") from error

    def approved_documents(self, token: str, tenant_id: str, source_id: str) -> tuple[str, set[str]]:
        role = self.require_private_source_access(token, tenant_id, source_id)
        documents = self.request("/rest/v1/source_documents", params={
            "tenant_id": f"eq.{tenant_id}", "source_connection_id": f"eq.{source_id}",
            "select": "external_id,data_class,metadata_json", "limit": "500",
        }) or []
        approved = {
            str(item["external_id"]).removeprefix("local-inventory:")
            for item in documents
            if str(item.get("external_id", "")).startswith("local-inventory:")
            and item.get("data_class") == "internal"
            and item.get("metadata_json", {}).get("review_status") == "approved"
        }
        return role, approved

    def require_private_source_access(self, token: str, tenant_id: str, source_id: str) -> str:
        user = self.request("/auth/v1/user", token=token)
        user_id = str(user.get("id", "")) if isinstance(user, dict) else ""
        if not user_id:
            raise PermissionError("Sesión local no válida.")
        memberships = self.request("/rest/v1/organization_memberships", params={
            "tenant_id": f"eq.{tenant_id}", "auth_user_id": f"eq.{user_id}",
            "status": "eq.active", "select": "role", "limit": "1",
        }) or []
        if not memberships:
            raise PermissionError("Sin pertenencia activa a la entidad.")
        sources = self.request("/rest/v1/source_connections", params={
            "id": f"eq.{source_id}", "tenant_id": f"eq.{tenant_id}", "scope": "eq.tenant_private",
            "status": "eq.active", "select": "id", "limit": "1",
        }) or []
        if not sources:
            raise PermissionError("La fuente privada no está activa para esta entidad.")
        return str(memberships[0].get("role", "member"))

    def authorized_document(self, token: str, tenant_id: str, source_id: str,
                            document_id: str) -> tuple[str, dict]:
        role = self.require_private_source_access(token, tenant_id, source_id)
        documents = self.request("/rest/v1/source_documents", params={
            "id": f"eq.{document_id}", "tenant_id": f"eq.{tenant_id}",
            "source_connection_id": f"eq.{source_id}",
            "select": "id,external_id,title,mime_type,data_class,source_sha256", "limit": "1",
        }) or []
        if not documents:
            raise PermissionError("Documento privado no disponible para esta entidad.")
        return role, documents[0]

    def require_document_agent(self, tenant_id: str) -> None:
        configs = self.request("/rest/v1/tenant_configs", params={
            "tenant_id": f"eq.{tenant_id}", "select": "motivations_json", "limit": "1",
        }) or []
        motivations = configs[0].get("motivations_json", {}) if configs else {}
        configured = motivations.get("commercial_plan", {}) if isinstance(motivations, dict) else {}
        requested = str(configured.get("code", "")) if isinstance(configured, dict) else ""
        code = requested if requested in {"public", "social_team", "mission_full"} else (
            "mission_full" if motivations.get("social_pricing") and motivations.get("pilot_scope") else "public"
        )
        if code != "mission_full":
            raise PermissionError("Permiso insuficiente: Asistente no incluido en el plan contratado.")

    def audit(self, tenant_id: str, user_label: str, source_id: str, detail: dict,
              action: str = "private_knowledge.queried") -> None:
        self.request("/rest/v1/audit_events", method="POST", body={
            "tenant_id": tenant_id, "actor_label": user_label,
            "action": action, "target_type": "source_connection",
            "target_id": source_id, "detail_json": detail,
        })


def index_path(tenant_id: str, source_id: str) -> Path:
    UUID(tenant_id)
    UUID(source_id)
    default_root = Path(os.getenv("LOCALAPPDATA") or Path.home()) / "Insertia" / "private-index"
    root = Path(os.getenv("PRIVATE_INDEX_ROOT", str(default_root))).resolve()
    candidate = (root / tenant_id / source_id / "quarantine.sqlite3").resolve()
    if not candidate.is_relative_to(root):
        raise ValueError("Ruta de índice privado no válida.")
    return candidate


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def private_document_path(token: str, tenant_id: str, source_id: str, document_id: str,
                          gateway: SupabaseGateway | None = None) -> tuple[Path, dict]:
    if not token:
        raise PermissionError("Falta la sesión de la entidad.")
    UUID(document_id)
    access = gateway or SupabaseGateway()
    role, document = access.authorized_document(token, tenant_id, source_id, document_id)
    external_id = str(document.get("external_id", ""))
    if not external_id.startswith("local-inventory:"):
        raise LookupError("El documento no procede de una carpeta local inventariada.")
    manifest_path = index_path(tenant_id, source_id).with_name("source-manifest.json")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("tenant_id") != tenant_id or manifest.get("source_connection_id") != source_id:
        raise PermissionError("El manifiesto local no pertenece a esta entidad.")
    local_id = external_id.removeprefix("local-inventory:")
    entry = next((item for item in manifest.get("documents", [])
                  if item.get("document_id") == local_id), None)
    if not entry or entry.get("source_sha256") != document.get("source_sha256"):
        raise LookupError("El original local no coincide con el inventario vigente.")
    root = Path(str(manifest.get("corpus_root", ""))).resolve()
    candidate = (root / str(entry.get("relative_path", ""))).resolve()
    if not root.is_dir() or not candidate.is_relative_to(root) or not candidate.is_file():
        raise FileNotFoundError("El original ya no está en la carpeta autorizada.")
    if file_sha256(candidate) != document.get("source_sha256"):
        raise LookupError("La huella del original ha cambiado; vuelve a inventariar la carpeta.")
    access.audit(tenant_id, role, source_id, {
        "document_id": document_id, "data_class": document.get("data_class"),
        "sha256": document.get("source_sha256"), "storage": "local_authorized_folder",
        "external_ai_calls": 0, "content_copied_to_audit": False,
    }, action="private_document.opened_local")
    return candidate, document


def query_private_knowledge(token: str, tenant_id: str, source_id: str, question: str,
                            gateway: SupabaseGateway | None = None) -> dict:
    if not token:
        raise PermissionError("Falta la sesión de la entidad.")
    access = gateway or SupabaseGateway()
    role, approved = access.approved_documents(token, tenant_id, source_id)
    access.require_document_agent(tenant_id)
    if not approved:
        raise LookupError("Todavía no hay documentos aprobados para consultar.")
    result = query_index(index_path(tenant_id, source_id), tenant_id, source_id, question, approved)
    access.audit(tenant_id, role, source_id, {
        "mode": result["mode"], "query_hash": result["queryHash"],
        "approved_document_count": result["approvedDocumentCount"],
        "selected_chunk_count": result["selectedChunkCount"],
        "external_ai_calls": 0, "content_copied_to_audit": False,
    })
    return result
