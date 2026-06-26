from __future__ import annotations

from collections.abc import Iterator

from app.connectors.base import SourceConnector
from app.core.models import ExtractedDocument, SourceItem


class GoogleDriveConnector(SourceConnector):
    """Placeholder for Google Drive API / Shared Drives integration.

    The implementation should use least-privilege OAuth scopes for user-selected
    folders during pilots, or domain-wide delegation only after Workspace admin
    approval and a documented tenant boundary.
    """

    def __init__(self, source_id: str, folder_id: str):
        self._source_id = source_id
        self.folder_id = folder_id

    @property
    def source_id(self) -> str:
        return self._source_id

    def iter_items(self, cursor: str | None = None) -> Iterator[SourceItem]:
        raise NotImplementedError("Google Drive connector is documented but not wired in the MVP scaffold.")

    def extract(self, item: SourceItem) -> ExtractedDocument:
        raise NotImplementedError("Google Drive extraction is documented but not wired in the MVP scaffold.")
