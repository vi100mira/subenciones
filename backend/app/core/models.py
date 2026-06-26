from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class DataClass(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    PERSONAL = "personal"
    SENSITIVE = "sensitive"
    BLOCKED = "blocked"


class SourceKind(str, Enum):
    LOCAL_FOLDER = "local_folder"
    GOOGLE_DRIVE = "google_drive"
    MICROSOFT_GRAPH = "microsoft_graph"
    PUBLIC_API = "public_api"
    MANUAL_UPLOAD = "manual_upload"


@dataclass(frozen=True)
class Tenant:
    id: str
    name: str


@dataclass(frozen=True)
class SourceItem:
    source_id: str
    external_id: str
    name: str
    path: str
    mime_type: str
    modified_at: datetime
    content_hash: str
    data_class: DataClass
    source_kind: SourceKind
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ExtractedDocument:
    item: SourceItem
    text: str


@dataclass(frozen=True)
class IngestionResult:
    run_id: str
    source_id: str
    scanned: int
    inserted: int
    updated: int
    skipped: int
    blocked: int
    started_at: datetime
    finished_at: datetime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
