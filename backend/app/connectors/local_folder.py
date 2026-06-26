from __future__ import annotations

import hashlib
import mimetypes
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

from app.connectors.base import SourceConnector
from app.core.models import DataClass, ExtractedDocument, SourceItem, SourceKind


TEXT_SUFFIXES = {".txt", ".md", ".csv", ".json", ".xml", ".html"}
BLOCKED_MARKERS = {"sensible", "sensitive", "beneficiarios_identificados", "casos_personales"}
INTERNAL_MARKERS = {"interno", "interna", "conocimiento_interno", "aprobado"}
PUBLIC_MARKERS = {"publico", "publica", "subvenciones_vivas", "fuentes_publicas"}


class LocalFolderConnector(SourceConnector):
    def __init__(self, source_id: str, root: Path):
        self._source_id = source_id
        self.root = root.resolve()

    @property
    def source_id(self) -> str:
        return self._source_id

    def iter_items(self, cursor: str | None = None) -> Iterator[SourceItem]:
        if not self.root.exists():
            raise FileNotFoundError(f"Local source folder does not exist: {self.root}")

        for path in sorted(self.root.rglob("*")):
            if not path.is_file() or path.name.startswith("."):
                continue
            relative_path = path.relative_to(self.root).as_posix()
            content_hash = self._hash_file(path)
            stat = path.stat()
            yield SourceItem(
                source_id=self.source_id,
                external_id=relative_path,
                name=path.name,
                path=relative_path,
                mime_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                modified_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
                content_hash=content_hash,
                data_class=self._classify_path(relative_path),
                source_kind=SourceKind.LOCAL_FOLDER,
                metadata={"absolute_path": str(path)},
            )

    def extract(self, item: SourceItem) -> ExtractedDocument:
        if item.data_class in {DataClass.SENSITIVE, DataClass.BLOCKED}:
            return ExtractedDocument(item=item, text="")

        path = Path(item.metadata["absolute_path"])
        if path.suffix.lower() not in TEXT_SUFFIXES:
            return ExtractedDocument(
                item=item,
                text=f"[Unsupported binary document for prototype extraction: {path.name}]",
            )

        text = path.read_text(encoding="utf-8", errors="replace")
        return ExtractedDocument(item=item, text=text)

    @staticmethod
    def _hash_file(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()

    @staticmethod
    def _classify_path(relative_path: str) -> DataClass:
        normalized = relative_path.lower().replace("\\", "/")
        parts = set(normalized.replace("-", "_").split("/"))
        words = set(normalized.replace("-", "_").replace(".", "_").split("_"))
        tokens = parts | words
        if tokens & BLOCKED_MARKERS:
            return DataClass.BLOCKED
        if tokens & INTERNAL_MARKERS:
            return DataClass.INTERNAL
        if tokens & PUBLIC_MARKERS:
            return DataClass.PUBLIC
        return DataClass.INTERNAL
