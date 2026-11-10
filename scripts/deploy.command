#!/bin/bash
# ดับเบิลคลิกไฟล์นี้ใน Finder เพื่อ: ตรวจระบบ → push GitHub → deploy Cloudflare Pages
# ไม่มี secret ในไฟล์นี้ — wrangler ใช้บัญชีที่ login ไว้ในเครื่อง
set -u
cd "$(dirname "$0")/.." || exit 1
PROJECT="rtafnc-gooddeeds"
line() { printf '\n==== %s ====\n' "$1"; }
fail() { printf '\n❌ %s\n' "$1"; read -r -p "กด Enter เพื่อปิด"; exit 1; }

line "1/5 ตัดข้อมูลส่วนตัวออกจากไฟล์ที่ขึ้นเว็บ"
python3 scripts/strip_public_student_pii.py || fail "ตัดข้อมูลส่วนตัวไม่สำเร็จ — หยุด deploy"

line "2/5 ทดสอบระบบ"
node scripts/check-syntax.cjs || fail "syntax ไม่ผ่าน"
node --test tests/*.test.cjs >/tmp/gd_test.log 2>&1 || { tail -30 /tmp/gd_test.log; fail "test ไม่ผ่าน"; }
grep -E "^# (pass|fail)" /tmp/gd_test.log

line "3/5 push ขึ้น GitHub (main)"
git push origin main || fail "push ไม่สำเร็จ (ตรวจการ login GitHub)"

line "4/5 ตรวจ secret ใน Cloudflare"
SECRETS="$(npx --yes wrangler pages secret list --project-name "$PROJECT" 2>/dev/null || true)"
for k in GAS_URL TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID RUN_ADMIN_KEY RUN_GATEWAY_KEY; do
  if echo "$SECRETS" | grep -q "$k"; then echo "✅ $k"; else echo "⚠️  ยังไม่มี $k"; fi
done
KEYFILE="data/private/run_keys_DO_NOT_SHARE.txt"
if ! echo "$SECRETS" | grep -q RUN_GATEWAY_KEY || ! echo "$SECRETS" | grep -q RUN_ADMIN_KEY; then
  read -r -p "สร้าง RUN_ADMIN_KEY / RUN_GATEWAY_KEY ใหม่ให้อัตโนมัติไหม? (y/N) " ans
  if [ "${ans:-N}" = "y" ]; then
    mkdir -p data/private; umask 077
    ADMIN="$(openssl rand -hex 16)"; GATE="$(openssl rand -hex 24)"
    printf '%s' "$ADMIN" | npx --yes wrangler pages secret put RUN_ADMIN_KEY --project-name "$PROJECT" >/dev/null || fail "ตั้ง RUN_ADMIN_KEY ไม่สำเร็จ"
    printf '%s' "$GATE"  | npx --yes wrangler pages secret put RUN_GATEWAY_KEY --project-name "$PROJECT" >/dev/null || fail "ตั้ง RUN_GATEWAY_KEY ไม่สำเร็จ"
    printf 'RUN_ADMIN_KEY (ให้ผู้ตรวจ)=%s\nRUN_GATEWAY_KEY (ใส่ Script Properties ใน Apps Script)=%s\nสร้างเมื่อ %s\n' "$ADMIN" "$GATE" "$(date)" > "$KEYFILE"
    echo "🔐 บันทึกรหัสไว้ที่ $KEYFILE (ไฟล์นี้ไม่ขึ้น GitHub) — อย่าส่งในแชต"
  fi
fi

line "5/5 deploy Cloudflare Pages"
npx --yes wrangler pages deploy frontend --project-name "$PROJECT" --branch main --commit-dirty=true || fail "deploy ไม่สำเร็จ"

printf '\n✅ เสร็จแล้ว: https://%s.pages.dev\n' "$PROJECT"
read -r -p "กด Enter เพื่อปิด"
