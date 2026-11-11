// Rich Menu แบบแท็บ: ปุ่มอยู่ในกรอบภาพ, ทุกแท็บสลับไปแท็บอื่นได้, ลิงก์เปิดผ่าน LIFF เท่านั้น
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('rich menu definitions are valid LINE payloads', async () => {
  const { MENUS, LIFF_ID } = await import(path.join(__dirname, '../functions/api/_richmenu_def.js'));
  assert.equal(MENUS.length, 3);
  const aliases = MENUS.map((m) => m.alias);
  for (const m of MENUS) {
    assert.deepEqual(m.size, { width: 2500, height: 1686 });
    assert.ok(m.chatBarText.length <= 14, 'chatBarText ≤ 14 ตัวอักษร');
    assert.ok(m.areas.length <= 20);
    assert.ok(fs.existsSync(path.join(__dirname, '../frontend/richmenu', m.image)), 'มีไฟล์ภาพ ' + m.image);
    const switches = m.areas.filter((a) => a.action.type === 'richmenuswitch').map((a) => a.action.richMenuAliasId);
    assert.deepEqual(switches.sort(), aliases.filter((a) => a !== m.alias).sort());
    for (const a of m.areas) {
      const b = a.bounds;
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 2500 && b.y + b.height <= 1686, JSON.stringify(b));
      assert.ok(!a.action.label || a.action.label.length <= 20);
      if (a.action.type === 'uri') {
        const u = new URL(a.action.uri);
        assert.equal(u.origin + u.pathname, `https://liff.line.me/${LIFF_ID}`);
        assert.match(u.searchParams.get('redirect'), /^[a-z_-]+\.html(\?[a-z]+=[a-z]+)?$/); // หน้าในระบบเท่านั้น
      }
    }
  }
  assert.equal(MENUS.filter((m) => m.selected).length, 1);
});
