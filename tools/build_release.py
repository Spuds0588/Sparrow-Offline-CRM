#!/usr/bin/env python3
"""Build Sparrow CRM v1.1.0 from v1.0.0.

Strips all baked-in rendered state (contact cards, tasks, relationships,
settings rows, modal snapshots, duplicate favicons, live data JSON) that
leaked into v1.0.0 when it was saved from a live session. The JS is
refactored separately (str_replace passes); this script only fixes markup
and scaffolds the new file.
"""
import re

SRC = "Sparrow CRM v1.0.0.html"
DST = "Sparrow CRM v1.1.0.html"

with open(SRC, encoding="utf-8") as fh:
    text = fh.read()

lines = text.split("\n")

def find_line(pattern, start=0):
    for i in range(start, len(lines)):
        if re.search(pattern, lines[i]):
            return i
    raise SystemExit(f"pattern not found: {pattern!r}")

# --- 1. head: deduplicate the 5 accumulated favicon links down to one ------
head_links = [i for i, ln in enumerate(lines) if ln.startswith('<link rel="icon"')]
if not head_links:
    raise SystemExit("no favicon links found")
favicon = lines[head_links[0]].strip()
# Rebuild the single favicon line with normalized indentation.
lines[head_links[0]] = "    " + favicon
for i in reversed(head_links[1:]):
    del lines[i]

# --- 2. contactGrid: remove the 50 baked-in contact cards ------------------
i = find_line(r'<div id="contactGrid">')
lines[i] = '                <div id="contactGrid"></div>'

# --- 3. loadMoreContainer: class starts collapsed --------------------------
i = find_line(r'<div id="loadMoreContainer"')
lines[i] = '                <div id="loadMoreContainer" class="hidden">'

# --- 4. taskScreen: empty task list ----------------------------------------
# The rendered <ul> spans multiple lines; collapse the whole range.
i = find_line(r'<div id="all-tasks-list">')
j = find_line(r'</main>', i)
lines[i:j] = ['                <div id="all-tasks-list"></div>']

# --- 5. settingsScreen: strip rendered field rows --------------------------
# The container opening line and all rendered <li> rows span many lines;
# replace the whole range with one empty container line.
i = find_line(r'<div id="sections-management-container">')
j = find_line(r'<button id="add-section-btn"', i)
lines[i:j] = ['                <div id="sections-management-container"></div>']

i = find_line(r'<div id="settings-jump-links"')
j = find_line(r'Danger Zone</a>', i)
k = find_line(r'</div>', j)
lines[i : k + 1] = [
    '                <div id="settings-jump-links" class="jump-links-bar">',
    '                    <a href="#settings-data-management">Data Management</a>',
    '                    <a href="#settings-danger-zone">Danger Zone</a>',
    '                </div>',
]

# --- 6. contactDetailModal: reset the whole rendered snapshot --------------
i = find_line(r'<div id="contactDetailModal"')
m = re.search(r'class="modal( [^"]*)?"', lines[i])
lines[i] = f'    <div id="contactDetailModal" class="modal">'
j = find_line(r'<div class="modal-content">', i)
k = find_line(r'id="newContactModal"', j)
# Replace lines i+1 .. k-1 with the skeleton; keep the closing </div> of the
# outer modal container which lives at k-1 (the line before newContactModal).
inner = """        <div class="modal-content"></div>
"""
lines[i + 1 : k - 1] = [inner.rstrip("\n")]

# --- 7. newContactModal: reset rendered field container --------------------
# Same multi-line issue: replace container opening through the notes group.
i = find_line(r'<div id="new-contact-fields-container"')
j = find_line(r'<div class="form-group" style="grid-column: span 2;', i)
lines[i:j] = [
    '                    <div id="new-contact-fields-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 2rem;"></div>'
]

# --- 8. addRelationshipModal: clear the stale hidden target ----------------
i = find_line(r'<input type="hidden" id="relationship-target-id"')
lines[i] = '                        <input type="hidden" id="relationship-target-id" value="">'

# --- 9. data JSON: pristine, with ghostMode off -----------------------------
i = find_line(r'<script id="sparrow-data"')
data_json = """{
  "contacts": [],
  "tasks": [],
  "activities": [],
  "relationships": [],
  "settings": {
    "fieldDefinitions": {},
    "sections": [],
    "customActivityTypes": [
      "Phone Call",
      "SMS",
      "Email",
      "Meeting"
    ],
    "ghostMode": false
  }
}"""
close_i = find_line(r"</script>", i)
lines[i] = '    <script id="sparrow-data" type="application/json">'
# Replace everything up to AND INCLUDING the old closing tag, then re-add it.
lines[i + 1 : close_i + 1] = [data_json, '</script>']

with open(DST, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))

print(f"wrote {DST} ({len(lines)} lines)")
