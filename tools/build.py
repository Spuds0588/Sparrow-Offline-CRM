#!/usr/bin/env python3
"""Build the Sparrow CRM single-file release from src/.

The product is one portable HTML file (see agents.md). This script bundles:

    src/head.html    doctype + <head> ("<!-- STYLES -->" marker -> styles.css inlined)
    src/styles.css   application CSS
    src/shell.html   <body> markup (screens, modals, save reminder)
    src/data.json    pristine embedded data (ghostMode false, empty collections)
    src/utils.js     app modules, concatenated in order into one <script>
    src/core.js
    src/ui.js
    src/events.js
    src/main.js      (utils.js opens the IIFE, main.js closes it)

Usage:
    python3 tools/build.py                  # build "Sparrow CRM v<version>.html"
    python3 tools/build.py --check          # verify data.json is pristine, then build
    python3 tools/build.py --out custom.html

The --check gate refuses to build if src/data.json contains any contacts,
tasks, or non-default field definitions — the template/data rule from agents.md.
"""
import argparse
import json
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"
STYLES_RE = re.compile(r"^[ \t]*<style>\n.*?\n[ \t]*</style>[ \t]*$", re.S | re.M)


def read(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


def build(out_path: Path) -> Path:
    head = read("head.html")
    css = read("styles.css").strip()
    shell = read("shell.html").rstrip()
    data = read("data.json").strip()
    js = "\n\n".join(read(m).strip() for m in ("utils.js", "core.js", "ui.js", "events.js", "main.js"))

    # src/head.html ends with the <style> block from the previous release;
    # replace it (including the indent) with the freshly bundled CSS.
    head, n = STYLES_RE.subn(lambda _: f"    <style>\n{css}\n    </style>", head, count=1)
    if n != 1:
        sys.exit("build: <style> block not found in src/head.html")

    # Collapse duplicate favicon links. History lesson (see history.md): the
    # v1.0.0 'dedupe' left several <link rel="icon"> tags concatenated on ONE
    # line, so line-counting checks kept reporting '1'. setFavicon() strips
    # them at runtime, but the file must ship with exactly one.
    favicon_links = re.findall(r'<link rel="icon"[^>]*>', head)
    if len(favicon_links) > 1:
        # Collapse every run of concatenated favicon links to its first element.
        head = re.sub(
            r'(?:<link rel="icon"[^>]*>)+',
            lambda m: re.match(r'<link rel="icon"[^>]*>', m.group(0)).group(0),
            head,
        )

    html = (
        head.rstrip()
        + "\n"
        + shell
        + "\n    "
        + '<script id="sparrow-data" type="application/json">'
        + "\n"
        + data
        + "\n    </script>\n"
        + "    <script>\n"
        + js
        + "\n    </script>\n\n</body></html>\n"
    )
    out_path.write_text(html, encoding="utf-8")
    return out_path


def check_pristine() -> None:
    data = json.loads(read("data.json"))
    problems = []
    if data.get("contacts"):
        problems.append(f"data.json holds {len(data['contacts'])} contacts")
    if data.get("tasks"):
        problems.append(f"data.json holds {len(data['tasks'])} tasks")
    if data.get("activities"):
        problems.append(f"data.json holds {len(data['activities'])} activities")
    if data.get("relationships"):
        problems.append(f"data.json holds {len(data['relationships'])} relationships")
    if data.get("settings", {}).get("fieldDefinitions"):
        problems.append("data.json holds field definitions")
    if problems:
        sys.exit("build --check FAILED (template/data rule, see agents.md):\n  - " + "\n  - ".join(problems))
    print("pristine check OK: data.json holds no user data")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="output path (default: Sparrow CRM v<version>.html)")
    ap.add_argument("--check", action="store_true", help="verify data.json is pristine before building")
    args = ap.parse_args()

    if args.check:
        check_pristine()

    utils = read("utils.js")
    m = re.search(r"const APP_VERSION = '([^']+)'", utils)
    if not m:
        sys.exit("build: APP_VERSION not found in src/utils.js")
    version = m.group(1)

    out = Path(args.out) if args.out else Path(f"Sparrow CRM v{version}.html")
    build(out)
    print(f"built {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
