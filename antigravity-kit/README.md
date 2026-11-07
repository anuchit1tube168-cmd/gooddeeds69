# ชุดติดตั้ง Cloudflare + LINE + Telegram สำหรับ Antigravity

## มีอะไรในชุดนี้

```
AGENTS.md                          ← กฎถาวร (Antigravity อ่านอัตโนมัติ)
.agents/rules/install-cloudflare.md
.agents/rules/install-line.md
.agents/rules/install-notifications.md
README.md                          ← ไฟล์นี้
PROMPT.txt                         ← ข้อความเริ่มต้นสำหรับวางใน chat
```

## วิธีติดตั้งชุดนี้ในโปรเจกต์

1. แตกไฟล์ zip
2. คัดลอก `AGENTS.md` และโฟลเดอร์ `.agents/` ไปวางที่ **root ของโปรเจกต์**
3. ถ้าโปรเจกต์มี `AGENTS.md` อยู่แล้ว **ให้รวมเนื้อหา ไม่ทับไฟล์เดิม**
4. เปิดโฟลเดอร์โปรเจกต์ใน Antigravity
5. วางข้อความจาก `PROMPT.txt` ในช่องแชท

## วิธีตรวจว่า Antigravity เห็นกฎ

- เปิด Antigravity → Settings → Rules / Customizations
- ต้องเห็น `AGENTS.md` และ rule 3 ไฟล์จาก `.agents/rules/`
- ถ้าไม่เห็น ให้ตรวจว่าวางที่ root และชื่อโฟลเดอร์เป็น `.agents` (มี s)

## ข้อจำกัดที่ต้องรู้

- Antigravity จำกัด rule ไฟล์ละ **24 KB** → ชุดนี้แบ่งไว้ให้แล้ว
- กฎที่ `always_on` รวมกันไม่ควรเกิน **20,000 tokens** → `AGENTS.md` จึงเก็บสั้น
- rule 3 ไฟล์ใช้ `trigger: model_decision` → โหลดเมื่อทำงานตรงหัวข้อ
- Antigravity ไม่โหลดกฎจากโฟลเดอร์ย่อยลึกเกิน 1 ชั้น

## ลำดับการใช้งาน

1. Cloudflare: Worker + D1 + secrets + deploy
2. LINE: Provider + Login Channel + LIFF + Messaging API
3. Telegram: BotFather + chat ID
4. แจ้งเตือนหลายช่องทาง + กันส่งซ้ำ
5. ทดสอบ + ส่งมอบ

รายละเอียดทั้งหมดอยู่ใน rule ทั้ง 3 ไฟล์
