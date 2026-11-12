#!/bin/bash
# ดับเบิลคลิกไฟล์นี้ใน Finder เพื่อ: ตรวจระบบ → push GitHub → deploy Cloudflare Pages
# ไม่มี secret ในไฟล์นี้ — wrangler ใช้บัญชีที่ login ไว้ในเครื่อง
set -u
cd "$(dirname "$0")/.." || exit 1
PROJECT="rtafnc-gooddeeds"
line() { printf '\n==== %s ====\n' "$1"; }
fail() { printf '\n❌ %s\n' "$1"; exit 1; }

line "1/6 ตัดข้อมูลส่วนตัวออกจากไฟล์ที่ขึ้นเว็บ"
python3 scripts/strip_public_student_pii.py || fail "ตัดข้อมูลส่วนตัวไม่สำเร็จ — หยุด deploy"
python3 scripts/build_sop_html.py || fail "สร้างหน้า SOP ไม่สำเร็จ"

line "2/6 ทดสอบระบบ"
node scripts/check-syntax.cjs || fail "syntax ไม่ผ่าน"
node --test tests/*.test.cjs >/tmp/gd_test.log 2>&1 || { tail -30 /tmp/gd_test.log; fail "test ไม่ผ่าน"; }
grep -E "(^# |ℹ )(pass|fail) " /tmp/gd_test.log

line "3/6 push ขึ้น GitHub (main)"
# ไม่ถามรหัสผ่านใน Terminal: ถ้ายังไม่ได้ login GitHub ให้ข้ามไป deploy ต่อ (push ทีหลังได้)
if GIT_TERMINAL_PROMPT=0 git push origin main; then
  echo "✅ push GitHub แล้ว"
else
  echo "⚠️  ข้าม push GitHub (เครื่องนี้ยังไม่ได้ login GitHub) — deploy Cloudflare ต่อ"
fi

line "4/6 ตรวจ secret ใน Cloudflare"
SECRETS="$(npx --yes wrangler pages secret list --project-name "$PROJECT" 2>/dev/null || true)"
for k in GAS_URL TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID RUN_ADMIN_KEY RUN_GATEWAY_KEY; do
  if echo "$SECRETS" | grep -q "$k"; then echo "✅ $k"; else echo "⚠️  ยังไม่มี $k"; fi
done
if echo "$SECRETS" | grep -q -e LINE_CHANNEL_ACCESS_TOKEN -e LINE_CHANNEL_SECRET; then
  echo "✅ LINE (token หรือ channel id + secret)"
else
  echo "⚠️  ยังไม่มี LINE_CHANNEL_SECRET ใน Cloudflare — วางค่าความลับแชนแนลเอง (ระบบจะไม่แสดงสิ่งที่พิมพ์):"
  npx --yes wrangler pages secret put LINE_CHANNEL_SECRET --project-name "$PROJECT" || echo "⚠️  ข้ามการตั้ง LINE secret"
fi
KEYFILE="data/private/run_keys_DO_NOT_SHARE.txt"
if ! echo "$SECRETS" | grep -q RUN_GATEWAY_KEY || ! echo "$SECRETS" | grep -q RUN_ADMIN_KEY; then
  # ยังไม่มีรหัสระบบวิ่ง → สุ่มสร้างให้อัตโนมัติ (ไม่ถามเพื่อให้รันจบได้ในครั้งเดียว)
  if true; then
    mkdir -p data/private; umask 077
    ADMIN="$(openssl rand -hex 16)"; GATE="$(openssl rand -hex 24)"
    printf '%s' "$ADMIN" | npx --yes wrangler pages secret put RUN_ADMIN_KEY --project-name "$PROJECT" >/dev/null || fail "ตั้ง RUN_ADMIN_KEY ไม่สำเร็จ"
    printf '%s' "$GATE"  | npx --yes wrangler pages secret put RUN_GATEWAY_KEY --project-name "$PROJECT" >/dev/null || fail "ตั้ง RUN_GATEWAY_KEY ไม่สำเร็จ"
    printf 'RUN_ADMIN_KEY (ให้ผู้ตรวจ)=%s\nRUN_GATEWAY_KEY (ใส่ Script Properties ใน Apps Script)=%s\nสร้างเมื่อ %s\n' "$ADMIN" "$GATE" "$(date)" > "$KEYFILE"
    echo "🔐 บันทึกรหัสไว้ที่ $KEYFILE (ไฟล์นี้ไม่ขึ้น GitHub) — อย่าส่งในแชต"
  fi
fi

line "5/6 อัปเดต Apps Script (ระบบวิ่ง + แจ้งเตือน LINE/Telegram)"
GAS_DIR="scratch/live_gas_project"
DEPLOY_ID="$(grep -o 'macros/s/[A-Za-z0-9_-]*' .env 2>/dev/null | head -1 | cut -d/ -f3)"
if [ ! -f "$GAS_DIR/.clasp.json" ] || [ -z "$DEPLOY_ID" ]; then
  echo "⚠️  ข้าม Apps Script (ไม่พบ $GAS_DIR/.clasp.json หรือ GAS_URL ใน .env)"
else
  # clasp 3.x ให้ตรงกับไฟล์ login (~/.clasprc.json) ที่เครื่องนี้ใช้อยู่
  CLASP="npx --yes @google/clasp@3.4.1"
  gas_step() {
    [ -f "$HOME/.clasprc.json" ] || $CLASP login || return 1
    TMP="$(mktemp -d)"
    cp "$GAS_DIR/.clasp.json" "$TMP/"
    ( cd "$TMP" && $CLASP pull >/dev/null ) || { echo "   ดึงโค้ด Apps Script ไม่สำเร็จ (ลอง: npx @google/clasp@3.4.1 login)"; return 1; }
    python3 scripts/build_live_gas.py "$TMP" || return 1
    ( cd "$TMP" && $CLASP push -f ) || return 1
    ( cd "$TMP" && $CLASP deploy -i "$DEPLOY_ID" -d "run-tracker $(date +%Y%m%d-%H%M)" ) || return 1
    rm -f "$TMP/RunKey.js"
  }
  # Apps Script ล้มเหลวไม่หยุดการ deploy เว็บ — ระบบวิ่งจะยังปิดอยู่ (fail closed) จนกว่าจะอัปเดตสำเร็จ
  if gas_step; then echo "✅ Apps Script อัปเดตแล้ว (URL เดิม)"; else echo "⚠️  ข้าม Apps Script รอบนี้ — deploy เว็บต่อ"; fi
fi

line "6/6 deploy Cloudflare Pages"
npx --yes wrangler pages deploy frontend --project-name "$PROJECT" --branch main --commit-dirty=true || fail "deploy ไม่สำเร็จ"

line "เมนู LINE (Rich Menu แบบแท็บ)"
# ติดตั้งเฉพาะเมื่อภาพ/นิยามเมนูเปลี่ยน — รอบแรกติดตั้งเสมอ
RM_HASH="$(cat frontend/richmenu/*.jpg functions/api/_richmenu_def.js | shasum | cut -d' ' -f1)"
RM_STAMP="data/private/richmenu_installed.sha"
ADMIN_KEY="$(grep '^RUN_ADMIN_KEY' "$KEYFILE" 2>/dev/null | cut -d= -f2-)"
if [ -f data/private/richmenu_legacy ]; then
  # โหมดเมนูเดิม: สลับกลับครั้งเดียว แล้วไม่ติดตั้งเมนูแท็บจนกว่าจะลบไฟล์นี้
  if [ "$(cat "$RM_STAMP" 2>/dev/null)" = "legacy" ]; then
    echo "⏸  ใช้เมนู LINE เดิมอยู่ (ลบ data/private/richmenu_legacy เพื่อกลับไปใช้เมนูแท็บ)"
  elif [ -n "$ADMIN_KEY" ]; then
    sleep 8
    RESP="$(curl -s -X POST -H "X-Admin-Key: $ADMIN_KEY" -H "Content-Type: application/json" -d '{"action":"revert"}' "https://$PROJECT.pages.dev/api/richmenu-setup")"
    if echo "$RESP" | grep -q '"status":"success"'; then
      echo legacy > "$RM_STAMP"; echo "✅ กลับไปใช้เมนู LINE เดิมแล้ว: $(echo "$RESP" | grep -o '"name":"[^"]*"')"
    else
      echo "⚠️  สลับกลับเมนูเดิมไม่สำเร็จ: $RESP"
    fi
  fi
elif [ -z "$ADMIN_KEY" ]; then
  echo "⚠️  ข้ามเมนู LINE (ไม่พบ RUN_ADMIN_KEY ใน $KEYFILE)"
elif [ "$(cat "$RM_STAMP" 2>/dev/null)" = "$RM_HASH" ]; then
  echo "✅ เมนู LINE เป็นรุ่นล่าสุดอยู่แล้ว"
else
  sleep 8   # รอ deployment ใหม่กระจายถึง edge
  RESP="$(curl -s -X POST -H "X-Admin-Key: $ADMIN_KEY" "https://$PROJECT.pages.dev/api/richmenu-setup")"
  if echo "$RESP" | grep -q '"status":"success"'; then
    echo "$RM_HASH" > "$RM_STAMP"; echo "✅ ติดตั้งเมนู LINE 3 แท็บแล้ว"
  else
    echo "⚠️  ติดตั้งเมนู LINE ไม่สำเร็จ: $(echo "$RESP" | grep -o '"code":"[A-Z_]*"')"
    echo "    ถ้าเป็น LINE_TOKEN_MISSING ให้เพิ่ม LINE_CHANNEL_ACCESS_TOKEN ใน Cloudflare แล้วรันใหม่"
  fi
fi

printf '\n✅ เสร็จแล้ว: https://%s.pages.dev\n' "$PROJECT"
