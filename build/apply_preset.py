#!/usr/bin/env python3
"""
Swap the CONFIG block of index.html for a preset (or your own config file). Standard library only.

  python3 apply_preset.py presets/pantry.js
  python3 apply_preset.py presets/volunteers.js --name "Sunrise Helpers" --tagline "Fill every shift" --theme sunset --logo 🌅
  python3 apply_preset.py presets/bakery_demo.js            # go back to the demo
  python3 build/apply_preset.py src/presets/pantry.js     # (inside the GitHub repo layout)

Presets: volunteers, pantry, donors, clients, events, directory, bakery_demo.
A backup is saved as index.html.bak. Then rebuild the Worker (python3 cloudflare/build_worker.py) and redeploy.
Tip: browser storage is keyed by app name, so a renamed app starts with fresh demo data.
"""
import argparse, re, shutil, sys
from pathlib import Path

START, END = "/*==CONFIG:START==*/", "/*==CONFIG:END==*/"
ap = argparse.ArgumentParser()
_here = Path(__file__).resolve().parent
_default = _here / "index.html" if (_here / "index.html").exists() else _here.parent / "src" / "index.html"   # kit: web-starter/  |  repo: build/ -> ../src/
ap.add_argument("preset"); ap.add_argument("--target", default=str(_default))
ap.add_argument("--name"); ap.add_argument("--tagline"); ap.add_argument("--theme"); ap.add_argument("--logo")
a = ap.parse_args()

target = Path(a.target); html = target.read_text(encoding="utf-8")
if START not in html or END not in html: sys.exit("Markers not found in target; is it the starter's index.html?")
cfg = Path(a.preset).read_text(encoding="utf-8").strip()
if "const CONFIG" not in cfg: sys.exit("Preset must define `const CONFIG = {...};`")
js = lambda v: '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'
for key, val in (("appName", a.name), ("tagline", a.tagline), ("theme", a.theme), ("logo", a.logo)):
    if val is not None:
        cfg, n = re.subn(r'(\b%s:\s*)"(?:[^"\\]|\\.)*"' % key, lambda m: m.group(1) + js(val), cfg, count=1)
        if not n: print(f"warning: could not set {key}")
head, rest = html.split(START, 1); _, tail = rest.split(END, 1)
shutil.copyfile(target, str(target) + ".bak")
target.write_text(head + START + "\n" + cfg + "\n" + END + tail, encoding="utf-8")
print(f"Applied {a.preset} to {target} (backup: {target.name}.bak)")
