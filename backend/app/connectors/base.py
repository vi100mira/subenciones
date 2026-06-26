from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator

from app.core.models import ExtractedDocument, SourceItem


class SourceConnector(ABC):
    """Common contract for local folders, corporate drives, APIs, and uploads."""

    @property
    @abstractmethod
    def source_id(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def iter_items(self, cursor: str | None = None) -> Iterator[SourceItem]:
        raise NotImplementedError

    @abstractmethod
    def extract(self, item: SourceItem) -> ExtractedDocument:
        raise NotImplementedError
