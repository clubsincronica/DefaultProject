import re

ENTRY_SPLIT = re.compile(r'(?=<div class="flip-entry")')
TITLE_RE = re.compile(r'<div class="flip-entry-title">(.*?)</div>', re.S)
ID_RE = re.compile(r'(?:file/d/|folders/|document/d/)([\w-]+)')


def parse_entries(html: str):
    entries = []
    for block in ENTRY_SPLIT.split(html):
        if not block.startswith('<div class="flip-entry"'):
            continue
        t = TITLE_RE.search(block)
        i = ID_RE.search(block)
        if not t or not i:
            continue
        name = t.group(1)
        if "google-apps.document" in block:
            kind = "doc"
        elif "type/audio" in block or "type/video" in block:
            kind = "audio"
        elif "drive-sprite-folder" in block or "google-apps.folder" in block or "folders/" in block:
            kind = "folder"
        else:
            kind = "file"
        entries.append({"name": name, "id": i.group(1), "kind": kind})
    return entries


def doc_export_url(doc_id: str) -> str:
    return f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
