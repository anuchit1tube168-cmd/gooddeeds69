/**
 * นิยาม Rich Menu แบบแท็บ 3 หน้า (สไตล์เดียวกับ LINE OA ที่ใช้ richmenuswitch)
 * ภาพ: frontend/richmenu/richmenu_tab{1,2,3}.jpg ขนาด 2500×1686 (ต้นแบบ docs/richmenu-design.html)
 * พิกัดปุ่มต้องตรงกับภาพ — ถ้าแก้ layout ในภาพ ต้องแก้ตรงนี้ด้วย
 */
export const LIFF_ID = '2010948179-Ympqt2bT';
export const MENU_PREFIX = 'gd-tabs-';
const W = 2500, H = 1686, TAB_H = 250;
// พื้นที่เนื้อหา: padding 56, gap 48 (ตรงกับ CSS ในไฟล์ออกแบบ)
const X0 = 56, X1 = 2444, Y0 = 306, Y1 = 1630, ROW_H = 638, GAP = 48;
const R1 = [Y0, Y0 + ROW_H], R2 = [Y0 + ROW_H + GAP, Y1];

const liff = (page) => `https://liff.line.me/${LIFF_ID}?redirect=${encodeURIComponent(page)}`;
const box = (x0, x1, [y0, y1], page, label) => ({
  bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
  action: { type: 'uri', label: label.slice(0, 20), uri: liff(page) },
});
const tabs = (active) => [1, 2, 3].map((t) => ({
  bounds: { x: Math.round((t - 1) * W / 3), y: 0, width: Math.round(W / 3), height: TAB_H },
  action: t === active
    ? { type: 'postback', label: `แท็บ ${t}`, data: `tab=${t}`, displayText: undefined }
    : { type: 'richmenuswitch', label: `แท็บ ${t}`, richMenuAliasId: `gd-tab-${t}`, data: `tab=${t}` },
}));

const c2 = [X0, X0 + 1170, X0 + 1170 + GAP, X1];        // 2 คอลัมน์เท่ากัน
const c3 = [X0, 820, 868, 1632, 1680, X1];               // 3 คอลัมน์ (แถวล่างแท็บ 1)
const cWide = [X0, 1503, 1551, X1];                       // 1.62fr : 1fr (แถวบนแท็บ 1)

export const MENUS = [
  { alias: 'gd-tab-1', name: MENU_PREFIX + '1', chatBarText: 'เมนูความดี', image: 'richmenu_tab1.jpg', areas: [
    ...tabs(1),
    box(cWide[0], cWide[1], R1, 'student-dashboard.html', 'หน้าหลักของฉัน'),
    box(cWide[2], cWide[3], R1, 'submit-deed.html', 'บันทึกความดี'),
    box(c3[0], c3[1], R2, 'history.html', 'ประวัติความดี'),
    box(c3[2], c3[3], R2, 'view_cards.html', 'คอลเลกชันบัตร'),
    box(c3[4], c3[5], R2, 'ranking.html', 'จัดอันดับ'),
  ] },
  { alias: 'gd-tab-2', name: MENU_PREFIX + '2', chatBarText: 'เมนูความดี', image: 'richmenu_tab2.jpg', areas: [
    ...tabs(2),
    box(c2[0], c2[1], R1, 'run.html?mode=gps', 'วิ่งด้วย GPS'),
    box(c2[2], c2[3], R1, 'run.html', 'ส่งผลจากแอปวิ่ง'),
    box(c2[0], c2[1], R2, 'run.html?focus=power', 'ค่าพลังของฉัน'),
    box(c2[2], c2[3], R2, 'run.html?focus=rules', 'กติกาชั่วโมงวิ่ง'),
  ] },
  { alias: 'gd-tab-3', name: MENU_PREFIX + '3', chatBarText: 'เมนูความดี', image: 'richmenu_tab3.jpg', areas: [
    ...tabs(3),
    box(X0, X1, R1, 'manual.html', 'คู่มือและเกณฑ์'),
    box(c2[0], c2[1], R2, 'qa-board.html', 'ถาม-ตอบ'),
    box(c2[2], c2[3], R2, 'profile.html', 'โปรไฟล์'),
  ] },
].map((m) => ({ ...m, size: { width: W, height: H }, selected: m.alias === 'gd-tab-1' }));

// แท็บที่เปิดอยู่: กดซ้ำไม่ต้องทำอะไร — ใช้ postback เงียบ ๆ (ไม่แสดงข้อความในแชต)
for (const m of MENUS) for (const a of m.areas) if (a.action.type === 'postback') delete a.action.displayText;
