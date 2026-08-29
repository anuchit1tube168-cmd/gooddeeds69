# RTAFNC ONE Pilot

ต้นแบบรวมระบบวิทยาลัยพยาบาลทหารอากาศ โดย **ไม่แก้ Production LIFF เดิม** และนำของที่ทำงานแล้วกลับมาใช้ก่อน

## สิ่งที่ Pilot นี้ใช้จริง
- ดีไซน์และแนวคิดจาก `frontend/student-dashboard.html`, `teacher-dashboard.html`, `view_cards.html`
- Backend เดิม `backend/CodeV2.gs`
- Google Apps Script Web App/API ของ Good Deed V2
- Session / RBAC / listDeeds / getProfile จากระบบเดิม
- Google Drive/Sheets เดิมเป็นฐานข้อมูลและคลังหลักฐาน

## เปิดใช้งาน
`https://anuchit1tube168-cmd.github.io/gooddeeds69/rtafnc-one-pilot/`

กด **ดูหน้าต้นแบบ** ได้โดยไม่ใช้บัญชี หรือ Login ด้วยบัญชีระบบ Good Deed V2 เพื่อดึงข้อมูลตามสิทธิ์จริง

## กฎความปลอดภัย
1. ไม่เปลี่ยน LIFF Endpoint เดิมใน Pilot
2. ไม่เก็บ Channel token, Channel secret, Telegram token หรือรหัสผ่านใน GitHub
3. ข้อมูลสุขภาพ/สุขภาพจิตต้องส่งแจ้งเตือนแบบไม่เปิดเผยรายละเอียด และเปิดดูหลัง Authentication + Role Check เท่านั้น
4. Telegram เป็น Primary Operations; LINE สงวนสำหรับ Critical/Urgent/Health และเหตุที่ต้องถึงบุคคลแน่นอน
5. Google Drive เป็น Master Repository ของรูป/PDF/เอกสาร

## 4-Day Sprint
- Day 1: App Shell + reuse Good Deed + Digital Card + API bridge
- Day 2: Telegram Identity/Role Binding + Approval/Event Router + Flex Message Kit
- Day 3: Mind Care/Health adapter + Advisor routing + urgent escalation + consent/privacy gate
- Day 4: end-to-end test, load/error test, security cleanup, LIFF provider decision และ deployment checklist

## Blocker ก่อนสลับ LIFF
ต้องยืนยันว่า LINE Login/LIFF Channel และ Messaging API Channel ของ OA อยู่ Provider เดียวกัน และผู้ดูแลมีสิทธิ์ Admin/Owner ก่อนเปลี่ยน Endpoint
