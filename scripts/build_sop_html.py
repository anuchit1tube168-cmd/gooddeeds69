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
<link rel="icon" href="crest-240.jpg">
<script src="theme.js?v=20261111b"></script>
<link rel="stylesheet" href="style.css?v=3580"><link rel="stylesheet" href="theme.css?v=20261108">
<link rel="stylesheet" href="pro.css?v=20261111"><link rel="stylesheet" href="macos.css?v=20261114c">
<script src="ui-adapt.js?v=20261112b" defer></script>
<style>
.sop-wrap{max-width:980px;margin:24px auto 60px;padding:0 14px}
.sop-doc{padding:34px 44px!important;font-family:"TH Sarabun New","TH SarabunPSK","Sarabun",var(--mac-font);font-size:1.06rem;line-height:1.78;position:relative;overflow:hidden}
.sop-doc::before{content:"";position:absolute;inset:0;background:url(crest-240.jpg) center 52%/420px no-repeat;opacity:.035;pointer-events:none}
.sop-head{text-align:center;padding-bottom:18px;margin-bottom:22px;border-bottom:3px double var(--mac-accent)}
.sop-head img{width:108px;height:108px}
.sop-head .org{font-weight:700;font-size:1.18rem;margin-top:10px;letter-spacing:.01em}
.sop-head .org2{font-size:.95rem;color:var(--mac-text-3)}
.sop-head .chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px}
.sop-head .chip{border:1px solid var(--mac-accent);color:var(--mac-text);border-radius:999px;padding:2px 12px;font-size:.82rem;background:var(--mac-select)}
.sop-doc h1{font-size:1.55rem;margin:0 0 4px;text-align:center}.sop-doc h1+h2{border:0;text-align:center;font-size:1.12rem;margin-top:2px}
.sop-doc h2{font-size:1.22rem;margin:30px 0 10px;padding:6px 0 6px 12px;border-left:5px solid var(--mac-accent);border-bottom:1px solid var(--mac-hairline)}
.sop-doc h3{font-size:1.08rem;margin:22px 0 8px;color:var(--mac-accent-strong)}.sop-doc h4{text-align:center;font-weight:600;color:var(--mac-text-3);margin:0 0 14px}
.sop-doc p{margin:8px 0}.sop-doc ul{margin:6px 0 10px 22px}
.sop-doc .tw{overflow-x:auto;margin:12px 0;border:1px solid var(--mac-hairline);border-radius:10px}
.sop-doc table{width:100%;font-size:.94rem;border-collapse:collapse!important}.sop-doc th{background:var(--mac-select)!important;color:var(--mac-text)!important;font-size:.9rem}
.sop-doc th,.sop-doc td{padding:8px 10px;text-align:left;vertical-align:top}
.sop-doc blockquote{margin:12px 0;padding:10px 14px;border-left:4px solid var(--mac-accent);background:var(--mac-select);border-radius:8px}
.sop-doc code{background:var(--mac-control);padding:1px 6px;border-radius:5px;font-size:.88em}
.sop-doc .flow{counter-reset:s;list-style:none;padding:0;display:grid;gap:8px}
.sop-doc .flow li{counter-increment:s;padding:10px 14px 10px 48px;position:relative;border:1px solid var(--mac-hairline);border-radius:10px;background:var(--mac-control)}
.sop-doc .flow li::before{content:counter(s);position:absolute;left:12px;top:9px;width:26px;height:26px;border-radius:50%;background:var(--mac-accent);color:var(--mac-on-accent);display:grid;place-items:center;font-weight:700;font-size:.8rem}
.annex-head{text-align:center;margin:44px 0 6px;padding-top:26px;border-top:3px double var(--mac-accent)}
.annex-head img{width:84px;height:84px}.annex-head .tag{display:inline-block;margin-top:8px;padding:2px 14px;border-radius:999px;background:var(--mac-accent);color:var(--mac-on-accent);font-weight:700;font-size:.85rem}
.sop-bar{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-bottom:12px}
.sop-bar .brand{display:flex;align-items:center;gap:8px;font-weight:600}.sop-bar .brand img{width:30px;height:30px}
@media (max-width:640px){.sop-doc{padding:22px 16px!important}.sop-head img{width:84px;height:84px}}
@page{size:A4;margin:18mm 16mm}
@media print{.sop-bar,.mac-traffic-lights{display:none!important}body{background:#fff!important}
 .sop-doc{box-shadow:none!important;border:0!important;font-size:16pt;padding:0!important;color:#000!important;background:#fff!important}
 .sop-doc *{color:#000!important}.annex-head{break-before:page;border-top:0;margin-top:0}
 .sop-doc h2,.sop-doc h3{break-after:avoid}.sop-doc tr{break-inside:avoid}}
</style></head>
<body><div class="sop-wrap">
<div class="sop-bar"><a class="btn btn-sm" href="manual.html">‹ กลับคู่มือ</a><span class="brand"><img class="rtafnc-crest" src="crest-240.jpg" alt="">วพอ.พอ.</span><button class="btn btn-sm btn-primary" onclick="print()">พิมพ์ / บันทึก PDF</button></div>
<article class="card sop-doc">
<div class="mac-traffic-lights"><span class="light red"></span><span class="light yellow"></span><span class="light green"></span><span class="mac-title">SOP-RTAFNC-GD-2569</span></div>
<header class="sop-head"><img class="rtafnc-crest" src="crest-240.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ">
<div class="org">วิทยาลัยพยาบาลทหารอากาศ</div><div class="org2">กรมแพทย์ทหารอากาศ · Royal Thai Air Force Nursing College</div>
<div class="chips"><span class="chip">SOP-RTAFNC-GD-2569</span><span class="chip">ฉบับที่ ๒.๒</span><span class="chip">ปีการศึกษา ๒๕๖๙</span></div></header>
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
            annex = "## " + annex[2:]
        body += ('\n<div class="annex-head" id="annex-a"><img class="rtafnc-crest" src="crest-240.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ">'
                 '<div><span class="tag">ภาคผนวก ก</span></div></div>\n' + convert(annex))
    OUT.write_text(TPL.replace("%BODY%", body), encoding="utf-8")
    print(f"✅ สร้าง {OUT.relative_to(ROOT)}")
