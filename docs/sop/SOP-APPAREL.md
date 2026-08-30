# SOP — APPAREL / ระบบอาภรณ์ภัณฑ์

## Purpose
บริหาร catalog อาภรณ์ภัณฑ์ ขนาด/เพศ/ประเภท สิทธิ์หรือจำนวนที่ได้รับ คำสั่งซื้อ/จ่าย/รับ/แก้ไข/คืน และรายงานประจำปีการศึกษา โดยแยก master catalog ออกจาก transaction history.

## Source rule
ใช้ source catalog/อัตรา/คำสั่งที่ตรวจสอบปีและวันที่มีผลจริงเท่านั้น ไฟล์หลายเวอร์ชันต้องเก็บ provenance และจัดเป็น candidate จนกว่าจะยืนยันฉบับใช้จริง ห้ามเลือกจากชื่อไฟล์ที่ดูใหม่กว่าเพียงอย่างเดียว.

## Data model
`ApparelCatalog`, `CatalogVersion`, `EntitlementRule`, `StudentSizeProfile`, `Order`, `OrderLine`, `IssueTransaction`, `ReturnExchange`, `StockBalanceView`, `Evidence`, `AuditLog`.

Student identity มาจาก CORE. Size profile เป็นข้อมูลปฏิบัติการและเปลี่ยนได้แบบ versioned; ห้ามทับประวัติการเบิก/รับย้อนหลัง.

## Workflow
`CATALOG_DRAFT → VERIFIED → ACTIVE`; transaction `REQUEST/ORDER → CHECK → APPROVE where required → ISSUE/RECEIVE → ACKNOWLEDGED → CLOSED`; exchange/return เป็น transaction ใหม่เชื่อมรายการเดิม.

## Controls
- ตรวจ item code/size/unit/gender applicability และปีการศึกษาก่อนบันทึก.
- จำนวนจ่ายห้ามเกินสิทธิ์/สต็อก เว้นแต่มี policy exception ที่บันทึกเหตุผล.
- ราคาหรืออัตราเปลี่ยนต้องสร้าง CatalogVersion ใหม่ ไม่แก้ย้อนหลังแบบไร้ร่องรอย.
- ไม่มีการเดาขนาดจากเพศ/รุ่นหรือรายการปีก่อน.
- ข้อมูลจริง/คำสั่ง/รายชื่อไม่ขึ้น public GitHub.

## Permissions
Student เห็นของตนเองและยืนยันรับ/ขอแก้ไขได้ตาม workflow. Operations/ผู้รับผิดชอบอาภรณ์ภัณฑ์จัด catalog/stock/order ใน scope. Admin ทั่วไปไม่แก้รายการย้อนหลังโดยไม่มี audit.

## Academic year
1 ส.ค. snapshot catalog/stock/open transactions. Catalog/size defaults อาจ carry forward หลัง review; transaction เดิมคงปีเดิม. ต้อง reconcile คำสั่ง/อัตรา 2569 ก่อน activate catalog ปีปัจจุบัน.

## Audit/rollback
ทุก catalog version, order, issue, exchange, manual adjustment มี actor/reason/correlation. Rollback ปิด active version แล้วชี้กลับ version ก่อนหน้า; transaction ที่เกิดแล้วไม่ถูกลบ.

## Acceptance
catalog verified, stock math reconciled, entitlement rule tests, duplicate issue prevention, self-only student view, year rollover test, export totals and audit pass.

## Activation gate
เปิด read catalog ก่อน จากนั้น order/request แล้วจึง issue/stock write. ห้ามเปิดพร้อมกันถ้า catalog/อัตรา/stock ยังไม่ยืนยัน.
