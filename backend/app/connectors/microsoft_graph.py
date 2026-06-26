from __future__ import annotations

from collections.abc import Iterator

from app.connectors.base import SourceConnector
from app.core.models import ExtractedDocument, SourceItem


class MicrosoftGraphDriveConnector(SourceConnector):
    """Placeholder for OneDrive for Business / SharePoint document libraries."""

    def __init__(self, source_id: str, drive_id: str, item_id: str):
        self._source_id = source_id
        self.drive_id = drive_id
        self.item_id = item_id

    @property
    def source_id(self) -> str:
        return self._source_id

    def iter_items(self, cursor: str | None = None) -> Iterator[SourceItem]:
        raise NotImplementedError("Microsoft Graph connector is documented but not wired in the MVP scaffold.")

    def extract(self, item: SourceItem) -> ExtractedDocument:
        raise NotImplementedError("Microsoft Graph extraction is documented but not wired in the MVP scaffold.")
