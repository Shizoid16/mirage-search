#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает js/data.js и articles.json из codes/*.md (необязательно)."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SRC, OUT_JS, OUT_JSON = ROOT/"codes", ROOT/"js"/"data.js", ROOT/"articles.json"
def pair(s):
    n = [int(x) for x in re.findall(r"\d+", s or "")[:2]]
    return [n[0], n[-1]] if n else None
def parse_file(path):
    out = []
    for b in re.split(r"(?m)^##\s+", path.read_text(encoding="utf-8"))[1:]:
        lines = b.strip().splitlines()
        m = re.match(r"([\d.]+)\s+(.+)", lines[0])
        if not m: sys.exit(f"{path.name}: заголовок без номера: {lines[0]}")
        meta, body = {}, []
        for ln in lines[1:]:
            kv = re.match(r"(severity|scope|months|fine|keywords|code):\s*(.+)", ln, re.I)
            (meta.__setitem__(kv.group(1).lower(), kv.group(2).strip()) if kv else body.append(ln))
        a = {"id": f"{path.stem}-{m.group(1).replace('.', '-')}", "code": meta.get("code", path.stem),
             "num": m.group(1), "title": m.group(2),
             "text": " ".join(x.strip() for x in body if x.strip()),
             "severity": int(meta.get("severity", 0)), "scope": meta.get("scope", "B").upper(),
             "months": pair(meta.get("months")), "fine": pair(meta.get("fine")),
             "keywords": [k.strip() for k in re.split(r"[,;]", meta.get("keywords", "")) if k.strip()]}
        assert 0 <= a["severity"] <= 5, f'{a["id"]}: severity вне 0..5'
        assert a["scope"] in "FRB", f'{a["id"]}: scope должен быть F/R/B'
        out.append(a)
    return out
def main():
    if not SRC.exists(): sys.exit(f"Нет папки {SRC} — создай codes/*.md или правь js/data.js руками.")
    arts = [a for p in sorted(SRC.glob("*.md")) for a in parse_file(p)]
    OUT_JS.write_text("window.MIRAGE_DATA = " + json.dumps(arts, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    OUT_JSON.write_text(json.dumps(arts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: статей {len(arts)} -> js/data.js, articles.json")
if __name__ == "__main__":
    main()