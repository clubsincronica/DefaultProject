"""Descarga fuentes de una cancion del cancionero rojo.
Uso: python scripts/fetch-songbook.py --song je-veux
"""
import argparse, pathlib, sys, requests
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from parse_drive import parse_entries, doc_export_url

SONGS = {
    "je-veux": {"folder": "13HCVRZ-_UyJL6NeTWG2cV8KNR6AX5s9-",
                "doc": "14Ep5Tb-Rbj_et0k2onOSoS-NYB6pT-T2ACN9Bbocpx0",
                "mp3": "1aOY045VbdI17woEmHcSqFSHkLx_HpU25",
                "name": "je-veux"},
}
ROOT = pathlib.Path(__file__).resolve().parent.parent
VIEW = "https://drive.google.com/embeddedfolderview?id={fid}#list"


def fetch(song_key: str):
    cfg = SONGS[song_key]
    sheets = ROOT / "sources" / "sheets"
    refs = ROOT / "sources" / "reference"
    sheets.mkdir(parents=True, exist_ok=True)
    refs.mkdir(parents=True, exist_ok=True)

    r = requests.get(doc_export_url(cfg["doc"]), timeout=60)
    r.raise_for_status()
    (sheets / f"{cfg['name']}.txt").write_text(r.text, encoding="utf-8")
    print(f"sheet: sources/sheets/{cfg['name']}.txt")

    import gdown
    out = refs / f"{cfg['name']}.mp3"
    gdown.download(id=cfg["mp3"], output=str(out), quiet=False)
    if not out.exists() or out.stat().st_size < 100_000:
        sys.exit("mp3 download failed - drop the file manually into sources/reference/")
    print(f"reference: sources/reference/{cfg['name']}.mp3")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--song", required=True, choices=SONGS)
    fetch(ap.parse_args().song)
