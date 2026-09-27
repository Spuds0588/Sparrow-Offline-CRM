#!/usr/bin/env python3
"""One-time migration: split the v1.1.0 release file into src/ modules.

The JS is split at the module-object boundaries (Utils / Core / UI / Events /
init). The IIFE wrapper stays where it is: `utils.js` opens it, `main.js`
closes it, and build.py simply concatenates the modules in order — so the
bundled output stays byte-similar to the v1.1.0 release file.
"""
import re
from pathlib import Path

SRC_FILE = Path("Sparrow CRM v1.1.0.html")
lines = SRC_FILE.read_text(encoding="utf-8").split("\n")


def idx(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    raise SystemExit("anchor not found")


style_open = idx(lambda ln: ln.strip() == "<style>")
style_close = idx(lambda ln: ln.strip() == "</style>")
body_open = idx(lambda ln: ln.strip() == "<body>")
data_open = idx(lambda ln: '<script id="sparrow-data"' in ln)
data_close = idx(lambda ln: ln.strip() == "</script>", data_open)
js_open = idx(lambda ln: ln.strip() == "<script>", data_close)
js_close = idx(lambda ln: ln.strip() == "</script>", js_open)

out = Path("src")
out.mkdir(exist_ok=True)

# head.html spans doctype through </head> (everything before <body>), so the
# favicon <link> and </head> survive extraction. build.py replaces the <style>
# block in place with the freshly bundled styles.css.
(out / "head.html").write_text("\n".join(lines[:body_open]).rstrip() + "\n", encoding="utf-8")
(out / "styles.css").write_text("\n".join(lines[style_open + 1 : style_close]).strip() + "\n", encoding="utf-8")
(out / "shell.html").write_text("\n".join(lines[body_open:data_open]).rstrip() + "\n", encoding="utf-8")
(out / "data.json").write_text("\n".join(lines[data_open + 1 : data_close]).strip() + "\n", encoding="utf-8")

app = lines[js_open + 1 : js_close]
# utils.js must include the IIFE opener `(function() { "use strict";`, which
# sits just before `const APP_VERSION` — anchoring on APP_VERSION would drop
# it and leave main.js's closing `}());` unbalanced.
iife_open = next(i for i, ln in enumerate(app) if ln.strip() == "(function() {")
anchors = {
    "utils": iife_open,
    "core": next(i for i, ln in enumerate(app) if ln.strip() == "const Core = {"),
    "ui": next(i for i, ln in enumerate(app) if ln.strip() == "const UI = {"),
    "events": next(i for i, ln in enumerate(app) if ln.strip() == "const Events = {"),
    "main": next(i for i, ln in enumerate(app) if ln.strip().startswith("function init()")),
}

def dump(name, chunk, header=""):
    text = "\n".join(chunk).strip()
    if header:
        text = header + "\n" + text
    (out / name).write_text(text + "\n", encoding="utf-8")
    print(f"{name}: {len(chunk)} lines")

dump("utils.js", app[anchors["utils"] : anchors["core"]],
     "// Sparrow CRM — utils & constants. NOTE: this file OPENS the IIFE that\n"
     "// main.js closes; tools/build.py concatenates utils→core→ui→events→main.")
dump("core.js", app[anchors["core"] : anchors["ui"]], "// Sparrow CRM — state mutations & persistence.")
dump("ui.js", app[anchors["ui"] : anchors["events"]], "// Sparrow CRM — rendering.")
dump("events.js", app[anchors["events"] : anchors["main"]], "// Sparrow CRM — event wiring & delegated handlers.")
dump("main.js", app[anchors["main"] :],
     "// Sparrow CRM — bootstrap. NOTE: this file CLOSES the IIFE opened in utils.js.")
