// ชั้นปีจากรุ่น: 69 ต้องเป็นชั้นปีที่ 1 ในปีการศึกษา 2569 ไม่ว่าค่าเป็นตัวเลขหรือข้อความ
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const NOV_2569 = new Date('2026-11-14T05:00:00Z');
const JUN_2570 = new Date('2027-06-20T05:00:00Z');
const JUL_2570 = new Date('2027-07-02T05:00:00Z');

test('yearLabel ปีการศึกษา 2569', async () => {
  const { yearLabel } = await import(path.join(__dirname, '../functions/api/_year.js'));
  assert.strictEqual(yearLabel(69, '', NOV_2569), 'ชั้นปีที่ 1 (รุ่น 69)');      // ตัวเลข (บัคเดิมได้ชั้นปีที่ 4)
  assert.strictEqual(yearLabel('69', '', NOV_2569), 'ชั้นปีที่ 1 (รุ่น 69)');
  assert.strictEqual(yearLabel('รุ่น 68', '', NOV_2569), 'ชั้นปีที่ 2 (รุ่น 68)');
  assert.strictEqual(yearLabel(66, '', NOV_2569), 'ชั้นปีที่ 4 (รุ่น 66)');
  assert.strictEqual(yearLabel(65, '', NOV_2569), 'ศิษย์เก่า (รุ่น 65)');
  assert.strictEqual(yearLabel('', String(6900000 + 1), NOV_2569), 'ชั้นปีที่ 1 (รุ่น 69)'); // จากรหัส
});

test('เลื่อนชั้นเองเมื่อขึ้นปีการศึกษาใหม่ (1 ก.ค.)', async () => {
  const { yearLabel } = await import(path.join(__dirname, '../functions/api/_year.js'));
  assert.strictEqual(yearLabel(69, '', JUN_2570), 'ชั้นปีที่ 1 (รุ่น 69)');
  assert.strictEqual(yearLabel(69, '', JUL_2570), 'ชั้นปีที่ 2 (รุ่น 69)');
});
