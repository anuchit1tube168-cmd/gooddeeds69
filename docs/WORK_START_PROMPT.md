# Start Prompt — RTAFNC Good Deed Finalization

ทำงานระบบความดี วพอ. ให้เสร็จก่อนงาน RTAFNC ONE อื่นทั้งหมด

ให้อ่าน `docs/GOOD_DEED_HANDOFF_WORK_20260902.md` ก่อน และถือเป็น Source of Truth สำหรับการเริ่มงาน จากนั้นตรวจ HEAD/CI/ไฟล์จริงใน GitHub ก่อนแก้ไขทุกครั้ง

เป้าหมาย:
- Existing LINE LIFF ต้องยังใช้หน้าเดิมที่ทำงานได้จนกว่าจะผ่าน E2E และ owner อนุมัติ cutover
- Architecture: Existing LIFF -> Cloudflare same-origin HTML/Auth/Gateway -> signed Apps Script adapter -> Private Google Sheets/Drive
- Source ปี 2569: `Main_2569` + `Deeds_2569`
- Staging write tests ใช้เฉพาะ private staging copy
- LINE verification, session, CSRF, RBAC, Student Master link และ audit ต้อง server-side
- ห้าม password/default PIN/localStorage identity
- ห้าม PII/secrets/student photos ใน public GitHub/browser
- Submit ต้อง pending ก่อน; approved เท่านั้นที่เพิ่มยอดหมวดใน Main_2569
- Approval ต้อง idempotent ห้ามบวกชั่วโมงซ้ำ
- ใช้ Level เดิม: <10/10/25/50/80/120/180/250/300/350+
- รักษาสูตรและข้อมูลเดิม ห้ามลบ; Clean = organize/reconcile
- Production cutover/write ห้ามเปิดจน owner อนุมัติ

Active branches:
- `anuchit1tube168-cmd/gooddeeds69` -> `gooddeed-final-cloudflare-20260902`
- `anuchit1tube168-cmd/rtafnc-one` -> `gooddeed-final-gateway-20260902`

ลำดับทำงาน:
1. ตรวจ CI + compile/Wrangler dry-run ของ gateway ให้ผ่านทั้งหมด
2. ตรวจ Apps Script adapter contract/security
3. Deploy adapter ไป private staging source เท่านั้น
4. ตั้ง runtime secrets/private properties โดยไม่ commit/paste secrets
5. เปิด staging auth/E2E gate เฉพาะที่จำเป็น
6. ทดสอบ LINE -> session -> activation/link -> card/history -> submit/evidence -> approver review -> approve/reject -> audit
7. reconcile ชั่วโมง/Level/สูตรและทดสอบ retry/replay/rollback
8. load-test รูปแบบใช้งานประมาณ 500 registered users
9. สรุป Production Readiness Gate ให้ owner อนุมัติ
10. ห้าม merge main / เปลี่ยน LIFF Endpoint ก่อน explicit approval

ทำงานต่อเนื่องโดยไม่ถามซ้ำในสิ่งที่ตรวจจาก repo/Drive ได้ รายงานเฉพาะ checkpoint และ blocker ที่ต้องให้ owner กดหรืออนุมัติจริงเท่านั้น
