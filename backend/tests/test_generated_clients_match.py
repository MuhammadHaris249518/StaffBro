from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_generated_clients_match() -> None:
    mobile = (ROOT.parent / "mobile" / "src" / "api" / "generated.ts").read_text(encoding="utf-8")
    admin = (ROOT.parent / "admin" / "src" / "api" / "generated.ts").read_text(encoding="utf-8")
    assert mobile == admin
