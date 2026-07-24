import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree


WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def document_parts(archive: zipfile.ZipFile) -> list[str]:
    names = archive.namelist()
    ordered = ["word/document.xml"]
    ordered.extend(sorted(name for name in names if re.fullmatch(r"word/(?:header|footer)\d+\.xml", name)))
    ordered.extend(sorted(name for name in names if name.startswith("word/footnotes") or name.startswith("word/endnotes")))
    return [name for name in ordered if name in names]


def extract_part(raw_xml: bytes) -> str:
    root = ElementTree.fromstring(raw_xml)
    lines = []
    for paragraph in root.iter(f"{{{WORD_NAMESPACE}}}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{{{WORD_NAMESPACE}}}t"))
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            lines.append(text)
    return "\n".join(lines)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    path = Path(sys.argv[1])
    with zipfile.ZipFile(path) as archive:
        parts = [extract_part(archive.read(name)) for name in document_parts(archive)]
    text = "\n\n".join(part for part in parts if part).strip()[:120000]
    print(json.dumps({"text": text, "characters": len(text), "parser": "docx_xml"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
