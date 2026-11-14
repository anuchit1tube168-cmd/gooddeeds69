#!/usr/bin/env python3
"""แปลง SOP_STANDARD_OPERATING_PROCEDURE_2569.md → frontend/sop.html (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
รองรับ: หัวข้อ, ย่อหน้า, รายการ, ตาราง, ตัวหนา, code, blockquote, เส้นคั่น
แผนภาพ mermaid แปลงเป็นลำดับขั้นตอน (หน้าเว็บไม่โหลดสคริปต์ภายนอก)
"""
import html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "SOP_STANDARD_OPERATING_PROCEDURE_2569.md"
ANNEX_A = ROOT / "docs" / "ข้อกำหนด_บันทึกความดี_ปีการศึกษา2569.md"  # ภาคผนวก ก ต่อท้ายในหน้าเดียวกัน
OUT = ROOT / "frontend" / "sop.html"

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    return t

def mermaid_steps(lines):
    steps = []
    for l in lines:
        for m in re.finditer(r"\[([^\]]+)\]|\{([^}]+)\}|\(\[([^\]]+)\]\)", l):
            label = next(g for g in m.groups() if g)
            if label not in steps:
                steps.append(label)
    return '<ol class="flow">' + "".join(f"<li>{inline(s)}</li>" for s in steps) + "</ol>"

def convert(md):
    out, lines, i = [], md.splitlines(), 0
    para = []
    def flush():
        if para:
            out.append("<p>" + "<br>".join(inline(p) for p in para) + "</p>")
            para.clear()
    while i < len(lines):
        l = lines[i]
        if l.startswith("```"):
            flush(); lang = l[3:].strip(); block = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i]); i += 1
            out.append(mermaid_steps(block) if lang == "mermaid" else "<pre>" + html.escape("\n".join(block)) + "</pre>")
        elif re.match(r"^#{1,4} ", l):
            flush(); n = len(l.split(" ")[0]); out.append(f"<h{n}>{inline(l[n+1:])}</h{n}>")
        elif l.strip() == "---":
            flush(); out.append("<hr>")
        elif l.startswith("|"):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            i -= 1
            head, body = rows[0], [r for r in rows[1:] if not all(re.fullmatch(r":?-+:?", c) for c in r)]
            out.append('<div class="tw"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>")
        elif l.startswith("> "):
            flush(); out.append(f"<blockquote>{inline(l[2:])}</blockquote>")
        elif re.match(r"^\s*- ", l):
            flush(); items = []
            while i < len(lines) and re.match(r"^\s*- ", lines[i]):
                items.append(inline(re.sub(r"^\s*- ", "", lines[i]))); i += 1
            i -= 1
            out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>")
        elif not l.strip():
            flush()
        else:
            para.append(l.strip())
        i += 1
    flush()
    return "\n".join(out)

TPL = """<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SOP ระบบบันทึกความดี วพอ.พอ. ๒๕๖๙</title>
<script src="theme.js?v=20261111b"></script>
<link rel="stylesheet" href="style.css?v=3580"><link rel="stylesheet" href="theme.css?v=20261108">
<link rel="stylesheet" href="pro.css?v=20261111"><link rel="stylesheet" href="macos.css?v=20261112b">
<style>
.sop-wrap{max-width:980px;margin:24px auto 60px;padding:0 14px}
.sop-doc{padding:28px 34px!important;font-family:"TH Sarabun New","TH SarabunPSK","Sarabun",var(--mac-font);font-size:1.02rem;line-height:1.75}
.sop-doc h1{font-size:1.5rem;margin:0 0 4px}.sop-doc h2{font-size:1.18rem;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--mac-hairline)}
.sop-doc h3{font-size:1.06rem;margin:20px 0 8px}.sop-doc p{margin:8px 0}.sop-doc ul{margin:6px 0 10px 22px}
.sop-doc .tw{overflow-x:auto;margin:10px 0}.sop-doc table{width:100%;font-size:.92rem}.sop-doc th,.sop-doc td{padding:7px 9px;text-align:left;vertical-align:top}
.sop-doc blockquote{margin:10px 0;padding:10px 14px;border-left:4px solid var(--mac-accent);background:var(--mac-select);border-radius:8px}
.sop-doc code{background:var(--mac-control);padding:1px 6px;border-radius:5px;font-size:.88em}
.sop-doc .flow{counter-reset:s;list-style:none;padding:0;display:grid;gap:8px}
.sop-doc .flow li{counter-increment:s;padding:10px 14px 10px 48px;position:relative;border:1px solid var(--mac-hairline);border-radius:10px;background:var(--mac-control)}
.sop-doc .flow li::before{content:counter(s);position:absolute;left:12px;top:9px;width:26px;height:26px;border-radius:50%;background:var(--mac-accent);color:var(--mac-on-accent);display:grid;place-items:center;font-weight:700;font-size:.8rem}
.sop-bar{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-bottom:12px;padding-right:150px}
@media print{.sop-bar,.mac-traffic-lights{display:none!important}.sop-doc{box-shadow:none!important;border:0!important;font-size:16pt}}
</style></head>
<body><div class="sop-wrap">
<div class="sop-bar"><a class="btn btn-sm" href="manual.html">‹ กลับคู่มือ</a><button class="btn btn-sm btn-primary" onclick="print()">พิมพ์ / บันทึก PDF</button></div>
<article class="card sop-doc">
<div class="mac-traffic-lights"><span class="light red"></span><span class="light yellow"></span><span class="light green"></span><span class="mac-title">SOP-RTAFNC-GD-2569</span></div>
%BODY%
</article></div></body></html>
"""

if __name__ == "__main__":
    body = convert(SRC.read_text(encoding="utf-8"))
    if ANNEX_A.exists():
        annex = ANNEX_A.read_text(encoding="utf-8")
        # หัวเรื่องของภาคผนวกลดระดับลง ไม่ให้ชนหัวเรื่องหลักของ SOP
        annex = annex.replace("\n### ", "\n#### ").replace("\n## ", "\n### ").replace("\n# ", "\n## ")
        if annex.startswith("# "):
            annex = "## ภาคผนวก ก — " + annex[2:]
        body += '\n<hr id="annex-a" style="margin:36px 0 8px;border:0;border-top:2px solid var(--mac-hairline)">\n' + convert(annex)
    OUT.write_text(TPL.replace("%BODY%", body), encoding="utf-8")
    print(f"✅ สร้าง {OUT.relative_to(ROOT)}")
