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
  CLASP="npx --yes @google/clasp@2.4.2"
  [ -f "$HOME/.clasprc.json" ] || $CLASP login || fail "login clasp ไม่สำเร็จ"
  TMP="$(mktemp -d)"
  cp "$GAS_DIR/.clasp.json" "$TMP/"
  ( cd "$TMP" && $CLASP pull >/dev/null ) || fail "ดึงโค้ด Apps Script ปัจจุบันไม่สำเร็จ"
  python3 scripts/build_live_gas.py "$TMP" || fail "เตรียมโค้ด Apps Script ไม่สำเร็จ"
  ( cd "$TMP" && $CLASP push -f ) || fail "clasp push ไม่สำเร็จ"
  ( cd "$TMP" && $CLASP deploy -i "$DEPLOY_ID" -d "run-tracker $(date +%Y%m%d-%H%M)" ) || fail "อัปเดต deployment Apps Script ไม่สำเร็จ"
  rm -f "$TMP/RunKey.js"
  echo "✅ Apps Script อัปเดตแล้ว (URL เดิม)"
fi

line "6/6 deploy Cloudflare Pages"
npx --yes wrangler pages deploy frontend --project-name "$PROJECT" --branch main --commit-dirty=true || fail "deploy ไม่สำเร็จ"

printf '\n✅ เสร็จแล้ว: https://%s.pages.dev\n' "$PROJECT"
