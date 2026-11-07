# กติกากลาง: Cloudflare + LINE + Telegram

ไฟล์นี้เป็นกฎถาวรของโปรเจกต์ (Antigravity โหลดอัตโนมัติทุก session)
รายละเอียดขั้นตอนอยู่ใน `.agents/rules/` และจะถูกโหลดเมื่อทำงานตรงหัวข้อ

## ภาษาและการสื่อสาร

- ตอบภาษาไทย ใช้ภาษาคนธรรมดา อธิบายศัพท์เทคนิคสั้น ๆ
- ทำ **ทีละขั้น** รอผู้ใช้ยืนยันก่อนไปขั้นถัดไป
- ก่อนให้กดบนเว็บ บอก: เว็บไซต์ → บัญชี → แท็บ → ปุ่ม → ค่าที่กรอก
- บอก **"ควรเห็นอะไรเมื่อสำเร็จ"** ทุกขั้น
- แยกให้ชัด: งานที่ AI ทำได้ กับงานที่ผู้ใช้ต้องทำเอง (ล็อกอิน, กดยืนยัน, กรอก OTP)
- ถ้าไม่แน่ใจค่าจริง ให้ถามหรือตรวจจากระบบจริง **ห้ามเดา**

## ความปลอดภัย (ห้ามละเมิด)

- ห้ามขอรหัสผ่าน LINE / Cloudflare / Telegram และห้ามขอ OTP
- ห้ามใส่ token / secret / password ในโค้ด, Git, README, แชท, ภาพหน้าจอ
- ค่าลับใช้ `wrangler secret put` หรือ `.dev.vars` ที่อยู่ใน `.gitignore`
- ตรวจ ID token ที่เซิร์ฟเวอร์ และตรวจ webhook signature จาก raw body
- ตรวจสิทธิ์ทุก API ที่เขียนข้อมูล — การซ่อนปุ่มในหน้าจอไม่ใช่การป้องกัน
- ห้ามเดา URL / Channel ID / LIFF ID / database ID / chat ID

## ก่อนแตะระบบ

- ตรวจ `git status` และงานที่ยังไม่ commit ก่อนเสมอ
- ห้าม reset / revert / ลบงานที่ไม่ได้ทำเอง
- สำรอง D1 ก่อนเปลี่ยนแปลงที่กระทบข้อมูล
- ขออนุมัติก่อน: deploy production, ส่งข้อความจริง, เปลี่ยน URL/webhook/LIFF, เปลี่ยนสิทธิ์ผู้ใช้

## ลำดับงานติดตั้ง

1. อ่าน `.agents/rules/install-cloudflare.md` → Worker + D1 + secrets + deploy
2. อ่าน `.agents/rules/install-line.md` → LINE Login + LIFF + Messaging API
3. อ่าน `.agents/rules/install-notifications.md` → Telegram + แจ้งเตือนหลายช่อง
4. ทดสอบตาม checklist ในแต่ละไฟล์
5. สรุป URL, version, ผลทดสอบ, สิ่งที่ค้าง, วิธีย้อนกลับ

## คำสั่งมาตรฐาน

```sh
npx wrangler whoami
npx wrangler d1 create <ชื่อฐานข้อมูล>
npx wrangler d1 migrations apply <ชื่อฐานข้อมูล> --remote
npx wrangler secret put <ชื่อ secret>
npx wrangler secret list
npx wrangler deploy --dry-run
npx wrangler deploy
npx wrangler tail
npx wrangler rollback
```

## นิยาม "งานเสร็จ"

- `typecheck` / `test` / `deploy --dry-run` ผ่าน
- deploy แล้วเปิด URL จริงได้
- ผู้ใช้ยืนยันการทดสอบบนมือถือ และข้อความแจ้งเตือนจริง
- ไม่มี secret หลุดใน Git หรือ log
- มีบันทึกสิ่งที่ยังค้างและวิธีย้อนกลับ

## ห้าม

- ห้าม deploy แล้วบอกว่าเสร็จโดยไม่มีการตรวจผลจริง
- ห้ามปิด security (signature, auth, HTTPS) เพื่อให้ผ่านปัญหา
- ห้ามลบหรือเขียนทับฐานข้อมูล production โดยไม่ได้รับอนุมัติ
- ห้ามใช้ `getUpdates` พร้อม Telegram webhook
