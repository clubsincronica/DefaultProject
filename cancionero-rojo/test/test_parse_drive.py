# test/test_parse_drive.py  (run: python -m unittest test.test_parse_drive)
import unittest, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scripts"))
from parse_drive import parse_entries, doc_export_url

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "drive_frances.html"

class TestParseDrive(unittest.TestCase):
    def test_parses_audio_and_doc_entries(self):
        entries = parse_entries(FIXTURE.read_text(encoding="utf-8"))
        by_name = {e["name"]: e for e in entries}
        self.assertIn("Je Veux.mp3", by_name)
        self.assertEqual(by_name["Je Veux.mp3"]["id"], "1aOY045VbdI17woEmHcSqFSHkLx_HpU25")
        self.assertEqual(by_name["Je Veux.mp3"]["kind"], "audio")
        self.assertEqual(by_name["Je veux"]["kind"], "doc")

    def test_doc_export_url(self):
        self.assertEqual(
            doc_export_url("ABC123"),
            "https://docs.google.com/document/d/ABC123/export?format=txt")

if __name__ == "__main__":
    unittest.main()
